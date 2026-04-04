import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// GitHub Pages project URL: https://<user>.github.io/gospel-harmony/
// If the repo is renamed, update this path to match the repository name.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/gospel-harmony/' : '/',
  plugins: [react()],
}))
