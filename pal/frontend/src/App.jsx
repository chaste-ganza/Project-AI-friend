import { useState } from 'react'
import MicButton from './components/MicButton'
import heroImg from './assets/hero.png'
import './App.css'

// Renders the PAL speech coach and coordinates transcription requests.
function App() {
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)

  // Uploads the completed audio recording and stores the returned transcript.
  async function handleAudioReady(blob) {
    setIsTranscribing(true)
    setTranscript('')

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
      setTranscript(data.transcript)
    } catch {
      setTranscript('Sorry, PAL could not transcribe that audio.')
    } finally {
      setIsTranscribing(false)
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
          isTranscribing={isTranscribing}
        />
      </section>
    </>
  )
}

export default App
