import React, { useState } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Archive, CheckCircle2, Megaphone, Pause, Pencil, Play, Send, ShieldAlert, Square, Trash2, Undo2, XCircle } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { confirm } from '../../lib/confirm';
import { formatNPR, formatNumber, humanize } from '../../lib/format';
import { colors, space } from '../../theme';
import { Button, Chip, EmptyState, ErrorState, Field, Loading, Row, Screen, T } from '../ui';
import { VerificationChip } from '../sponsorship/SponsorBits';
import { Box, KV, Notice, Section, StatTile, useSponsorApi } from '../sponsorship/AdminSponsorKit';
import { AdCreative } from './AdSlot';
import CampaignEditor from './CampaignEditor';
import { CTA_LABELS, CampaignReport, CreativeStatusChip, DeliveryChip, FORMAT_LABELS, HistoryList, SURFACE_LABELS, dateSpan, pctText, priceLine } from './AdBits';

// One ad campaign: overview, actions, editor, report and history.
// mode 'advertiser' → sponsor/ads/[id]; mode 'staff' → admin/ad-campaign/[id] (adds review tools).

const previewOf = (k, advertiserName) => ({ ...k, token: `preview-${k._id}`, ctaLabel: CTA_LABELS[k.cta], advertiserName });

const ReviewPanel = ({ c, onDone, showToast }) => {
  const [decisions, setDecisions] = useState({});
  const [reasons, setReasons] = useState({});
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');
  const verified = c.advertiser?.verificationStatus === 'VERIFIED';

  const send = async (decision) => {
    if (decision === 'REJECT' && !reason.trim()) return showToast('Tell the advertiser why the campaign was rejected', 'warning');
    const creatives = Object.entries(decisions).map(([_id, status]) => ({ _id, status, reason: (reasons[_id] || '').trim() }));
    if (creatives.some((k) => k.status === 'REJECTED' && !k.reason)) return showToast('Give a reason for each rejected creative', 'warning');
    setBusy(decision);
    try {
      const res = await API.put(`/ads/campaigns/${c._id}/review`, { decision, reason: reason.trim(), creatives });
      showToast(res.data?.message || 'Saved', 'success');
      onDone(res.data?.data);
    } catch (err) {
      showToast(errorMessage(err, 'Could not save the review'), 'error');
    } finally {
      setBusy('');
    }
    return undefined;
  };

  return (
    <Section title="Review" hint="Approving makes the campaign eligible to serve from its start date. Creatives you do not mark are approved with it.">
      {!verified ? (
        <Box tone="warn">
          <T variant="small" style={{ color: colors.marigoldText }}>{`The sponsor account “${c.advertiser?.name}” is not verified yet, so the campaign cannot be approved.`}</T>
          <Button title="Open sponsor accounts" size="sm" variant="ghost" onPress={() => router.push('/admin/sponsors')} />
        </Box>
      ) : null}
      {(c.creatives || []).map((k, i) => {
        const d = decisions[k._id];
        return (
          <Box key={k._id} tone="paper">
            <Row style={{ justifyContent: 'space-between' }} gap={8}>
              <T variant="semibold" style={{ flex: 1 }} numberOfLines={1}>{k.name || `Creative ${i + 1}`} · {FORMAT_LABELS[k.format]}</T>
              <CreativeStatusChip status={k.status} />
            </Row>
            {!k.isActive ? <T variant="caption">Inactive — not shown.</T> : null}
            <Row gap={8} wrap>
              <Chip label="Approve" active={d === 'APPROVED'} icon={CheckCircle2} onPress={() => setDecisions((x) => ({ ...x, [k._id]: d === 'APPROVED' ? undefined : 'APPROVED' }))} />
              <Chip label="Reject" active={d === 'REJECTED'} icon={XCircle} onPress={() => setDecisions((x) => ({ ...x, [k._id]: d === 'REJECTED' ? undefined : 'REJECTED' }))} />
            </Row>
            {d === 'REJECTED' ? <Field label="Reason for this creative" value={reasons[k._id] || ''} onChangeText={(v) => setReasons((x) => ({ ...x, [k._id]: v }))} multiline maxLength={500} /> : null}
          </Box>
        );
      })}
      <Field label="Note to the advertiser (required to reject)" value={reason} onChangeText={setReason} multiline maxLength={500} />
      <Row gap={10}>
        <Button title="Reject" icon={XCircle} variant="danger" loading={busy === 'REJECT'} disabled={!!busy} onPress={() => send('REJECT')} style={{ flex: 1 }} />
        <Button title="Approve" icon={CheckCircle2} variant="pine" loading={busy === 'APPROVE'} disabled={!!busy || !verified} onPress={() => send('APPROVE')} style={{ flex: 1 }} />
      </Row>
    </Section>
  );
};

