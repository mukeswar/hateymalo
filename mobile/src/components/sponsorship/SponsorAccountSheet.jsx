import React, { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Plus, ShieldAlert, Trash2 } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { colors } from '../../theme';
import { Button, Field, Row, Select, Sheet, T } from '../ui';
import { ACCOUNT_TYPES, InfoNote, UrlImageField, isHttpUrl } from './SponsorBits';

// Create (POST /sponsorship/accounts) or edit (PUT /sponsorship/accounts/:id)
// a sponsor account. Logos are image URLs until uploads are enabled.
const BACKGROUNDS = [
  { value: 'ANY', label: 'Any background' },
  { value: 'LIGHT', label: 'For light backgrounds' },
  { value: 'DARK', label: 'For dark backgrounds' },
];

const fromAccount = (a, user) => ({
  name: a?.name || '',
  type: a?.type || 'COMPANY',
  description: a?.description || '',
  website: a?.website || '',
  panNumber: a?.panNumber || '',
  vatRegistered: !!a?.vatRegistered,
  address: a?.address || '',
  contactName: a?.contactName ?? user?.name ?? '',
  contactEmail: a?.contactEmail ?? user?.email ?? '',
  contactPhone: a?.contactPhone || '',
  logos: (a?.logos || []).map((l) => ({ label: l.label || 'Logo', url: l.url || '', background: l.background || 'ANY' })),
});

export default function SponsorAccountSheet({ visible, onClose, account = null, onSaved }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState(() => fromAccount(account, user));
  const [saving, setSaving] = useState(false);
  const editing = !!account?._id;

  useEffect(() => {
    if (visible) setForm(fromAccount(account, user));
  }, [visible, account, user]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setLogo = (idx, patch) => set({ logos: form.logos.map((l, i) => (i === idx ? { ...l, ...patch } : l)) });

  const verified = account?.verificationStatus === 'VERIFIED';
  const identityChanged = editing && verified && (form.name.trim() !== (account.name || '') || form.panNumber.trim() !== (account.panNumber || ''));

  const submit = async () => {
    if (!form.name.trim()) return showToast('Organisation name is required', 'error');
    if (form.website && !isHttpUrl(form.website)) return showToast('Website must be an http(s) link', 'error');
    const logos = form.logos.filter((l) => l.url.trim());
    if (logos.some((l) => !isHttpUrl(l.url))) return showToast('Each logo needs an http(s) image link', 'error');
    const body = { ...form, name: form.name.trim(), website: form.website.trim(), logos: logos.map((l) => ({ ...l, url: l.url.trim() })) };
    setSaving(true);
    try {
      const res = editing ? await API.put(`/sponsorship/accounts/${account._id}`, body) : await API.post('/sponsorship/accounts', body);
      showToast(res.data?.message || 'Saved', 'success');
      onSaved?.(res.data?.data);
      onClose();
    } catch (err) {
      showToast(errorMessage(err, 'Could not save the sponsor account'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Edit sponsor account' : 'New sponsor account'}
      footer={<Button title={editing ? 'Save changes' : 'Create account'} loading={saving} full size="lg" onPress={submit} />}
    >
      {!editing ? (
        <T variant="small">
          Register the organisation that will sponsor. You become its owner and can invite colleagues. Our team verifies new accounts before deals are signed.
        </T>
      ) : null}
      {identityChanged ? (
        <InfoNote icon={ShieldAlert} tone="marigold">Changing the name or PAN of a verified account sends it back for re-verification.</InfoNote>
      ) : null}

      <Field label="Organisation name" value={form.name} onChangeText={(v) => set({ name: v })} maxLength={140} placeholder="e.g. Himal Tea Pvt Ltd" />
      <Select label="Type" options={ACCOUNT_TYPES} value={form.type} onChange={(v) => set({ type: v })} />
      <Field label="About (optional)" value={form.description} onChangeText={(v) => set({ description: v })} multiline maxLength={2000} />
      <Field label="Website (optional)" value={form.website} onChangeText={(v) => set({ website: v })} placeholder="https://" autoCapitalize="none" keyboardType="url"
        error={form.website && !isHttpUrl(form.website) ? 'Use an http(s) link' : undefined} />
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        <Field style={{ flex: 1 }} label="PAN (optional)" value={form.panNumber} onChangeText={(v) => set({ panNumber: v })} maxLength={20} />
        <View style={{ gap: 6, paddingTop: 2 }}>
          <T variant="semibold" style={{ fontSize: 14.5 }}>VAT registered</T>
          <Switch
            value={form.vatRegistered}
            onValueChange={(v) => set({ vatRegistered: v })}
            trackColor={{ true: colors.pine, false: colors.sand }}
            thumbColor={colors.white}
            accessibilityLabel="VAT registered"
          />
        </View>
      </Row>
      <Field label="Address (optional)" value={form.address} onChangeText={(v) => set({ address: v })} maxLength={300} />

      <T variant="h3">Contact person</T>
      <Field label="Name" value={form.contactName} onChangeText={(v) => set({ contactName: v })} maxLength={120} />
      <Field label="Email" value={form.contactEmail} onChangeText={(v) => set({ contactEmail: v })} autoCapitalize="none" keyboardType="email-address" maxLength={160} />
      <Field label="Phone" value={form.contactPhone} onChangeText={(v) => set({ contactPhone: v })} keyboardType="phone-pad" maxLength={40} />

      <View style={{ gap: 4 }}>
        <T variant="h3">Logos</T>
        <T variant="small">Paste links to your logo images (PNG or SVG). Nothing is shown publicly until you approve its use on a specific deal.</T>
      </View>
      {form.logos.map((l, idx) => (
        <View key={idx} style={{ gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.sand, backgroundColor: colors.white }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="eyebrow" style={{ color: colors.pine }}>Logo {idx + 1}</T>
            <Pressable onPress={() => set({ logos: form.logos.filter((_, i) => i !== idx) })} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove logo ${idx + 1}`}>
              <Trash2 size={18} color={colors.brand} />
            </Pressable>
          </Row>
          <Field label="Label" value={l.label} onChangeText={(v) => setLogo(idx, { label: v })} maxLength={60} placeholder="Primary, white version…" />
          <UrlImageField label="Image link" value={l.url} onChangeText={(v) => setLogo(idx, { url: v })} />
          <Select options={BACKGROUNDS} value={l.background} onChange={(v) => setLogo(idx, { background: v })} />
        </View>
      ))}
      {form.logos.length < 10 ? (
        <Button
          title="Add a logo"
          icon={Plus}
          variant="ghost"
          size="sm"
          style={{ alignSelf: 'flex-start' }}
          onPress={() => set({ logos: [...form.logos, { label: form.logos.length ? 'Alternate' : 'Primary', url: '', background: 'ANY' }] })}
        />
      ) : null}
    </Sheet>
  );
}

