import React from 'react'
import './PalFace.css'
import { EXPRESSIONS } from '../lib/palExpressions'

function PalFace({ expression = 'idle' }) {
  const currentExpression = EXPRESSIONS[expression] || EXPRESSIONS.idle
  const {
    browAngle,
    eyeScaleY,
    mouthCurve,
    showThoughtBubble,
    showPulseRing,
    animateMouth,
  } = currentExpression

  return (
    <div className={`pal-face-container ${expression === 'idle' ? 'pal-idle' : ''} ${expression === 'thinking' ? 'pal-thinking' : ''}`}>
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        {/* Listening pulse ring */}
        {showPulseRing && (
          <circle cx="100" cy="100" r="90" fill="none" stroke="#a0c4ff" strokeWidth="2">
            <animate attributeName="r" values="90; 98; 90" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2; 0.4; 0.2" dur="2s" repeatCount="indefinite" />
          </circle>
        )}

        {/* Base face */}
        <circle cx="100" cy="100" r="90" fill="#1a1a2e" stroke="#3d3d6b" strokeWidth="1.5" />

        {/* Left eye */}
        <g 
          className="pal-eye left"
          style={{ 
            '--target-scale': eyeScaleY,
            transformOrigin: '70px 85px' 
          }}
        >
          <ellipse cx="70" cy="85" rx="11" ry="13" fill="#a0c4ff" />
          <circle cx="72" cy="85" r="5" fill="#1a1a2e" />
        </g>

        {/* Right eye */}
        <g 
          className="pal-eye right"
          style={{ 
            '--target-scale': eyeScaleY,
            transformOrigin: '130px 85px' 
          }}
        >
          <ellipse cx="130" cy="85" rx="11" ry="13" fill="#a0c4ff" />
          <circle cx="128" cy="85" r="5" fill="#1a1a2e" />
        </g>

        {/* Left brow */}
        <line
          x1="60" y1="60" x2="80" y2="60"
          stroke="#a0c4ff" strokeWidth="2.5" strokeLinecap="round"
          className="pal-brow"
          style={{ 
            '--brow-rotate': `${browAngle}deg`,
            transformOrigin: '70px 60px' 
          }}
        />

        {/* Right brow */}
        <line
          x1="120" y1="60" x2="140" y2="60"
          stroke="#a0c4ff" strokeWidth="2.5" strokeLinecap="round"
          className="pal-brow"
          style={{ 
            '--brow-rotate': `${-browAngle}deg`,
            transformOrigin: '130px 60px' 
          }}
        />

        {/* Mouth */}
        {animateMouth ? (
          <g>
            {/* Speaking animation uses SVG animate on overlapping ellipses */}
            <ellipse cx="100" cy="130" rx="35" ry="3" fill="#a0c4ff">
              <animate attributeName="ry" values="3; 15; 3" dur="0.35s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="100" cy="130" rx="30" ry="1" fill="#1a1a2e">
              <animate attributeName="ry" values="1; 10; 1" dur="0.35s" repeatCount="indefinite" />
            </ellipse>
          </g>
        ) : (
          <path
            d={`M 65 130 Q 100 ${130 + mouthCurve} 135 130`}
            stroke="#a0c4ff"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            className="pal-mouth"
          />
        )}

        {/* Thinking thought bubble */}
        {showThoughtBubble && (
          <g>
            <circle cx="130" cy="70" r="5" fill="#a0c4ff" opacity="0.3">
              <animate attributeName="opacity" values="0.3; 0.9; 0.3" dur="1s" begin="0s" repeatCount="indefinite" />
            </circle>
            <circle cx="142" cy="56" r="7" fill="#a0c4ff" opacity="0.3">
              <animate attributeName="opacity" values="0.3; 0.9; 0.3" dur="1s" begin="0.3s" repeatCount="indefinite" />
            </circle>
            <circle cx="152" cy="44" r="9" fill="#a0c4ff" opacity="0.3">
              <animate attributeName="opacity" values="0.3; 0.9; 0.3" dur="1s" begin="0.6s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>
    </div>
  )
}

export default PalFace
