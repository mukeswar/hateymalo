import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Building2, ExternalLink, LogOut, Mail, MapPin, Pencil, Phone, ShieldAlert, ShieldCheck, UserMinus, UserPlus } from 'lucide-react-native';
import API, { errorMessage } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import { confirm } from '../../../../lib/confirm';
import { formatDate, humanize } from '../../../../lib/format';
import { colors, space } from '../../../../theme';
import { Avatar, Button, Card, Chip, Divider, EmptyState, Field, Loading, Row, Screen, Select, T } from '../../../../components/ui';
import { InfoNote, SponsorLogo, VerificationChip, accountTypeLabel, idOf, openLink } from '../../../../components/sponsorship/SponsorBits';
import SponsorAccountSheet from '../../../../components/sponsorship/SponsorAccountSheet';

// /sponsor/portal/account/[id] — one sponsor account (web: /sponsor/portal/accounts/:id).
const ROLES = [
  { value: 'EDITOR', label: 'Editor' },
  { value: 'VIEWER', label: 'Viewer' },
  { value: 'OWNER', label: 'Owner' },
];
const ROLE_HELP = {
  OWNER: 'Owners manage the team, edit the account and act on deals.',
  EDITOR: 'Editors can edit the account, apply, message and approve logos.',
  VIEWER: 'Viewers can read deals and receipts but cannot change anything.',
};

const Line = ({ icon: Icon, children, onPress }) => (
  <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? 'link' : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    <Icon size={16} color={colors.muted} />
    <T variant="body" style={{ flex: 1, fontSize: 15, color: onPress ? colors.brand : colors.inkSoft }}>{children}</T>
  </Pressable>
);

