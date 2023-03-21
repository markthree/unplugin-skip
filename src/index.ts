import mem from "mem";
import { join } from "path";
import consola from "consola";
import { lstat } from "fs/promises";
import { createCache } from "./core";
import { createUnplugin } from "unplugin";
import { DEFAULT_CACHE } from "./constant";
import { listLog, normalizePath } from "./utils";
import { exists as _exists } from "file-computed"

const exists = mem(_exists);

interface Options {
  log?: boolean;
  cache?: string;
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
      name: "unplugin-skip:goalkeeper",
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
          config.plugins.forEach((plugin, index) => {
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

                if (id.includes("assets")) {
                  return getNewResult();
                }

                const [path] = normalizePath(id);

                // Could be a virtual module
                if (!(await exists(path))) {
                  return getNewResult();
                }

                const { update, isChanged, hasResult, getResult } = loadCacheCtx
                  .useCache(plugin, index, path, id);

                if (hasResult() && !(await isChanged())) {
                  if (log) {
                    hits.push(`load: ${path}`)
                  }
                  return getResult();
                }

                const newResult = await getNewResult();

                await update(newResult);

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

                // Could be a virtual module
                if (!(await exists(path))) {
                  return getNewResult();
                }


                const { update, isChanged, hasResult, getResult } = transformCacheCtx
                  .useCache(plugin, index, path, id);

                if (hasResult() && !(await isChanged())) {
                  if (log) {
                    hits.push(`transform: ${path}`)
                  }
                  return getResult();
                }

                const newResult = await getNewResult();

                await update(newResult);

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
            loadCacheCtx.writeCache(),
            transformCacheCtx.writeCache(),
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
