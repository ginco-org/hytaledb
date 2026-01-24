import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

// Schema for block data
const blockSchema = z.object({
	id: z.string(),
	name: z.string(),
});

// Schema for asset types
const assetTypeSchema = z.object({
	id: z.string(),
	name: z.string(),
	location: z.string(),
});

// Schema for server versions
const versionSchema = z.object({
	id: z.string(),
	patchline: z.enum(['release', 'pre-release']),
	version: z.string(),
	date: z.string(),
	commit: z.string(),
	size: z.number(),
	sha256: z.string(),
});

export const collections = {
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
	blocks: defineCollection({
		loader: file('src/data/blocks.json'),
		schema: blockSchema,
	}),
	assetTypes: defineCollection({
		loader: file('src/data/asset-types.json'),
		schema: assetTypeSchema,
	}),
	versions: defineCollection({
		loader: file('src/data/versions.json'),
		schema: versionSchema,
	}),
};
