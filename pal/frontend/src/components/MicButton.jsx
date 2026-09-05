// MicButton — Phase 2
// The push-to-talk button is gone. This component now shows VAD status and
// exposes a single mute/unmute toggle for the auto-listening system.

function MicButton({
  isVadReady,
  isListening,
  isSpeechDetected,
  isPalThinking,
  isSpeaking,
  isStreaming,
  isMuted,
  onToggleMute,
  transcript,
  palReply,
  isTranscribing,
  vadError,
  onNewSession,
}) {
  // ── Status line shown below the face ──────────────────────────────────────
  function statusText() {
    if (!isVadReady)        return 'Starting up…'
    if (isMuted)            return 'Auto-listen paused'
    if (isSpeaking)         return 'PAL is speaking…'
    if (isStreaming)        return 'PAL is responding…'
    if (isPalThinking)      return 'PAL is thinking…'
    if (isSpeechDetected)   return 'Listening…'
    if (isListening)        return 'Waiting for you to speak'
    return 'Initialising mic…'
  }

  // ── Mute button appearance ─────────────────────────────────────────────────
  function muteButtonClass() {
    if (isMuted)     return 'mic-button muted'
    if (!isVadReady) return 'mic-button disabled'
    return 'mic-button'
  }

  function muteButtonLabel() {
    return isMuted ? '🎤 Resume listening' : '🔇 Pause listening'
  }

  return (
    <div className="mic-panel">

      {/* VAD status indicator */}
      <div className="vad-status" aria-live="polite">
        {isListening && !isMuted && !isSpeaking && !isStreaming && !isPalThinking && (
          <span className={`vad-dot ${isSpeechDetected ? 'active' : ''}`} aria-hidden="true" />
        )}
        <span className="vad-status-text">{statusText()}</span>
      </div>

      {/* Mute / unmute toggle — the only manual control left */}
      <button
        type="button"
        className={muteButtonClass()}
        onClick={onToggleMute}
        disabled={!isVadReady}
        aria-pressed={isMuted}
      >
        {muteButtonLabel()}
      </button>

      {vadError && (
        <p className="mic-error" role="alert">{vadError}</p>
      )}

      {isTranscribing && (
        <p className="loading-text">Transcribing…</p>
      )}

      {transcript && (
        <div className="transcript-box">
          <p>{transcript}</p>
        </div>
      )}

      {(isPalThinking || isStreaming || palReply) && (
        <div className="pal-reply-box">
          <p>
            <strong>PAL:</strong>{' '}
            {isPalThinking && !palReply ? 'PAL is thinking…' : palReply}
          </p>
          {(isSpeaking || isStreaming) && (
            <span className="speaking-indicator" aria-label="PAL is speaking">
              <span /><span /><span />
            </span>
          )}
        </div>
      )}

      <button type="button" className="session-button" onClick={onNewSession}>
        Start new session
      </button>
    </div>
  )
}

export default MicButton
