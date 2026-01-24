---
title: Hytale HTTP APIs
description: Reference documentation for Hytale's HTTP APIs including OAuth and Game Assets
---

Hytale uses several HTTP APIs for authentication and distributing game assets. This document covers the known endpoints and how to use them.

## Base URLs

| Service | URL | Purpose |
|---------|-----|---------|
| OAuth | `https://oauth.accounts.hytale.com/oauth2` | Authentication |
| Game Assets | `https://account-data.hytale.com/game-assets` | Server builds and version info |
| Accounts | `https://accounts.hytale.com` | Account management |

## Authentication

The Game Assets API requires OAuth 2.0 authentication using the Device Authorization flow. This is the same flow used by the official Hytale downloader.

### Device Authorization Flow

1. **Request device code**

```http
POST https://oauth.accounts.hytale.com/oauth2/device/auth
Content-Type: application/x-www-form-urlencoded

client_id=hytale-downloader&scope=offline auth:downloader
```

Response:
```json
{
  "device_code": "ory_dc_...",
  "user_code": "ABC12345",
  "verification_uri": "https://oauth.accounts.hytale.com/oauth2/device/verify",
  "verification_uri_complete": "https://oauth.accounts.hytale.com/oauth2/device/verify?user_code=ABC12345",
  "expires_in": 600,
  "interval": 5
}
```

2. **User visits the verification URL** and enters the user code to authorize.

3. **Poll for token**

```http
POST https://oauth.accounts.hytale.com/oauth2/token
Content-Type: application/x-www-form-urlencoded

client_id=hytale-downloader&grant_type=urn:ietf:params:oauth:grant-type:device_code&device_code={device_code}
```

Poll every `interval` seconds until authorization completes. Response:
```json
{
  "access_token": "...",
  "refresh_token": "ory_rt_...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

4. **Refresh token** (for subsequent requests)

```http
POST https://oauth.accounts.hytale.com/oauth2/token
Content-Type: application/x-www-form-urlencoded

client_id=hytale-downloader&grant_type=refresh_token&refresh_token={refresh_token}
```

## Game Assets API

All Game Assets API requests require a Bearer token in the Authorization header.

### Patchlines

The API uses "patchlines" to distinguish between release channels:

| Patchline | Description |
|-----------|-------------|
| `release` | Stable release builds |
| `pre-release` | Pre-release/beta builds |

### Version Format

Versions follow the format: `YYYY.MM.DD-{commit_hash}`

Example: `2026.01.24-6e2d4fc36`

- Date portion indicates the build date
- Commit hash identifies the source code version

### Get Current Version Info

Returns version information for a patchline.

```http
GET https://account-data.hytale.com/game-assets/version/{patchline}.json
Authorization: Bearer {access_token}
```

Response (signed URL):
```json
{
  "url": "https://ht-game-assets-release...r2.cloudflarestorage.com/version/{patchline}.json?X-Amz-..."
}
```

Fetch the signed URL to get the actual version info:
```json
{
  "version": "2026.01.24-6e2d4fc36",
  "download_url": "builds/release/2026.01.24-6e2d4fc36.zip",
  "sha256": "77e8b08465819dc46a03af1377126c3202fae3cd11bbd11afd9b8b2386436b16"
}
```

### Download a Build

Get a signed URL for downloading a specific build.

```http
GET https://account-data.hytale.com/game-assets/{download_url}
Authorization: Bearer {access_token}
```

Where `{download_url}` is the path from the version info (e.g., `builds/release/2026.01.24-6e2d4fc36.zip`).

Response:
```json
{
  "url": "https://ht-game-assets-release...r2.cloudflarestorage.com/builds/release/2026.01.24-6e2d4fc36.zip?X-Amz-..."
}
```

The signed URL can be used to download the build directly (no auth required, but URL expires after ~6 hours).

### Historical Versions

The API will generate signed URLs for any path that matches the expected format, but only versions that actually exist on R2 storage can be downloaded. Requests for non-existent versions will get a signed URL from the API, but R2 returns 404.

**Important:** There is no API endpoint to list available versions. Versions must be tracked manually.

See the [Server Versions](/database/versions/) database for a list of known versions with their SHA256 hashes.

## Storage

Game assets are stored on Cloudflare R2 storage at `ht-game-assets-release.*.r2.cloudflarestorage.com`. All download URLs are pre-signed S3-compatible URLs that expire after approximately 6 hours.
