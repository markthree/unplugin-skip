import mem from "mem";
import fastJson from "fast-json-stringify";
import {
  ensureFile,
  getMtime as _getMtime,
  readJsonFileWithStream as _readJsonFileWithStream,
  writeJsonFile,
} from "file-computed";


const stringify = fastJson({
  title: "unplugin-skip",
  type: "object",
  additionalProperties: {
    type: "object",
    properties: {
      mtime: { type: "number" },
      mods: {},
    },
  },
});

const getMtime = mem(_getMtime);

type Result = any;

interface Item {
  mtime: number;
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

  const changeRef = { value: false }

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
    name: string,
    path: string,
    id: string,
  ) {
    const key = `${name}:${id}`

    let newMtime: number;

    async function isChanged() {
      const { mtime } = getItem(path);
      newMtime = await getMtime(path);
      return newMtime !== mtime
    }

    function hasResult() {
      return hasMod(path, key);
    }

    function getResult() {
      return getMod(path, key);
    }

    async function update(result: any) {
      changeRef.value = true
      if (!hasItem(path)) {
        setItem(path, {
          mtime: newMtime || cacheFile[path]?.mtime || await getMtime(path),
          mods: { [key]: result },
        });
        return;
      }
      if (!hasMod(path, key)) {
        setItem(path, {
          mtime: newMtime || cacheFile[path]?.mtime || await getMtime(path)
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

  return { useCache, initCache, writeCache, changeRef };
}
