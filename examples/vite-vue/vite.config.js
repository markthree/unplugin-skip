import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import { vitePlugin as Skip } from 'unplugin-skip'

export default defineConfig({
	plugins: [Skip(), Vue()]
})
