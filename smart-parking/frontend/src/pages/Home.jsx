import React from 'react';
import { Link } from 'react-router-dom';
import './home.css';

function SupercarSVG() {
  return (
    <svg
      width="520"
      height="220"
      viewBox="0 0 520 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ maxWidth: '100%', height: 'auto', zIndex: 2, position: 'relative' }}
    >
      <defs>
        <filter id="glowRed" x="-40" y="-40" width="600" height="300" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 0.2 0 0 0  0 0 0.2 0  0 0 0 1 0"
            result="redGlow"
          />
          <feMerge>
            <feMergeNode in="redGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="soft" x="-50" y="-50" width="620" height="320" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="6" />
        </filter>

        <linearGradient id="carBody" x1="140" y1="80" x2="420" y2="170" gradientUnits="userSpaceOnUse">
          <stop stopColor="#111" />
          <stop offset="0.55" stopColor="#0a0a0a" />
          <stop offset="1" stopColor="#050505" />
        </linearGradient>

        <linearGradient id="accent" x1="140" y1="90" x2="420" y2="170" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e94560" />
          <stop offset="1" stopColor="#ff4d6d" />
        </linearGradient>
      </defs>

      {/* Speed lines behind car */}
      <g opacity="0.5">
        {Array.from({ length: 16 }).map((_, i) => {
          const x = 20 + i * 30;
          return (
            <path
              key={i}
              d={`M${x} 170 L${x + 40} 120`}
              stroke="#e94560"
              strokeWidth="2"
              strokeLinecap="round"
              className="sp-speedlines"
              style={{ animationDelay: `${i * 0.08}s` }}
            />
          );
        })}
      </g>

      {/* Neon underglow */}
      <ellipse cx="270" cy="172" rx="190" ry="26" fill="#e94560" opacity="0.22" filter="url(#soft)" />
      <ellipse cx="270" cy="175" rx="155" ry="16" fill="#e94560" opacity="0.18" />

      {/* Car body */}
      <g filter="url(#glowRed)">
        <path
          d="M95 138C118 118 150 105 190 100C232 95 275 96 315 100C350 104 382 112 412 127C422 132 430 139 433 146C440 162 438 170 424 170H102C88 170 83 156 95 138Z"
          fill="url(#carBody)"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="2"
        />
        <path
          d="M178 114C210 105 260 105 304 112C320 115 342 122 360 132C344 135 320 136 278 136C235 136 206 132 184 127C181 123 180 118 178 114Z"
          fill="rgba(201,168,76,0.06)"
        />
        <path
          d="M214 120C230 116 250 116 270 119C283 121 300 126 312 132C294 135 274 136 252 135C236 134 224 132 214 120Z"
          fill="rgba(233,69,96,0.12)"
        />

        {/* Windshield */}
        <path
          d="M214 109C242 101 270 101 297 107C308 109 320 113 327 117C315 122 284 124 255 122C235 120 223 117 214 109Z"
          fill="#000"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth="2"
        />

        {/* Body lines */}
        <path
          d="M106 150C150 140 200 138 260 140C318 142 370 148 418 160"
          stroke="url(#accent)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path
          d="M135 132C165 123 200 120 255 121C308 122 345 126 382 136"
          stroke="rgba(201,168,76,0.35)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Wheels */}
        <g>
          <circle cx="165" cy="170" r="20" fill="#060606" stroke="rgba(255,255,255,0.10)" strokeWidth="2" />
          <circle cx="165" cy="170" r="10" fill="#0f0f0f" stroke="rgba(201,168,76,0.25)" strokeWidth="2" />
          <circle cx="165" cy="170" r="5" fill="#c9a84c" opacity="0.35" />

          <circle cx="370" cy="170" r="20" fill="#060606" stroke="rgba(255,255,255,0.10)" strokeWidth="2" />
          <circle cx="370" cy="170" r="10" fill="#0f0f0f" stroke="rgba(201,168,76,0.25)" strokeWidth="2" />
          <circle cx="370" cy="170" r="5" fill="#c9a84c" opacity="0.35" />
        </g>

        {/* Headlights */}
        <g className="sp-headlights">
          <path d="M402 132C412 138 420 145 424 152C410 152 394 149 388 146C392 140 396 135 402 132Z" fill="#eaf0ff" opacity="0.12" />
          <circle cx="413" cy="147" r="6" fill="#e94560" opacity="0.35" />
          <circle cx="413" cy="147" r="3" fill="#ffffff" opacity="0.9" />
        </g>

        {/* Tail accent */}
        <path
          d="M120 155C136 152 155 151 168 152C165 158 150 164 130 165C118 165 113 160 120 155Z"
          fill="rgba(233,69,96,0.25)"
        />
      </g>
    </svg>
  );
}

export default function Home() {
  return (
    <div className="sp-home">
      <div
        className="sp-hero"
        style={{
          position: 'relative',
          minHeight: '100vh',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.45,
            zIndex: 0,
          }}
        >
          <source src="/videos/bg.mp4" type="video/mp4" />
        </video>

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0.4))',
            zIndex: 1,
          }}
        />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="sp-hero-content">
            <h1 className="sp-hero-title">SMARTPARK</h1>
            <p className="sp-hero-subtitle">Premium Parking. Engineered for Excellence.</p>

            <div className="sp-hero-actions">
              <Link className="sp-btn sp-btn-primary" to="/login">
                Enter System
              </Link>
              <Link className="sp-btn sp-btn-secondary" to="/slots">
                View Slots
              </Link>
            </div>

            <div className="sp-supercar-wrap">
              <SupercarSVG />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2 - Features */}
      <div className="sp-features" aria-label="Features">
        <div className="sp-card sp-card-glass sp-anim-in fade-in">
          <div className="sp-card-icon">🏎️</div>
          <h3>Instant Entry</h3>
          <p>Camera detects plate in seconds.</p>
        </div>
        <div className="sp-card sp-card-glass sp-anim-in fade-in" style={{ animationDelay: '120ms' }}>
          <div className="sp-card-icon">🅿️</div>
          <h3>100 Premium Bays</h3>
          <p>Real-time availability.</p>
        </div>
        <div className="sp-card sp-card-glass sp-anim-in fade-in" style={{ animationDelay: '220ms' }}>
          <div className="sp-card-icon">⚡</div>
          <h3>Auto Billing</h3>
          <p>Exit and pay in 30 seconds.</p>
        </div>
        <div className="sp-card sp-card-glass sp-anim-in fade-in" style={{ animationDelay: '320ms' }}>
          <div className="sp-card-icon">🔒</div>
          <h3>Secure System</h3>
          <p>JWT protected access.</p>
        </div>
      </div>

      {/* Section 3 - Stats bar */}
      <div className="sp-statsbar">
        <div className="sp-stat">
          <span className="sp-stat-value">500+</span>
          <span className="sp-stat-label">Vehicles Served</span>
        </div>
        <div className="sp-divider" />
        <div className="sp-stat">
          <span className="sp-stat-value">99.9%</span>
          <span className="sp-stat-label">Uptime</span>
        </div>
        <div className="sp-divider" />
        <div className="sp-stat">
          <span className="sp-stat-value">< 30s</span>
          <span className="sp-stat-label">Exit Time</span>
        </div>
      </div>
    </div>
  );
}

