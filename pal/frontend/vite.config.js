import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// VAD runtime assets (ONNX weights, WASM binaries, .mjs bindings, AudioWorklet
// bundle) must be served at / with no Vite module transforms applied:
//
//   • In dev:   a configureServer middleware streams them straight from
//               static-vad/ with correct MIME types, bypassing Vite's module
//               graph (putting them in public/ causes Vite 8 to block dynamic
//               import() of .mjs files with "should not be imported from source
//               code" — these are runtime-fetched, not bundler imports).
//
//   • In build: viteStaticCopy copies static-vad/ → dist/ root so the same
//               absolute paths work in production.
//
// static-vad/ is populated by the `postinstall` npm hook (cross-platform Node
// script: scripts/copy-vad-assets.mjs). It is gitignored.

const STATIC_VAD_DIR = path.resolve(import.meta.dirname, 'static-vad')

const MIME = {
  '.onnx': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.mjs':  'text/javascript',
  '.js':   'text/javascript',
}

function vadStaticMiddleware() {
  return {
    name: 'vad-static-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Strip query string for file lookup
        const urlPath = req.url.split('?')[0]
        const filePath = path.join(STATIC_VAD_DIR, path.basename(urlPath))
        const ext = path.extname(filePath)

        if (!MIME[ext] || !fs.existsSync(filePath)) {
          return next()
        }

        res.setHeader('Content-Type', MIME[ext])
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
        res.setHeader('Cross-Origin-Opener-Policy',   'same-origin')
        fs.createReadStream(filePath).pipe(res)
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    vadStaticMiddleware(),
    viteStaticCopy({
      targets: [
        { src: 'static-vad/*', dest: './' },
      ],
    }),
  ],
})
