import { getServer } from "./hytale";
import { existsSync, mkdirSync, rmSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(__dirname);
const schemasOutputDir = join(projectRoot, "src", "data", "schemas");

interface HytaleMetadata {
    path?: string;
    extension?: string;
    idProvider?: string;
    internalKeys?: string[];
}

interface JsonSchema {
    $schema?: string;
    $id?: string;
    title?: string;
    description?: string;
    type?: string;
    allOf?: any[];
    properties?: Record<string, any>;
    $defs?: Record<string, any>;
    hytale?: HytaleMetadata;
    [key: string]: any;
}

// Properties to remove from all schema objects (Hytale-specific metadata)
const HYTALE_PROPERTIES_TO_REMOVE = new Set([
    "hytale",
    "hytaleCommonAsset",
    "hytaleSchemaTypeField",
    "hytaleAssetRef",
]);

// Editor metadata property names to remove from properties objects
const EDITOR_METADATA_PROPERTIES = new Set([
    "$Title",
    "$Comment",
    "$Author",
    "$TODO",
    "$Position",
    "$FloatingFunctionNodes",
    "$Groups",
    "$WorkspaceID",
    "$NodeId",
    "$NodeEditorMetadata"
]);

// Check if an array contains only empty strings
function isEmptyStringArray(arr: any[]): boolean {
    return arr.every(item => item === "");
}

// Deep clean a schema object recursively
function deepClean(obj: any, isInsideProperties: boolean = false): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepClean(item, false)).filter(item => item !== undefined);
    }

    if (typeof obj !== "object") {
        return obj;
    }

    const cleaned: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
        // Skip Hytale-specific properties
        if (HYTALE_PROPERTIES_TO_REMOVE.has(key)) {
            continue;
        }

        // Skip editor metadata properties when inside a properties object
        if (isInsideProperties && EDITOR_METADATA_PROPERTIES.has(key)) {
            continue;
        }

        // Remove empty enumDescriptions and markdownEnumDescriptions
        if ((key === "enumDescriptions" || key === "markdownEnumDescriptions") &&
            Array.isArray(value) && isEmptyStringArray(value)) {
            continue;
        }

        // Remove markdownDescription if it equals description
        if (key === "markdownDescription" && obj.description === value) {
            continue;
        }

        // Recursively clean nested objects/arrays
        // Pass isInsideProperties=true when we're processing a "properties" key
        const nextIsInsideProperties = key === "properties";
        const cleanedValue = deepClean(value, nextIsInsideProperties);

        if (cleanedValue !== undefined) {
            cleaned[key] = cleanedValue;
        }
    }

    // Simplify anyOf patterns for nullable types
    return simplifyAnyOf(cleaned);
}

// Simplify nested anyOf patterns, especially for nullable types
function simplifyAnyOf(obj: Record<string, any>): Record<string, any> {
    if (!obj.anyOf || !Array.isArray(obj.anyOf)) {
        return obj;
    }

    const anyOfItems = obj.anyOf;

    // Pattern: anyOf with nested anyOf and null type
    // { anyOf: [ { anyOf: [...] }, { type: "null" } ] }
    if (anyOfItems.length === 2) {
        const nullItem = anyOfItems.find((item: any) => item.type === "null");
        const otherItem = anyOfItems.find((item: any) => item.type !== "null");

        if (nullItem && otherItem) {
            // If the other item has a nested anyOf, flatten it
            if (otherItem.anyOf && Array.isArray(otherItem.anyOf)) {
                // Check if it's a number-or-special-string pattern (Infinity/NaN)
                const nestedItems = otherItem.anyOf;
                const hasNumberAndSpecialString = nestedItems.some((i: any) => i.type === "number") &&
                    nestedItems.some((i: any) => i.type === "string" && i.pattern?.includes("Infinity"));

                if (hasNumberAndSpecialString) {
                    // Replace with ref to base.schema.json#/$defs/NullableNumberOrSpecial
                    const { anyOf: _parentAnyOf, ...restOfObj } = obj;
                    const { anyOf: _nestedAnyOf, ...restOfOther } = otherItem;

                    return {
                        ...restOfObj,
                        ...restOfOther,
                        $ref: "base.schema.json#/$defs/NullableNumberOrSpecial"
                    };
                }

                // For other nested anyOf, flatten them
                const { anyOf: _parentAnyOf, ...restOfObj } = obj;
                const flattenedItems = [...nestedItems, nullItem];
                return {
                    ...restOfObj,
                    anyOf: flattenedItems
                };
            }

            // Check if it's a reference pattern with anyOf for string ref or inline object
            // { anyOf: [ { type: "string", title: "Reference to X" }, { $ref: "X.json#" } ] }
            if (otherItem.anyOf && otherItem.anyOf.length === 2) {
                const stringRef = otherItem.anyOf.find((i: any) => i.type === "string" && i.title?.startsWith("Reference to"));
                const schemaRef = otherItem.anyOf.find((i: any) => i.$ref);

                if (stringRef && schemaRef) {
                    // Simplify to just the ref options plus null
                    const { anyOf: _parentAnyOf, ...restOfObj } = obj;
                    return {
                        ...restOfObj,
                        anyOf: [
                            { type: "string", title: stringRef.title },
                            schemaRef,
                            nullItem
                        ]
                    };
                }
            }
        }
    }

    return obj;
}

