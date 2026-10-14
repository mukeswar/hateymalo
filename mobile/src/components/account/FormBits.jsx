import React from 'react';
import { Pressable, View } from 'react-native';
import { AlertCircle, Eye, EyeOff } from 'lucide-react-native';
import { colors, radius } from '../../theme';
import { T } from '../ui';

// Private helpers shared by the login / register screens.

export const FormError = ({ message }) =>
  message ? (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
        backgroundColor: colors.brandTint,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: '#F2C9C3',
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <AlertCircle size={18} color={colors.brandDark} style={{ marginTop: 1 }} />
      <T variant="medium" style={{ flex: 1, fontSize: 14.5, color: colors.brandDark }}>{message}</T>
    </View>
  ) : null;

export const PasswordToggle = ({ shown, onToggle }) => (
  <Pressable
    onPress={onToggle}
    hitSlop={8}
    accessibilityRole="button"
    accessibilityLabel={shown ? 'Hide password' : 'Show password'}
    accessibilityState={{ selected: shown }}
    style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
  >
    {shown ? <EyeOff size={18} color={colors.muted} /> : <Eye size={18} color={colors.muted} />}
  </Pressable>
);
