// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
	integrations: [
		react(),
		starlight({
			title: 'HytaleDB',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/ginco-org/hytaledb' }],
			sidebar: [
				{
					label: 'Database',
					items: [
						{ label: 'Asset Types', link: '/database/asset-types' },
						{ label: 'Blocks', link: '/database/blocks' },
					],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Example Guide', slug: 'guides/example' },
					],
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
			],
		}),
	],
});
