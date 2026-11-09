import React from 'react';
import { Link } from 'react-router-dom';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
  showTagline?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'light',
  showTagline = false,
}) => {
  const textColor = variant === 'dark' ? 'text-white' : 'text-[#171717]';

  const sizeStyles = {
    sm: {
      text: 'text-base sm:text-lg leading-[0.85] tracking-[-0.03em]',
      tagline: 'text-[9px] tracking-[0.16em]',
    },
    md: {
      text: 'text-xl sm:text-2xl leading-[0.84] tracking-[-0.03em]',
      tagline: 'text-[10px] tracking-[0.18em]',
    },
    lg: {
      text: 'text-2xl sm:text-3xl lg:text-4xl leading-[0.82] tracking-[-0.03em]',
      tagline: 'text-xs tracking-[0.2em]',
    },
  }[size];

  return (
    <Link
      to="/"
      className={`inline-flex flex-col justify-center transition-opacity hover:opacity-90 select-none group ${className}`}
      aria-label="ELEVEN NATION — Home"
    >
      <div className={`font-display font-extrabold uppercase ${textColor} ${sizeStyles.text} flex flex-col`}>
        <span className="block font-black">ELEVEN</span>
        <span className="block font-black">NATION</span>
      </div>
      {showTagline && (
        <span className={`mt-1 font-sans ${sizeStyles.tagline} uppercase text-[#77746D] font-medium hidden sm:block`}>
          Wear Your Identity
        </span>
      )}
    </Link>
  );
};
