import mem from "mem";
import { hash } from "ohash";
import { lstat } from "fs/promises";
import { VitePlugin } from "unplugin";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";

export function createSkip(cache: string) {
  const storage = createStorage({
    driver: fsDriver({ base: cache }),
  });

  const getItem = mem((key) => {
    return storage.getItem(key);
  });

  const getMtime = mem(async (path) => {
    const { mtimeMs } = await lstat(path);
    return mtimeMs;
  });

  const slash = mem((path: string) => path.replace(/\\/g, "/"));

  async function useSkip(
    plugin: VitePlugin,
    index: number,
    id: string,
  ) {
    const [path] = slash(id).split("?");

    let virtual = false;
    let newMtimeMs = 0;
    let key = hash([plugin, index, id]);
    try {
      newMtimeMs = await getMtime(path);
    } catch (error) {
      // It may be a virtual module, no real files exist
      virtual = true;
    }

    async function noChange() {
      const { mtimeMs: oldMtimeMs } = (await getItem(
        key,
      )) as any;

      return oldMtimeMs === newMtimeMs;
    }

    function hasResult() {
      return storage.hasItem(key);
    }

    async function getResult() {
      const { result } = (await getItem(key)) as any;
      return result;
    }

    function update(result: any) {
      return storage.setItem(key, {
        result,
        mtimeMs: newMtimeMs,
      });
    }

    return {
      path,
      update,
      virtual,
      noChange,
      hasResult,
      getResult,
    };
  }

  return useSkip;
}
