import useMicrophone from '../hooks/useMicrophone'

// Renders the microphone controls and sends completed recordings upward.
function MicButton({ onAudioReady, transcript, isTranscribing }) {
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
        className={isRecording ? 'mic-button recording' : 'mic-button'}
        onClick={handleClick}
      >
        {isRecording && <span className="recording-dot" aria-hidden="true" />}
        {isRecording ? 'Stop' : 'Start speaking'}
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
    </div>
  )
}

export default MicButton
