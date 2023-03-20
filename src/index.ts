import consola from 'consola'
import { cwd } from 'process'
import { relative } from 'path'
import { listLog } from './utils'
import { createSkip } from './core'
import { createUnplugin } from 'unplugin'

interface Options {
	log?: boolean
}

export const unplugin = createUnplugin(
	(options: Options = {}) => {
		const { log = false } = options

		const _cwd = cwd()

		const hits: string[] = []
		const { useSkip, hasCacheFlag, setCacheFlag } =
			createSkip()

		return [
			{
				name: 'unplugin-skip:goalkeeper',
				enforce: 'pre',
				vite: {
					apply: 'build',
					configResolved(config) {
						config.plugins.forEach(plugin => {
							if (!plugin.transform) {
								return
							}
							const handler =
								'handler' in plugin.transform
									? plugin.transform.handler
									: plugin.transform

							plugin.transform = async function (
								code: string,
								id: string,
								options
							) {
								if (await hasCacheFlag()) {
									const oldCode = await useSkip(id, code)
									if (oldCode) {
										hits.push(relative(_cwd, id))
										return oldCode
									}
								}

								return handler.call(
									this as any,
									code,
									id,
									options
								)
							}
						})
					}
				}
			},
			{
				name: 'unplugin-skip:recorder',
				enforce: 'post',
				vite: {
					apply: 'build',
					async closeBundle() {
						await setCacheFlag()
						if (log && hits.length) {
							consola
								.withTag('skip')
								.withScope('unplugin-skip')
								.log(
									listLog(
										Array.from(
											new Set(
												hits.sort(
													(a, b) => a.length - b.length
												)
											)
										)
									)
								)
						}
					},
					transform: {
						order: 'post',
						async handler(code, id) {
							await useSkip(id, code)
						}
					}
				}
			}
		]
	}
)

export const vitePlugin = unplugin.vite
export const rollupPlugin = unplugin.rollup
export const webpackPlugin = unplugin.webpack
export const rspackPlugin = unplugin.rspack
export const esbuildPlugin = unplugin.esbuild
