import mem from "mem";
import { hash } from "ohash";
import { VitePlugin } from "unplugin";
import fastJson from "fast-json-stringify";
import {
  ensureFile,
  getMtime as _getMtime,
  readJsonFileWithStream as _readJsonFileWithStream,
  writeJsonFile,
} from "file-computed";
import { readFile } from "fs/promises";

const getFileHash = mem(async (path) => {
  return hash(await readFile(path));
});

const stringify = fastJson({
  title: "unplugin-skip",
  type: "object",
  additionalProperties: {
    type: "object",
    properties: {
      mtime: { type: "number" },
      hash: { type: "string" },
      mods: { },
    },
  },
});

const getMtime = mem(_getMtime);

type Result = any;

interface Item {
  mtime: number;
  hash: string;
  mods: {
    [key: string]: Result;
  };
}

interface CacheFile {
  [path: string]: Item;
}

export function createCache(cache: string) {
  let cacheFile: CacheFile;
  async function initCache() {
    await ensureFile(cache);
    cacheFile = await _readJsonFileWithStream(cache) || {};
  }

  function writeCache() {
    return writeJsonFile(cache, stringify(cacheFile));
  }

  function hasItem(path: string) {
    return Boolean(cacheFile[path]);
  }

  function getItem(path: string) {
    return cacheFile[path];
  }

  function setItem(path: string, item: Partial<Item> = cacheFile[path]) {
    return cacheFile[path] = { ...cacheFile[path], ...item };
  }

  function hasMod(path: string, key: string) {
    return Boolean(cacheFile[path]?.mods?.[key]);
  }

  function getMod(path: string, key: string) {
    return cacheFile[path].mods[key];
  }

  function setMod(path: string, key: string, value: any) {
    cacheFile[path].mods[key] = value;
  }

  function useCache(
    plugin: VitePlugin,
    index: number,
    path: string,
    id: string,
  ) {
    const key = hash([plugin, index, id]);

    let newHash: string;
    let newMtime: number;

    async function isChanged() {
      const { mtime, hash } = getItem(path);
      newMtime = await getMtime(path);
      if (mtime === newMtime) {
        return false;
      }
      newHash = await getFileHash(path);
      if (hash === newHash) {
        return false;
      }
      return true;
    }

    function hasResult() {
      return hasMod(path, key);
    }

    function getResult() {
      return getMod(path, key);
    }

    async function update(result: any) {
      if (!hasItem(path)) {
        setItem(path, {
          hash: newHash ?? await getFileHash(path),
          mtime: newMtime ?? await getMtime(path),
          mods: { [key]: result },
        });
        return;
      }
      if (!hasMod(path, key)) {
        setItem(path, {
          hash: newHash ?? await getFileHash(path),
          mtime: newMtime ?? await getMtime(path),
        });
        setMod(path, key, result);
      }
    }

    return {
      update,
      isChanged,
      hasResult,
      getResult,
    };
  }

  return { useCache, initCache, writeCache };
}