// Replace Color RGB patterns with ref to base.schema.json#/$defs/ColorRGB
function replaceColorPatterns(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => replaceColorPatterns(item));
    }

    if (typeof obj !== "object") {
        return obj;
    }

    // Check if this object matches the Color RGB pattern
    if (obj.title === "Color RGB" && obj.anyOf && Array.isArray(obj.anyOf)) {
        const hasHexPattern = obj.anyOf.some((item: any) =>
            item.pattern && item.pattern.includes("#([0-9a-fA-F]"));
        const hasRgbPattern = obj.anyOf.some((item: any) =>
            item.pattern && item.pattern.includes("rgb\\("));

        if (hasHexPattern && hasRgbPattern) {
            // Replace with ref
            return { $ref: "base.schema.json#/$defs/ColorRGB" };
        }
    }

    // Recursively process all properties
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        result[key] = replaceColorPatterns(value);
    }

    return result;
}

// Replace non-nullable NumberOrSpecial patterns (number or Infinity/NaN, without null)
function replaceNumberOrSpecialPatterns(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => replaceNumberOrSpecialPatterns(item));
    }

    if (typeof obj !== "object") {
        return obj;
    }

    // Check if this object matches the non-nullable NumberOrSpecial pattern
    // { anyOf: [ { type: "number" }, { type: "string", pattern: "Infinity" } ] }
    if (obj.anyOf && Array.isArray(obj.anyOf) && obj.anyOf.length === 2) {
        const hasNumber = obj.anyOf.some((item: any) => item.type === "number");
        const hasInfinityPattern = obj.anyOf.some((item: any) =>
            item.type === "string" && item.pattern?.includes("Infinity"));
        const hasNull = obj.anyOf.some((item: any) => item.type === "null");

        if (hasNumber && hasInfinityPattern && !hasNull) {
            // Replace with ref, preserving other properties like default
            const { anyOf: _anyOf, ...rest } = obj;
            return {
                ...rest,
                $ref: "base.schema.json#/$defs/NumberOrSpecial"
            };
        }
    }

    // Also check oneOf pattern (from earlier simplification)
    if (obj.oneOf && Array.isArray(obj.oneOf)) {
        const hasNumber = obj.oneOf.some((item: any) => item.type === "number");
        const hasInfinityPattern = obj.oneOf.some((item: any) =>
            item.type === "string" && item.pattern?.includes("Infinity"));
        const hasNull = obj.oneOf.some((item: any) => item.type === "null");

        if (hasNumber && hasInfinityPattern) {
            const { oneOf: _oneOf, ...rest } = obj;
            if (hasNull) {
                return {
                    ...rest,
                    $ref: "base.schema.json#/$defs/NullableNumberOrSpecial"
                };
            } else {
                return {
                    ...rest,
                    $ref: "base.schema.json#/$defs/NumberOrSpecial"
                };
            }
        }
    }

    // Recursively process all properties
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        result[key] = replaceNumberOrSpecialPatterns(value);
    }

    return result;
}

// Convert common.json $ref paths
function convertCommonRefs(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => convertCommonRefs(item));
    }

    if (typeof obj !== "object") {
        return obj;
    }

    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
        if (key === "$ref" && typeof value === "string" && value.startsWith("common.json#")) {
            // Convert common.json#/definitions/Foo to common.schema.json#/$defs/Foo
            result[key] = value.replace("common.json#/definitions/", "common.schema.json#/$defs/");
        } else {
            result[key] = convertCommonRefs(value);
        }
    }

    return result;
}

async function extractZip(zipPath: string, targetDir: string): Promise<void> {
    console.log(`Extracting ZIP to: ${targetDir}`);
    mkdirSync(targetDir, { recursive: true });

    // if on windows, use powershell, otherwise exit the program
    const isWindows = process.platform === "win32";
    if (isWindows) {
        const cmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${targetDir}' -Force"`;
        console.log(`Executing: ${cmd}\n`);
        execSync(cmd, { stdio: "inherit" });
    } else {
        throw new Error("ZIP extraction is only implemented for Windows in this script.");
    }

    console.log(`Extraction complete`);
}

