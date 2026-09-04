import { useEffect, useRef, useState } from 'react'
import MicButton from './components/MicButton'
import PalFace from './components/PalFace'
import useConverse from './hooks/useConverse'
import { getExpressionFromAppState } from './lib/palExpressions'
import './App.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

// Renders the PAL speech coach and coordinates transcription, streaming reply, and speech.
function App() {
  const [transcript, setTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [overrideExpression, setOverrideExpression] = useState(null)
  const overrideTimerRef = useRef(null)

  const {
    converse,
    cancelConverse,
    palReply,
    isPalThinking,
    isStreaming,
    isSpeaking,
    error: converseError,
    onExpression,
  } = useConverse()

  // Wire up expression events from the WebSocket stream.
  useEffect(() => {
    onExpression.current = (expr) => {
      if (expr === 'idle') return          // don't override with neutral
      clearTimeout(overrideTimerRef.current)
      setOverrideExpression(expr)
      overrideTimerRef.current = setTimeout(() => setOverrideExpression(null), 3000)
    }
    return () => {
      onExpression.current = null
      clearTimeout(overrideTimerRef.current)
    }
  }, [onExpression])

  // Uploads the completed audio recording, transcribes it, then starts the WS stream.
  async function handleAudioReady(blob) {
    setIsTranscribing(true)
    setTranscript('')

    try {
      const formData = new FormData()
      formData.append('file', blob, 'recording.webm')

      const response = await fetch(`${BACKEND_URL}/transcribe`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Transcription request failed')

      const data = await response.json()
      const transcriptText = data.transcript
      setTranscript(transcriptText)
      setIsTranscribing(false)

      // Hand off to the streaming WebSocket pipeline.
      await converse(transcriptText, isMuted)
    } catch {
      setTranscript('Sorry, PAL could not transcribe that audio.')
      setIsTranscribing(false)
    }
  }

  // Clears backend session memory, cancels any in-flight stream, and resets UI.
  async function handleNewSession() {
    cancelConverse()
    try {
      await fetch(`${BACKEND_URL}/session/reset`, { method: 'POST' })
    } finally {
      setTranscript('')
    }
  }

  function handleMuteToggle() {
    setIsMuted(v => !v)
  }

  const baseExpression = getExpressionFromAppState(
    isRecording, isTranscribing, isPalThinking, isSpeaking, isStreaming,
  )
  const expression = overrideExpression ?? baseExpression

  return (
    <>
      <section id="center">
        <div className="pal-face-wrapper">
          <PalFace expression={expression} />
        </div>
        <div>
          <h1>PAL</h1>
          <p>Your voice AI speech coach</p>
        </div>
        <MicButton
          onRecordingChange={setIsRecording}
          onAudioReady={handleAudioReady}
          transcript={transcript}
          palReply={palReply}
          isTranscribing={isTranscribing}
          isPalThinking={isPalThinking}
          isSpeaking={isSpeaking}
          isStreaming={isStreaming}
          isMuted={isMuted}
          converseError={converseError}
          onNewSession={handleNewSession}
          onMuteToggle={handleMuteToggle}
        />
      </section>
    </>
  )
}

export default App
