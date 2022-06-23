import type { AddressInfo } from 'net';
import type { ViteDevServer } from 'vite';
import {
	AstroConfig,
	AstroIntegration,
	AstroRenderer,
	BuildConfig,
	RouteData,
} from '../@types/astro.js';
import ssgAdapter from '../adapter-ssg/index.js';
import type { SerializedSSRManifest } from '../core/app/types';
import type { PageBuildData } from '../core/build/types';
import { mergeConfig } from '../core/config.js';
import type { ViteConfigWithSSR } from '../core/create-vite.js';
import { isBuildingToSSR } from '../core/util.js';

type Hooks<
	Hook extends keyof AstroIntegration['hooks'],
	Fn = AstroIntegration['hooks'][Hook]
> = Fn extends (...args: any) => any ? Parameters<Fn>[0] : never;

export async function runHookConfigSetup({
	config: _config,
	command,
}: {
	config: AstroConfig;
	command: 'dev' | 'build';
}): Promise<AstroConfig> {
	if (_config.adapter) {
		_config.integrations.push(_config.adapter);
	}

	let updatedConfig: AstroConfig = { ..._config };
	for (const integration of _config.integrations) {
		/**
		 * By making integration hooks optional, Astro can now ignore null or undefined Integrations
		 * instead of giving an internal error most people can't read
		 *
		 * This also enables optional integrations, e.g.
		 * ```ts
		 * integration: [
		 *   // Only run `compress` integration in production environments, etc...
		 *   import.meta.env.production ? compress() : null
		 * ]
		 * ```
		 */
		if (integration?.hooks?.['astro:config:setup']) {
			const hooks: Hooks<'astro:config:setup'> = {
				config: updatedConfig,
				command,
				addRenderer(renderer: AstroRenderer) {
					updatedConfig._ctx.renderers.push(renderer);
				},
				addPageExtensions: (exts: string|string[]) => {
					const ext = Array.isArray(exts) ? exts : [exts];
					updatedConfig._ctx.pageExtensions.push(...ext);
				},
				injectScript: (stage, content) => {
					updatedConfig._ctx.scripts.push({ stage, content });
				},
				updateConfig: (newConfig) => {
					updatedConfig = mergeConfig(updatedConfig, newConfig) as AstroConfig;
				},
				injectRoute: (injectRoute) => {
					updatedConfig._ctx.injectedRoutes.push(injectRoute);
				},
			};
			// Semi-private `addPageExtension` hook
			Object.defineProperty(hooks, 'addPageExtension', {
				value: (...input: (string | string[])[]) => {
					const exts = (input.flat(Infinity) as string[]).map(
						(ext) => `.${ext.replace(/^\./, '')}`
					);
					updatedConfig._ctx.pageExtensions.push(...exts);
				},
				writable: false,
				enumerable: false,
			});
			await integration.hooks['astro:config:setup'](hooks);
		}
	}
	return updatedConfig;
}

export async function runHookConfigDone({ config }: { config: AstroConfig }) {
	for (const integration of config.integrations) {
		if (integration?.hooks?.['astro:config:done']) {
			await integration.hooks['astro:config:done']({
				config,
				setAdapter(adapter) {
					if (config._ctx.adapter && config._ctx.adapter.name !== adapter.name) {
						throw new Error(
							`Adapter already set to ${config._ctx.adapter.name}. You can only have one adapter.`
						);
					}
					config._ctx.adapter = adapter;
				},
			});
		}
	}
	// Call the default adapter
	if (!config._ctx.adapter) {
		const integration = ssgAdapter();
		config.integrations.push(integration);
		if (integration?.hooks?.['astro:config:done']) {
			await integration.hooks['astro:config:done']({
				config,
				setAdapter(adapter) {
					config._ctx.adapter = adapter;
				},
			});
		}
	}
}

export async function runHookServerSetup({
	config,
	server,
}: {
	config: AstroConfig;
	server: ViteDevServer;
}) {
	for (const integration of config.integrations) {
		if (integration?.hooks?.['astro:server:setup']) {
			await integration.hooks['astro:server:setup']({ server });
		}
	}
}

export async function runHookServerStart({
	config,
	address,
}: {
	config: AstroConfig;
	address: AddressInfo;
}) {
	for (const integration of config.integrations) {
		if (integration?.hooks?.['astro:server:start']) {
			await integration.hooks['astro:server:start']({ address });
		}
	}
}

export async function runHookServerDone({ config }: { config: AstroConfig }) {
	for (const integration of config.integrations) {
		if (integration?.hooks?.['astro:server:done']) {
			await integration.hooks['astro:server:done']();
		}
	}
}

export async function runHookBuildStart({
	config,
	buildConfig,
}: {
	config: AstroConfig;
	buildConfig: BuildConfig;
}) {
	for (const integration of config.integrations) {
		if (integration?.hooks?.['astro:build:start']) {
			await integration.hooks['astro:build:start']({ buildConfig });
		}
	}
}

export async function runHookBuildSetup({
	config,
	vite,
	pages,
	target,
}: {
	config: AstroConfig;
	vite: ViteConfigWithSSR;
	pages: Map<string, PageBuildData>;
	target: 'server' | 'client';
}) {
	for (const integration of config.integrations) {
		if (integration?.hooks?.['astro:build:setup']) {
			await integration.hooks['astro:build:setup']({
				vite,
				pages,
				target,
				updateConfig: (newConfig) => {
					mergeConfig(vite, newConfig);
				},
			});
		}
	}
}

export async function runHookBuildSsr({
	config,
	manifest,
}: {
	config: AstroConfig;
	manifest: SerializedSSRManifest;
}) {
	for (const integration of config.integrations) {
		if (integration?.hooks?.['astro:build:ssr']) {
			await integration.hooks['astro:build:ssr']({ manifest });
		}
	}
}

export async function runHookBuildDone({
	config,
	buildConfig,
	pages,
	routes,
}: {
	config: AstroConfig;
	buildConfig: BuildConfig;
	pages: string[];
	routes: RouteData[];
}) {
	const dir = isBuildingToSSR(config) ? buildConfig.client : config.outDir;

	for (const integration of config.integrations) {
		if (integration?.hooks?.['astro:build:done']) {
			await integration.hooks['astro:build:done']({
				pages: pages.map((p) => ({ pathname: p })),
				dir,
				routes,
			});
		}
	}
}
