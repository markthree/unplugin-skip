import { cwd } from 'process'
import { hash } from 'ohash'
import { resolve } from 'path'
import { existsSync } from 'fs'
import { createStorage } from 'unstorage'
import { checkMtime, getMtime } from './fs'
import fsDriver from 'unstorage/drivers/fs'
import { DEFAULT_CACHE, CACHE_FLAG } from './constant'

export function createSkip(
	cache: string = resolve(cwd(), DEFAULT_CACHE)
) {
	const storage = createStorage({
		driver: fsDriver({ base: cache })
	})

	function hasCacheFlag() {
		return storage.hasItem(CACHE_FLAG)
	}

	function setCacheFlag() {
		return storage.setItem(CACHE_FLAG, 0)
	}

	async function useSkip(id: string, code: string) {
		const [path, query] = id.split('?')
		if (!existsSync(path)) {
			return null
		}

		const key = hash(path + query)
		if (!(await storage.hasItem(key))) {
			await storage.setItem(key, code)
			await storage.setMeta(key, {
				mtime: await getMtime(path)
			})
			return null
		}

		const newMtime = await getMtime(path)

		const { mtime: oldMtime } = await storage.getMeta(key)
		if (checkMtime(newMtime, oldMtime!)) {
			return storage.getItem(key) as Promise<string>
		}

		return null
	}

	return {
		useSkip,
		setCacheFlag,
		hasCacheFlag
	}
}
