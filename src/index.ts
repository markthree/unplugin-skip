import { createUnplugin } from 'unplugin'

export const unplugin = createUnplugin(options => {
	return {
		name: 'unplugin-skip',
		transformInclude(id) {
			return id.endsWith('.vue')
		},
		transform(code, id) {
			console.log(id)
			return code.replace(
				/<template>/,
				'<template><div>Injected</div>'
			)
		}
	}
})

export const vitePlugin = unplugin.vite
export const rollupPlugin = unplugin.rollup
export const webpackPlugin = unplugin.webpack
export const rspackPlugin = unplugin.rspack
export const esbuildPlugin = unplugin.esbuild
