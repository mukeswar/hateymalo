import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Image } from 'expo-image';
import { QrCode } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { findSection } from '../../lib/adminAccess';
import { colors, radius, space } from '../../theme';
import { Button, Card, Divider, ErrorState, Field, Loading, Row, Screen, T } from '../../components/ui';
import { ToggleRow } from '../../components/admin/people/PeopleKit';

const TITLE = findSection('settings')?.label || 'Settings';

const MODERATION = [
  { key: 'requirePostApproval', title: 'Require approval for posts', hint: 'New help posts stay private until an admin approves them.' },
  { key: 'requireBlogApproval', title: 'Require approval for blog stories', hint: 'Stories are reviewed before they are published.' },
];
const FEATURES = [
  { key: 'allowPublicDonations', title: 'Accept public donations', hint: 'Shows the Donate page, campaign contributions and donate buttons across the site.' },
  { key: 'allowPublicComments', title: 'Allow public comments', hint: 'Members can comment on help requests, events and stories.' },
  { key: 'allowRegistrations', title: 'Allow new member registrations', hint: 'Turn off to pause new sign-ups (existing members can still log in).' },
  { key: 'requireOrgVerification', title: 'Require verification for organisations', hint: 'Organisations get the verified badge only after the team checks their details.' },
];

const Group = ({ title, icon: Icon, children, hint }) => (
  <Card style={{ gap: space.md }}>
    <Row gap={6}>
      {Icon ? <Icon size={14} color={colors.brand} /> : null}
      <T variant="eyebrow">{title}</T>
    </Row>
    {hint ? <T variant="small" style={{ marginTop: -6 }}>{hint}</T> : null}
    {children}
  </Card>
);

// Web: "settings" tab — GET/PUT /super-admin/settings (Super Admin only; the layout guards it).
export default function AdminSettings() {
  const { refreshSettings } = useSettings();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [wordsText, setWordsText] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    try {
      const res = await API.get('/super-admin/settings');
      if (res.data?.success) {
        setData(res.data.data);
        setWordsText((res.data.data.prohibitedWords || []).join(', '));
      }
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load platform settings.'));
    } finally {
      setRefreshing(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (v) => setData((d) => ({ ...d, [k]: v }));
  const numText = (k) => (v) => set(k)(v.replace(/[^0-9]/g, ''));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        prohibitedWords: wordsText.split(',').map((w) => w.trim()).filter(Boolean),
        maxPostsPerDay: Number(data.maxPostsPerDay) || undefined,
        maxCommentsPerHour: Number(data.maxCommentsPerHour) || undefined,
      };
      const res = await API.put('/super-admin/settings', payload);
      if (res.data?.success) {
        showToast('Platform settings saved to database & applied to frontend!', 'success');
        if (res.data.data) {
          setData(res.data.data);
          setWordsText((res.data.data.prohibitedWords || []).join(', '));
        }
        refreshSettings();
      }
    } catch (err) {
      showToast(errorMessage(err, 'Settings update failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <>
        <Stack.Screen options={{ title: TITLE }} />
        {error ? <Screen><ErrorState message={error} onRetry={() => load()} /></Screen> : <Loading />}
      </>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <Stack.Screen options={{ title: TITLE }} />
      <T variant="small">Public platform identity, homepage hero, donation details and moderation rules.</T>

      <Group title="General">
        <Field label="Platform name" value={data.platformName ?? ''} onChangeText={set('platformName')} />
        <Field label="Tagline" value={data.tagline ?? ''} onChangeText={set('tagline')} />
        <Field label="Contact email" value={data.contactEmail ?? ''} onChangeText={set('contactEmail')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
      </Group>

      <Group title="Homepage hero" hint="Shown at the top of the public homepage. Put each line of the headline on its own line.">
        <Field label="Small label above the headline" value={data.heroSmallLabel ?? ''} onChangeText={set('heroSmallLabel')} />
        <Field label="Headline" value={data.heroHeadline ?? ''} onChangeText={set('heroHeadline')} multiline />
        <Field label="Description" value={data.heroDescription ?? ''} onChangeText={set('heroDescription')} multiline />
        <Field label="Hero image URL" value={data.heroImage ?? ''} onChangeText={set('heroImage')} placeholder="https://…" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        {data.heroImage ? (
          <Image source={{ uri: data.heroImage }} style={{ height: 140, width: '100%', borderRadius: radius.md, backgroundColor: colors.paperDeep }} contentFit="cover" accessibilityLabel="Hero image preview" />
        ) : null}
      </Group>

      <Group title="Donation payment & QR" icon={QrCode}>
        <Field
          label="Static payment QR image URL"
          value={data.paymentQrCode ?? ''}
          onChangeText={set('paymentQrCode')}
          placeholder="https://… (official eSewa / Khalti / Fonepay QR image)"
          hint="Paste any image URL or eSewa / Khalti / Fonepay QR image link. Leave empty to hide it."
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        {data.paymentQrCode ? (
          <Image source={{ uri: data.paymentQrCode }} style={{ height: 160, width: 160, borderRadius: radius.md, backgroundColor: colors.paperDeep }} contentFit="contain" accessibilityLabel="Payment QR preview" />
        ) : null}
        <Field
          label="Payment instructions"
          value={data.paymentInstructions ?? ''}
          onChangeText={set('paymentInstructions')}
          placeholder="Scan with eSewa, Khalti, or Fonepay to make a direct voluntary contribution."
          multiline
        />
        <Field label="Official mobile / wallet number" value={data.paymentPhone ?? ''} onChangeText={set('paymentPhone')} placeholder="Your official wallet or mobile number" keyboardType="phone-pad" />
      </Group>

      <Group title="Moderation policies">
        {MODERATION.map(({ key, title, hint }) => (
          <ToggleRow key={key} title={title} hint={hint} value={data[key] ?? true} onValueChange={set(key)} />
        ))}
        <Divider />
        <Field
          label="Prohibited words"
          value={wordsText}
          onChangeText={setWordsText}
          hint="Comma-separated words that are blocked in posts and comments."
          autoCapitalize="none"
          multiline
        />
        <Row gap={12} style={{ alignItems: 'flex-start' }}>
          <Field style={{ flex: 1 }} label="Max posts per day" value={String(data.maxPostsPerDay ?? '')} onChangeText={numText('maxPostsPerDay')} keyboardType="number-pad" />
          <Field style={{ flex: 1 }} label="Max comments per hour" value={String(data.maxCommentsPerHour ?? '')} onChangeText={numText('maxCommentsPerHour')} keyboardType="number-pad" />
        </Row>
      </Group>

      <Group title="Platform features">
        {FEATURES.map(({ key, title, hint }) => (
          <ToggleRow key={key} title={title} hint={hint} value={data[key] ?? true} onValueChange={set(key)} />
        ))}
      </Group>

      <View>
        <Button title="Save platform settings" onPress={save} loading={saving} full />
      </View>
    </Screen>
  );
}
