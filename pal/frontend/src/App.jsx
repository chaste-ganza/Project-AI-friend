import { useState } from 'react'
import MicButton from './components/MicButton'
import useTTS from './hooks/useTTS'
import heroImg from './assets/hero.png'
import './App.css'

// Renders the PAL speech coach and coordinates transcription, replies, and speech.
function App() {
  const [transcript, setTranscript] = useState('')
  const [palReply, setPalReply] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isPalThinking, setIsPalThinking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const { speak, isSpeaking } = useTTS()

  // Uploads the completed audio recording and asks PAL to respond to the transcript.
  async function handleAudioReady(blob) {
    setIsTranscribing(true)
    setTranscript('')
    setPalReply('')

    try {
      const formData = new FormData()
      formData.append('file', blob, 'recording.webm')

      const response = await fetch('http://localhost:8000/transcribe', {
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
        const palResponse = await fetch('http://localhost:8000/respond', {
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
      await fetch('http://localhost:8000/session/reset', {
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

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
        </div>
        <div>
          <h1>PAL</h1>
          <p>Your voice AI speech coach</p>
        </div>
        <MicButton
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
