---
title: Server Launch Arguments
description: Complete reference of HytaleServer command-line arguments and launch options
---

# Server Launch Arguments

Complete reference of all command-line arguments available when launching the HytaleServer.

## General Options

### `--help`
Prints the help message with all available options.

### `--version`
Prints version information including the build version, patchline, and environment.

### `--bare`
Runs the server in bare mode without:
- Loading worlds
- Binding to ports
- Creating directories

**Note:** Plugins will still be loaded and may not respect this flag.

## Asset Management

### `--assets` (alias: `--assets`)
Specifies the asset directory path.

**Type:** Directory or ZIP file  
**Default:** `../HytaleAssets`  
**Example:** `--assets "C:\path\to\HytaleAssets"`

### `--generate-schema`
Generates JSON schemas for all registered asset types, saves them to the assets directory's `Schema/` subdirectory, and then exits.

**Requirements:**
- Valid asset pack with writable `manifest.json`
- Asset pack must not be immutable (read-only)

**Output Location:** `{AssetDirectory}/Schema/`

### `--validate-assets`
Causes the server to exit with an error code if any assets are invalid.

### `--validate-prefabs` (optional argument)
Validates prefabs and exits with an error code if any are invalid.

**Optional Value:** Comma-separated list of `ValidationOption` values

### `--validate-world-gen`
Validates default world generation and exits with an error code if it's invalid.

### `--shutdown-after-validate`
Automatically shuts down the server after asset and/or prefab validation completes.

### `--disable-file-watcher`
Disables the file watcher that monitors asset files for changes.

### `--disable-asset-compare`
Disables asset comparison functionality.

## Network Configuration

### `--bind`, `-b`
Specifies the address and port to listen on.

**Type:** Socket address (host:port or just port)  
**Default:** `5520`  
**Examples:**
- `--bind 5520` (localhost:5520)
- `--bind localhost:8080`
- `--bind 192.168.1.100:5520`

Can specify multiple addresses separated by commas.

### `--transport`, `-t`
Specifies the network transport type.

**Type:** `QUIC` | `TCP`  
**Default:** `QUIC`  
**Example:** `--transport TCP`

## Logging

### `--log`
Sets the logger level for the server and specific modules.

**Format:** `--log LEVEL` or `--log MODULE:LEVEL`  
**Levels:** `ALL`, `FINEST`, `FINER`, `FINE`, `CONFIG`, `INFO`, `WARNING`, `SEVERE`, `OFF`

**Examples:**
- `--log INFO` (set all loggers to INFO)
- `--log com.hypixel:DEBUG` (specific module at DEBUG level)
- `--log INFO,com.hypixel.hytale:WARNING` (multiple settings)

## Prefab & Cache

### `--prefab-cache`
Specifies the prefab cache directory for immutable assets.

**Type:** Directory path  
**Example:** `--prefab-cache "C:\path\to\cache"`

### `--disable-cpb-build`
Disables building of compact prefab buffers.

## World Management

### `--universe`
Specifies the universe (world data) directory.

**Type:** Directory path  
**Example:** `--universe "C:\path\to\universe"`

### `--world-gen`
Specifies the world generation directory.

**Type:** Directory path  
**Example:** `--world-gen "C:\path\to\worldgen"`

### `--migrations`
Specifies migrations to run with format `name=path`.

**Format:** `--migrations migration1=path1,migration2=path2`  
**Requires:** `--migrate-worlds` option

### `--migrate-worlds`
Specifies which worlds to migrate (requires `--migrations`).

**Format:** `--migrate-worlds world1,world2,world3`

## Plugin Management

### `--mods`
Specifies additional mod/plugin directories to load from.

**Type:** Directory path (comma-separated for multiple)  
**Example:** `--mods "C:\mods\mod1","C:\mods\mod2"`

### `--accept-early-plugins`
Acknowledges that loading early plugins is unsupported and may cause stability issues.

**Required to use:** `--early-plugins`

### `--early-plugins`
Specifies additional early plugin directories to load from.

**Type:** Directory path (comma-separated for multiple)  
**Requires:** `--accept-early-plugins`  
**Example:** `--early-plugins "C:\plugins\early" --accept-early-plugins`

## Backup & Storage

### `--backup`
Enables automatic backups.

**Requires:** `--backup-dir` option

### `--backup-frequency`
Sets backup frequency in minutes.

**Type:** Integer  
**Default:** `30`  
**Example:** `--backup-frequency 60`

### `--backup-dir`
Specifies the backup directory.

**Type:** Directory path  
**Required if:** `--backup` is enabled  
**Example:** `--backup-dir "C:\backups"`

### `--backup-max-count`
Maximum number of backups to keep.

**Type:** Integer  
**Default:** `5`  
**Example:** `--backup-max-count 10`

## Singleplayer & Authentication

### `--singleplayer`
Runs the server in singleplayer mode.

### `--owner-name`
Specifies the owner name for singleplayer mode.

**Type:** String  
**Example:** `--owner-name "PlayerName"`

### `--owner-uuid`
Specifies the owner UUID for singleplayer mode.

**Type:** UUID  
**Example:** `--owner-uuid "12345678-1234-5678-1234-567812345678"`

### `--auth-mode`
Sets the authentication mode.

**Options:** `AUTHENTICATED` | `OFFLINE` | `INSECURE`  
**Default:** `AUTHENTICATED`  
**Example:** `--auth-mode OFFLINE`

### `--session-token`
Provides a session token for the Session Service API.

**Type:** String

### `--identity-token`
Provides an identity token (JWT) for authentication.

**Type:** String

## System & Development

### `--event-debug`
Enables event debugging output.

### `--force-network-flush`
Forces network flush on each update.

**Type:** Boolean  
**Default:** `true`  
**Example:** `--force-network-flush false`

### `--disable-sentry`
Disables Sentry error reporting.

### `--client-pid`
Specifies the client process ID (used for launcher integration).

**Type:** Integer  
**Example:** `--client-pid 1234`

### `--boot-command`
Runs commands on server boot. Multiple commands are executed synchronously in order.

**Type:** String (comma-separated for multiple)  
**Example:** `--boot-command "say Server starting","/op PlayerName"`

### `--allow-op`
Allows operators to use `/op` on themselves.