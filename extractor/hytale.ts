// Script to download a Hytale server release from Maven

import { existsSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

declare global {
  interface ImportMeta {
    main: boolean;
  }
}

const MAVEN_BASE_URL = "https://maven.hytale.com/release/com/hypixel/hytale/Server";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface VersionInfo {
  version: string;
  [key: string]: unknown;
}

/**
 * Fetches the latest release version from Maven metadata.
 */
export async function fetchLatestVersion(): Promise<string> {
  const response = await fetch(`${MAVEN_BASE_URL}/maven-metadata.xml`);
  if (!response.ok) {
    throw new Error(`Failed to fetch Maven metadata: ${response.status}`);
  }

  const text = await response.text();
  const releaseMatch = text.match(/<release>([^<]+)<\/release>/);
  const latestMatch = text.match(/<latest>([^<]+)<\/latest>/);
  const version = releaseMatch?.[1] ?? latestMatch?.[1];

  if (!version) {
    throw new Error("Could not determine latest version from Maven metadata");
  }

  return version;
}

/**
 * Fetches all available versions from Maven metadata.
 */
export async function fetchAllVersions(): Promise<string[]> {
  const response = await fetch(`${MAVEN_BASE_URL}/maven-metadata.xml`);
  if (!response.ok) {
    throw new Error(`Failed to fetch Maven metadata: ${response.status}`);
  }

  const text = await response.text();
  const versions: string[] = [];
  const versionRegex = /<version>([^<]+)<\/version>/g;
  let match;
  while ((match = versionRegex.exec(text)) !== null) {
    versions.push(match[1]);
  }
  return versions;
}

/**
 * Returns the Maven URL for a specific server version JAR.
 */
export function getJarUrl(version: string): string {
  return `${MAVEN_BASE_URL}/${version}/Server-${version}.jar`;
}

/**
 * Downloads a Hytale server JAR or returns cached path.
 * @param patchline - Label for caching (e.g. "release")
 * @param version - Specific version to download. If not specified, uses latest.
 * @returns Path to the downloaded/cached server JAR file
 */
export async function getServer(patchline: string, version?: string): Promise<string> {
  const cacheDir = join(__dirname, "downloads");

  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  const selectedVersion = version || await fetchLatestVersion();
  const serverJarPath = join(cacheDir, `${patchline}-${selectedVersion}.jar`);

  if (existsSync(serverJarPath)) {
    console.log(`Using cached server JAR: ${serverJarPath}`);
    return serverJarPath;
  }

  console.log(`\nDownloading HytaleServer ${patchline}@${selectedVersion}...`);
  const jarUrl = getJarUrl(selectedVersion);

  try {
    const response = await fetch(jarUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const fileStream = createWriteStream(serverJarPath);
    await pipeline(response.body, fileStream);

    console.log(`Downloaded to: ${serverJarPath}\n`);
    return serverJarPath;
  } catch (error) {
    if (existsSync(serverJarPath)) {
      rmSync(serverJarPath, { force: true });
    }
    throw error;
  }
}

// Run directly to list available versions
if (import.meta.main) {
  async function main() {
    console.log("Fetching Hytale server versions from Maven...\n");

    const latest = await fetchLatestVersion();
    console.log(`Latest version: ${latest}\n`);

    const versions = await fetchAllVersions();
    console.log(`All versions (${versions.length}):`);
    for (const v of versions) {
      console.log(`  ${v}`);
    }
  }

  main().catch(console.error);
}
