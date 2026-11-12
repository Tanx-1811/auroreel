import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { build, defineConfig, type Plugin } from 'vite';
import { FONT_ASSETS } from './src/core/css/common.ts';
import { createManifest } from './src/manifest.ts';

const src = resolve(import.meta.dirname, 'src');

/** `AUROREEL_OUT` lets parallel work build into a scratch folder without clobbering `dist`. */
const outDirFor = (mode: string) =>
  resolve(import.meta.dirname, process.env.AUROREEL_OUT ?? (mode === 'e2e' ? 'dist-e2e' : 'dist'));

const defines = (mode: string) => ({
  __RS_E2E__: JSON.stringify(mode === 'e2e'),
  'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
});

function manifestPlugin(mode: string): Plugin {
  return {
    name: 'auroreel:manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: `${JSON.stringify(createManifest(mode), null, 2)}\n`,
      });
    },
  };
}

/**
 * Bundled UI fonts from @fontsource: keep only the Latin and Vietnamese subsets
 * and drop the WOFF fallbacks — Chrome always takes the WOFF2.
 */
function fontSubsetsPlugin(): Plugin {
  return {
    name: 'auroreel:font-subsets',
    enforce: 'pre',
    transform(code, id) {
      if (!/[\\/]@fontsource[\\/].+\.css$/.test(id)) return null;
      const kept = code
        .split(/(?=\/\* [\w-]+ \*\/)/)
        .filter((block) => /^\/\* [\w-]+-(latin|vietnamese)-\d+-(normal|italic) \*\//.test(block));
      return { code: kept.join('').replace(/,\s*url\([^)]+\.woff\)\s*format\(["']woff["']\)/g, ''), map: null };
    },
  };
}

/** Page fonts the themes offer, copied to dist/fonts (web-accessible on the supported sites). */
function pageFontsPlugin(outDir: string): Plugin {
  return {
    name: 'auroreel:page-fonts',
    apply: 'build',
    closeBundle() {
      mkdirSync(resolve(outDir, 'fonts'), { recursive: true });
      for (const file of FONT_ASSETS) {
        const family = file.replace(/-(latin|vietnamese)-\d+-normal\.woff2$/, '');
        copyFileSync(
          resolve(import.meta.dirname, 'node_modules/@fontsource', family, 'files', file),
          resolve(outDir, 'fonts', file),
        );
      }
    },
  };
}

/**
 * The service worker (ES module) and the content script (classic script:
 * Chrome doesn't load content scripts as modules) are bundled on their own
 * after the main build, also on every rebuild in watch mode.
 */
function scriptsPlugin(mode: string, outDir: string): Plugin {
  const one = (entry: string, fileName: string, format: 'es' | 'iife') =>
    build({
      configFile: false,
      logLevel: 'warn',
      mode,
      publicDir: false,
      define: defines(mode),
      build: {
        outDir,
        emptyOutDir: false,
        copyPublicDir: false,
        target: 'chrome121',
        minify: mode === 'production',
        sourcemap: mode === 'production' ? false : 'inline',
        lib: { entry: resolve(src, entry), formats: [format], name: 'auroreel', fileName: () => fileName },
      },
    });
  return {
    name: 'auroreel:scripts',
    apply: 'build',
    async closeBundle() {
      await one('background/service-worker.ts', 'service-worker.js', 'es');
      await one('content/main.ts', 'content.js', 'iife');
    },
  };
}

// Multi-page extension build: toolbar popup and the full-page studio (options).
export default defineConfig(({ mode }) => ({
  root: src,
  base: '',
  publicDir: resolve(import.meta.dirname, 'public'),
  plugins: [
    fontSubsetsPlugin(),
    react(),
    manifestPlugin(mode),
    pageFontsPlugin(outDirFor(mode)),
    scriptsPlugin(mode, outDirFor(mode)),
  ],
  define: defines(mode),
  build: {
    outDir: outDirFor(mode),
    emptyOutDir: true,
    target: 'chrome121',
    sourcemap: mode !== 'production',
    minify: mode === 'production',
    modulePreload: { polyfill: false },
    rolldownOptions: {
      input: {
        popup: resolve(src, 'popup/popup.html'),
        options: resolve(src, 'options/options.html'),
      },
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'vendor', test: /node_modules/ },
          ],
        },
      },
    },
  },
}));