async function createMinimalManifest(assetsDir: string): Promise<void> {
    const manifest = {
        Group: "Test",
        Name: "Test"
    };
    await Bun.write(join(assetsDir, "manifest.json"), JSON.stringify(manifest, null, 2));
}

async function generateSchemas(workDir: string, assetsDir: string): Promise<void> {
    const serverJar = join(workDir, "HytaleServer", "Server", "HytaleServer.jar");

    if (!existsSync(serverJar)) {
        throw new Error(`Server JAR not found at: ${serverJar}`);
    }

    console.log(`\nRunning schema generation...`);

    try {
        // Run the server with schema generation flag
        const cmd = `java -jar "${serverJar}" --generate-schema --bare --assets "${assetsDir}"`;
        console.log(`Executing: ${cmd}\n`);
        execSync(cmd, { stdio: "inherit" });
    } catch (error) {
        // The server exits after generating schemas, which might cause a non-zero exit code
        // This is expected behavior, so we don't throw on error
        console.log(`\nSchema generation completed`);
    }
}

function cleanSchema(schema: JsonSchema): JsonSchema {
    // Properties that are common to all assets (only included in base.schema.json)
    const baseProperties = new Set(["Parent", "Tags"]);

    // Editor metadata properties to strip out
    const editorMetadataProperties = new Set([
        "$Title",
        "$Comment",
        "$Author",
        "$TODO",
        "$Position",
        "$FloatingFunctionNodes",
        "$Groups",
        "$WorkspaceID",
        "$NodeId",
        "$NodeEditorMetadata"
    ]);

    // Create cleaned schema with only asset-specific properties
    const cleaned: JsonSchema = {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        $id: schema.$id,
        title: schema.title,
        description: schema.description || `${schema.title} asset type`,
        type: "object",
        allOf: [
            { $ref: "base.schema.json" }
        ]
    };

    // Copy asset-specific properties (exclude base properties and editor metadata)
    if (schema.properties) {
        const assetProperties: Record<string, any> = {};
        for (const [key, prop] of Object.entries(schema.properties)) {
            // Skip base properties and editor metadata
            if (!baseProperties.has(key) && !editorMetadataProperties.has(key)) {
                // Deep clean each property, convert refs, and replace common patterns
                let cleanedProp = deepClean(convertCommonRefs(prop));
                cleanedProp = replaceColorPatterns(cleanedProp);
                cleanedProp = replaceNumberOrSpecialPatterns(cleanedProp);
                assetProperties[key] = cleanedProp;
            }
        }

        if (Object.keys(assetProperties).length > 0) {
            cleaned.properties = assetProperties;
        }
    }

    // Copy and clean $defs if they exist
    if (schema.$defs && Object.keys(schema.$defs).length > 0) {
        let cleanedDefs = deepClean(convertCommonRefs(schema.$defs));
        cleanedDefs = replaceColorPatterns(cleanedDefs);
        cleanedDefs = replaceNumberOrSpecialPatterns(cleanedDefs);
        cleaned.$defs = cleanedDefs;
    }

    return cleaned;
}

// Clean and process common.json to create common.schema.json with $defs
function cleanCommonSchema(schema: JsonSchema): JsonSchema {
    const cleaned: JsonSchema = {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        $id: "common.schema.json",
        title: "Common Definitions",
        description: "Shared type definitions used across Hytale asset schemas"
    };

    // Convert definitions to $defs (JSON Schema 2020-12 format)
    if (schema.definitions && Object.keys(schema.definitions).length > 0) {
        cleaned.$defs = {};
        for (const [key, def] of Object.entries(schema.definitions)) {
            // Deep clean each definition, convert refs, and replace common patterns
            let cleanedDef = deepClean(convertCommonRefs(def));
            cleanedDef = replaceColorPatterns(cleanedDef);
            cleanedDef = replaceNumberOrSpecialPatterns(cleanedDef);
            cleaned.$defs[key] = cleanedDef;
        }
    }

    return cleaned;
}

