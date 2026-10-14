import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, Share, Switch, View } from 'react-native';
import { Search, Check } from 'lucide-react-native';
import API, { errorMessage } from '../../../lib/api';
import { colors, fonts, radius, space } from '../../../theme';
import { Avatar, Button, Field, Row, Select, Sheet, T, VerificationBadge } from '../../ui';

// Private helpers for the admin people / finance / system screens
// (members, orgs, volunteers, donations, campaigns, expenses, admins, settings, logs).

// memberLevel values the backend accepts (User model enum; same list as AdminDashboard.jsx).
export const MEMBER_LEVELS = ['NEW MEMBER', 'TRUSTED MEMBER', 'VERIFIED MEMBER', 'ORGANIZATION', 'ADMIN'];
export const FINANCE_PERMS = ['canViewDonations', 'canManageDonations'];
export const STAFF_ROLES = [
  { value: 'MODERATOR', label: 'Moderator', hint: 'Reviews content and reports' },
  { value: 'ADMIN', label: 'Admin', hint: 'Also manages members, events and causes' },
];

export const matches = (q, ...fields) => {
  const s = q.trim().toLowerCase();
  return !s || fields.some((f) => String(f || '').toLowerCase().includes(s));
};

/* ---------- Data ---------- */

// GET /admin/users — shared by members, orgs, volunteers and admins (same as the web's fetchTabData).
export const useAdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    try {
      const res = await API.get('/admin/users');
      if (res.data?.success) setUsers(res.data.data || []);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load members.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { users, setUsers, loading, refreshing, error, reload: load, refresh: () => load(true) };
};

// GET /super-admin/access-catalog → { permissions, rolePresets } (Super Admin only)
export const useAccessCatalog = (enabled = true) => {
  const [catalog, setCatalog] = useState(null);
  useEffect(() => {
    if (!enabled) return;
    API.get('/super-admin/access-catalog')
      .then((res) => { if (res.data?.success) setCatalog(res.data.data); })
      .catch(() => {});
  }, [enabled]);
  return catalog;
};

export const presetFor = (catalog, role) => catalog?.rolePresets?.[role] || [];
export const permissionLabel = (catalog, key) => catalog?.permissions?.find((p) => p.key === key)?.label || key;

// PUT /admin/users/:id/verify { memberLevel, isVerified } — same call as handleVerifyUser on the web.
export const verifyUser = async (user, memberLevel, isVerified, { showToast, onDone }) => {
  try {
    const res = await API.put(`/admin/users/${user._id}/verify`, { memberLevel, isVerified });
    if (res.data?.success) {
      showToast(res.data.message || `Updated ${user.name}`, 'success');
      onDone?.({ ...user, memberLevel, isVerified });
    }
  } catch (err) {
    showToast(errorMessage(err, 'User verification failed'), 'error');
  }
};

/* ---------- CSV export (web: exportCSV) ---------- */

