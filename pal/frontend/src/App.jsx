import { useEffect, useRef, useState } from 'react'
import MicButton from './components/MicButton'
import PalFace from './components/PalFace'
import useVAD from './hooks/useVAD'
import { getExpressionFromAppState } from './lib/palExpressions'
import './App.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

function App() {
  const [transcript, setTranscript]   = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [overrideExpression, setOverrideExpression] = useState(null)
  const overrideTimerRef = useRef(null)

  const {
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
  } = useVAD()

  // Wire up expression events from the WebSocket stream.
  useEffect(() => {
    onExpression.current = (expr) => {
      if (expr === 'idle') return
      clearTimeout(overrideTimerRef.current)
      setOverrideExpression(expr)
      overrideTimerRef.current = setTimeout(() => setOverrideExpression(null), 3000)
    }
    return () => {
      onExpression.current = null
      clearTimeout(overrideTimerRef.current)
    }
  }, [onExpression])

  // Clears backend session memory and resets UI state.
  async function handleNewSession() {
    setTranscript('')
    try {
      await fetch(`${BACKEND_URL}/session/reset`, { method: 'POST' })
    } catch {
      // Non-fatal — local state is already cleared.
    }
  }

  const baseExpression = getExpressionFromAppState({
    isListening,
    isSpeechDetected,
    isTranscribing,
    isPalThinking,
    isSpeaking,
    isStreaming,
    isMuted,
  })
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
          isVadReady={isVadReady}
          isListening={isListening}
          isSpeechDetected={isSpeechDetected}
          isPalThinking={isPalThinking}
          isSpeaking={isSpeaking}
          isStreaming={isStreaming}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          transcript={transcript}
          palReply={palReply}
          isTranscribing={isTranscribing}
          vadError={vadError}
          onNewSession={handleNewSession}
        />
      </section>
    </>
  )
}

export default App
