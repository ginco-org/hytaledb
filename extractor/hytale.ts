// Script to download a Hytale server release

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

declare global {
  interface ImportMeta {
    main: boolean;
  }
}

const OAUTH_BASE_URL = "https://oauth.accounts.hytale.com/oauth2";
const GAME_ASSETS_URL = "https://account-data.hytale.com/game-assets";
const CLIENT_ID = "hytale-downloader";

// Token cache file path (in the same directory as this script)
const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_CACHE_PATH = join(__dirname, ".token-cache.json");

interface CachedToken {
  refresh_token: string;
  cached_at: number;
}

function loadCachedToken(): string | null {
  try {
    if (existsSync(TOKEN_CACHE_PATH)) {
      const data = JSON.parse(readFileSync(TOKEN_CACHE_PATH, "utf-8")) as CachedToken;
      console.log("Found cached refresh token");
      return data.refresh_token;
    }
  } catch (e) {
    console.log("Failed to load cached token:", e instanceof Error ? e.message : e);
  }
  return null;
}

function saveCachedToken(refreshToken: string): void {
  try {
    const data: CachedToken = {
      refresh_token: refreshToken,
      cached_at: Date.now(),
    };
    writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(data, null, 2));
    console.log("Saved refresh token to cache");
  } catch (e) {
    console.log("Failed to save token cache:", e instanceof Error ? e.message : e);
  }
}

interface DeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface TokenErrorResponse {
  error: string;
  error_description?: string;
}

interface VersionInfo {
  version: string;
  download_url: string;
  sha256: string;
  [key: string]: unknown;
}

interface DownloadUrlResponse {
  url: string;
}

async function requestDeviceAuth(): Promise<DeviceAuthResponse> {
  const response = await fetch(`${OAUTH_BASE_URL}/device/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      scope: "offline auth:downloader",
    }),
  });

  if (!response.ok) {
    throw new Error(`Device auth failed: ${response.status}`);
  }

  return response.json();
}

async function pollForToken(
  deviceCode: string,
  interval: number,
  expiresIn: number
): Promise<TokenResponse> {
  const startTime = Date.now();
  const expiresAt = startTime + expiresIn * 1000;

  while (Date.now() < expiresAt) {
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));

    const response = await fetch(`${OAUTH_BASE_URL}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: deviceCode,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return data as TokenResponse;
    }

    const error = data as TokenErrorResponse;
    if (error.error === "authorization_pending") {
      continue;
    } else if (error.error === "slow_down") {
      interval += 5;
      continue;
    } else {
      throw new Error(`Token request failed: ${error.error}`);
    }
  }

  throw new Error("Device authorization expired");
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(`${OAUTH_BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json();
}

interface SignedUrlResponse {
  url: string;
}

async function getSignedUrl(
  path: string,
  accessToken: string
): Promise<string> {
  const response = await fetch(`${GAME_ASSETS_URL}/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to get signed URL for ${path}: ${response.status}`);
  }

  const data: SignedUrlResponse = await response.json();
  return data.url;
}

async function getVersionInfo(
  patchline: string,
  accessToken: string
): Promise<VersionInfo> {
  // First get the signed URL from the API
  const signedUrl = await getSignedUrl(`version/${patchline}.json`, accessToken);

  // Then fetch the actual version info from the signed URL
  const response = await fetch(signedUrl);

  if (!response.ok) {
    throw new Error(`Failed to get version info from signed URL: ${response.status}`);
  }

  return response.json();
}

async function getDownloadUrl(
  downloadPath: string,
  accessToken: string
): Promise<string> {
  const response = await fetch(`${GAME_ASSETS_URL}/${downloadPath}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to get download URL: ${response.status}`);
  }

  const data: DownloadUrlResponse = await response.json();
  return data.url;
}

export interface HytaleServerDownloadOptions {
  patchline: string;
  refreshToken?: string;
  onDeviceAuth?: (auth: DeviceAuthResponse) => void;
}

export interface HytaleServerDownloadResult {
  versionInfo: VersionInfo;
  downloadUrl: string;
  tokens: TokenResponse;
}

export async function getHytaleServer(
  options: HytaleServerDownloadOptions
): Promise<HytaleServerDownloadResult> {
  let tokens: TokenResponse;

  if (options.refreshToken) {
    tokens = await refreshAccessToken(options.refreshToken);
  } else {
    const deviceAuth = await requestDeviceAuth();

    if (options.onDeviceAuth) {
      options.onDeviceAuth(deviceAuth);
    } else {
      console.log(`Please visit: ${deviceAuth.verification_uri_complete}`);
      console.log(`Or go to ${deviceAuth.verification_uri} and enter code: ${deviceAuth.user_code}`);
    }

    tokens = await pollForToken(
      deviceAuth.device_code,
      deviceAuth.interval,
      deviceAuth.expires_in
    );
  }

  const versionInfo = await getVersionInfo(options.patchline, tokens.access_token);
  const downloadUrl = await getDownloadUrl(versionInfo.download_url, tokens.access_token);

  return {
    versionInfo,
    downloadUrl,
    tokens,
  };
}

/**
 * Get authenticated tokens, using cached refresh token if available.
 * Falls back to device auth flow if no cached token or if refresh fails.
 */
export async function getTokens(): Promise<TokenResponse> {
  const cachedRefreshToken = loadCachedToken();

  if (cachedRefreshToken) {
    try {
      const tokens = await refreshAccessToken(cachedRefreshToken);
      saveCachedToken(tokens.refresh_token);
      return tokens;
    } catch {
      // Fall through to device auth
    }
  }

  const deviceAuth = await requestDeviceAuth();
  console.log(`\nVisit: ${deviceAuth.verification_uri_complete}`);
  console.log(`Or enter code: ${deviceAuth.user_code}\n`);

  const tokens = await pollForToken(
    deviceAuth.device_code,
    deviceAuth.interval,
    deviceAuth.expires_in
  );
  saveCachedToken(tokens.refresh_token);
  return tokens;
}

export {
  requestDeviceAuth,
  pollForToken,
  refreshAccessToken,
  getVersionInfo,
  getDownloadUrl,
  getSignedUrl,
  loadCachedToken,
  saveCachedToken,
};

export type { TokenResponse, VersionInfo, DeviceAuthResponse };

// Run directly to test authentication and get current versions
if (import.meta.main) {
  async function main() {
    console.log("Testing Hytale API connection...\n");

    const tokens = await getTokens();
    console.log("Authenticated!\n");

    for (const patchline of ["release", "pre-release"]) {
      try {
        const info = await getVersionInfo(patchline, tokens.access_token);
        console.log(`${patchline}: ${info.version}`);
        console.log(`  download_url: ${info.download_url}`);
        console.log(`  sha256: ${info.sha256}\n`);
      } catch (e) {
        console.log(`${patchline}: ${e instanceof Error ? e.message : e}\n`);
      }
    }
  }

  main().catch(console.error);
}
