import { useEffect } from 'react'
import useMicrophone from '../hooks/useMicrophone'

// Renders the microphone controls and sends completed recordings upward.
function MicButton({
  onAudioReady,
  transcript,
  palReply,
  isTranscribing,
  isPalThinking,
  isSpeaking,
  isStreaming,
  isMuted,
  converseError,
  onNewSession,
  onMuteToggle,
  onRecordingChange,
}) {
  const { startRecording, stopRecording, error: micError, isRecording } = useMicrophone()

  useEffect(() => {
    if (onRecordingChange) onRecordingChange(isRecording)
  }, [isRecording, onRecordingChange])

  // Toggles recording and forwards the stopped audio Blob to the app.
  async function handleClick() {
    if (isRecording) {
      const blob = await stopRecording()
      if (blob) onAudioReady(blob)
      return
    }
    await startRecording()
  }

  // Button is disabled while PAL is speaking, streaming, or thinking.
  const isDisabled = isSpeaking || isStreaming || isPalThinking

  function buttonClass() {
    if (isRecording) return 'mic-button recording'
    if (isSpeaking) return 'mic-button disabled'
    if (isStreaming || isPalThinking) return 'mic-button streaming'
    return 'mic-button'
  }

  function buttonLabel() {
    if (isSpeaking) return 'PAL is speaking...'
    if (isStreaming) return 'PAL is responding...'
    if (isPalThinking) return 'PAL is thinking...'
    if (isRecording) return 'Stop'
    return 'Start speaking'
  }

  return (
    <div className="mic-panel">
      <button
        type="button"
        className={buttonClass()}
        onClick={handleClick}
        disabled={isDisabled}
      >
        {isRecording && <span className="recording-dot" aria-hidden="true" />}
        {buttonLabel()}
      </button>

      {(micError || converseError) && (
        <p className="mic-error">
          {micError
            ? 'Microphone access denied. Please allow microphone access in your browser.'
            : converseError}
        </p>
      )}

      {isTranscribing && <p className="loading-text">Transcribing...</p>}

      {transcript && (
        <div className="transcript-box">
          <p>{transcript}</p>
        </div>
      )}

      {(isPalThinking || isStreaming || palReply) && (
        <div className="pal-reply-box">
          <p>
            <strong>PAL:</strong>{' '}
            {isPalThinking && !palReply ? 'PAL is thinking...' : palReply}
          </p>
          {(isSpeaking || isStreaming) && (
            <span className="speaking-indicator" aria-label="PAL is speaking">
              <span />
              <span />
              <span />
            </span>
          )}
        </div>
      )}

      <button type="button" className="session-button" onClick={onMuteToggle}>
        {isMuted ? 'Unmute PAL' : 'Mute PAL'}
      </button>

      <button type="button" className="session-button" onClick={onNewSession}>
        Start new session
      </button>
    </div>
  )
}

export default MicButton
