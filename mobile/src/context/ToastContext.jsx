import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react-native';
import { colors, radius, shadow } from '../theme';
import { T } from '../components/ui/Text';

const ToastContext = createContext(null);

const STYLES = {
  success: { accent: colors.pine, icon: CheckCircle2, fg: colors.pine, bg: colors.pineTint },
  error: { accent: colors.brand, icon: AlertCircle, fg: colors.brand, bg: colors.brandTint },
  warning: { accent: colors.marigold, icon: AlertTriangle, fg: colors.marigoldText, bg: colors.marigoldTint },
  info: { accent: colors.sky, icon: Info, fg: colors.sky, bg: colors.skyTint },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);
  const insets = useSafeAreaInsets();

  const removeToast = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const showToast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${seq.current++}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View pointerEvents="box-none" style={[styles.stack, { bottom: insets.bottom + 72 }]}>
        {toasts.map((toast) => {
          const s = STYLES[toast.type] || STYLES.info;
          const Icon = s.icon;
          return (
            <View
              key={toast.id}
              style={styles.toast}
              accessibilityRole={toast.type === 'error' ? 'alert' : 'text'}
              accessibilityLiveRegion="polite"
            >
              <View style={[styles.accent, { backgroundColor: s.accent }]} />
              <View style={[styles.icon, { backgroundColor: s.bg }]}>
                <Icon size={18} color={s.fg} />
              </View>
              <T variant="medium" style={styles.msg}>{toast.message}</T>
              <Pressable
                onPress={() => removeToast(toast.id)}
                hitSlop={10}
                accessibilityLabel="Dismiss notification"
                style={styles.close}
              >
                <X size={16} color={colors.muted} />
              </Pressable>
            </View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  stack: { position: 'absolute', left: 16, right: 16, gap: 10, zIndex: 100 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 18,
    paddingRight: 10,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadow.lift,
  },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  msg: { flex: 1, fontSize: 15, color: colors.ink, lineHeight: 21 },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});

export const useToast = () => useContext(ToastContext) || { showToast: () => {} };