export default function CampaignDetail({ id, mode = 'advertiser', showToast }) {
  const staff = mode === 'staff';
  const { data: c, setData, loading, refreshing, error, status, reload, refresh } = useSponsorApi(id ? `/ads/campaigns/${id}` : null, { fallback: 'Could not load this campaign.' });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [reportKey, setReportKey] = useState(0);
  const listHref = staff ? '/admin/ads' : '/sponsor/ads';

  if (loading) return <><Stack.Screen options={{ title: 'Ad campaign' }} /><Loading /></>;
  if (!c) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Ad campaign' }} />
        {status === 404 ? (
          <EmptyState icon={Megaphone} title="Campaign not found" message="It may have been deleted." action="Back to campaigns" onAction={() => router.replace(listHref)} />
        ) : status === 403 ? (
          <EmptyState icon={ShieldAlert} title="No access" message={error} />
        ) : (
          <ErrorState message={error} onRetry={() => reload()} />
        )}
      </Screen>
    );
  }

  const v = c.viewer || {};
  const canEdit = !!v.canEdit;
  const s = c.status;
  const onUpdated = (next) => {
    if (next) setData((prev) => ({ ...next, history: next.history || prev?.history }));
    else reload();
    setReportKey((k) => k + 1);
  };

  const act = async (action, { ask, message } = {}) => {
    if (ask && !(await confirm(ask, message || ''))) return;
    setBusy(action);
    try {
      const res = await API.post(`/ads/campaigns/${c._id}/status`, { action, note: note.trim() });
      showToast(res.data?.message || 'Saved', 'success');
      setNote('');
      onUpdated(res.data?.data);
      reload();
    } catch (err) {
      showToast(errorMessage(err, 'Could not change the campaign'), 'error');
    } finally {
      setBusy('');
    }
  };

  const submit = async () => {
    setBusy('SUBMIT');
    try {
      const res = await API.post(`/ads/campaigns/${c._id}/submit`, { note: note.trim() });
      showToast(res.data?.message || 'Submitted', 'success');
      setNote('');
      onUpdated(res.data?.data);
      reload();
    } catch (err) {
      showToast(errorMessage(err, 'Could not submit the campaign'), 'error');
    } finally {
      setBusy('');
    }
  };

  const remove = async () => {
    if (!(await confirm('Delete this campaign?', 'The draft and its creatives are removed permanently.'))) return;
    setBusy('DELETE');
    let offerArchive = '';
    try {
      const res = await API.delete(`/ads/campaigns/${c._id}`);
      showToast(res.data?.message || 'Campaign deleted', 'success');
      router.replace(listHref);
    } catch (err) {
      if (err?.response?.status === 409) offerArchive = errorMessage(err);
      else showToast(errorMessage(err, 'Could not delete the campaign'), 'error');
    } finally {
      setBusy('');
    }
    if (offerArchive && (await confirm('This campaign cannot be deleted', `${offerArchive}\n\nArchive it instead?`, { confirmText: 'Archive', destructive: false }))) act('ARCHIVE');
  };

  // Which buttons apply (server enforces the same rules)
  const writer = canEdit;
  const reviewer = !!v.canReview;
  const actions = [];
  if (writer && ['DRAFT', 'REJECTED'].includes(s)) actions.push({ key: 'SUBMIT', title: s === 'REJECTED' ? 'Resubmit for review' : 'Submit for review', icon: Send, variant: 'primary', run: submit });
  if (writer && s === 'IN_REVIEW') actions.push({ key: 'WITHDRAW', title: 'Withdraw to draft', icon: Undo2, variant: 'ghost', run: () => act('WITHDRAW', { ask: 'Withdraw from review?', message: 'The campaign goes back to draft so you can edit it.' }) });
  if ((writer || reviewer) && s === 'APPROVED') actions.push({ key: 'PAUSE', title: 'Pause', icon: Pause, variant: 'ghost', run: () => act('PAUSE') });
  if ((writer || reviewer) && s === 'PAUSED' && (reviewer || !c.pausedByStaff)) actions.push({ key: 'RESUME', title: 'Resume', icon: Play, variant: 'pine', run: () => act('RESUME') });
  if ((writer || reviewer) && ['APPROVED', 'PAUSED'].includes(s)) actions.push({ key: 'END', title: 'End now', icon: Square, variant: 'danger', run: () => act('END', { ask: 'End this campaign?', message: 'It stops showing immediately and cannot be restarted.' }) });
  if ((writer || reviewer) && ['DRAFT', 'REJECTED', 'ENDED'].includes(s)) actions.push({ key: 'ARCHIVE', title: 'Archive', icon: Archive, variant: 'ghost', run: () => act('ARCHIVE', { ask: 'Archive this campaign?', message: 'It is hidden from the active lists; reports stay available.' }) });
  if (writer && ['DRAFT', 'REJECTED'].includes(s)) actions.push({ key: 'DELETE', title: 'Delete', icon: Trash2, variant: 'danger', run: remove });
  const noteFor = actions.some((a) => ['SUBMIT', 'PAUSE', 'RESUME', 'END'].includes(a.key));
  const rejectedCreatives = (c.creatives || []).filter((k) => k.status === 'REJECTED');

  return (
    <Screen refreshing={refreshing} onRefresh={() => { refresh(); setReportKey((k) => k + 1); }}>
      <Stack.Screen options={{ title: c.title || 'Ad campaign' }} />

      <View style={{ gap: 8 }}>
        <Row wrap gap={8}>
          <DeliveryChip status={c.deliveryStatus} />
          {c.deliveryStatus !== s ? <Chip label={humanize(s)} tone={{ bg: colors.paperDeep, fg: colors.inkSoft }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} /> : null}
          {c.customPrice ? <Chip label="Custom price" tone={{ bg: colors.skyTint, fg: colors.sky }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} /> : null}
        </Row>
        <T variant="h1">{c.title}</T>
        <Row wrap gap={8}>
          <T variant="small">{c.advertiser?.name}</T>
          <VerificationChip status={c.advertiser?.verificationStatus} />
        </Row>
        <T variant="small">{`${dateSpan(c.startDate, c.endDate)} · ${humanize(c.objective)}`}</T>
      </View>

      {s === 'REJECTED' && c.rejectionReason ? <Notice>{`Not approved: ${c.rejectionReason}`}</Notice> : null}
      {rejectedCreatives.length ? (
        <Box tone="warn">
          <T variant="semibold" style={{ fontSize: 14.5, color: colors.marigoldText }}>Rejected creatives</T>
          {rejectedCreatives.map((k, i) => <T key={k._id} variant="small" style={{ color: colors.marigoldText }}>{`${k.name || `Creative ${i + 1}`}: ${k.rejectionReason || 'No reason given'}`}</T>)}
        </Box>
      ) : null}
      {s === 'PAUSED' ? <Notice>{c.pausedByStaff ? `Paused by the Hateymalo team${c.pauseNote ? `: ${c.pauseNote}` : '.'}${staff ? '' : ' Contact us to have it resumed.'}` : `Paused${c.pauseNote ? `: ${c.pauseNote}` : '.'}`}</Notice> : null}
      {c.deliveryStatus === 'NO_CREATIVE' ? <Notice>No approved, active creative — nothing can be shown.</Notice> : null}
      {s === 'IN_REVIEW' && !staff ? <Notice tone="paper">Waiting for review. Our team usually reviews ads within two working days.</Notice> : null}

      <Row wrap gap={10}>
        <StatTile label="Impressions" value={formatNumber(c.totals?.impressions)} hint={`${formatNumber(c.totals?.viewable)} viewable`} />
        <StatTile label="Clicks" value={formatNumber(c.totals?.clicks)} hint={`CTR ${pctText(c.ctr)}`} />
        <StatTile label="Spend to date" value={formatNPR(c.spend)} tone="pine" />
        <StatTile label={c.pricingModel === 'FLAT' ? 'Price' : 'Budget'} value={formatNPR(c.bookedValue)} hint={priceLine(c)} />
      </Row>

      {staff && reviewer && s === 'IN_REVIEW' ? <ReviewPanel c={c} showToast={showToast} onDone={(next) => { onUpdated(next); reload(); }} /> : null}

      {actions.length ? (
        <Section title="Actions">
          {noteFor ? <Field label={staff ? 'Note (shown in history and to the advertiser)' : 'Note (optional)'} value={note} onChangeText={setNote} maxLength={500} /> : null}
          <Row wrap gap={10}>
            {actions.map((a) => <Button key={a.key} title={a.title} icon={a.icon} variant={a.variant} size="sm" loading={busy === a.key} disabled={!!busy} onPress={a.run} />)}
          </Row>
          {s === 'PAUSED' && c.pausedByStaff && !reviewer ? <T variant="caption">Our team paused this campaign, so only they can resume it.</T> : null}
        </Section>
      ) : null}

      {editing ? (
        <Section title="Edit campaign">
          {['APPROVED', 'PAUSED'].includes(s) && !reviewer ? (
            <Notice>{'This campaign is approved. Saving changes (other than the daily frequency cap) sends it back to review and it stops showing until approved again.'}</Notice>
          ) : null}
          <CampaignEditor
            campaign={c}
            showToast={showToast}
            isManager={!!v.canManage}
            onCancel={() => setEditing(false)}
            onSaved={(next) => { setEditing(false); onUpdated(next); reload(); }}
          />
        </Section>
      ) : (
        <>
          <Section title="Details" right={canEdit ? <Button title="Edit" icon={Pencil} size="sm" variant="ghost" onPress={() => setEditing(true)} /> : null}>
            <Box>
              <KV label="Destination" value={c.destinationUrl} />
              <KV label="UTM tags" value={c.appendUtm ? 'Added' : 'Off'} />
              <KV label="Pricing" value={priceLine(c)} />
              {c.pricingModel !== 'FLAT' ? <KV label="Budget" value={formatNPR(c.budget)} /> : null}
              <KV label="Placements" value={(c.placements || []).join(', ') || 'None yet'} />
              <KV label="Shows on" value={(c.surfaces || []).map((x) => SURFACE_LABELS[x]).join(' + ')} />
              <KV label="Causes" value={(c.categories || []).length ? c.categories.join(', ') : 'Everywhere'} />
              <KV label="Per device per day" value={c.frequencyCapPerDay ? `${c.frequencyCapPerDay}×` : 'No limit'} />
              {c.description ? <T variant="small" style={{ color: colors.inkSoft }}>{c.description}</T> : null}
            </Box>
          </Section>
          <Section title="Creatives" hint={`${(c.creatives || []).length} creative${(c.creatives || []).length === 1 ? '' : 's'}`}>
            {(c.creatives || []).length ? c.creatives.map((k, i) => (
              <View key={k._id} style={{ gap: 6 }}>
                <Row style={{ justifyContent: 'space-between' }} gap={8}>
                  <T variant="semibold" style={{ flex: 1 }} numberOfLines={1}>{`${k.name || `Creative ${i + 1}`} · ${FORMAT_LABELS[k.format]}${k.isActive ? '' : ' · inactive'}`}</T>
                  <CreativeStatusChip status={k.status} />
                </Row>
                <AdCreative ad={previewOf(k, c.advertiser?.name)} preview />
              </View>
            )) : <T variant="small">No creatives yet.{canEdit ? ' Tap Edit to add one.' : ''}</T>}
          </Section>
        </>
      )}

      <CampaignReport campaignId={c._id} showToast={showToast} reloadKey={reportKey} />
      <HistoryList history={c.history} />
      <View style={{ height: space.lg }} />
    </Screen>
  );
}
