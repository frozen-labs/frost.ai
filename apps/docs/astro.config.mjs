// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Frost AI',
			description: 'Open-source billing and analytics engine for AI companies',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/frozen-labs/frost' }
			],
			editLink: {
				baseUrl: 'https://github.com/frozen-labs/frost/edit/main/apps/docs/',
			},
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Quick Start', slug: 'getting-started/quick-start' },
						{ label: 'Installation', slug: 'getting-started/installation' },
					],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Development', slug: 'guides/development' },
					],
				},
				{
					label: 'API Reference',
					items: [
						{ label: 'Overview', slug: 'api/overview' },
						{
							label: 'Endpoints',
							items: [
								{ label: 'Health Check', slug: 'api/endpoints/health' },
								{ label: 'Token Tracking', slug: 'api/endpoints/tokens' },
								{ label: 'Signal Tracking', slug: 'api/endpoints/signals' },
								{ label: 'Customer Management', slug: 'api/endpoints/customers' },
							],
						},
					],
				},
				{
					label: 'Troubleshooting',
					slug: 'troubleshooting',
				},
			],
		}),
	],
});
