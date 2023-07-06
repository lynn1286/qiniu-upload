import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ROOT_DIR, PAGES } from './build/config'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // 多页支持
      input: PAGES.reduce((map, { name }) => {
        map[name] = path.resolve(ROOT_DIR, `${name}.html`)
        return map
      }, {}),
      output: {
        chunkFileNames: 'static/[name].js',
        entryFileNames: 'static/[name].js',
        assetFileNames: 'static/[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(ROOT_DIR, './src'),
    },
  },
})
