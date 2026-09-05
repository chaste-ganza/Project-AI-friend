/**
 * copy-vad-assets.mjs
 *
 * Copies VAD runtime assets from node_modules into static-vad/ so the Vite
 * dev-server middleware and viteStaticCopy (build) can serve them at /.
 *
 * Run automatically via the `postinstall` npm hook (cross-platform Node ESM).
 * Re-run manually after updating @ricky0123/vad-web or onnxruntime-web:
 *   node scripts/copy-vad-assets.mjs
 */

import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root    = dirname(dirname(fileURLToPath(import.meta.url)))  // frontend/
const nm      = join(root, 'node_modules')
const dest    = join(root, 'static-vad')
const vadDist = join(nm, '@ricky0123', 'vad-web', 'dist')
const ortDist = join(nm, 'onnxruntime-web', 'dist')

const files = [
  [vadDist, 'silero_vad_v5.onnx'],
  [vadDist, 'silero_vad_legacy.onnx'],
  [vadDist, 'vad.worklet.bundle.min.js'],
  [ortDist, 'ort-wasm-simd-threaded.wasm'],
  [ortDist, 'ort-wasm-simd-threaded.jsep.wasm'],
  [ortDist, 'ort-wasm-simd-threaded.asyncify.wasm'],
  [ortDist, 'ort-wasm-simd-threaded.jspi.wasm'],
  [ortDist, 'ort-wasm-simd-threaded.mjs'],
  [ortDist, 'ort-wasm-simd-threaded.jsep.mjs'],
  [ortDist, 'ort-wasm-simd-threaded.asyncify.mjs'],
  [ortDist, 'ort-wasm-simd-threaded.jspi.mjs'],
]

if (!existsSync(dest)) mkdirSync(dest, { recursive: true })

let ok = 0
let missing = 0

for (const [srcDir, name] of files) {
  const src = join(srcDir, name)
  if (!existsSync(src)) {
    console.warn(`  [skip] not found: ${src}`)
    missing++
    continue
  }
  copyFileSync(src, join(dest, name))
  console.log(`  [ok]   ${name}`)
  ok++
}

console.log(`\nVAD assets: ${ok} copied to static-vad/${missing ? `, ${missing} missing` : ''}`)
if (missing > 0) process.exit(1)
