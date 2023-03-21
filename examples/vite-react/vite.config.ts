import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { vitePlugin as Skip } from 'unplugin-skip'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), Skip({ log: true })]
})