async function processGeneratedSchemas(assetsDir: string): Promise<void> {
    const schemaDir = join(assetsDir, "Schema");

    if (!existsSync(schemaDir)) {
        throw new Error(`Schema directory not found at: ${schemaDir}`);
    }

    console.log(`\nProcessing generated schemas...`);

    // Ensure output directory exists
    mkdirSync(schemasOutputDir, { recursive: true });

    // Load existing asset-types for updating locations
    const assetTypesPath = join(projectRoot, "src", "data", "asset-types.json");
    const assetTypes: Array<{ id: string; name: string; location: string }> = existsSync(assetTypesPath)
        ? JSON.parse(await Bun.file(assetTypesPath).text())
        : [];

    // Create a map for quick lookup
    const assetTypeMap = new Map(assetTypes.map(a => [a.id, a]));

    // Process each schema file
    const files = readdirSync(schemaDir).filter(f => f.endsWith(".json"));

    // First, process common.json to create shared definitions
    const commonSchemaPath = join(schemaDir, "common.json");
    if (existsSync(commonSchemaPath)) {
        console.log(`  Processing: common.json (shared definitions)`);
        try {
            const rawCommonSchema = JSON.parse(await Bun.file(commonSchemaPath).text()) as JsonSchema;
            const cleanedCommonSchema = cleanCommonSchema(rawCommonSchema);
            const commonOutputPath = join(schemasOutputDir, "common.schema.json");
            await Bun.write(commonOutputPath, JSON.stringify(cleanedCommonSchema, null, 2));

            const defCount = cleanedCommonSchema.$defs ? Object.keys(cleanedCommonSchema.$defs).length : 0;
            console.log(`    → Extracted ${defCount} shared definitions`);
        } catch (error) {
            console.error(`  ✗ Error processing common.json:`, error instanceof Error ? error.message : error);
        }
    }

    for (const file of files) {
        const schemaPath = join(schemaDir, file);
        console.log(`  Processing: ${file}`);

        try {
            const rawSchema = JSON.parse(await Bun.file(schemaPath).text()) as JsonSchema;

            // Skip common.json (already processed) and other.json
            if (file === "common.json" || file === "other.json") {
                if (file === "other.json") {
                    console.log(`    → Skipping reference schema`);
                }
                continue;
            }

            // Clean the schema
            const cleanedSchema = cleanSchema(rawSchema);

            // Write cleaned schema to output directory with .schema.json extension
            const outputFileName = file.replace(".json", ".schema.json");
            const outputPath = join(schemasOutputDir, outputFileName);
            await Bun.write(outputPath, JSON.stringify(cleanedSchema, null, 2));

            // Update asset-types.json with location information
            if (rawSchema.hytale && rawSchema.title) {
                const assetId = rawSchema.title;
                const location = rawSchema.hytale.path;
                const extension = rawSchema.hytale.extension;

                if (location) {
                    // Update existing entry or create new one
                    if (assetTypeMap.has(assetId)) {
                        const entry = assetTypeMap.get(assetId)!;
                        entry.location = location;
                    } else {
                        assetTypeMap.set(assetId, {
                            id: assetId,
                            name: assetId,
                            location: location
                        });
                    }

                    console.log(`    → Location: ${location}`);
                    console.log(`    → Extension: ${extension || ".json"}`);
                }
            }
        } catch (error) {
            console.error(`  ✗ Error processing ${file}:`, error instanceof Error ? error.message : error);
        }
    }

    // Write updated asset-types.json
    const updatedAssetTypes = Array.from(assetTypeMap.values());
    updatedAssetTypes.sort((a, b) => a.id.localeCompare(b.id));
    await Bun.write(assetTypesPath, JSON.stringify(updatedAssetTypes, null, 2));

    console.log(`Schemas processed and saved to: ${schemasOutputDir}`);
    console.log(`Asset types updated at: ${assetTypesPath}`);
}

async function main() {
    const startTime = Date.now();

    console.log("Hytale Asset Schema Generator\n");

    // Create temporary working directory
    const tempDir = join(__dirname, ".temp-schema-gen");
    if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true });
    }
    mkdirSync(tempDir, { recursive: true });

    try {
        // Step 1: Download server
        console.log("Downloading Hytale server...");
        const serverZipPath = await getServer("release");
        console.log(`Server ready at: ${serverZipPath}`);

        // Step 2: Extract server
        const serverDir = join(tempDir, "HytaleServer");
        await extractZip(serverZipPath, serverDir);

        // Step 3: Create assets directory with manifest
        const assetsDir = join(tempDir, "assets");
        mkdirSync(assetsDir, { recursive: true });
        await createMinimalManifest(assetsDir);
        console.log(`Created minimal asset pack at: ${assetsDir}`);

        // Step 4: Run schema generation
        await generateSchemas(tempDir, assetsDir);

        // Step 5: Process and clean schemas
        await processGeneratedSchemas(assetsDir);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\nComplete in ${duration}s`);
    } catch (error) {
        console.error("\nError:", error instanceof Error ? error.message : error);
        process.exit(1);
    } finally {
        // Cleanup
        console.log("\nCleaning up temporary files...");
        if (existsSync(tempDir)) {
            rmSync(tempDir, { recursive: true, force: true });
        }
    }
}

main().catch(console.error)