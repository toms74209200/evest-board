import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages はリポジトリ名のサブパス(/<repo>/)で配信されるため、
  // アセット参照をデプロイ先に依存しない相対パスにする
  base: './',
  plugins: [preact()],
})
