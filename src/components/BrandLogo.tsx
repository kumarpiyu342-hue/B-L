import React from 'react';

interface BrandLogoProps {
  variant?: 'full' | 'compact' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  tone?: 'light' | 'dark';
  subtitle?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  size = 'md',
  tone = 'light',
  subtitle,
}) => {
  const dim =
    size === 'sm'
      ? 'w-7 h-7'
      : size === 'lg'
        ? 'w-11 h-11'
        : 'w-9 h-9';

  const titleSize =
    size === 'sm'
      ? 'text-sm'
      : size === 'lg'
        ? 'text-xl'
        : 'text-base';

  const titleColor = tone === 'dark' ? 'text-amber-50' : 'text-stone-900';
  const subColor = tone === 'dark' ? 'text-amber-300/80' : 'text-amber-700';

  return (
    <div className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${dim} shrink-0`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="bnlObsidianGrad" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#292524" />
            <stop offset="100%" stopColor="#0c0a09" />
          </linearGradient>
          <linearGradient id="bnlGoldCoinGrad" x1="21" y1="19" x2="35" y2="35" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="55%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#bnlObsidianGrad)" />
        <rect
          x="2.75"
          y="2.75"
          width="34.5"
          height="34.5"
          rx="9.25"
          stroke="#eab308"
          strokeOpacity="0.45"
          strokeWidth="1.25"
        />
        {/* Crisp Ivory Receipt Ticket */}
        <path
          d="M10.5 10.5C10.5 9.67157 11.1716 9 12 9H23C23.8284 9 24.5 9.67157 24.5 10.5V29.5L22.1 27.9L19.8 29.5L17.5 27.9L15.2 29.5L12.8 27.9L10.5 29.5V10.5Z"
          fill="#fffbeb"
        />
        <rect x="13.5" y="13" width="8" height="2" rx="1" fill="#b45309" />
        <rect x="13.5" y="17" width="6" height="1.8" rx="0.9" fill="#78716c" />
        <rect x="13.5" y="20.8" width="4.5" height="1.8" rx="0.9" fill="#a8a29e" />
        {/* Overlapping Dark-Yellow Gold Coin */}
        <circle cx="27.5" cy="27" r="7.5" fill="#0c0a09" />
        <circle cx="27.5" cy="27" r="6.3" fill="url(#bnlGoldCoinGrad)" />
        <circle cx="27.5" cy="27" r="4.3" stroke="#fef9c3" strokeWidth="0.9" strokeOpacity="0.9" />
        <path
          d="M27.5 24.2L28.25 25.95L30.15 26.15L28.72 27.42L29.12 29.28L27.5 28.32L25.88 29.28L26.28 27.42L24.85 26.15L26.75 25.95L27.5 24.2Z"
          fill="#451a03"
        />
      </svg>

      {variant !== 'icon' && (
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-display font-bold tracking-tight ${titleColor} ${titleSize}`}>
              B&amp;L
            </span>
            {variant === 'full' && (
              <span className={`text-xs font-semibold ${subColor}`}>
                Billing &amp; Loyalty
              </span>
            )}
          </div>
          {subtitle && (
            <div className={`text-[11px] truncate ${tone === 'dark' ? 'text-stone-400' : 'text-stone-500'}`}>
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
