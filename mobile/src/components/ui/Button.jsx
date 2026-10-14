import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, radius } from '../../theme';
import { T } from './Text';

// Website equivalents: btn-primary (crimson), btn-pine (donations/trust),
// btn-ghost (outlined), plus quiet text-only and danger variants.
const VARIANTS = {
  primary: { bg: colors.brand, pressed: colors.brandDark, fg: colors.white, border: colors.brand },
  pine: { bg: colors.pine, pressed: colors.pineDark, fg: colors.white, border: colors.pine },
  ghost: { bg: colors.white, pressed: colors.paperDeep, fg: colors.ink, border: colors.sand },
  soft: { bg: colors.paperDeep, pressed: colors.sand, fg: colors.ink, border: colors.paperDeep },
  danger: { bg: colors.brandTint, pressed: '#F6D5D0', fg: colors.brand, border: '#F2C9C3' },
  text: { bg: 'transparent', pressed: colors.paperDeep, fg: colors.brand, border: 'transparent' },
};

const SIZES = {
  sm: { h: 36, px: 14, fs: 14, icon: 16 },
  md: { h: 46, px: 18, fs: 16, icon: 18 },
  lg: { h: 54, px: 22, fs: 17, icon: 20 },
};

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  full = false,
  style,
  accessibilityLabel,
}) => {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;

  const handlePress = (e) => {
    if (variant === 'primary' || variant === 'pine') Haptics.selectionAsync().catch(() => {});
    onPress?.(e);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.h,
          paddingHorizontal: s.px,
          backgroundColor: pressed ? v.pressed : v.bg,
          borderColor: v.border,
          opacity: isDisabled ? 0.55 : 1,
          alignSelf: full ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <View style={styles.row}>
          {Icon ? <Icon size={s.icon} color={v.fg} /> : null}
          {title ? (
            <T style={{ fontFamily: fonts.semibold, fontSize: s.fs, color: v.fg }} numberOfLines={1}>
              {title}
            </T>
          ) : null}
          {IconRight ? <IconRight size={s.icon} color={v.fg} /> : null}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

export default Button;
