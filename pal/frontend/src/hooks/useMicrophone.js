import { useEffect, useRef, useState } from 'react'

const AUDIO_TYPE = 'audio/webm'

// Manages microphone access, recording state, and cleanup for recorded audio.
function useMicrophone() {
  const [audioBlob, setAudioBlob] = useState(null)
  const [error, setError] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const chunksRef = useRef([])
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)

  // Requests microphone permission and starts collecting audio chunks.
  async function startRecording() {
    try {
      setAudioBlob(null)
      setError(null)
      chunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const options = MediaRecorder.isTypeSupported(AUDIO_TYPE)
        ? { mimeType: AUDIO_TYPE }
        : undefined
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      setError(err)
      setIsRecording(false)
    }
  }

  // Stops recording and resolves with the final audio Blob.
  function stopRecording() {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(audioBlob)
        return
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: AUDIO_TYPE })
        setAudioBlob(blob)
        setIsRecording(false)

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

        mediaRecorderRef.current = null
        resolve(blob)
      }

      mediaRecorder.stop()
    })
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return { startRecording, stopRecording, audioBlob, error, isRecording }
}

export default useMicrophone
