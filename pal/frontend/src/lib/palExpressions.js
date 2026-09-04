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

export function getExpressionFromAppState(isRecording, isTranscribing, isPalThinking, isSpeaking) {
  if (isSpeaking) return 'speaking'
  if (isPalThinking) return 'thinking'
  if (isTranscribing) return 'thinking'
  if (isRecording) return 'listening'
  return 'idle'
}