export default function SponsorAccountScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [acc, setAcc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EDITOR');
  const [adding, setAdding] = useState(false);
  const [busyMember, setBusyMember] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await API.get(`/sponsorship/accounts/${id}`);
      setAcc(res.data?.data || null);
      setNotFound('');
    } catch (err) {
      setNotFound(errorMessage(err, 'Could not load this sponsor account.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (user) load(); else setLoading(false); }, [load, user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return <Screen><Loading /></Screen>;

  if (!user) {
    return (
      <Screen>
        <EmptyState icon={Building2} title="Sign in to see this account" action="Sign in" onAction={() => router.push('/login')} />
      </Screen>
    );
  }

  if (!acc) {
    return (
      <Screen>
        <EmptyState
          icon={Building2}
          title="Sponsor account unavailable"
          message={notFound || 'It may have been removed, or you are no longer on its team.'}
          action="Back to the portal"
          onAction={() => router.replace('/sponsor/portal')}
        />
      </Screen>
    );
  }

  const myRole = acc.myRole;
  const canEdit = ['OWNER', 'EDITOR'].includes(myRole);
  const isOwner = myRole === 'OWNER';
  const members = acc.members || [];
  const owners = members.filter((m) => m.role === 'OWNER').length;

  const addMember = async () => {
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return showToast('Enter the email they use on Hateymalo', 'error');
    setAdding(true);
    try {
      const res = await API.post(`/sponsorship/accounts/${id}/members`, { email: e, role });
      showToast(res.data?.message || 'Member added', 'success');
      setEmail('');
      setRole('EDITOR');
      await load();
    } catch (err) {
      showToast(errorMessage(err, 'Could not add this person'), 'error');
    } finally {
      setAdding(false);
    }
  };

  const removeMember = async (m) => {
    const uid = idOf(m.user);
    const self = uid === user._id;
    const name = m.user?.name || 'this member';
    const ok = await confirm(
      self ? 'Leave this sponsor account?' : `Remove ${name}?`,
      self ? `You will lose access to ${acc.name} and its deals.` : `${name} will lose access to ${acc.name} and its deals.`,
      { confirmText: self ? 'Leave' : 'Remove' },
    );
    if (!ok) return;
    setBusyMember(uid);
    try {
      await API.delete(`/sponsorship/accounts/${id}/members/${uid}`);
      showToast(self ? `You left ${acc.name}` : 'Member removed', 'success');
      if (self) router.replace('/sponsor/portal');
      else await load();
    } catch (err) {
      showToast(errorMessage(err, 'Could not remove this member'), 'error');
    } finally {
      setBusyMember(null);
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: 'Sponsor account' }} />

      <Card style={{ gap: 12 }}>
        <Row gap={14}>
          <SponsorLogo uri={acc.logos?.[0]?.url} name={acc.name} size={54} />
          <View style={{ flex: 1, gap: 4 }}>
            <T variant="h2">{acc.name}</T>
            <T variant="caption">{accountTypeLabel(acc.type)} · you are {humanize(myRole || 'staff').toLowerCase()}</T>
          </View>
        </Row>
        <Row gap={6} wrap>
          <VerificationChip status={acc.verificationStatus} />
          {acc.vatRegistered ? <Chip label="VAT registered" tone={{ bg: colors.skyTint, fg: colors.sky }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} /> : null}
        </Row>
        {acc.verificationStatus === 'VERIFIED' ? (
          <InfoNote icon={ShieldCheck} tone="pine">Verified by the Hateymalo team{acc.verifiedAt ? ` on ${formatDate(acc.verifiedAt)}` : ''}.</InfoNote>
        ) : acc.verificationStatus === 'REJECTED' ? (
          <InfoNote icon={ShieldAlert} tone="brand">{acc.verificationNote || 'This account was not approved. Contact the Hateymalo team.'}</InfoNote>
        ) : (
          <InfoNote icon={ShieldAlert} tone="marigold">
            {acc.verificationNote || 'Our team will verify this account. You can already apply to campaigns; deals are signed once verified.'}
          </InfoNote>
        )}
        {acc.description ? <T variant="body" style={{ fontSize: 15 }}>{acc.description}</T> : null}
        <View style={{ gap: 8 }}>
          {acc.website ? <Line icon={ExternalLink} onPress={() => openLink(acc.website)}>{acc.website}</Line> : null}
          {acc.address ? <Line icon={MapPin}>{acc.address}</Line> : null}
          {acc.panNumber ? <Line icon={Building2}>PAN {acc.panNumber}</Line> : null}
          {acc.contactName || acc.contactEmail ? <Line icon={Mail}>{[acc.contactName, acc.contactEmail].filter(Boolean).join(' · ')}</Line> : null}
          {acc.contactPhone ? <Line icon={Phone}>{acc.contactPhone}</Line> : null}
        </View>
        {canEdit ? <Button title="Edit account" icon={Pencil} variant="ghost" full onPress={() => setEditOpen(true)} /> : null}
      </Card>

      {/* Logos */}
      <View style={{ gap: 10 }}>
        <T variant="h2">Logos</T>
        {acc.logos?.length ? (
          <Card style={{ gap: 14 }}>
            {acc.logos.map((l, i) => (
              <View key={l._id || i} style={{ gap: 8 }}>
                {i > 0 ? <Divider style={{ marginBottom: 6 }} /> : null}
                <Row gap={12}>
                  <SponsorLogo uri={l.url} name={acc.name} size={48} style={l.background === 'DARK' ? { backgroundColor: colors.night } : null} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="semibold">{l.label || 'Logo'}</T>
                    <T variant="caption">{l.background === 'LIGHT' ? 'For light backgrounds' : l.background === 'DARK' ? 'For dark backgrounds' : 'Any background'}</T>
                    <T variant="caption" numberOfLines={1}>{l.url}</T>
                  </View>
                </Row>
              </View>
            ))}
            <T variant="caption">Logos appear on a campaign only after you approve their use on that deal.</T>
          </Card>
        ) : (
          <T variant="small">No logos yet.{canEdit ? ' Add a logo link via “Edit account”.' : ''}</T>
        )}
      </View>

      {/* Team */}
      <View style={{ gap: 10 }}>
        <T variant="h2">Team</T>
        <Card style={{ gap: 12 }}>
          {members.map((m, i) => {
            const uid = idOf(m.user);
            const self = uid === user._id;
            const lastOwner = m.role === 'OWNER' && owners === 1;
            const canRemove = !lastOwner && (self || isOwner);
            return (
              <View key={uid || i} style={{ gap: 12 }}>
                {i > 0 ? <Divider /> : null}
                <Row gap={12}>
                  <Avatar name={m.user?.name} src={m.user?.profilePicture} size="sm" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T variant="semibold" numberOfLines={1}>{m.user?.name || 'Member'}{self ? ' (you)' : ''}</T>
                    {m.user?.email ? <T variant="caption" numberOfLines={1}>{m.user.email}</T> : null}
                  </View>
                  <Chip label={humanize(m.role)} tone={m.role === 'OWNER' ? { bg: colors.pineTint, fg: colors.pine } : { bg: colors.paperDeep, fg: colors.inkSoft }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} />
                </Row>
                {canRemove ? (
                  <Button
                    title={self ? 'Leave account' : 'Remove'}
                    icon={self ? LogOut : UserMinus}
                    variant="danger"
                    size="sm"
                    loading={busyMember === uid}
                    style={{ alignSelf: 'flex-start' }}
                    onPress={() => removeMember(m)}
                  />
                ) : null}
              </View>
            );
          })}
          {owners === 1 && isOwner ? (
            <T variant="caption">You are the only owner. Add another owner before you can leave.</T>
          ) : null}
        </Card>

        {isOwner ? (
          <Card style={{ gap: 12 }}>
            <Row gap={8}>
              <UserPlus size={18} color={colors.pine} />
              <T variant="h3">Add a colleague</T>
            </Row>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="name@company.com"
              autoCapitalize="none"
              keyboardType="email-address"
              hint="They need a Hateymalo account with this email."
            />
            <Select label="Role" options={ROLES} value={role} onChange={setRole} />
            <T variant="caption">{ROLE_HELP[role]}</T>
            <Button title="Add to team" variant="pine" loading={adding} onPress={addMember} />
          </Card>
        ) : null}
      </View>

      <Button title="Back to the sponsor portal" variant="text" onPress={() => router.replace('/sponsor/portal')} />
      <View style={{ height: space.md }} />

      <SponsorAccountSheet visible={editOpen} onClose={() => setEditOpen(false)} account={acc} onSaved={load} />
    </Screen>
  );
}
