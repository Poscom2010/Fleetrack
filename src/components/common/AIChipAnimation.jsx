import React from 'react';

const AIChipAnimation = ({ size = 120 }) => {
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background glow */}
        <defs>
          <radialGradient id="chipGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3">
              <animate
                attributeName="stopOpacity"
                values="0.3;0.6;0.3"
                dur="2s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
          </radialGradient>
          
          <linearGradient id="chipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          
          <filter id="chipShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1e40af" floodOpacity="0.5" />
          </filter>
        </defs>
        
        {/* Glow effect */}
        <circle cx="100" cy="100" r="80" fill="url(#chipGlow)" />
        
        {/* Main chip body */}
        <rect
          x="60"
          y="60"
          width="80"
          height="80"
          rx="8"
          fill="url(#chipGradient)"
          filter="url(#chipShadow)"
        >
          <animate
            attributeName="opacity"
            values="0.8;1;0.8"
            dur="2s"
            repeatCount="indefinite"
          />
        </rect>
        
        {/* Circuit lines - top */}
        <line x1="70" y1="50" x2="70" y2="60" stroke="#60a5fa" strokeWidth="2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
        </line>
        <line x1="90" y1="45" x2="90" y2="60" stroke="#60a5fa" strokeWidth="2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
        </line>
        <line x1="110" y1="45" x2="110" y2="60" stroke="#60a5fa" strokeWidth="2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.6s" repeatCount="indefinite" />
        </line>
        <line x1="130" y1="50" x2="130" y2="60" stroke="#60a5fa" strokeWidth="2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.9s" repeatCount="indefinite" />
        </line>
        
        {/* Circuit lines - bottom */}
        <line x1="70" y1="140" x2="70" y2="150" stroke="#60a5fa" strokeWidth="2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.2s" repeatCount="indefinite" />
        </line>
        <line x1="90" y1="140" x2="90" y2="155" stroke="#60a5fa" strokeWidth="2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
        </line>
        <line x1="110" y1="140" x2="110" y2="155" stroke="#60a5fa" strokeWidth="2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.8s" repeatCount="indefinite" />
        </line>
        <line x1="130" y1="140" x2="130" y2="150" stroke="#60a5fa" strokeWidth="2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="1.1s" repeatCount="indefinite" />
        </line>
        
        {/* Circuit lines - left */}
        <line x1="50" y1="70" x2="60" y2="70" stroke="#60a5fa" strokeWidth="2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.4s" repeatCount="indefinite" />
        </line>
        <line x1="45" y1="90" x2="60" y2="90" stroke="#60a5fa" strokeWidth="2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.7s" repeatCount="indefinite" />
        </line>
        <line x1="45" y1="110" x2="60" y2="110" stroke="#60a5fa" strokeWidth="2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="1.0s" repeatCount="indefinite" />
        </line>
        <line x1="50" y1="130" x2="60" y2="130" stroke="#60a5fa" strokeWidth="2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.1s" repeatCount="indefinite" />
        </line>
        
        {/* Circuit lines - right */}
        <line x1="140" y1="70" x2="150" y2="70" stroke="#60a5fa" strokeWidth="2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.6s" repeatCount="indefinite" />
        </line>
        <line x1="140" y1="90" x2="155" y2="90" stroke="#60a5fa" strokeWidth="2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.9s" repeatCount="indefinite" />
        </line>
        <line x1="140" y1="110" x2="155" y2="110" stroke="#60a5fa" strokeWidth="2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
        </line>
        <line x1="140" y1="130" x2="150" y2="130" stroke="#60a5fa" strokeWidth="2">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="1.2s" repeatCount="indefinite" />
        </line>
        
        {/* Central processing core */}
        <circle cx="100" cy="100" r="20" fill="#1e40af" opacity="0.8">
          <animate
            attributeName="r"
            values="20;22;20"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Inner core glow */}
        <circle cx="100" cy="100" r="15" fill="#60a5fa">
          <animate
            attributeName="opacity"
            values="0.5;1;0.5"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Data flow particles */}
        <circle cx="80" cy="80" r="2" fill="#93c5fd">
          <animate
            attributeName="cx"
            values="80;120;80"
            dur="3s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="cy"
            values="80;120;80"
            dur="3s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0;1;0"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
        
        <circle cx="120" cy="80" r="2" fill="#93c5fd">
          <animate
            attributeName="cx"
            values="120;80;120"
            dur="3s"
            begin="1s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="cy"
            values="80;120;80"
            dur="3s"
            begin="1s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0;1;0"
            dur="3s"
            begin="1s"
            repeatCount="indefinite"
          />
        </circle>
        
        <circle cx="80" cy="120" r="2" fill="#93c5fd">
          <animate
            attributeName="cx"
            values="80;120;80"
            dur="3s"
            begin="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="cy"
            values="120;80;120"
            dur="3s"
            begin="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0;1;0"
            dur="3s"
            begin="2s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Corner connection points */}
        <circle cx="70" cy="70" r="3" fill="#3b82f6" />
        <circle cx="130" cy="70" r="3" fill="#3b82f6" />
        <circle cx="70" cy="130" r="3" fill="#3b82f6" />
        <circle cx="130" cy="130" r="3" fill="#3b82f6" />
      </svg>
      
      {/* Rotating ring effect */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-full border-2 border-blue-400/30 rounded-full animate-spin-slow" style={{ animationDuration: '8s' }}></div>
      </div>
    </div>
  );
};

export default AIChipAnimation;
