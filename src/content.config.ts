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
};
