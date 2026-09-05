export const EXPRESSIONS = {
  idle: {
    browAngle: 0,
    eyeScaleY: 1,
    mouthCurve: 10,
    showThoughtBubble: false,
    showPulseRing: false,
    animateMouth: false,
  },
  // VAD is active and quiet — PAL is passively waiting for the user to speak.
  vadIdle: {
    browAngle: 0,
    eyeScaleY: 1,
    mouthCurve: 8,
    showThoughtBubble: false,
    showPulseRing: false,
    animateMouth: false,
  },
  // VAD is running and has detected speech — user is currently talking.
  listening: {
    browAngle: -5,
    eyeScaleY: 1.15,
    mouthCurve: 25,
    showThoughtBubble: false,
    showPulseRing: true,
    animateMouth: false,
  },
  thinking: {
    browAngle: 5,
    eyeScaleY: 0.8,
    mouthCurve: 0,
    showThoughtBubble: true,
    showPulseRing: false,
    animateMouth: false,
  },
  // Sentence chunks arriving, audio not playing yet.
  streaming: {
    browAngle: 2,
    eyeScaleY: 1.05,
    mouthCurve: 12,
    showThoughtBubble: false,
    showPulseRing: true,
    animateMouth: false,
  },
  speaking: {
    browAngle: 0,
    eyeScaleY: 1,
    mouthCurve: 15,
    showThoughtBubble: false,
    showPulseRing: false,
    animateMouth: true,
  },
  // Auto-listen is paused by the user.
  muted: {
    browAngle: -3,
    eyeScaleY: 0.95,
    mouthCurve: 5,
    showThoughtBubble: false,
    showPulseRing: false,
    animateMouth: false,
  },
  concerned: {
    browAngle: -15,
    eyeScaleY: 0.9,
    mouthCurve: -15,
    showThoughtBubble: false,
    showPulseRing: false,
    animateMouth: false,
  },
  pleased: {
    browAngle: 10,
    eyeScaleY: 1.1,
    mouthCurve: 25,
    showThoughtBubble: false,
    showPulseRing: false,
    animateMouth: false,
  },
}

/**
 * Resolves the current PalFace expression from app state.
 *
 * Priority order (first match wins):
 *   speaking        → PAL audio is playing
 *   thinking        → waiting for first LLM token
 *   streaming       → LLM tokens arriving, no audio yet
 *   thinking        → transcription in progress
 *   listening       → VAD has detected speech (user is talking)
 *   muted           → user paused auto-listen
 *   vadIdle         → VAD active, no speech detected
 *   idle            → VAD not yet ready
 */
export function getExpressionFromAppState({
  isListening,
  isSpeechDetected,
  isTranscribing,
  isPalThinking,
  isSpeaking,
  isStreaming,
  isMuted,
}) {
  if (isSpeaking)       return 'speaking'
  if (isPalThinking)    return 'thinking'
  if (isStreaming)      return 'streaming'
  if (isTranscribing)   return 'thinking'
  if (isSpeechDetected) return 'listening'
  if (isMuted)          return 'muted'
  if (isListening)      return 'vadIdle'
  return 'idle'
}
