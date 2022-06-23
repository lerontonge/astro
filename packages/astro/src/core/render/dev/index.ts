import { fileURLToPath } from 'url';
import type { HtmlTagDescriptor, ViteDevServer } from 'vite';
import type {
	AstroConfig,
	AstroRenderer,
	ComponentInstance,
	RouteData,
	RuntimeMode,
	SSRElement,
	SSRLoadedRenderer,
} from '../../../@types/astro';
import { prependForwardSlash } from '../../../core/path.js';
import { LogOptions } from '../../logger/core.js';
import { isBuildingToSSR } from '../../util.js';
import { render as coreRender } from '../core.js';
import { RouteCache } from '../route-cache.js';
import { createModuleScriptElementWithSrcSet } from '../ssr-element.js';
import { collectMdMetadata } from '../util.js';
import { getStylesForURL } from './css.js';
import { injectTags } from './html.js';
import { resolveClientDevPath } from './resolve.js';

export interface SSROptions {
	/** an instance of the AstroConfig */
	astroConfig: AstroConfig;
	/** location of file on disk */
	filePath: URL;
	/** logging options */
	logging: LogOptions;
	/** "development" or "production" */
	mode: RuntimeMode;
	/** production website */
	origin: string;
	/** the web request (needed for dynamic routes) */
	pathname: string;
	/** optional, in case we need to render something outside of a dev server */
	route?: RouteData;
	/** pass in route cache because SSR can’t manage cache-busting */
	routeCache: RouteCache;
	/** Vite instance */
	viteServer: ViteDevServer;
	/** Request */
	request: Request;
}

export type ComponentPreload = [SSRLoadedRenderer[], ComponentInstance];

export type RenderResponse =
	| { type: 'html'; html: string; response: ResponseInit }
	| { type: 'response'; response: Response };

const svelteStylesRE = /svelte\?svelte&type=style/;

async function loadRenderer(
	viteServer: ViteDevServer,
	renderer: AstroRenderer
): Promise<SSRLoadedRenderer> {
	// Vite modules can be out-of-date when using an un-resolved url
	// We also encountered inconsistencies when using the resolveUrl and resolveId helpers
	// We've found that pulling the ID directly from the urlToModuleMap is the most stable!
	const id =
		viteServer.moduleGraph.urlToModuleMap.get(renderer.serverEntrypoint)?.id ??
		renderer.serverEntrypoint;
	const mod = (await viteServer.ssrLoadModule(id)) as { default: SSRLoadedRenderer['ssr'] };
	return { ...renderer, ssr: mod.default };
}

export async function loadRenderers(
	viteServer: ViteDevServer,
	astroConfig: AstroConfig
): Promise<SSRLoadedRenderer[]> {
	return Promise.all(astroConfig._ctx.renderers.map((r) => loadRenderer(viteServer, r)));
}

export async function preload({
	astroConfig,
	filePath,
	viteServer,
}: Pick<SSROptions, 'astroConfig' | 'filePath' | 'viteServer'>): Promise<ComponentPreload> {
	// Important: This needs to happen first, in case a renderer provides polyfills.
	const renderers = await loadRenderers(viteServer, astroConfig);
	// Load the module from the Vite SSR Runtime.
	const mod = (await viteServer.ssrLoadModule(fileURLToPath(filePath))) as ComponentInstance;
	if (viteServer.config.mode === 'development' || !mod?.$$metadata) {
		return [renderers, mod];
	}

	// append all nested markdown metadata to mod.$$metadata
	const modGraph = await viteServer.moduleGraph.getModuleByUrl(fileURLToPath(filePath));
	if (modGraph) {
		await collectMdMetadata(mod.$$metadata, modGraph, viteServer);
	}

	return [renderers, mod];
}

function isPage(filePath: URL, astroConfig: AstroConfig): boolean {
	const relativeURL = filePath.toString().replace(astroConfig.srcDir.toString().slice(0, -1), '');
	if (!relativeURL.startsWith('/pages/')) return false;
	const ext = '.' + relativeURL.split('.').at(-1);
	for (const _ext of astroConfig._ctx.pageExtensions) {
		if (ext === _ext) return true;
	}
	return false;
}

/** use Vite to SSR */
export async function render(
	renderers: SSRLoadedRenderer[],
	mod: ComponentInstance,
	ssrOpts: SSROptions
): Promise<RenderResponse> {
	const {
		astroConfig,
		filePath,
		logging,
		mode,
		origin,
		pathname,
		request,
		route,
		routeCache,
		viteServer,
	} = ssrOpts;
	// Add hoisted script tags
	const scripts = createModuleScriptElementWithSrcSet(
		mod.hasOwnProperty('$$metadata') ? Array.from(mod.$$metadata.hoistedScriptPaths()) : []
	);

	// Inject HMR scripts
	if (isPage(filePath, astroConfig) && mode === 'development') {
		scripts.add({
			props: { type: 'module', src: '/@vite/client' },
			children: '',
		});
		scripts.add({
			props: {
				type: 'module',
				src: new URL('../../../runtime/client/hmr.js', import.meta.url).pathname,
			},
			children: '',
		});
	}
	// TODO: We should allow adding generic HTML elements to the head, not just scripts
	for (const script of astroConfig._ctx.scripts) {
		if (script.stage === 'head-inline') {
			scripts.add({
				props: {},
				children: script.content,
			});
		}
	}

	// Pass framework CSS in as style tags to be appended to the page.
	const { urls: styleUrls, stylesMap } = await getStylesForURL(filePath, viteServer, mode);
	let links = new Set<SSRElement>();
	[...styleUrls].forEach((href) => {
		links.add({
			props: {
				rel: 'stylesheet',
				href,
				'data-astro-injected': true,
			},
			children: '',
		});
	});

	let styles = new Set<SSRElement>();
	[...stylesMap].forEach(([url, content]) => {
		// The URL is only used by HMR for Svelte components
		// See src/runtime/client/hmr.ts for more details
		styles.add({
			props: {
				'data-astro-injected': svelteStylesRE.test(url) ? url : true,
			},
			children: content,
		});
	});

	let content = await coreRender({
		links,
		styles,
		logging,
		markdown: astroConfig.markdown,
		mod,
		origin,
		pathname,
		scripts,
		// Resolves specifiers in the inline hydrated scripts, such as "@astrojs/preact/client.js"
		async resolve(s: string) {
			if (s.startsWith('/@fs')) {
				return resolveClientDevPath(s);
			}
			return '/@id' + prependForwardSlash(s);
		},
		renderers,
		request,
		route,
		routeCache,
		site: astroConfig.site ? new URL(astroConfig.base, astroConfig.site).toString() : undefined,
		ssr: isBuildingToSSR(astroConfig),
	});

	if (route?.type === 'endpoint' || content.type === 'response') {
		return content;
	}

	// inject tags
	const tags: HtmlTagDescriptor[] = [];

	// add injected tags
	let html = injectTags(content.html, tags);

	// inject <!doctype html> if missing (TODO: is a more robust check needed for comments, etc.?)
	if (!/<!doctype html/i.test(html)) {
		html = '<!DOCTYPE html>\n' + content;
	}

	return {
		type: 'html',
		html,
		response: content.response,
	};
}

export async function ssr(
	preloadedComponent: ComponentPreload,
	ssrOpts: SSROptions
): Promise<RenderResponse> {
	const [renderers, mod] = preloadedComponent;
	return await render(renderers, mod, ssrOpts); // NOTE: without "await", errors won’t get caught below
}
