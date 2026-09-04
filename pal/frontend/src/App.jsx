import { useState } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'
import MicButton from './components/MicButton'
import useTTS from './hooks/useTTS'
import PalFace from './components/PalFace'
import { getExpressionFromAppState } from './lib/palExpressions'
import './App.css'

// Renders the PAL speech coach and coordinates transcription, replies, and speech.
function App() {
  const [transcript, setTranscript] = useState('')
  const [palReply, setPalReply] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isPalThinking, setIsPalThinking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [overrideExpression, setOverrideExpression] = useState(null)
  const { speak, isSpeaking } = useTTS()

  function detectToneFromReply(replyText) {
    const lower = replyText.toLowerCase()
    const pleasedWords = ['good', 'great', 'well done', 'strong', 'excellent', 'nice']
    const concernedWords = ['watch', 'careful', 'too many', 'filler', 'slow', 'avoid', 'losing']

    if (pleasedWords.some(w => lower.includes(w))) {
      setOverrideExpression('pleased')
      setTimeout(() => setOverrideExpression(null), 3000)
    } else if (concernedWords.some(w => lower.includes(w))) {
      setOverrideExpression('concerned')
      setTimeout(() => setOverrideExpression(null), 3000)
    }
  }

  // Uploads the completed audio recording and asks PAL to respond to the transcript.
  async function handleAudioReady(blob) {
    setIsTranscribing(true)
    setTranscript('')
    setPalReply('')

    try {
      const formData = new FormData()
      formData.append('file', blob, 'recording.webm')

      const response = await fetch(`${BACKEND_URL}/transcribe`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Transcription request failed')
      }

      const data = await response.json()
      const transcriptText = data.transcript
      setTranscript(transcriptText)
      setIsTranscribing(false)
      setIsPalThinking(true)

      try {
        const palResponse = await fetch(`${BACKEND_URL}/respond`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transcript: transcriptText }),
        })

        if (!palResponse.ok) {
          throw new Error('PAL response request failed')
        }

        const palData = await palResponse.json()
        const reply = palData.reply
        setPalReply(reply)
        setIsPalThinking(false)
        detectToneFromReply(reply)

        if (!isMuted) {
          speak(reply)
        }
      } catch {
        const fallbackReply = "I didn't catch that - try again."
        setPalReply(fallbackReply)
        setIsPalThinking(false)

        if (!isMuted) {
          speak(fallbackReply)
        }
      }
    } catch {
      setTranscript('Sorry, PAL could not transcribe that audio.')
    } finally {
      setIsTranscribing(false)
      setIsPalThinking(false)
    }
  }

  // Clears backend session memory and resets the visible conversation.
  async function handleNewSession() {
    try {
      await fetch(`${BACKEND_URL}/session/reset`, {
        method: 'POST',
      })
    } finally {
      setTranscript('')
      setPalReply('')
    }
  }

  // Toggles whether PAL should speak replies aloud automatically.
  function handleMuteToggle() {
    setIsMuted((currentValue) => !currentValue)
  }

  const baseExpression = getExpressionFromAppState(isRecording, isTranscribing, isPalThinking, isSpeaking)
  const expression = overrideExpression || baseExpression

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
          isMuted={isMuted}
          onNewSession={handleNewSession}
          onMuteToggle={handleMuteToggle}
        />
      </section>
    </>
  )
}

export default App
