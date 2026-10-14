import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { formatNPR, humanize } from '../../lib/format';
import { colors, fonts, radius, space } from '../../theme';
import { Button, Chip, Field, Row, Select, T } from '../ui';

// Private helpers for the staff / organiser sponsorship screens
// (admin/sponsorship, admin/sponsorDeals, admin/sponsors, admin/sponsor-deal/[id],
// sponsor/organize/[id]). Enums mirror docs/SPONSORSHIP.md and the backend models.

export const OPP_STATUSES = ['DRAFT', 'OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED'];
export const CAMPAIGN_TYPES = ['CLEANUP', 'BLOOD_DONATION', 'TREE_PLANTATION', 'EDUCATION', 'DISASTER_RELIEF', 'FOOD_DISTRIBUTION', 'HEALTH', 'OTHER'];
export const TIER_LEVELS = ['TITLE', 'GOLD', 'SILVER', 'BRONZE', 'COMMUNITY_PARTNER', 'MEDIA_PARTNER', 'IN_KIND', 'CUSTOM'];
export const LOGO_SIZES = ['XL', 'L', 'M', 'S', 'NONE'];
export const RESOURCE_TYPES = ['CASH', 'MATERIALS', 'EQUIPMENT', 'TRANSPORT', 'FOOD', 'UNIFORMS', 'VENUE', 'MEDIA', 'OTHER'];
export const STAGES = ['APPLIED', 'IN_REVIEW', 'NEGOTIATING', 'AGREED', 'FULFILLED', 'DECLINED', 'WITHDRAWN', 'CANCELLED'];
export const ACTIVE_STAGES = ['APPLIED', 'IN_REVIEW', 'NEGOTIATING', 'AGREED'];
export const CONTRACTED_STAGES = ['AGREED', 'FULFILLED'];
export const VALUATION_METHODS = ['SPONSOR_INVOICE', 'MARKET_QUOTE', 'SPONSOR_DECLARED', 'STAFF_ESTIMATE', 'NOT_VALUED'];
export const IN_KIND_STATUSES = ['PLEDGED', 'RECEIVED', 'CANCELLED'];
export const DELIVERABLE_TYPES = ['VEST_LOGO', 'VENUE_BANNER', 'BACKDROP', 'ID_CARD', 'SOCIAL_MENTION', 'VIDEO', 'PHOTO_ALBUM', 'WEBSITE_LISTING', 'SPEAKING_SLOT', 'IMPACT_REPORT', 'OTHER'];
export const DELIVERABLE_STATUSES = ['PENDING', 'IN_PROGRESS', 'DONE', 'WAIVED'];
export const PAYMENT_METHODS = ['BANK_TRANSFER', 'CONNECTIPS', 'KHALTI', 'ESEWA', 'CHEQUE', 'CASH', 'OTHER'];
export const PLACEMENTS = ['VEST_FRONT', 'VEST_BACK', 'BANNER', 'BACKDROP', 'ID_CARD', 'SIGNAGE'];
export const SLOT_SIZES = ['XL', 'L', 'M', 'S'];
export const VERIFICATION = ['PENDING', 'VERIFIED', 'REJECTED'];

// Same transition table as the server (changeDealStage). Targets in
// MANAGER_ONLY need canManageSponsorships; the rest managers or organisers.
export const TRANSITIONS = {
  APPLIED: ['IN_REVIEW', 'NEGOTIATING', 'AGREED', 'DECLINED'],
  IN_REVIEW: ['NEGOTIATING', 'AGREED', 'DECLINED'],
  NEGOTIATING: ['IN_REVIEW', 'AGREED', 'DECLINED'],
  AGREED: ['FULFILLED', 'CANCELLED', 'NEGOTIATING'],
  FULFILLED: ['AGREED'],
  DECLINED: ['IN_REVIEW'],
  WITHDRAWN: [],
  CANCELLED: ['IN_REVIEW'],
};
const MANAGER_ONLY = ['AGREED', 'FULFILLED', 'CANCELLED'];
export const allowedMoves = (stage, viewer = {}) =>
  (TRANSITIONS[stage] || []).filter((to) => (MANAGER_ONLY.includes(to) ? viewer.isManager : viewer.isManager || viewer.isOrganizer));

