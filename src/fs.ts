import { lstat } from 'fs/promises'

export async function getMtime(path: string) {
	return (await lstat(path)).mtime
}

export function checkMtime(newMtime: Date, oldMtime: Date) {
	return newMtime.getTime() === oldMtime.getTime()
}
