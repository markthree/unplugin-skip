import mem from "mem"
import { join } from "path"
import consola from "consola"
import { createCache } from "./core"
import { createUnplugin } from "unplugin"
import { DEFAULT_CACHE } from "./constant"
import { listLog, normalizePath } from "./utils"
import { exists as _exists } from "file-computed"

const exists = mem(_exists);

// TODO
async function defaultRefresh() {
  return false
}

interface Options {
  log?: boolean;
  cache?: string;
  refresh?: typeof defaultRefresh
}

function isVirtualOrAssets(id: string) {
  return id.includes("assets") || (id.startsWith('\x00') && !id.includes('node_modules'))
}

export const unplugin = createUnplugin(
  (options: Options = {}) => {
    const { log = false, cache = DEFAULT_CACHE } = options;
    const hits: string[] = [];

    const LOAD_CACHE = join(cache, "load");
    const TRANSFORM_CACHE = join(cache, "transform");

    const loadCacheCtx = createCache(LOAD_CACHE);
    const transformCacheCtx = createCache(TRANSFORM_CACHE);

    return {
      name: "unplugin-skip",
      enforce: "pre",
      vite: {
        apply: "build",
        async buildStart() {
          await Promise.all([
            loadCacheCtx.initCache(),
            transformCacheCtx.initCache(),
          ]);
        },
        configResolved(config) {
          config.plugins.forEach(plugin => {
            // hask load
            if (plugin.load) {
              const handler = "handler" in plugin.load
                ? plugin.load.handler
                : plugin.load;
              plugin.load = async function (id, options) {
                const getNewResult = () => {
                  return handler.call(
                    this,
                    id,
                    options,
                  );
                };

                if (isVirtualOrAssets(id)) {
                  return getNewResult();
                }

                const [path] = normalizePath(id);

                if (!(await exists(path))) {
                  return getNewResult()
                }

                const { update, isChanged, hasResult, getResult } = loadCacheCtx
                  .useCache(plugin.name, path, id);

                if (hasResult() && !(await isChanged())) {
                  if (log) {
                    hits.push(`load: ${path}`)
                  }
                  return getResult();
                }

                const newResult = await getNewResult();

                update(newResult);

                return newResult;
              };
            }

            // hask transform
            if (plugin.transform) {
              const handler = "handler" in plugin.transform
                ? plugin.transform.handler
                : plugin.transform;

              plugin.transform = async function (
                code: string,
                id: string,
                options,
              ) {
                const getNewResult = () => {
                  return handler.call(
                    this,
                    code,
                    id,
                    options,
                  );
                };

                const [path] = normalizePath(id);

                if (isVirtualOrAssets(id)) {
                  return getNewResult();
                }

                if (!(await exists(path))) {
                  return getNewResult()
                }


                const { update, isChanged, hasResult, getResult } = transformCacheCtx
                  .useCache(plugin.name, path, id);

                if (hasResult() && !(await isChanged())) {
                  if (log) {
                    hits.push(`transform: ${path}`)
                  }
                  return getResult();
                }

                const newResult = await getNewResult();

                update(newResult);

                return newResult;
              };
            }
          });
        },
        async closeBundle() {
          if (log && hits.length > 0) {
            consola.withScope("unplugin-skip").withTag("hit").log(
              listLog(hits.sort((a, b) => a.length - b.length)),
            );
          }

          await Promise.all([
            loadCacheCtx.changeRef.value && loadCacheCtx.writeCache(),
            transformCacheCtx.changeRef.value && transformCacheCtx.writeCache(),
          ]);
        },
      },
    };
  },
);

export const vitePlugin = unplugin.vite;
export const rollupPlugin = unplugin.rollup;
export const webpackPlugin = unplugin.webpack;
export const rspackPlugin = unplugin.rspack;
export const esbuildPlugin = unplugin.esbuild;