export const exportCSV = async (data, filename, showToast) => {
  if (!data || data.length === 0) {
    showToast('No data to export', 'info');
    return;
  }
  const cell = (v) => {
    const s = v && typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
    return `"${s.replace(/"/g, '""')}"`;
  };
  const headers = Object.keys(data[0]);
  const csv = [headers.join(','), ...data.map((row) => headers.map((h) => cell(row[h])).join(','))].join('\n');
  try {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
      link.setAttribute('download', `${filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      await Share.share({ title: `${filename}.csv`, message: csv });
    }
  } catch {
    showToast('Could not export this list', 'error');
  }
};

/* ---------- UI bits ---------- */

export const SearchBox = ({ value, onChangeText, placeholder }) => (
  <Field
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    autoCapitalize="none"
    autoCorrect={false}
    returnKeyType="search"
    accessibilityLabel={placeholder}
    right={<Search size={18} color={colors.muted} />}
  />
);

export const PersonHeader = ({ person, right, showBadge = true }) => (
  <Row gap={12} style={{ alignItems: 'flex-start' }}>
    <Avatar name={person.name} src={person.profilePicture} size="md" rounded={person.memberLevel !== 'ORGANIZATION'} />
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Row gap={6}>
        <T variant="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{person.name}</T>
        {showBadge ? <VerificationBadge level={person.memberLevel} isVerified={person.isVerified} showLabel={false} /> : null}
      </Row>
      {person.email ? <T variant="small" numberOfLines={1}>{person.email}</T> : null}
    </View>
    {right}
  </Row>
);

// Labelled on/off row (checkbox on the web).
export const ToggleRow = ({ title, hint, value, onValueChange, warn }) => (
  <Pressable
    onPress={() => onValueChange(!value)}
    accessibilityRole="switch"
    accessibilityState={{ checked: !!value }}
    accessibilityLabel={title}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: space.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: value && warn ? '#F1D9A8' : colors.sand,
      backgroundColor: value && warn ? colors.marigoldTint : colors.white,
    }}
  >
    <View style={{ flex: 1, gap: 2 }}>
      <T variant="semibold" style={{ fontSize: 15 }}>{title}</T>
      {hint ? <T variant="small">{hint}</T> : null}
    </View>
    <Switch
      value={!!value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.sand, true: colors.pine }}
      thumbColor={colors.white}
      accessibilityLabel={title}
    />
  </Pressable>
);

// Permission tick-list (web: AccessChecklist). Finance permissions are grouped separately.
export const AccessChecklist = ({ catalog, value, onChange }) => {
  if (!catalog) return <T variant="small">Loading permissions…</T>;
  const toggle = (key, on) => onChange(on ? [...new Set([...value, key])] : value.filter((k) => k !== key));
  const group = (title, items, warn) => (
    <View style={{ gap: 8 }}>
      <T variant="eyebrow" style={{ color: colors.muted }}>{title}</T>
      {warn ? (
        <View style={{ backgroundColor: colors.marigoldTint, borderRadius: radius.sm, padding: 10 }}>
          <T variant="small" style={{ color: colors.marigoldText }}>{warn}</T>
        </View>
      ) : null}
      {items.map((p) => (
        <ToggleRow key={p.key} title={p.label} hint={p.hint} value={value.includes(p.key)} onValueChange={(on) => toggle(p.key, on)} />
      ))}
    </View>
  );
  return (
    <View style={{ gap: space.lg }}>
      {group('Moderation & community', catalog.permissions.filter((p) => !FINANCE_PERMS.includes(p.key)))}
      {group('Finance (confidential)', catalog.permissions.filter((p) => FINANCE_PERMS.includes(p.key)), 'Only grant to people you trust with donor names, amounts and transaction IDs.')}
      <T variant="small">Settings, staff management, roles and the activity log always stay with the Super Admin.</T>
    </View>
  );
};

export const RolePicker = ({ value, onChange }) => (
  <View style={{ gap: 6 }}>
    <Select label="Role" options={STAFF_ROLES.map((r) => ({ value: r.value, label: r.label }))} value={value} onChange={onChange} />
    <T variant="small">{STAFF_ROLES.find((r) => r.value === value)?.hint}</T>
  </View>
);

// Staff access editor / "Make staff" (web: editingAccess modal → PUT /super-admin/staff/:id/permissions).
// `person` is the member being edited; null hides the sheet.
export const AccessEditorSheet = ({ person, catalog, onClose, onSaved, showToast, confirm }) => {
  const [role, setRole] = useState('MODERATOR');
  const [permissions, setPermissions] = useState([]);
  const [saving, setSaving] = useState(false);
  const promoting = person?.role === 'USER';

  useEffect(() => {
    if (!person) return;
    const r = ['ADMIN', 'MODERATOR'].includes(person.role) ? person.role : 'MODERATOR';
    setRole(r);
    setPermissions(person.permissions?.length ? person.permissions : presetFor(catalog, r));
  }, [person, catalog]);

  const save = async () => {
    if (!person) return;
    if (promoting && !(await confirm(`Give ${person.name} staff access as ${role}?`, '', { confirmText: 'Give access', destructive: false }))) return;
    setSaving(true);
    try {
      const res = await API.put(`/super-admin/staff/${person._id}/permissions`, { role, permissions });
      if (res.data?.success) {
        showToast(`Access updated for ${person.name}`, 'success');
        onSaved?.();
        onClose();
      }
    } catch (err) {
      showToast(errorMessage(err, 'Failed to update access'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={!!person}
      onClose={onClose}
      title={person ? (promoting ? `Make ${person.name} staff` : `Access for ${person.name}`) : ''}
      footer={<Button title={promoting ? 'Give staff access' : 'Save access'} onPress={save} loading={saving} full />}
    >
      <RolePicker value={role} onChange={(r) => { setRole(r); setPermissions(presetFor(catalog, r)); }} />
      <T variant="small">Changing the role resets the ticks below to that role's defaults. Adjust them as needed.</T>
      <AccessChecklist catalog={catalog} value={permissions} onChange={setPermissions} />
    </Sheet>
  );
};

// Suspend / reactivate (web: suspension modal → PUT /admin/users/:id/suspend).
export const SuspendSheet = ({ person, onClose, onDone, showToast }) => {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setReason(''); }, [person]);
  if (!person) return <Sheet visible={false} onClose={onClose} title="" />;
  const suspending = !person.isSuspended;

  const submit = async () => {
    setSaving(true);
    try {
      const res = await API.put(`/admin/users/${person._id}/suspend`, { isSuspended: suspending, suspensionReason: reason });
      if (res.data?.success) {
        showToast(res.data.message, 'info');
        onDone?.({ ...person, isSuspended: suspending, suspensionReason: suspending ? reason : '' });
        onClose();
      }
    } catch (err) {
      showToast(errorMessage(err, 'User suspension status change failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      title={suspending ? `Suspend ${person.name}?` : `Reactivate ${person.name}?`}
      footer={
        <Button
          title={suspending ? 'Confirm suspension' : 'Confirm reactivation'}
          variant={suspending ? 'primary' : 'pine'}
          onPress={submit}
          loading={saving}
          full
        />
      }
    >
      {suspending ? (
        <Field label="Reason for suspension" value={reason} onChangeText={setReason} multiline placeholder="Reason for account suspension…" />
      ) : (
        <T variant="small">This member will regain access to their account.</T>
      )}
    </Sheet>
  );
};

// Account status chips: suspended / banned / warnings.
export const AccountStatus = ({ person }) => (
  <Row gap={6} wrap>
    {person.isBanned ? (
      <StatusPill label="Banned" bg={colors.brandTint} fg={colors.brand} />
    ) : person.isSuspended ? (
      <StatusPill label="Suspended" bg={colors.brandTint} fg={colors.brand} />
    ) : (
      <StatusPill label="Active" bg={colors.pineTint} fg={colors.pine} />
    )}
    {person.warnings?.length ? (
      <StatusPill label={`${person.warnings.length} warning${person.warnings.length > 1 ? 's' : ''}`} bg={colors.marigoldTint} fg={colors.marigoldText} />
    ) : null}
  </Row>
);

export const StatusPill = ({ label, bg = colors.paperDeep, fg = colors.inkSoft, mono }) => (
  <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
    <T style={{ fontFamily: mono ? undefined : fonts.semibold, fontSize: 12.5, color: fg }} numberOfLines={1}>{label}</T>
  </View>
);

export const VerifyButton = ({ verified, onPress, onLabel = 'Verified', offLabel = 'Verify' }) => (
  <Button
    title={verified ? onLabel : offLabel}
    icon={verified ? Check : undefined}
    variant={verified ? 'soft' : 'ghost'}
    size="sm"
    onPress={onPress}
    accessibilityLabel={verified ? `${onLabel}. Tap to remove verification` : offLabel}
  />
);
