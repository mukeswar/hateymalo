import React, { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { fonts } from '../../theme';
import { T } from './Text';

// The User model's default profilePicture is a stock photo of a stranger, so
// it is treated as "no photo" and replaced with initials (same as the website).
const PLACEHOLDER_IDS = ['photo-1535713875002'];
const isRealPhoto = (src) => !!src && !PLACEHOLDER_IDS.some((id) => src.includes(id));

const TONES = [
  ['#FBE3E1', '#9E1B22'],
  ['#E3EFEA', '#1D5B4A'],
  ['#FCEFD9', '#8A5410'],
  ['#E6E8F3', '#323A63'],
  ['#F3E6EE', '#7A2E5A'],
];

const initialsOf = (name = '') =>
  name.replace(/\(.*?\)/g, '').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';

const toneOf = (name = '') => TONES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % TONES.length];

const SIZES = { xs: 24, sm: 32, md: 40, lg: 56, xl: 96, '2xl': 128 };

export const Avatar = ({ name = '', src, size = 'md', rounded = true, style }) => {
  const [failed, setFailed] = useState(false);
  const px = typeof size === 'number' ? size : SIZES[size] || SIZES.md;
  const shape = { width: px, height: px, borderRadius: rounded ? px / 2 : px * 0.22 };

  if (isRealPhoto(src) && !failed) {
    return (
      <Image
        source={{ uri: src }}
        style={[shape, style]}
        contentFit="cover"
        transition={150}
        onError={() => setFailed(true)}
        accessibilityLabel={name}
      />
    );
  }

  const [bg, fg] = toneOf(name);
  return (
    <View
      style={[shape, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel={name}
    >
      <T style={{ fontFamily: fonts.semibold, color: fg, fontSize: px * 0.38, lineHeight: px * 0.5 }}>
        {initialsOf(name)}
      </T>
    </View>
  );
};

export default Avatar;
