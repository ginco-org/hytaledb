# Extractor

This dir contains scripts for extracting data from hytale game files to generate the contents of the /src/data folder.


## TODO

asset schema gen:
- clean out hytaleCommonAsset, hytale, enumDescriptions, markdownEnumDescriptions

figure out what hytale.inheritsProperty does

but definitely all hytale type annotation like:
"hytale": {
    "type": "number"
},
are useless and can be removed


- references to common.json like "$ref": "common.json#/definitions/GatheringConfig" exist, but cant resolve since we dont have the common.json
- some properties have nested base properties again
- there probably are properties that we can make into refs to reduce duplication, like a ref for Position{X, Y, Z} etc