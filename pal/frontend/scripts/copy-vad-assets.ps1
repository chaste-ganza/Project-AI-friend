# Copies VAD runtime assets from node_modules into public/ so Vite serves
# them at / in both `vite dev` and `vite build`.
# Re-run this after updating @ricky0123/vad-web or onnxruntime-web.

$vadDist = "node_modules/@ricky0123/vad-web/dist"
$ortDist = "node_modules/onnxruntime-web/dist"
$dest    = "public"

$files = @(
    "$vadDist/silero_vad_v5.onnx",
    "$vadDist/silero_vad_legacy.onnx",
    "$vadDist/vad.worklet.bundle.min.js",
    "$ortDist/ort-wasm-simd-threaded.wasm",
    "$ortDist/ort-wasm-simd-threaded.jsep.wasm",
    "$ortDist/ort-wasm-simd-threaded.asyncify.wasm",
    "$ortDist/ort-wasm-simd-threaded.jspi.wasm",
    "$ortDist/ort-wasm-simd-threaded.mjs",
    "$ortDist/ort-wasm-simd-threaded.jsep.mjs",
    "$ortDist/ort-wasm-simd-threaded.asyncify.mjs",
    "$ortDist/ort-wasm-simd-threaded.jspi.mjs"
)

foreach ($f in $files) {
    Copy-Item $f $dest -Force
    Write-Host "Copied: $(Split-Path $f -Leaf)"
}

Write-Host "`nDone — $($files.Count) files copied to $dest/"
