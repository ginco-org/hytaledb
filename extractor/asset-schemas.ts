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
                assetProperties[key] = prop;
            }
        }

        if (Object.keys(assetProperties).length > 0) {
            cleaned.properties = assetProperties;
        }
    }

    // Copy $defs if they exist
    if (schema.$defs && Object.keys(schema.$defs).length > 0) {
        cleaned.$defs = schema.$defs;
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

    for (const file of files) {
        const schemaPath = join(schemaDir, file);
        console.log(`  Processing: ${file}`);

        try {
            const rawSchema = JSON.parse(await Bun.file(schemaPath).text()) as JsonSchema;

            // Skip common.json and other.json - these are reference schemas
            if (file === "common.json" || file === "other.json") {
                console.log(`    → Skipping reference schema`);
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