// com.hypixel.hytale.server.core.asset.AssetRegistryLoader defined the locations of asset types
// com.hypixel.hytale.server.core.asset.type contains the asset type definitions

import { getServer } from "./hytale"

async function main() {

    const path = await getServer("release") // downloads and returns path to server folder (or uses cached version)

    // unzip zip at path
    // unzip Assets.zip inside it

}

main().catch(console.error)