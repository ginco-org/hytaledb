# Extractor

This dir contains scripts for extracting data from hytale game files to generate the contents of the /src/data folder.

## Running

`bun run extractor/asset-schemas.ts`

### Schema Cleanup

The script performs the following cleanup on generated schemas:

**Metadata Removal:**
- Removes Hytale-specific metadata: `hytale`, `hytaleCommonAsset`, `hytaleSchemaTypeField`, `hytaleAssetRef`
- Removes editor metadata properties: `$Title`, `$Comment`, `$Author`, `$TODO`, `$Position`, etc.
- Removes empty `enumDescriptions` and `markdownEnumDescriptions` arrays
- Removes duplicate `markdownDescription` when identical to `description`
- Removes generic unhelpful titles (e.g., `"title": "Map"`)
- Removes empty `propertyNames: {}` objects

**Pattern Simplification:**
- Simplifies nested `anyOf` patterns for nullable types
- Converts `common.json#/definitions/` refs to `common.schema.json#/$defs/`
- Creates `common.schema.json` with all shared type definitions

**Shared Type Extraction:**
- Replaces nullable number/Infinity/NaN patterns with `$ref: "base.schema.json#/$defs/NullableNumberOrSpecial"`
- Replaces non-nullable number/Infinity/NaN patterns with `$ref: "base.schema.json#/$defs/NumberOrSpecial"`
- Replaces Color RGB patterns (hex/rgb()) with `$ref: "base.schema.json#/$defs/ColorRGB"`

**Shared Definitions in base.schema.json:**
- `NumberOrSpecial` - A number that can also be Infinity or NaN
- `NullableNumberOrSpecial` - A number that can be Infinity, NaN, or null
- `ColorRGB` - A color in hex (#RGB or #RRGGBB) or rgb() format


## Notes

**`hytaleSchemaTypeField`**: This is a discriminator for polymorphic types (e.g., `{ property: "Type", values: ["And", "BlockSet", ...] }`). Converting to JSON Schema `if-then-else` patterns would be complex. Currently removed since the schema still validates structure.

**`hytale.inheritsProperty`**: Hytale-specific runtime inheritance behavior. Removed as it's not relevant for schema validation.