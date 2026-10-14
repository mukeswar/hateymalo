import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors, fonts, radius, shadow, space, statusTone } from '../../theme';
import { T } from './Text';

/* ---------- Layout ---------- */

// Scrollable page with paper background, pull-to-refresh and keyboard handling.
// Use `scroll={false}` when the screen renders its own FlatList.
export const Screen = ({ children, scroll = true, refreshing, onRefresh, edges = ['bottom'], contentStyle, style }) => {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.screenContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <SafeAreaView edges={edges} style={[styles.screen, style]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export const Card = ({ children, style, onPress, padded = true, accessibilityLabel }) => {
  const base = [styles.card, padded && { padding: space.lg }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && { transform: [{ scale: 0.985 }], opacity: 0.96 }]}
    >
      {children}
    </Pressable>
  );
};

export const SectionHeader = ({ eyebrow, title, action, onAction, style }) => (
  <View style={[styles.sectionHeader, style]}>
    <View style={{ flex: 1 }}>
      {eyebrow ? <T variant="eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</T> : null}
      {title ? <T variant="h2">{title}</T> : null}
    </View>
    {action ? (
      <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
        <T variant="semibold" style={{ color: colors.brand, fontSize: 15 }}>{action}</T>
      </Pressable>
    ) : null}
  </View>
);

export const Divider = ({ style }) => <View style={[{ height: 1, backgroundColor: colors.sand }, style]} />;

export const Row = ({ children, gap = 8, style, wrap = false }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>
);

/* ---------- Chips & badges ---------- */

export const Chip = ({ label, active = false, onPress, icon: Icon, tone, style }) => {
  const bg = tone?.bg || (active ? colors.ink : colors.white);
  const fg = tone?.fg || (active ? colors.white : colors.inkSoft);
  const content = (
    <>
      {Icon ? <Icon size={14} color={fg} /> : null}
      <T style={{ fontFamily: fonts.semibold, fontSize: 13.5, color: fg }} numberOfLines={1}>{label}</T>
    </>
  );
  const chipStyle = [styles.chip, { backgroundColor: bg, borderColor: tone ? 'transparent' : active ? colors.ink : colors.sand }, style];
  if (!onPress) return <View style={chipStyle}>{content}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} style={chipStyle}>
      {content}
    </Pressable>
  );
};

export const StatusChip = ({ status, label, style }) => {
  const tone = statusTone(status);
  const text = label || String(status || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  return <Chip label={text} tone={tone} style={[{ paddingVertical: 3, paddingHorizontal: 10 }, style]} />;
};

// Horizontal scrolling filter chips (categories, tabs).
export const ChipBar = ({ options, value, onChange, style }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[{ gap: 8, paddingHorizontal: space.lg }, style]}>
    {options.map((o) => {
      const key = typeof o === 'string' ? o : o.value;
      const label = typeof o === 'string' ? o : o.label;
      return <Chip key={key} label={label} active={value === key} onPress={() => onChange(key)} />;
    })}
  </ScrollView>
);

export const Segmented = ({ options, value, onChange, style }) => (
  <View style={[styles.segment, style]}>
    {options.map((o) => {
      const active = o.value === value;
      return (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
          style={[styles.segmentItem, active && styles.segmentActive]}
        >
          <T style={{ fontFamily: fonts.semibold, fontSize: 14, color: active ? colors.ink : colors.muted }} numberOfLines={1}>
            {o.label}
          </T>
        </Pressable>
      );
    })}
  </View>
);

export const ProgressBar = ({ value = 0, color = colors.marigold, height = 8, style }) => {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <View
      style={[{ height, backgroundColor: colors.paperDeep, borderRadius: height, overflow: 'hidden' }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
    >
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: height }} />
    </View>
  );
};

/* ---------- Forms ---------- */

export const Field = ({ label, hint, error, multiline, style, inputStyle, right, ...inputProps }) => (
  <View style={[{ gap: 6 }, style]}>
    {label ? <T variant="semibold" style={{ fontSize: 14.5 }}>{label}</T> : null}
    <View style={[styles.field, multiline && { minHeight: 110, alignItems: 'flex-start' }, error && { borderColor: colors.brand }]}>
      <TextInput
        placeholderTextColor="#9A9087"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && { paddingTop: 12, minHeight: 100 }, inputStyle]}
        accessibilityLabel={label}
        {...inputProps}
      />
      {right}
    </View>
    {error ? <T variant="small" style={{ color: colors.brand }}>{error}</T> : hint ? <T variant="small">{hint}</T> : null}
  </View>
);

// Simple option picker rendered as wrapping chips (replaces <select>).
export const Select = ({ label, options, value, onChange, style }) => (
  <View style={[{ gap: 8 }, style]}>
    {label ? <T variant="semibold" style={{ fontSize: 14.5 }}>{label}</T> : null}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const key = typeof o === 'string' ? o : o.value;
        const text = typeof o === 'string' ? o : o.label;
        return <Chip key={key} label={text} active={value === key} onPress={() => onChange(key)} />;
      })}
    </View>
  </View>
);

/* ---------- States ---------- */

export const Loading = ({ label = 'Loading…', style }) => (
  <View style={[styles.center, style]} accessibilityLabel={label}>
    <ActivityIndicator color={colors.brand} />
  </View>
);

export const Skeleton = ({ height = 16, width = '100%', radius: r = 10, style }) => (
  <View style={[{ height, width, borderRadius: r, backgroundColor: colors.paperDeep }, style]} />
);

export const EmptyState = ({ icon: Icon, title, message, action, onAction, style }) => (
  <View style={[styles.empty, style]}>
    {Icon ? (
      <View style={styles.emptyIcon}>
        <Icon size={26} color={colors.muted} />
      </View>
    ) : null}
    <T variant="h3" style={{ textAlign: 'center' }}>{title}</T>
    {message ? <T variant="small" style={{ textAlign: 'center', maxWidth: 300 }}>{message}</T> : null}
    {action ? (
      <Pressable onPress={onAction} style={{ marginTop: 8 }} accessibilityRole="button">
        <T variant="semibold" style={{ color: colors.brand }}>{action}</T>
      </Pressable>
    ) : null}
  </View>
);

export const ErrorState = ({ message = 'Could not load this page.', onRetry }) => (
  <EmptyState title="Something went wrong" message={message} action={onRetry ? 'Try again' : null} onAction={onRetry} />
);

/* ---------- Overlays ---------- */

// Bottom sheet modal used for forms (donate, report, reject, edit profile, admin edits).
export const Sheet = ({ visible, onClose, title, children, footer }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <T variant="h2" style={{ flex: 1 }}>{title}</T>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close" style={styles.sheetClose}>
              <X size={20} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  screenContent: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.sand,
    ...shadow.soft,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  segment: { flexDirection: 'row', backgroundColor: colors.paperDeep, borderRadius: radius.pill, padding: 4 },
  segmentItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.white, ...shadow.soft },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  input: { flex: 1, minHeight: 48, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, minHeight: 160 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: space.xxl, paddingHorizontal: space.lg },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(26,23,20,0.45)' },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...shadow.lift,
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.sand, marginTop: 8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.md },
  sheetClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paperDeep },
  sheetFooter: { paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.sand, gap: 10 },
});
