import { useCallback, useEffect, useRef, useState } from 'react'
import { MicVAD } from '@ricky0123/vad-web'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

function toWsUrl(httpUrl) {
  return httpUrl.replace(/^http/, 'ws')
}

// ── VAD tuning constants ────────────────────────────────────────────────────
// Raise positiveSpeechThreshold to reduce false positives in noisy rooms.
// Lower redemptionFrames if PAL cuts off too late; raise it if it cuts off
// mid-sentence.  Each frame ≈ 96 ms with the default 512-sample window.
const VAD_CONFIG = {
  positiveSpeechThreshold: 0.6,   // confidence to count a frame as speech
  negativeSpeechThreshold: 0.35,  // confidence below which a frame is silence
  minSpeechFrames: 4,             // ~250 ms of speech before triggering
  redemptionFrames: 12,           // ~750 ms of silence before end-of-turn
}

/**
 * useVAD — Phase 2 auto-turn-detection hook.
 *
 * Lifecycle:
 *   1. On mount: request mic permission, initialise Silero VAD.
 *   2. While !isMuted && !isPalSpeaking: VAD runs continuously.
 *   3. onSpeechStart → open WebSocket, begin streaming audio chunks.
 *   4. onFrameProcessed (speech frames) → send binary chunks over WS.
 *   5. onSpeechEnd → send {"type":"end_of_turn"}, receive streaming reply.
 *   6. While isPalSpeaking: VAD is paused; resumes when PAL finishes.
 *
 * Returned API:
 *   isVadReady        — true once VAD is initialised and mic is available
 *   isListening       — true while VAD is actively detecting (not paused)
 *   isSpeechDetected  — true while VAD thinks the user is currently speaking
 *   isMuted           — true when user has manually silenced auto-listening
 *   toggleMute()      — flip isMuted
 *   palReply          — streamed reply text (from useConverse-like WS logic)
 *   isPalThinking     — true while waiting for first LLM token
 *   isStreaming       — true while sentence/audio frames are arriving
 *   isSpeaking        — true while AudioContext is playing audio
 *   vadError          — string or null
 *   onExpression      — ref; assign callback(expr) to receive expression events
 */
