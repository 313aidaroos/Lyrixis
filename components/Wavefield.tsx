"use client";

export function Wavefield() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
      viewBox="0 0 1200 700"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="waveGrad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="55%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <path
        d="M0 360 Q 150 280 300 360 T 600 360 T 900 360 T 1200 360"
        fill="none"
        stroke="url(#waveGrad)"
        strokeWidth="1.6"
      >
        <animate
          attributeName="d"
          dur="8s"
          repeatCount="indefinite"
          values="M0 360 Q 150 280 300 360 T 600 360 T 900 360 T 1200 360;M0 360 Q 150 420 300 360 T 600 360 T 900 360 T 1200 360;M0 360 Q 150 280 300 360 T 600 360 T 900 360 T 1200 360"
        />
      </path>
      <path
        d="M0 410 Q 200 340 400 410 T 800 410 T 1200 410"
        fill="none"
        stroke="url(#waveGrad)"
        strokeWidth="1.2"
        opacity="0.5"
      >
        <animate
          attributeName="d"
          dur="11s"
          repeatCount="indefinite"
          values="M0 410 Q 200 340 400 410 T 800 410 T 1200 410;M0 410 Q 200 470 400 410 T 800 410 T 1200 410;M0 410 Q 200 340 400 410 T 800 410 T 1200 410"
        />
      </path>
    </svg>
  );
}
