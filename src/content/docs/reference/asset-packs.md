---
title: Asset Packs
description: Documentation for Hytale Asset Packs.
---

Hytale is driven by its assets, and Asset Packs are one way to define those assets. Asset Packs are collections of assets that can be used to add new content to the game, such as blocks, items, creatures, and more.

Asset Packs can be edited and created with the in-game Asset Editor, or by manually creating the necessary files and folder structure.

They are managed by the server, and get automatically downloaded by clients when they connect to a server that uses them.

An Asset Pack is a directory or zip file that contains a specific structure of files and folders. The main components of an Asset Pack include:

## Manifest File

Every Asset Pack must contain a `manifest.json` file at its root. This file defines the basic information about the Asset Pack, such as its name, version, author, and description.

```json
{
  "Group": "My Group",
  "Name": "Pack Example",
  "Version": "1.0.0",
  "Description": "An Example Asset Pack",
  "Authors": [
    {
      "Name": "Me",
      "Email": "",
      "Url": ""
    }
  ],
  "Website": "",
  "Dependencies": {},
  "OptionalDependencies": {},
  "LoadBefore": {},
  "DisabledByDefault": false,
  "IncludesAssetPack": false,
  "SubPlugins": []
}
```

## Common Folder

## Server Folder

## Asset Files

Asset files are typically stored in JSON format. The filename must start with a uppercase letter, and after each underscore, the next letter must also be uppercase (e.g., `My_Asset_File.json`).

TODO: link to asset types reference