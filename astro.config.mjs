// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import starlightThemeRapide from 'starlight-theme-rapide';

// https://astro.build/config
export default defineConfig({
	integrations: [
		react(),
		tailwind({ applyBaseStyles: false }),
		starlight({
			title: 'HytaleDB',
			plugins: [starlightThemeRapide()],
			customCss: ['./src/styles/tailwind.css'],
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/ginco-org/hytaledb' }],
			tableOfContents: false,
			sidebar: [
				{
					label: 'Database',
					items: [
						{ label: 'Asset Types', link: '/database/asset-types' },
						{ label: 'Blocks', link: '/database/blocks' },
						{ label: 'Server Versions', link: '/database/versions' },
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
