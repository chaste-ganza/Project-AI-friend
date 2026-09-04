import { useCallback, useRef, useState } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

// Derive the WebSocket base URL from the HTTP base URL.
// http://host:port  →  ws://host:port
// https://host:port →  wss://host:port
function toWsUrl(httpUrl) {
  return httpUrl.replace(/^http/, 'ws')
}

const WS_URL = `${toWsUrl(BACKEND_URL)}/ws/converse`

/**
 * useConverse — drives the full streaming pipeline:
 *   WebSocket /ws/converse  →  incremental text  +  MP3 audio chunks
 *
 * Returned API:
 *   converse(transcript)   — opens WS, sends transcript, streams reply
 *   cancelConverse()       — closes WS mid-stream (e.g. new session)
 *   palReply               — accumulated reply text (updates per sentence)
 *   isPalThinking          — true while waiting for first sentence token
 *   isStreaming            — true while audio is playing / chunks arriving
 *   isSpeaking             — true while AudioContext is actively playing
 *   error                  — last error string, or null
 *   onExpression           — ref; assign a callback(expressionStr) to receive expression events
 */
export default function useConverse() {
  const [palReply, setPalReply] = useState('')
  const [isPalThinking, setIsPalThinking] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState(null)

  // Caller sets this ref to receive expression updates:  onExpression.current = (expr) => ...
  const onExpression = useRef(null)

  const wsRef = useRef(null)
  const audioCtxRef = useRef(null)
  const nextStartTimeRef = useRef(0)   // AudioContext clock: when the next chunk should start
  const activeSourcesRef = useRef([])  // keep track so we can stop them on cancel

  // ── Audio helpers ───────────────────────────────────────────────────────────

  function getAudioContext() {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext()
      nextStartTimeRef.current = 0
    }
    return audioCtxRef.current
  }

  // Decodes a raw MP3 ArrayBuffer and schedules it back-to-back with previous chunks.
  async function scheduleAudioChunk(arrayBuffer) {
    const ctx = getAudioContext()

    let audioBuffer
    try {
      audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    } catch (e) {
      console.warn('useConverse: failed to decode audio chunk', e)
      return
    }

    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)
    activeSourcesRef.current.push(source)

    // Schedule back-to-back: start no earlier than the end of the previous chunk.
    const startAt = Math.max(ctx.currentTime, nextStartTimeRef.current)
    nextStartTimeRef.current = startAt + audioBuffer.duration
    source.start(startAt)

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source)
      // Mark isSpeaking false once all scheduled sources have finished.
      if (activeSourcesRef.current.length === 0) {
        setIsSpeaking(false)
      }
    }
  }

  function stopAllAudio() {
    activeSourcesRef.current.forEach(s => {
      try { s.stop() } catch (_) { /* already stopped */ }
    })
    activeSourcesRef.current = []
    nextStartTimeRef.current = 0
    setIsSpeaking(false)
  }

  // ── Browser TTS fallback (mirrors old useTTS.js logic) ─────────────────────

  function speakWithBrowser(text) {
    return new Promise(resolve => {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        resolve()
        return
      }
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      const voices = window.speechSynthesis.getVoices()
      const preferred = voices.find(
        v => v.name.includes('Google') || v.name.includes('Daniel'),
      )
      if (preferred) utterance.voice = preferred
      utterance.rate = 0.95
      utterance.pitch = 1.0
      utterance.onend = () => { setIsSpeaking(false); resolve() }
      utterance.onerror = () => { setIsSpeaking(false); resolve() }
      setIsSpeaking(true)
      window.speechSynthesis.speak(utterance)
    })
  }

  // ── Main converse function ──────────────────────────────────────────────────

  const converse = useCallback(async (transcript, isMuted = false) => {
    // Reset state.
    setPalReply('')
    setError(null)
    setIsPalThinking(true)
    setIsStreaming(false)
    stopAllAudio()

    // Accumulate reply text across sentence frames for the fallback path.
    let accumulatedReply = ''

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      ws.send(JSON.stringify({ transcript }))
    }

    ws.onmessage = async (event) => {
      // Binary frame → audio chunk
      if (event.data instanceof ArrayBuffer) {
        if (!isMuted) {
          setIsSpeaking(true)
          setIsStreaming(true)
          await scheduleAudioChunk(event.data)
        }
        return
      }

      // Text frame → JSON control message
      let msg
      try {
        msg = JSON.parse(event.data)
      } catch {
        console.warn('useConverse: unparseable WS frame', event.data)
        return
      }

      switch (msg.type) {
        case 'sentence':
          setIsPalThinking(false)
          setIsStreaming(true)
          accumulatedReply += (accumulatedReply ? ' ' : '') + msg.text
          setPalReply(accumulatedReply)
          break

        case 'expression':
          if (onExpression.current) {
            onExpression.current(msg.value)
          }
          break

        case 'fallback':
          // ElevenLabs unavailable — use browser TTS for the full reply.
          setIsPalThinking(false)
          if (!isMuted) {
            await speakWithBrowser(msg.text || accumulatedReply)
          }
          break

        case 'done':
          setIsStreaming(false)
          ws.close()
          break

        case 'error':
          setError(msg.message ?? 'PAL encountered an error.')
          setIsPalThinking(false)
          setIsStreaming(false)
          ws.close()
          break

        default:
          console.warn('useConverse: unknown frame type', msg.type)
      }
    }

    ws.onerror = () => {
      setError("Couldn't reach PAL — is the backend running?")
      setIsPalThinking(false)
      setIsStreaming(false)
    }

    ws.onclose = (event) => {
      // Abnormal close (not triggered by our own ws.close() after 'done').
      if (!event.wasClean) {
        setIsPalThinking(false)
        setIsStreaming(false)
      }
      wsRef.current = null
    }
  }, [])

  const cancelConverse = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    stopAllAudio()
    window.speechSynthesis?.cancel()
    setIsPalThinking(false)
    setIsStreaming(false)
  }, [])

  return {
    converse,
    cancelConverse,
    palReply,
    isPalThinking,
    isStreaming,
    isSpeaking,
    error,
    onExpression,
  }
}
