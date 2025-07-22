export function PBLabLogo() {
  return (
    <div className="flex items-center gap-3">
      <svg
        aria-label="PBLab logo"
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary"
      >
        {/* Chat bubble background */}
        <path
          d="M24 4H8C5.79086 4 4 5.79086 4 8V18C4 20.2091 5.79086 22 8 22H12L16 26L20 22H24C26.2091 22 28 20.2091 28 18V8C28 5.79086 26.2091 4 24 4Z"
          fill="currentColor"
          opacity="0.1"
        />
        <path
          d="M24 4H8C5.79086 4 4 5.79086 4 8V18C4 20.2091 5.79086 22 8 22H12L16 26L20 22H24C26.2091 22 28 20.2091 28 18V8C28 5.79086 26.2091 4 24 4Z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        
        {/* Lightbulb inside */}
        <g transform="translate(10, 8)">
          {/* Bulb shape */}
          <path
            d="M6 2C8.20914 2 10 3.79086 10 6C10 7.30622 9.41421 8.47413 8.5 9.23607V11C8.5 11.2761 8.27614 11.5 8 11.5H4C3.72386 11.5 3.5 11.2761 3.5 11V9.23607C2.58579 8.47413 2 7.30622 2 6C2 3.79086 3.79086 2 6 2Z"
            fill="currentColor"
            opacity="0.8"
          />
          {/* Base/screw threads */}
          <rect x="4" y="11.5" width="4" height="0.5" fill="currentColor" opacity="0.6"/>
          <rect x="4" y="12" width="4" height="0.5" fill="currentColor" opacity="0.4"/>
          
          {/* Light rays */}
          <g opacity="0.6">
            <line x1="6" y1="0.5" x2="6" y2="1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            <line x1="10.5" y1="3" x2="9.5" y2="3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            <line x1="9.89" y1="1.11" x2="9.18" y2="1.82" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            <line x1="2.11" y1="1.11" x2="2.82" y2="1.82" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            <line x1="1.5" y1="3" x2="2.5" y2="3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
          </g>
        </g>
      </svg>
      
      <span className="text-xl font-bold text-foreground">PBLab</span>
    </div>
  );
} 