export const EXPRESSIONS = {
  idle: {
    browAngle: 0,
    eyeScaleY: 1,
    mouthCurve: 10,
    showThoughtBubble: false,
    showPulseRing: false,
    animateMouth: false,
  },
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
  // 'streaming' is shown while sentence chunks are arriving but audio hasn't
  // started yet — a subtle attentive look, distinct from 'thinking'.
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

// Priority order (first match wins):
//   speaking  → PAL is playing audio
//   thinking  → waiting for first LLM token (isPalThinking)
//   streaming → LLM tokens arriving, audio not yet playing
//   thinking  → transcription in progress (reuses same face)
//   listening → mic is recording
//   idle      → default
export function getExpressionFromAppState(
  isRecording,
  isTranscribing,
  isPalThinking,
  isSpeaking,
  isStreaming,
) {
  if (isSpeaking) return 'speaking'
  if (isPalThinking) return 'thinking'
  if (isStreaming) return 'streaming'
  if (isTranscribing) return 'thinking'
  if (isRecording) return 'listening'
  return 'idle'
}
