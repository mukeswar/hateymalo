import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Image } from 'expo-image';
import { BriefcaseBusiness, Building, CheckCircle2, ChevronDown, ChevronUp, RotateCcw, XCircle } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { findSection } from '../../lib/adminAccess';
import { formatDate, humanize } from '../../lib/format';
import { colors, space } from '../../theme';
import { Avatar, Button, Card, ChipBar, Divider, EmptyState, ErrorState, Field, Loading, Row, Screen, Sheet, StatusChip, T } from '../../components/ui';
import { SearchBar } from '../../components/admin/content/kit';
import { KV, LinkList, isHttpUrl, useSponsorApi } from '../../components/sponsorship/AdminSponsorKit';

const TITLE = findSection('sponsors')?.label || 'Sponsor accounts';
const FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
];

// Web: SuperAdminDashboard "sponsors" tab. GET /sponsorship/admin/accounts?status= (managers, finance);
// verify / reject → PUT /sponsorship/admin/accounts/:id/verify { status, note } (managers only).
export default function AdminSponsors() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const canVerify = can('canManageSponsorships');
  const [status, setStatus] = useState('PENDING');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [verifying, setVerifying] = useState(null); // { account, status }
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, setData, loading, refreshing, error, reload, refresh } = useSponsorApi(`/sponsorship/admin/accounts${status ? `?status=${status}` : ''}`, { fallback: 'Could not load sponsor accounts.' });
  const accounts = data || [];
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return accounts.filter((a) => !s || [a.name, a.contactName, a.contactEmail, a.panNumber].some((x) => String(x || '').toLowerCase().includes(s)));
  }, [accounts, q]);

  const startVerify = (account, next) => { setNote(next === 'VERIFIED' ? '' : account.verificationNote || ''); setVerifying({ account, status: next }); };

  const submitVerify = async () => {
    const { account, status: next } = verifying;
    if (next === 'REJECTED' && !note.trim()) return showToast('Add a note so the sponsor knows why', 'error');
    setSaving(true);
    try {
      const res = await API.put(`/sponsorship/admin/accounts/${account._id}/verify`, { status: next, note: note.trim() });
      showToast(res.data?.message || 'Account updated', 'success');
      setVerifying(null);
      // Keep the populated members/deal counts; patch the verification fields.
      const u = res.data?.data || {};
      setData((prev) => (prev || [])
        .map((a) => (a._id === account._id ? { ...a, verificationStatus: u.verificationStatus || next, verificationNote: u.verificationNote ?? note.trim(), verifiedAt: u.verifiedAt } : a))
        .filter((a) => !status || a.verificationStatus === status));
    } catch (err) {
      showToast(errorMessage(err, 'Could not update verification'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item: a }) => {
    const expanded = open === a._id;
    const logo = (a.logos || []).find((l) => isHttpUrl(l.url));
    return (
      <Card style={{ marginHorizontal: space.lg, gap: space.md }}>
        <Row gap={12} style={{ alignItems: 'flex-start' }}>
          {logo ? (
            <Image source={{ uri: logo.url }} style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: colors.paperDeep }} contentFit="contain" accessibilityLabel={`${a.name} logo`} />
          ) : (
            <Avatar name={a.name} size="md" rounded={false} />
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="semibold">{a.name}</T>
            <T variant="small">{`${humanize(a.type)} · registered ${formatDate(a.createdAt)}`}</T>
            <Row wrap gap={6} style={{ marginTop: 4 }}>
              <StatusChip status={a.verificationStatus} />
              <T variant="caption" style={{ color: colors.muted }}>{`${a.dealCount || 0} deal${a.dealCount === 1 ? '' : 's'} · ${a.contractedDeals || 0} agreed`}</T>
            </Row>
          </View>
        </Row>
        {a.verificationNote ? <T variant="small" style={{ color: colors.marigoldText }}>{`Note: ${a.verificationNote}`}</T> : null}

        {expanded ? (
          <View style={{ gap: 8 }}>
            {a.description ? <T variant="small">{a.description}</T> : null}
            <KV label="Website" value={a.website} />
            <KV label="PAN" value={a.panNumber} />
            <KV label="VAT registered" value={a.vatRegistered ? 'Yes' : 'No'} />
            <KV label="Address" value={a.address} />
            <KV label="Contact" value={a.contactName} />
            <KV label="Email" value={a.contactEmail} />
            <KV label="Phone" value={a.contactPhone} />
            <KV label="Verified" value={a.verifiedAt ? formatDate(a.verifiedAt) : ''} />
            {a.logos?.length ? (
              <View style={{ gap: 6 }}>
                <T variant="caption" style={{ color: colors.muted }}>Logos</T>
                <Row wrap gap={8}>
                  {a.logos.map((l) => (
                    <View key={l._id || l.url} style={{ alignItems: 'center', gap: 2 }}>
                      {isHttpUrl(l.url) ? (
                        <Image source={{ uri: l.url }} style={{ width: 72, height: 44, borderRadius: 6, backgroundColor: l.background === 'DARK' ? colors.night : colors.paperDeep }} contentFit="contain" accessibilityLabel={`${l.label} logo`} />
                      ) : null}
                      <T variant="caption">{`${l.label} · ${humanize(l.background)}`}</T>
                    </View>
                  ))}
                </Row>
                <LinkList urls={a.logos.map((l) => l.url)} />
              </View>
            ) : null}
            <Divider />
            <T variant="caption" style={{ color: colors.muted }}>{`Team (${a.members?.length || 0})`}</T>
            {(a.members || []).map((m) => (
              <Row key={m.user?._id || String(m.user)} gap={10}>
                <Avatar name={m.user?.name} size="sm" />
                <View style={{ flex: 1 }}>
                  <T variant="medium" numberOfLines={1}>{m.user?.name || 'Member'}</T>
                  {m.user?.email ? <T variant="caption" numberOfLines={1}>{m.user.email}</T> : null}
                </View>
                <StatusChip status="INFO" label={humanize(m.role)} />
              </Row>
            ))}
          </View>
        ) : null}

        <Row wrap gap={8}>
          <Button
            title={expanded ? 'Less' : 'Details'}
            icon={expanded ? ChevronUp : ChevronDown}
            variant="ghost"
            size="sm"
            onPress={() => setOpen(expanded ? null : a._id)}
          />
          {a.dealCount ? <Button title="Deals" icon={BriefcaseBusiness} variant="soft" size="sm" onPress={() => router.push(`/admin/sponsorDeals?sponsor=${a._id}&stage=ALL`)} /> : null}
          {canVerify && a.verificationStatus !== 'VERIFIED' ? <Button title="Verify" icon={CheckCircle2} variant="pine" size="sm" onPress={() => startVerify(a, 'VERIFIED')} /> : null}
          {canVerify && a.verificationStatus !== 'REJECTED' ? <Button title="Reject" icon={XCircle} variant="danger" size="sm" onPress={() => startVerify(a, 'REJECTED')} /> : null}
          {canVerify && a.verificationStatus !== 'PENDING' ? <Button title="Back to pending" icon={RotateCcw} variant="text" size="sm" onPress={() => startVerify(a, 'PENDING')} /> : null}
        </Row>
      </Card>
    );
  };

  if (loading && !data) return <><Stack.Screen options={{ title: TITLE }} /><Loading /></>;

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: TITLE }} />
      <FlatList
        data={list}
        keyExtractor={(a) => a._id}
        renderItem={renderItem}
        contentContainerStyle={{ gap: space.md, paddingBottom: space.xxl * 2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, paddingTop: space.lg }}>
            <View style={{ gap: space.md, paddingHorizontal: space.lg }}>
              <T variant="small">Organisations registered to sponsor campaigns. Verify identity (name, PAN, contact) before agreeing deals.</T>
              <SearchBar value={q} onChange={setQ} placeholder="Search name, contact or PAN…" />
            </View>
            <ChipBar options={FILTERS} value={status} onChange={setStatus} />
          </View>
        }
        ListEmptyComponent={
          error ? (
            <ErrorState message={error} onRetry={() => reload()} />
          ) : (
            <EmptyState
              icon={Building}
              title={status === 'PENDING' ? 'Nothing waiting for verification' : 'No sponsor accounts here'}
              message={q ? 'Try another search.' : 'Members register sponsor accounts from the sponsor portal.'}
              action={status ? 'Show all accounts' : null}
              onAction={() => setStatus('')}
            />
          )
        }
      />

      <Sheet
        visible={!!verifying}
        onClose={() => setVerifying(null)}
        title={verifying ? `${verifying.status === 'VERIFIED' ? 'Verify' : verifying.status === 'REJECTED' ? 'Reject' : 'Reset'} ${verifying.account.name}` : ''}
        footer={
          <Button
            title={verifying?.status === 'VERIFIED' ? 'Mark verified' : verifying?.status === 'REJECTED' ? 'Reject account' : 'Move back to pending'}
            variant={verifying?.status === 'REJECTED' ? 'primary' : 'pine'}
            onPress={submitVerify}
            loading={saving}
            full
          />
        }
      >
        <T variant="small">
          {verifying?.status === 'VERIFIED'
            ? 'Confirm you have checked the organisation name, PAN and contact details. The sponsor team is notified.'
            : verifying?.status === 'REJECTED'
              ? 'Rejected accounts cannot apply to campaigns. Tell them what is missing or wrong.'
              : 'The account goes back to the verification queue.'}
        </T>
        <Field label={verifying?.status === 'REJECTED' ? 'Reason (sent to the sponsor)' : 'Note (optional, sent to the sponsor)'} value={note} onChangeText={setNote} multiline maxLength={500} />
      </Sheet>
    </Screen>
  );
}
