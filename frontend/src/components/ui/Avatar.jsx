import React, { useState } from 'react';

// The User model's default profilePicture is a stock photo of a stranger, so
// it is treated the same as "no photo" and replaced with the person's initials.
const PLACEHOLDER_IDS = ['photo-1535713875002'];

const isRealPhoto = (src) => !!src && !PLACEHOLDER_IDS.some((id) => src.includes(id));

const TONES = [
  'bg-[#FBE3E1] text-[#9E1B22]',
  'bg-[#E3EFEA] text-[#1D5B4A]',
  'bg-[#FCEFD9] text-[#8A5410]',
  'bg-[#E6E8F3] text-[#323A63]',
  'bg-[#F3E6EE] text-[#7A2E5A]',
];

const initialsOf = (name = '') =>
  name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || '?';

const toneOf = (name = '') => TONES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % TONES.length];

const SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-24 h-24 text-3xl',
  '2xl': 'w-32 h-32 text-4xl',
};

const Avatar = ({ name = '', src, size = 'md', className = '', rounded = 'rounded-full' }) => {
  const [failed, setFailed] = useState(false);
  const base = `${SIZES[size] || size} ${rounded} shrink-0 ${className}`;

  if (isRealPhoto(src) && !failed) {
    return <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} className={`${base} object-cover`} />;
  }

  return (
    <span aria-label={name} role="img" className={`${base} ${toneOf(name)} inline-flex items-center justify-center font-semibold select-none`}>
      {initialsOf(name)}
    </span>
  );
};

export default Avatar;
