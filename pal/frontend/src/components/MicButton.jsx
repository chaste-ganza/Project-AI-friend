import useMicrophone from '../hooks/useMicrophone'

// Renders the microphone controls and sends completed recordings upward.
function MicButton({
  onAudioReady,
  transcript,
  palReply,
  isTranscribing,
  isPalThinking,
  isSpeaking,
  isMuted,
  onNewSession,
  onMuteToggle,
}) {
  const { startRecording, stopRecording, error, isRecording } = useMicrophone()

  // Toggles recording and forwards the stopped audio Blob to the app.
  async function handleClick() {
    if (isRecording) {
      const blob = await stopRecording()
      if (blob) {
        onAudioReady(blob)
      }
      return
    }

    await startRecording()
  }

  return (
    <div className="mic-panel">
      <button
        type="button"
        className={
          isRecording
            ? 'mic-button recording'
            : isSpeaking
              ? 'mic-button disabled'
              : 'mic-button'
        }
        onClick={handleClick}
        disabled={isSpeaking}
      >
        {isRecording && <span className="recording-dot" aria-hidden="true" />}
        {isSpeaking ? 'PAL is speaking...' : isRecording ? 'Stop' : 'Start speaking'}
      </button>

      {error && (
        <p className="mic-error">
          Microphone access denied. Please allow microphone access in your
          browser.
        </p>
      )}

      {isTranscribing && <p className="loading-text">Transcribing...</p>}

      {transcript && (
        <div className="transcript-box">
          <p>{transcript}</p>
        </div>
      )}

      {(isPalThinking || palReply) && (
        <div className="pal-reply-box">
          <p>
            <strong>PAL:</strong> {isPalThinking ? 'PAL is thinking...' : palReply}
          </p>
          {isSpeaking && (
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
