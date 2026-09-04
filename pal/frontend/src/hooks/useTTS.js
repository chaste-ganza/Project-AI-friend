import { useState } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

// Speaks PAL replies by trying backend audio first, then falling back to browser TTS.
// NOTE: This hook is retained for the /speak rollback path only.
// The active streaming path uses useConverse instead.
function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Uses the browser Web Speech API when ElevenLabs audio is unavailable.
  function speakWithBrowser(text) {
    return new Promise((resolve) => {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        setIsSpeaking(false)
        resolve()
        return
      }

      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      const voices = window.speechSynthesis.getVoices()
      const preferredVoice = voices.find(
        (voice) => voice.name.includes('Google') || voice.name.includes('Daniel'),
      )

      if (preferredVoice) {
        utterance.voice = preferredVoice
      }

      utterance.rate = 0.95
      utterance.pitch = 1.0
      utterance.onend = () => {
        setIsSpeaking(false)
        resolve()
      }
      utterance.onerror = () => {
        setIsSpeaking(false)
        resolve()
      }

      window.speechSynthesis.speak(utterance)
    })
  }

  // Requests speech audio from the backend and plays it, with browser TTS fallback.
  async function speak(text) {
    if (!text) {
      return
    }

    setIsSpeaking(true)

    try {
      const response = await fetch(`${BACKEND_URL}/speak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error('Speech request failed')
      }

      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        const data = await response.json()
        if (data.use_browser_tts) {
          await speakWithBrowser(text)
          return
        }
      }

      const audioBlob = await response.blob()
      const objectURL = URL.createObjectURL(audioBlob)
      const audio = new Audio(objectURL)

      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(objectURL)
      }
      audio.onerror = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(objectURL)
      }

      await audio.play()
    } catch {
      await speakWithBrowser(text)
    }
  }

  return { speak, isSpeaking }
}

export default useTTS
