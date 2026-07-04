import { useState } from 'react'
import MicButton from './components/MicButton'
import heroImg from './assets/hero.png'
import './App.css'

// Renders the PAL speech coach and coordinates transcription requests.
function App() {
  const [transcript, setTranscript] = useState('')
  const [palReply, setPalReply] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isPalThinking, setIsPalThinking] = useState(false)

  // Uploads the completed audio recording and stores the returned transcript.
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
        setPalReply(palData.reply)
      } catch {
        setPalReply("I didn't catch that — try again.")
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
          onNewSession={handleNewSession}
        />
      </section>
    </>
  )
}

export default App
