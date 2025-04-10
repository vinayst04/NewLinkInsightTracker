
import { build } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function buildApp() {
  // Build the client
  await build({
    root: resolve(__dirname, 'client'),
    build: {
      outDir: resolve(__dirname, 'dist/public'),
      emptyOutDir: true
    }
  })
}

buildApp()
