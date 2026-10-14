import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Share, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Search, Star, X } from 'lucide-react-native';
import API, { errorMessage } from '../../../lib/api';
import { Chip, Field, T } from '../../ui';
import { colors, fonts, radius, space } from '../../../theme';

// Private helpers for the admin content screens (approval, posts, blogs, events,
// reports, comments, announcements, categories). Not shared outside admin/content.

// Loads `res.data.data` from a GET endpoint; reloads when the screen regains focus
// (the website polls every 8 s — on a phone we refresh on focus + pull-to-refresh).
export const useAdminList = (path, { initial = [] } = {}) => {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const first = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await API.get(path);
      if (res.data?.success) setData(res.data.data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load this section.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [path]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      load();
    }, [load])
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return { data, setData, loading, refreshing, error, reload: load, refresh };
};

export const SearchBar = ({ value, onChange, placeholder = 'Search this section…' }) => (
  <Field
    value={value}
    onChangeText={onChange}
    placeholder={placeholder}
    accessibilityLabel={placeholder}
    autoCorrect={false}
    autoCapitalize="none"
    returnKeyType="search"
    right={
      value ? (
        <Pressable onPress={() => onChange('')} hitSlop={10} accessibilityLabel="Clear search">
          <X size={18} color={colors.muted} />
        </Pressable>
      ) : (
        <Search size={18} color={colors.muted} />
      )
    }
  />
);

// Small "description · count" line under the header, like the web Panel header.
export const PanelIntro = ({ title, count, description, right }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
    <View style={{ flex: 1, gap: 2 }}>
      <T variant="h2">
        {title}
        {count !== undefined ? <T variant="semibold" style={{ color: colors.muted, fontSize: 15 }}>{`  (${count})`}</T> : null}
      </T>
      {description ? <T variant="small">{description}</T> : null}
    </View>
    {right}
  </View>
);

export const FeatureButton = ({ featured, onPress, disabled }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityState={{ selected: !!featured, disabled: !!disabled }}
    style={({ pressed }) => ({
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 36,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      backgroundColor: featured ? colors.marigold : colors.marigoldTint,
      opacity: disabled ? 0.55 : pressed ? 0.85 : 1,
    })}
  >
    <Star size={15} color={featured ? colors.ink : colors.marigoldText} fill={featured ? colors.ink : 'transparent'} />
    <T style={{ fontFamily: fonts.semibold, fontSize: 14, color: featured ? colors.ink : colors.marigoldText }}>
      {featured ? 'Featured' : 'Feature'}
    </T>
  </Pressable>
);

export const PlainChip = ({ label }) =>
  label ? <Chip label={label} tone={{ bg: colors.paperDeep, fg: colors.inkSoft }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} /> : null;

export const ListGap = () => <View style={{ height: space.md }} />;

// Same CSV as the web's exportCSV (all keys of the first row, every value quoted).
// Web: downloads a file. Native: opens the share sheet with the CSV text.
export const exportCSV = async (data, filename, showToast) => {
  if (!data || data.length === 0) {
    showToast?.('No data to export', 'info');
    return;
  }
  const cell = (v) => `"${String(v && typeof v === 'object' ? (v.name || v.title || v._id || JSON.stringify(v)) : v ?? '').replace(/"/g, '""')}"`;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map((row) => Object.values(row).map(cell).join(','));
  const csv = [headers, ...rows].join('\n');
  if (Platform.OS === 'web') {
    const link = document.createElement('a');
    link.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }
  try {
    await Share.share({ title: `${filename}.csv`, message: csv });
  } catch {
    showToast?.('Could not open the share sheet', 'error');
  }
};

// Runs an async action while tracking which item is busy, so buttons can show a spinner.
export const useBusy = () => {
  const [busy, setBusy] = useState(null);
  const run = useCallback(async (key, fn) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }, []);
  return [busy, run];
};