export default function useVAD() {
  const [isVadReady, setIsVadReady]           = useState(false)
  const [isListening, setIsListening]         = useState(false)
  const [isSpeechDetected, setIsSpeechDetected] = useState(false)
  const [isMuted, setIsMuted]                 = useState(false)
  const [vadError, setVadError]               = useState(null)

  // Reply pipeline state (mirrors useConverse)
  const [palReply, setPalReply]               = useState('')
  const [isPalThinking, setIsPalThinking]     = useState(false)
  const [isStreaming, setIsStreaming]         = useState(false)
  const [isSpeaking, setIsSpeaking]           = useState(false)

  const onExpression = useRef(null)

  // Internal refs
  const vadRef         = useRef(null)
  const wsRef          = useRef(null)
  const isMutedRef     = useRef(false)   // sync copy so VAD callbacks see latest value
  const isSpeakingRef  = useRef(false)   // same

  // Audio playback (Web Audio API — identical to useConverse)
  const audioCtxRef       = useRef(null)
  const nextStartTimeRef  = useRef(0)
  const activeSourcesRef  = useRef([])

  // ── Audio helpers (copied from useConverse for self-containment) ───────────

  function getAudioContext() {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext()
      nextStartTimeRef.current = 0
    }
    return audioCtxRef.current
  }

  async function scheduleAudioChunk(arrayBuffer) {
    const ctx = getAudioContext()
    let audioBuffer
    try {
      audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    } catch (e) {
      console.warn('useVAD: failed to decode audio chunk', e)
      return
    }
    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)
    activeSourcesRef.current.push(source)

    const startAt = Math.max(ctx.currentTime, nextStartTimeRef.current)
    nextStartTimeRef.current = startAt + audioBuffer.duration
    source.start(startAt)

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source)
      if (activeSourcesRef.current.length === 0) {
        setIsSpeaking(false)
        isSpeakingRef.current = false
        // Resume VAD now that PAL has finished speaking.
        _resumeVAD()
      }
    }
  }

  function stopAllAudio() {
    activeSourcesRef.current.forEach(s => { try { s.stop() } catch (_) {} })
    activeSourcesRef.current = []
    nextStartTimeRef.current = 0
    setIsSpeaking(false)
    isSpeakingRef.current = false
  }

  function speakWithBrowser(text) {
    return new Promise(resolve => {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        resolve(); return
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
      utterance.onend = () => {
        setIsSpeaking(false)
        isSpeakingRef.current = false
        _resumeVAD()
        resolve()
      }
      utterance.onerror = () => {
        setIsSpeaking(false)
        isSpeakingRef.current = false
        _resumeVAD()
        resolve()
      }
      setIsSpeaking(true)
      isSpeakingRef.current = true
      window.speechSynthesis.speak(utterance)
    })
  }

  // ── VAD pause / resume ─────────────────────────────────────────────────────

  function _pauseVAD() {
    if (vadRef.current) {
      vadRef.current.pause()
      setIsListening(false)
    }
  }

  function _resumeVAD() {
    // Only resume if user hasn't manually muted.
    if (vadRef.current && !isMutedRef.current) {
      vadRef.current.start()
      setIsListening(true)
    }
  }

  // ── WebSocket reply pipeline ───────────────────────────────────────────────

  function _openReplySocket() {
    const ws = new WebSocket(`${toWsUrl(BACKEND_URL)}/ws/converse`)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    let accumulatedReply = ''

    ws.onerror = () => {
      setVadError("Couldn't reach PAL — is the backend running?")
      setIsPalThinking(false)
      setIsStreaming(false)
      wsRef.current = null
    }

    ws.onclose = (event) => {
      if (!event.wasClean) {
        setIsPalThinking(false)
        setIsStreaming(false)
      }
      wsRef.current = null
    }

    ws.onmessage = async (event) => {
      // Binary frame → MP3 audio chunk
      if (event.data instanceof ArrayBuffer) {
        setIsSpeaking(true)
        isSpeakingRef.current = true
        setIsStreaming(true)
        await scheduleAudioChunk(event.data)
        return
      }

      let msg
      try { msg = JSON.parse(event.data) } catch {
        console.warn('useVAD: unparseable WS frame', event.data); return
      }

      switch (msg.type) {
        case 'sentence':
          setIsPalThinking(false)
          setIsStreaming(true)
          accumulatedReply += (accumulatedReply ? ' ' : '') + msg.text
          setPalReply(accumulatedReply)
          break

        case 'expression':
          if (onExpression.current) onExpression.current(msg.value)
          break

        case 'fallback':
          setIsPalThinking(false)
          // Pause VAD before browser TTS starts so PAL's voice isn't
          // picked up — same principle as the AudioContext path above.
          _pauseVAD()
          setIsSpeaking(true)
          isSpeakingRef.current = true
          await speakWithBrowser(msg.text || accumulatedReply)
          break

        case 'done':
          setIsStreaming(false)
          ws.close()
          break

        case 'error':
          setVadError(msg.message ?? 'PAL encountered an error.')
          setIsPalThinking(false)
          setIsStreaming(false)
          ws.close()
          break

        default:
          console.warn('useVAD: unknown frame type', msg.type)
      }
    }

    return ws
  }

  // ── VAD initialisation ─────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const vad = await MicVAD.new({
          ...VAD_CONFIG,

          // Serve assets from our own origin (copied by vite-plugin-static-copy).
          baseAssetPath: '/',
          onnxWASMBasePath: '/',

          onSpeechStart() {
            if (isMutedRef.current || isSpeakingRef.current) return
            setIsSpeechDetected(true)

            // Reset reply state for the new turn.
            setPalReply('')
            setVadError(null)
            setIsPalThinking(false)
            setIsStreaming(false)
            stopAllAudio()

            // Open the WebSocket immediately so the connection is ready
            // before end_of_turn arrives. The backend waits for the first
            // frame to determine which path (binary vs text) to use.
            const ws = _openReplySocket()

            // Wait for open before we can send binary frames.
            // We store a flag on the ws so onFrameProcessed can check.
            ws._readyToSend = false
            ws.onopen = () => { ws._readyToSend = true }
          },

          onFrameProcessed(probabilities, frame) {
            if (isMutedRef.current || isSpeakingRef.current) return
            if (!wsRef.current || !wsRef.current._readyToSend) return

            // frame is a Float32Array (16 kHz mono PCM).
            // Convert to Int16 PCM before sending — smaller on the wire
            // and what Whisper/ffmpeg expects in a WebM/WAV container.
            const int16 = new Int16Array(frame.length)
            for (let i = 0; i < frame.length; i++) {
              int16[i] = Math.max(-32768, Math.min(32767, frame[i] * 32768))
            }
            wsRef.current.send(int16.buffer)
          },

          onSpeechEnd(_audio) {
            // _audio is the full Float32Array for the utterance — we don't
            // use it here because we already streamed frames incrementally.
            setIsSpeechDetected(false)
            setIsPalThinking(true)

            if (!wsRef.current) return

            const sendEOT = () => {
              wsRef.current.send(JSON.stringify({ type: 'end_of_turn' }))
            }

            if (wsRef.current._readyToSend) {
              sendEOT()
            } else {
              // Socket opened but onopen hasn't fired yet — queue it.
              const prev = wsRef.current.onopen
              wsRef.current.onopen = () => {
                wsRef.current._readyToSend = true
                if (prev) prev()
                sendEOT()
              }
            }

            // Pause VAD while PAL is thinking/speaking.
            _pauseVAD()
          },

          onVADMisfire() {
            // Too short — VAD retracted. Clean up any socket we opened.
            setIsSpeechDetected(false)
            if (wsRef.current) {
              wsRef.current.close()
              wsRef.current = null
            }
          },
        })

        if (cancelled) {
          vad.destroy()
          return
        }

        vadRef.current = vad
        vad.start()
        setIsVadReady(true)
        setIsListening(true)

      } catch (err) {
        if (!cancelled) {
          console.error('useVAD: init error', err)
          // Surface the real error rather than a generic catch-all message.
          const isPermission = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
          setVadError(
            isPermission
              ? 'Microphone access denied — please allow mic access in your browser and reload.'
              : `VAD failed to load: ${err?.message ?? String(err)}`
          )
        }
      }
    }

    init()

    return () => {
      cancelled = true
      if (vadRef.current) {
        vadRef.current.destroy()
        vadRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      stopAllAudio()
      window.speechSynthesis?.cancel()
    }
  }, []) // run once on mount

  // ── Mute / unmute ─────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev
      isMutedRef.current = next
      if (next) {
        _pauseVAD()
      } else if (!isSpeakingRef.current) {
        _resumeVAD()
      }
      return next
    })
  }, [])

  // Keep isMutedRef in sync if something sets isMuted from outside.
  useEffect(() => { isMutedRef.current = isMuted }, [isMuted])

  return {
    isVadReady,
    isListening,
    isSpeechDetected,
    isMuted,
    toggleMute,
    palReply,
    isPalThinking,
    isStreaming,
    isSpeaking,
    vadError,
    onExpression,
  }
}
