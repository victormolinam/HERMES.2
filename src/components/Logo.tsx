import React from 'react';

interface LogoProps {
  size?: number | string;
  className?: string;
  theme?: 'light' | 'dark';
}

export function Logo({ size = 48, className = '', theme = 'dark' }: LogoProps) {
  // We can choose colors based on theme if needed, but modern vector outlines in slate/blue fit both perfectly.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="plumeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.1" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="earthGlow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
          <stop offset="25%" stopColor="#60a5fa" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.95" />
          <stop offset="75%" stopColor="#60a5fa" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Subtle radial background glow */}
      <circle cx="100" cy="80" r="75" fill="url(#glow)" />

      {/* Earth atmosphere glow at the bottom */}
      <path
        d="M20 182 C65 158 135 158 180 182"
        stroke="url(#earthGlow)"
        strokeWidth="5"
        strokeLinecap="round"
        className="opacity-90 filters drop-shadow-[0_0_4px_rgba(56,189,248,0.5)]"
      />

      {/* Rocket Flame / Plume lines */}
      {/* Central flame trail */}
      <line
        x1="100"
        y1="126"
        x2="100"
        y2="164"
        stroke="url(#plumeGradient)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Inner Left flame trail */}
      <line
        x1="92"
        y1="126"
        x2="85"
        y2="156"
        stroke="url(#plumeGradient)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Inner Right flame trail */}
      <line
        x1="108"
        y1="126"
        x2="115"
        y2="156"
        stroke="url(#plumeGradient)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Outer Left flame trail */}
      <line
        x1="84"
        y1="126"
        x2="73"
        y2="148"
        stroke="url(#plumeGradient)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Outer Right flame trail */}
      <line
        x1="116"
        y1="126"
        x2="127"
        y2="148"
        stroke="url(#plumeGradient)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Rocket Main Body Outlines */}
      <path
        d="M100 24 C116 52 120 78 120 106 L120 118 L80 118 L80 106 C80 78 84 52 100 24 Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Inner detailing line */}
      <line
        x1="100"
        y1="82"
        x2="100"
        y2="118"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-75"
      />

      {/* Viewport circular window */}
      <circle
        cx="100"
        cy="64"
        r="11"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={theme === 'dark' ? '#0f172a' : '#ffffff'}
      />

      {/* Left Aerodynamic Fin */}
      <path
        d="M80 92 C67 101 62 112 62 125 C73 125 79 122 80 118"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right Aerodynamic Fin */}
      <path
        d="M120 92 C133 101 138 112 138 125 C127 125 121 122 120 118"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Nozzle Assembly */}
      <path
        d="M87 118 L87 122 C87 123 88 124 89 124 L111 124 C112 124 113 123 113 122 L113 118"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AppIcon({ size = 120, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-[28px] overflow-hidden shadow-2xl bg-gradient-to-b from-[#0b1329] via-[#040814] to-[#02050c] border border-slate-800 p-2 ${className}`} style={{ width: size, height: size }}>
      {/* Ambient background accent light */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(56,189,248,0.15),transparent_60%)] pointer-events-none" />
      <Logo size={size * 0.7} className="text-slate-100 relative z-10" theme="dark" />
    </div>
  );
}
