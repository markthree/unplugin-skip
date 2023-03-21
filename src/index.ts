import { join } from "path";
import consola from "consola";
import { listLog } from "./utils";
import { createSkip } from "./core";
import { createUnplugin } from "unplugin";
import { DEFAULT_CACHE } from "./constant";

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

    const useLoadSkip = createSkip(LOAD_CACHE);
    const useTransformSkip = createSkip(TRANSFORM_CACHE);

    return {
      name: "unplugin-skip:goalkeeper",
      enforce: "pre",
      vite: {
        apply: "build",
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

                const {
                  path,
                  update,
                  virtual,
                  noChange,
                  hasResult,
                  getResult,
                } = await useLoadSkip(
                  plugin,
                  index,
                  id,
                );

                if (!virtual) {
                  if (
                    (await hasResult()) &&
                    await noChange()
                  ) {
                    if (log) {
                      hits.push(path);
                    }
                    return getResult();
                  }
                }

                const newResult = await getNewResult();
                if (!virtual && newResult) {
                  update(newResult);
                }
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

                const {
                  path,
                  update,
                  virtual,
                  noChange,
                  hasResult,
                  getResult,
                } = await useTransformSkip(
                  plugin,
                  index,
                  id,
                );

                if (!virtual) {
                  if (
                    (await hasResult()) &&
                    await noChange()
                  ) {
                    if (log) {
                      hits.push(path);
                    }
                    return getResult();
                  }
                }

                const newResult = await getNewResult();
                if (!virtual && newResult) {
                  update(newResult);
                }
                return newResult;
              };
            }
          });
        },
        closeBundle() {
          if (log && hits.length > 0) {
            consola.withScope("unplugin-skip").withTag("hit").log(
              listLog(hits.sort((a, b) => a.length - b.length)),
            );
          }
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
