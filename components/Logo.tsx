import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

export const OpenBanqueIcon: React.FC<{ size?: number | string; className?: string }> = ({ 
  size = 36, 
  className = '' 
}) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      width={size} 
      height={size}
      className={`flex-shrink-0 drop-shadow-md ${className}`}
    >
      <defs>
        <linearGradient id="obLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="obLogoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      
      {/* Container Background */}
      <rect width="100" height="100" rx="26" fill="url(#obLogoBg)" />
      <rect width="98" height="98" x="1" y="1" rx="25" fill="none" stroke="rgba(52, 211, 153, 0.35)" strokeWidth="2" />
      
      {/* Outer Open Ring (O) */}
      <path 
        d="M 50 18 C 32 18 20 31 20 49 C 20 67 32 80 50 80 C 67 80 79 67 80 50" 
        fill="none" 
        stroke="url(#obLogoGradient)" 
        strokeWidth="8" 
        strokeLinecap="round" 
      />
      
      {/* Accent beacon */}
      <circle cx="76" cy="24" r="5" fill="#34d399" />
      
      {/* Central 'B' */}
      <path 
        d="M 40 33 L 40 65 M 40 33 H 53 C 59.5 33 63.5 36.5 63.5 41.5 C 63.5 46 59.5 49 53 49 H 40 M 40 49 H 55 C 62 49 65.5 52 65.5 57 C 65.5 62.5 61.5 65 55 65 H 40" 
        fill="none" 
        stroke="#ffffff" 
        strokeWidth="5.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  showTagline = false,
  className = '',
  onClick
}) => {
  const sizeMap = {
    sm: { icon: 28, text: 'text-lg', subtext: 'text-[8px]' },
    md: { icon: 38, text: 'text-xl', subtext: 'text-[9px]' },
    lg: { icon: 48, text: 'text-2xl', subtext: 'text-[10px]' },
    xl: { icon: 64, text: 'text-4xl', subtext: 'text-xs' }
  };

  const currentSize = sizeMap[size];

  return (
    <div 
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <OpenBanqueIcon size={currentSize.icon} />
      
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center tracking-wider font-sans">
            <span className={`${currentSize.text} font-black text-white`}>OPEN</span>
            <span className={`${currentSize.text} font-bold text-emerald-400 ml-1.5`}>BANQUE</span>
          </div>
          {showTagline && (
            <span className={`${currentSize.subtext} font-semibold uppercase tracking-[0.25em] text-emerald-500/80 mt-1`}>
              The Future of Banking
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
