// go through /src/data/versions.json and verify the listed versions are accessible,
// then download them and calculate their hashes and add those to the file

import { createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getTokens, getDownloadUrl } from "./hytale";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSIONS_PATH = join(__dirname, "../src/data/versions.json");
const DOWNLOADS_PATH = join(__dirname, "downloads");

interface Version {
  id: string;
  patchline: string;
  version: string;
  date: string;
  commit: string;
  size: number;
  sha256?: string;
}

async function downloadAndHash(
  version: Version,
  accessToken: string
): Promise<{ size: number; sha256: string } | null> {
  const downloadPath = `builds/${version.patchline}/${version.version}.zip`;

  try {
    const signedUrl = await getDownloadUrl(downloadPath, accessToken);

    console.log(`  Downloading ${version.version}...`);

    const response = await fetch(signedUrl);
    if (!response.ok) {
      console.log(`  Failed to download: ${response.status}`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const data = new Uint8Array(buffer);

    const hash = createHash("sha256").update(data).digest("hex");

    if (!existsSync(DOWNLOADS_PATH)) {
      mkdirSync(DOWNLOADS_PATH, { recursive: true });
    }
    const filePath = join(DOWNLOADS_PATH, `${version.patchline}-${version.version}.zip`);
    writeFileSync(filePath, data);
    console.log(`  Saved to ${filePath}`);

    return { size: data.length, sha256: hash };
  } catch (e) {
    console.log(`  Error: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

async function verifyVersion(
  version: Version,
  accessToken: string
): Promise<{ exists: boolean; size?: number }> {
  const downloadPath = `builds/${version.patchline}/${version.version}.zip`;

  try {
    const signedUrl = await getDownloadUrl(downloadPath, accessToken);

    const response = await fetch(signedUrl, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
    });

    if (response.status === 206 || response.status === 200) {
      const contentRange = response.headers.get("content-range");
      const size = contentRange ? parseInt(contentRange.split("/")[1]) : undefined;
      return { exists: true, size };
    }

    return { exists: false };
  } catch {
    return { exists: false };
  }
}

async function main() {
  const versions: Version[] = JSON.parse(readFileSync(VERSIONS_PATH, "utf-8"));
  console.log(`Loaded ${versions.length} versions from versions.json\n`);

  const tokens = await getTokens();
  console.log("Authenticated!\n");

  const needsHash = versions.filter((v) => !v.sha256);
  console.log(`Versions with hash: ${versions.length - needsHash.length}`);
  console.log(`Versions needing hash: ${needsHash.length}\n`);

  // Verify all versions exist
  console.log("=== Verifying versions ===\n");
  for (const version of versions) {
    process.stdout.write(`${version.patchline}/${version.version}: `);
    const result = await verifyVersion(version, tokens.access_token);

    if (result.exists) {
      console.log(`OK (${((result.size || 0) / 1024 / 1024).toFixed(2)} MB)`);
      if (result.size && result.size !== version.size) {
        version.size = result.size;
      }
    } else {
      console.log("NOT FOUND");
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  // Download and hash versions that need it
  if (needsHash.length > 0) {
    console.log("\n=== Downloading and hashing ===\n");

    for (const version of needsHash) {
      console.log(`${version.patchline}/${version.version}:`);
      const result = await downloadAndHash(version, tokens.access_token);

      if (result) {
        version.size = result.size;
        version.sha256 = result.sha256;
        console.log(`  SHA256: ${result.sha256}`);
        console.log(`  Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
      }

      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  writeFileSync(VERSIONS_PATH, JSON.stringify(versions, null, 2) + "\n");
  console.log("\nSaved updated versions.json");
}

main().catch(console.error);