export const opts = (list) => list.map((v) => ({ value: v, label: humanize(v) }));

/* ---------- Value helpers ---------- */

export const isHttpUrl = (v) => /^https?:\/\/\S+$/i.test(String(v || '').trim());
export const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
export const toDateInput = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};
export const isDateInput = (s) => !s || (/^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime()));
export const digits = (v) => String(v ?? '').replace(/[^0-9]/g, '');
export const intOr0 = (v) => Math.max(0, Math.round(Number(v) || 0));
export const has = (v) => v !== undefined && v !== null;
export const priceText = (tier) =>
  !has(tier?.price) ? '' : tier.price > 0 ? formatNPR(tier.price) : tier.priceNote || 'In-kind / by quotation';

/* ---------- Data ---------- */

// GET loader with pull-to-refresh state. `path` null = don't load.
export const useSponsorApi = (path, { fallback = 'Could not load this section.' } = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!path);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(0);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const load = useCallback(async (pull = false) => {
    if (!path) return;
    if (pull) setRefreshing(true);
    try {
      const res = await API.get(path);
      if (!alive.current) return;
      if (res.data?.success) setData(res.data.data);
      setError('');
      setStatus(200);
    } catch (err) {
      if (!alive.current) return;
      setStatus(err?.response?.status || 0);
      setError(errorMessage(err, fallback));
    } finally {
      if (alive.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [path, fallback]);

  useEffect(() => {
    setLoading(!!path);
    load();
  }, [load, path]);

  return { data, setData, loading, refreshing, error, status, reload: load, refresh: () => load(true) };
};

/* ---------- UI bits ---------- */

export const Section = ({ title, hint, right, children, style }) => (
  <View style={[{ gap: space.md }, style]}>
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="h3">{title}</T>
        {hint ? <T variant="small">{hint}</T> : null}
      </View>
      {right}
    </Row>
    {children}
  </View>
);

export const Box = ({ children, tone = 'white', style }) => (
  <View
    style={[
      {
        backgroundColor: tone === 'white' ? colors.white : tone === 'warn' ? colors.marigoldTint : tone === 'pine' ? colors.pineTint : colors.paperDeep,
        borderColor: tone === 'warn' ? '#F1D9A8' : colors.sand,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: space.md,
        gap: 8,
      },
      style,
    ]}
  >
    {children}
  </View>
);

export const Notice = ({ children, tone = 'warn' }) => (
  <Box tone={tone}>
    <T variant="small" style={{ color: tone === 'warn' ? colors.marigoldText : colors.inkSoft }}>{children}</T>
  </Box>
);

export const KV = ({ label, value, strong }) =>
  value === undefined || value === null || value === '' ? null : (
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} gap={12}>
      <T variant="small" style={{ color: colors.muted }}>{label}</T>
      <T variant={strong ? 'semibold' : 'small'} style={{ flexShrink: 1, textAlign: 'right', color: colors.ink }}>{String(value)}</T>
    </Row>
  );

export const StatTile = ({ label, value, hint, tone }) => (
  <View
    style={{
      flexGrow: 1,
      flexBasis: '45%',
      backgroundColor: tone === 'pine' ? colors.pineTint : tone === 'warn' ? colors.marigoldTint : colors.white,
      borderWidth: 1,
      borderColor: colors.sand,
      borderRadius: radius.md,
      padding: space.md,
      gap: 2,
    }}
    accessible
    accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ''}`}
  >
    <T variant="caption" style={{ color: colors.muted }}>{label}</T>
    <T style={{ fontFamily: fonts.bold, fontSize: 19, color: tone === 'pine' ? colors.pine : colors.ink }}>{value}</T>
    {hint ? <T variant="caption" style={{ color: tone === 'warn' ? colors.marigoldText : colors.muted }}>{hint}</T> : null}
  </View>
);

// URL field with a live image preview (only http(s) is previewed).
export const UrlField = ({ label, value, onChangeText, hint, preview = true, height = 140 }) => (
  <View style={{ gap: 8 }}>
    <Field
      label={label}
      value={value}
      onChangeText={onChangeText}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType="url"
      placeholder="https://…"
      hint={hint}
      error={value && !isHttpUrl(value) ? 'Use an http(s) link' : undefined}
    />
    {preview && isHttpUrl(value) ? (
      <Image
        source={{ uri: value.trim() }}
        style={{ width: '100%', height, borderRadius: radius.md, backgroundColor: colors.paperDeep }}
        contentFit="cover"
        accessibilityLabel={`${label} preview`}
      />
    ) : null}
  </View>
);

export const DateField = ({ label, value, onChangeText, hint }) => (
  <Field
    label={label}
    value={value}
    onChangeText={onChangeText}
    placeholder="YYYY-MM-DD"
    autoCapitalize="none"
    autoCorrect={false}
    maxLength={10}
    hint={hint}
    error={value && !isDateInput(value) ? 'Use the format YYYY-MM-DD' : undefined}
  />
);

export const MoneyField = ({ label, value, onChangeText, hint }) => (
  <Field label={label} value={String(value ?? '')} onChangeText={(v) => onChangeText(digits(v))} keyboardType="number-pad" placeholder="0" hint={hint} />
);

export const SmallIconButton = ({ icon: Icon, label, onPress, disabled, tone = 'ink' }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    hitSlop={6}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled: !!disabled }}
    style={({ pressed }) => ({
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tone === 'danger' ? colors.brandTint : colors.paperDeep,
      opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
    })}
  >
    <Icon size={17} color={tone === 'danger' ? colors.brand : colors.ink} />
  </Pressable>
);

// Editable list of row objects. `renderRow(row, update)` renders the fields.
export const RowListEditor = ({ title, hint, rows, onChange, blank, renderRow, addLabel = 'Add', reorder = false }) => {
  const update = (i) => (patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const remove = (i) => onChange(rows.filter((_, j) => j !== i));
  const move = (i, d) => {
    const next = rows.slice();
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <View style={{ gap: 8 }}>
      <T variant="semibold" style={{ fontSize: 14.5 }}>{title}</T>
      {hint ? <T variant="small">{hint}</T> : null}
      {rows.map((row, i) => (
        <Box key={row._key || row._id || i} tone="paper">
          {renderRow(row, update(i), i)}
          <Row gap={8} style={{ justifyContent: 'flex-end' }}>
            {reorder ? <SmallIconButton icon={ArrowUp} label="Move up" disabled={i === 0} onPress={() => move(i, -1)} /> : null}
            {reorder ? <SmallIconButton icon={ArrowDown} label="Move down" disabled={i === rows.length - 1} onPress={() => move(i, 1)} /> : null}
            <SmallIconButton icon={Trash2} label={`Remove ${title} row ${i + 1}`} tone="danger" onPress={() => remove(i)} />
          </Row>
        </Box>
      ))}
      <Button title={addLabel} icon={Plus} variant="ghost" size="sm" onPress={() => onChange([...rows, { ...blank, _key: `${Date.now()}-${rows.length}` }])} />
    </View>
  );
};

export const PickChips = ({ label, options, value, onChange }) => <Select label={label} options={opts(options)} value={value} onChange={onChange} />;

export const MultiChips = ({ label, options, value = [], onChange }) => (
  <View style={{ gap: 8 }}>
    {label ? <T variant="semibold" style={{ fontSize: 14.5 }}>{label}</T> : null}
    <Row wrap gap={8}>
      {options.map((o) => {
        const on = value.includes(o);
        return <Chip key={o} label={humanize(o)} active={on} onPress={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])} />;
      })}
    </Row>
  </View>
);

export const LinkList = ({ urls = [] }) =>
  urls.length ? (
    <View style={{ gap: 4 }}>
      {urls.map((u) => (
        <Pressable key={u} onPress={() => isHttpUrl(u) && Linking.openURL(u).catch(() => {})} accessibilityRole="link" accessibilityLabel={`Open ${u}`}>
          <T variant="small" style={{ color: colors.sky, textDecorationLine: 'underline' }} numberOfLines={1}>{u}</T>
        </Pressable>
      ))}
    </View>
  ) : null;
