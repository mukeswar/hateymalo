import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Handshake,
  ImageIcon,
  Link2,
  MessageSquare,
  Package,
  Pencil,
  ReceiptText,
  Send,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Undo2,
} from 'lucide-react-native';
import API, { errorMessage } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import { confirm } from '../../../../lib/confirm';
import { formatDate, formatDateTime, formatNPR, humanize, timeAgo } from '../../../../lib/format';
import { colors, fonts, radius, space } from '../../../../theme';
import { Avatar, Button, Card, Chip, Divider, EmptyState, Field, Loading, ProgressBar, Row, Screen, StatusChip, T } from '../../../../components/ui';
import {
  CONTRACTED_STAGES,
  EDITABLE_STAGES,
  InfoNote,
  STAGES,
  SponsorLogo,
  StageChip,
  UrlImageField,
  idOf,
  isHttpUrl,
  openLink,
  resourceLabel,
  valuationLabel,
} from '../../../../components/sponsorship/SponsorBits';
import SponsorProposalSheet from '../../../../components/sponsorship/SponsorProposalSheet';
import SponsorBrandKitPreview from '../../../../components/sponsorship/SponsorBrandKitPreview';

// /sponsor/portal/deal/[id] — one sponsorship deal from the sponsor's side
// (web: /sponsor/portal/deals/:id).
const Section = ({ icon: Icon, title, right, children }) => (
  <Card style={{ gap: 12 }}>
    <Row gap={8}>
      <Icon size={18} color={colors.brand} />
      <T variant="h3" style={{ flex: 1 }}>{title}</T>
      {right}
    </Row>
    {children}
  </Card>
);

const KV = ({ label, children }) => (
  <View style={{ gap: 2 }}>
    <T variant="caption" style={{ textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: fonts.semibold }}>{label}</T>
    {typeof children === 'string' ? <T variant="body" style={{ fontSize: 15 }}>{children}</T> : children}
  </View>
);

const InKindList = ({ items, showStatus }) => (
  <View style={{ gap: 10 }}>
    {items.map((i, idx) => (
      <View key={i._id || idx} style={{ gap: 3, padding: 10, borderRadius: radius.sm, backgroundColor: colors.paperDeep }}>
        <Row gap={8} style={{ justifyContent: 'space-between' }}>
          <T variant="semibold" style={{ flex: 1, fontSize: 15 }}>{i.description}</T>
          {showStatus ? <StatusChip status={i.status === 'RECEIVED' ? 'COMPLETED' : i.status === 'CANCELLED' ? 'CANCELLED' : 'PENDING'} label={humanize(i.status)} /> : null}
        </Row>
        <T variant="caption">
          {resourceLabel(i.type)}
          {i.quantity ? ` · ${i.quantity} ${i.unit || ''}` : ''}
          {i.status === 'RECEIVED' && i.receivedAt ? ` · received ${formatDate(i.receivedAt)}` : ''}
        </T>
        {i.estimatedValue > 0 ? (
          <T variant="small" style={{ color: colors.pine }}>
            {formatNPR(i.estimatedValue)} <T variant="caption">estimated value — not cash · {valuationLabel(i.valuationMethod)}</T>
          </T>
        ) : null}
      </View>
    ))}
  </View>
);

export default function SponsorDealScreen() {
  const { id } = useLocalSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [logoDraft, setLogoDraft] = useState('');
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await API.get(`/sponsorship/deals/${id}`);
      setDeal(res.data?.data || null);
      setLoadError('');
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load this deal.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (user) load(); else if (!authLoading) setLoading(false); }, [load, user, authLoading]);
  useEffect(() => { setLogoDraft(deal?.logoUrl || ''); setConsent(false); }, [deal?.logoUrl, deal?.logoUsageApproved]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (authLoading || loading) return <Screen><Loading /></Screen>;

  if (!user) {
    return (
      <Screen>
        <EmptyState icon={Handshake} title="Sign in to see this deal" action="Sign in" onAction={() => router.push('/login')} />
      </Screen>
    );
  }

  if (!deal) {
    return (
      <Screen>
        <EmptyState
          icon={Handshake}
          title="Deal unavailable"
          message={loadError || 'It may have been removed, or you no longer have access.'}
          action="Back to the portal"
          onAction={() => router.replace('/sponsor/portal')}
        />
      </Screen>
    );
  }

  const v = deal.viewer || {};
  const canAct = ['OWNER', 'EDITOR'].includes(v.sponsorRole);
  const readOnly = v.isSponsor && !canAct;
  const editable = EDITABLE_STAGES.includes(deal.stage);
  const contracted = CONTRACTED_STAGES.includes(deal.stage);
  const opp = deal.opportunity || {};
  const oppId = idOf(opp);
  const proposal = deal.proposal || {};
  const inKind = deal.inKindItems || [];
  const activeInKind = inKind.filter((i) => i.status !== 'CANCELLED');
  const payments = deal.payments || [];
  const received = deal.amountReceived ?? payments.reduce((s, p) => s + (p.amount || 0), 0);
  const cash = deal.cashAmount || 0;
  const agreement = deal.agreement || {};
  const hasAgreement = !!(agreement.documentUrl || agreement.terms || agreement.signedAt);
  const sponsorLogos = deal.sponsor?.logos || [];
  const deliverables = deal.deliverables || [];
  const report = deal.report;
  const messages = deal.messages || [];
  const history = [...(deal.history || [])].reverse();

  const act = async (action, extra = {}, okText = 'Saved') => {
    setBusy(action);
    try {
      const res = await API.put(`/sponsorship/deals/${id}/sponsor`, { action, ...extra });
      setDeal(res.data?.data || deal);
      showToast(okText, 'success');
      return true;
    } catch (err) {
      showToast(errorMessage(err, 'Could not save'), 'error');
      return false;
    } finally {
      setBusy('');
    }
  };

  const setLogo = () => {
    if (!isHttpUrl(logoDraft)) return showToast('Logo must be an http(s) image link', 'error');
    act('SET_LOGO', { logoUrl: logoDraft.trim() }, 'Logo updated — approve it to allow use');
  };

  const revokeLogo = async () => {
    const ok = await confirm('Withdraw logo approval?', 'The campaign team will be told to stop using your logo on new materials.', { confirmText: 'Withdraw approval' });
    if (ok) act('REVOKE_LOGO', {}, 'Logo approval withdrawn');
  };

  const withdraw = async () => {
    const ok = await confirm('Withdraw this proposal?', `You are withdrawing from “${opp.title}”. You can apply again later.`, { confirmText: 'Withdraw' });
    if (ok) {
      const done = await act('WITHDRAW', { note: 'Withdrawn by sponsor' }, 'Proposal withdrawn');
      if (done) load();
    }
  };

  const sendMessage = async () => {
    const body = msg.trim();
    if (!body) return;
    setBusy('MSG');
    try {
      const res = await API.post(`/sponsorship/deals/${id}/messages`, { body });
      setDeal(res.data?.data || deal);
      setMsg('');
    } catch (err) {
      showToast(errorMessage(err, 'Could not send your message'), 'error');
    } finally {
      setBusy('');
    }
  };

  const logoDirty = logoDraft.trim() !== (deal.logoUrl || '');

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: 'Sponsorship deal' }} />

      {/* Header */}
      <Card style={{ gap: 12 }}>
        <Row gap={8} style={{ justifyContent: 'space-between' }}>
          <StageChip stage={deal.stage} />
          <T variant="caption">Updated {timeAgo(deal.updatedAt)}</T>
        </Row>
        <Pressable onPress={() => oppId && router.push(`/sponsor/${oppId}`)} accessibilityRole="link">
          <Row gap={6} style={{ alignItems: 'flex-start' }}>
            <T variant="h2" style={{ flex: 1 }}>{opp.title || 'Campaign'}</T>
            <ArrowUpRight size={18} color={colors.muted} style={{ marginTop: 4 }} />
          </Row>
        </Pressable>
        <Row gap={10}>
          <SponsorLogo uri={deal.logoUrl || sponsorLogos[0]?.url} name={deal.sponsor?.name} size={34} />
          <View style={{ flex: 1 }}>
            <T variant="semibold" numberOfLines={1}>{deal.sponsor?.name}</T>
            <T variant="caption">
              {deal.tier?.name || 'Custom package'}
              {opp.startDate ? ` · ${formatDate(opp.startDate)}` : ''}
              {opp.location ? ` · ${opp.location}` : ''}
            </T>
          </View>
        </Row>
        {STAGES[deal.stage]?.next ? <InfoNote tone={contracted ? 'pine' : 'sky'}>{STAGES[deal.stage].next}</InfoNote> : null}
        {readOnly ? <InfoNote icon={Eye} tone="marigold">You are a viewer on this sponsor account, so this deal is read-only.</InfoNote> : null}
        {deal.sponsor?._id ? (
          <Button title="Sponsor account" variant="text" size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => router.push(`/sponsor/portal/account/${deal.sponsor._id}`)} />
        ) : null}
      </Card>

      {/* Proposal */}
      <Section
        icon={FileText}
        title="Your proposal"
        right={canAct && editable ? <Button title="Edit" icon={Pencil} size="sm" variant="ghost" onPress={() => setEditOpen(true)} /> : null}
      >
        <KV label="Package">{deal.tier ? `${deal.tier.name}${deal.tier.price > 0 ? ` · ${formatNPR(deal.tier.price)}` : deal.tier.priceNote ? ` · ${deal.tier.priceNote}` : ''}` : 'Custom package'}</KV>
        {proposal.contributionTypes?.length ? (
          <KV label="Contribution">
            <Row gap={6} wrap>
              {proposal.contributionTypes.map((t) => <Chip key={t} label={resourceLabel(t)} style={{ paddingVertical: 3, paddingHorizontal: 10 }} />)}
            </Row>
          </KV>
        ) : null}
        <KV label="Proposed cash">{proposal.amount > 0 ? formatNPR(proposal.amount) : 'None'}</KV>
        {proposal.message ? <KV label="Message">{proposal.message}</KV> : null}
        {!contracted && activeInKind.length ? (
          <KV label="In-kind offer">
            <InKindList items={activeInKind} />
          </KV>
        ) : null}
        {deal.tier?.benefits?.length ? (
          <KV label="Package benefits">
            <View style={{ gap: 4 }}>
              {deal.tier.benefits.map((b, i) => (
                <Row key={`${b}-${i}`} gap={6}><CheckCircle2 size={14} color={colors.pine} /><T variant="small" style={{ flex: 1, color: colors.inkSoft }}>{b}</T></Row>
              ))}
            </View>
          </KV>
        ) : null}
      </Section>

      {/* Agreed terms */}
      {contracted || hasAgreement || cash > 0 ? (
        <Section icon={ShieldCheck} title="Agreed terms">
          <Row gap={12}>
            <View style={{ flex: 1 }}>
              <T variant="caption">Contracted cash</T>
              <T style={{ fontFamily: fonts.displayBold, fontSize: 24, color: colors.pine }}>{formatNPR(cash)}</T>
            </View>
            {deal.inKindEstimatedValue > 0 ? (
              <View style={{ flex: 1 }}>
                <T variant="caption">In-kind (estimated value — not cash)</T>
                <T style={{ fontFamily: fonts.display, fontSize: 18, color: colors.inkSoft }}>{formatNPR(deal.inKindEstimatedValue)}</T>
              </View>
            ) : null}
          </Row>
          {inKind.length ? <InKindList items={inKind} showStatus /> : null}
          {agreement.terms ? <KV label="Terms">{agreement.terms}</KV> : null}
          {agreement.signedAt ? (
            <KV label="Signed">{`${formatDate(agreement.signedAt)}${agreement.signedByName ? ` by ${agreement.signedByName}` : ''}`}</KV>
          ) : null}
          {isHttpUrl(agreement.documentUrl) ? (
            <Button title="Open agreement" icon={Link2} variant="ghost" size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => openLink(agreement.documentUrl)} />
          ) : null}
        </Section>
      ) : null}

      {/* Logo */}
      <Section icon={ImageIcon} title="Your logo on this campaign">
        {deal.logoUrl ? (
          <Row gap={12}>
            <SponsorLogo uri={deal.logoUrl} name={deal.sponsor?.name} size={56} />
            <View style={{ flex: 1, gap: 4 }}>
              {deal.logoUsageApproved ? (
                <Chip label="Use approved" icon={ShieldCheck} tone={{ bg: colors.pineTint, fg: colors.pine }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} />
              ) : (
                <Chip label="Not approved yet" tone={{ bg: colors.marigoldTint, fg: colors.marigoldText }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} />
              )}
              {deal.logoUsageApproved && deal.logoApprovedAt ? <T variant="caption">Approved {formatDate(deal.logoApprovedAt)}</T> : null}
            </View>
          </Row>
        ) : (
          <T variant="small">No logo chosen yet.</T>
        )}
        {!deal.logoUsageApproved ? (
          <T variant="small">Your logo is never shown on vests, banners or the public page until you approve it here.</T>
        ) : null}

        {canAct ? (
          <View style={{ gap: 12 }}>
            {sponsorLogos.length ? (
              <View style={{ gap: 6 }}>
                <T variant="semibold" style={{ fontSize: 14.5 }}>Pick from your account</T>
                <Row gap={8} wrap>
                  {sponsorLogos.map((l) => {
                    const on = logoDraft.trim() === l.url;
                    return (
                      <Pressable
                        key={l._id || l.url}
                        onPress={() => setLogoDraft(l.url)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={l.label || 'Logo'}
                        style={{ borderRadius: 14, borderWidth: 2, borderColor: on ? colors.brand : 'transparent', padding: 2 }}
                      >
                        <SponsorLogo uri={l.url} name={deal.sponsor?.name} size={40} />
                      </Pressable>
                    );
                  })}
                </Row>
              </View>
            ) : null}
            <UrlImageField label="Or paste a logo link" value={logoDraft} onChangeText={setLogoDraft} previewHeight={48} />
            {logoDirty ? (
              <Button title="Use this logo" variant="ghost" loading={busy === 'SET_LOGO'} onPress={setLogo} />
            ) : null}

            {deal.logoUrl && !deal.logoUsageApproved && !logoDirty ? (
              <View style={{ gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.paperDeep }}>
                <Row gap={12} style={{ alignItems: 'flex-start' }}>
                  <T variant="small" style={{ flex: 1, color: colors.inkSoft }}>
                    I confirm {deal.sponsor?.name || 'our organisation'} owns this logo and allows Hateymalo to print and display it for “{opp.title}”.
                  </T>
                  <Switch
                    value={consent}
                    onValueChange={setConsent}
                    trackColor={{ true: colors.pine, false: colors.sand }}
                    thumbColor={colors.white}
                    accessibilityLabel="I allow Hateymalo to use this logo for this campaign"
                  />
                </Row>
                <Button
                  title="Approve logo use"
                  icon={ShieldCheck}
                  variant="pine"
                  disabled={!consent}
                  loading={busy === 'APPROVE_LOGO'}
                  onPress={() => act('APPROVE_LOGO', {}, 'Logo use approved')}
                />
              </View>
            ) : null}
            {deal.logoUsageApproved ? (
              <Button title="Withdraw logo approval" icon={ShieldOff} variant="danger" size="sm" style={{ alignSelf: 'flex-start' }} loading={busy === 'REVOKE_LOGO'} onPress={revokeLogo} />
            ) : null}
          </View>
        ) : null}
      </Section>

      {/* Brand kit */}
      {contracted && oppId ? <SponsorBrandKitPreview opportunityId={oppId} dealId={deal._id} /> : null}

      {/* Deliverables */}
      {deliverables.length ? (
        <Section icon={Package} title="Deliverables" right={<T variant="caption">{deliverables.filter((d) => d.status === 'DONE' || d.status === 'WAIVED').length}/{deliverables.length} done</T>}>
          {deliverables.map((d, i) => (
            <View key={d._id || i} style={{ gap: 6 }}>
              {i > 0 ? <Divider style={{ marginBottom: 6 }} /> : null}
              <Row gap={8} style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <T variant="semibold" style={{ flex: 1, fontSize: 15 }}>{d.title}</T>
                <StatusChip status={d.status === 'DONE' ? 'COMPLETED' : d.status} label={humanize(d.status)} />
              </Row>
              <T variant="caption">
                {humanize(d.type)}
                {d.dueDate ? ` · due ${formatDate(d.dueDate)}` : ''}
                {d.completedAt ? ` · completed ${formatDate(d.completedAt)}${d.completedBy?.name ? ` by ${d.completedBy.name}` : ''}` : ''}
              </T>
              {d.proofNote ? <T variant="small" style={{ color: colors.inkSoft }}>{d.proofNote}</T> : null}
              {(d.proofUrls || []).filter(isHttpUrl).map((u, k) => (
                <Pressable key={`${u}-${k}`} onPress={() => openLink(u)} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Link2 size={14} color={colors.brand} />
                  <T variant="small" style={{ color: colors.brand, flex: 1 }} numberOfLines={1}>{u}</T>
                </Pressable>
              ))}
            </View>
          ))}
        </Section>
      ) : contracted ? (
        <Section icon={Package} title="Deliverables">
          <T variant="small">The team has not listed deliverables for this deal yet.</T>
        </Section>
      ) : null}

      {/* Payments */}
      {payments.length || (contracted && cash > 0) ? (
        <Section icon={ReceiptText} title="Payments & receipts">
          {cash > 0 ? (
            <View style={{ gap: 6 }} accessibilityLabel={`${formatNPR(received)} received of ${formatNPR(cash)} contracted`}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T variant="small"><T style={{ fontFamily: fonts.displayBold, fontSize: 17, color: colors.pine }}>{formatNPR(received)}</T> received</T>
                <T variant="small">of {formatNPR(cash)} contracted</T>
              </Row>
              <ProgressBar value={cash ? (received / cash) * 100 : 0} color={colors.pine} />
              {received < cash ? <T variant="caption">{formatNPR(cash - received)} outstanding</T> : <T variant="caption" style={{ color: colors.pine }}>Fully paid — thank you.</T>}
            </View>
          ) : null}
          {payments.length ? (
            payments.map((p, i) => (
              <View key={p._id || i} style={{ gap: 2, paddingTop: i ? 10 : 0, borderTopWidth: i ? 1 : 0, borderTopColor: colors.sand }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T variant="semibold">{formatNPR(p.amount)}</T>
                  <T variant="caption">{formatDate(p.receivedAt)}</T>
                </Row>
                <T variant="caption">{humanize(p.method)}{p.reference ? ` · ref ${p.reference}` : ''}</T>
                {p.note ? <T variant="small">{p.note}</T> : null}
              </View>
            ))
          ) : (
            <T variant="small">No payments recorded yet. Receipts appear here once the finance team logs your transfer.</T>
          )}
        </Section>
      ) : null}

      {/* Impact report */}
      {report?.sharedAt ? (
        <Section icon={Sparkles} title="Impact report">
          <T variant="caption">Shared {formatDate(report.sharedAt)}</T>
          {report.summary ? <T variant="body" style={{ fontSize: 15.5 }}>{report.summary}</T> : null}
          {report.highlights?.length ? (
            <View style={{ gap: 6 }}>
              {report.highlights.map((h, i) => (
                <Row key={`${h}-${i}`} gap={8} style={{ alignItems: 'flex-start' }}>
                  <CheckCircle2 size={16} color={colors.pine} style={{ marginTop: 2 }} />
                  <T variant="body" style={{ flex: 1, fontSize: 15 }}>{h}</T>
                </Row>
              ))}
            </View>
          ) : null}
          {(report.mediaUrls || []).filter(isHttpUrl).map((u, i) => (
            <Pressable key={`${u}-${i}`} onPress={() => openLink(u)} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Link2 size={14} color={colors.brand} />
              <T variant="small" style={{ color: colors.brand, flex: 1 }} numberOfLines={1}>{u}</T>
            </Pressable>
          ))}
        </Section>
      ) : null}

      {/* Messages */}
      <Section icon={MessageSquare} title="Messages">
        {messages.length ? (
          messages.map((m, i) => {
            const mine = idOf(m.author) === user._id;
            const team = m.authorSide === 'HATEYMALO';
            return (
              <View
                key={m._id || i}
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  gap: 4,
                  padding: 12,
                  borderRadius: 16,
                  backgroundColor: mine ? colors.brandTint : team ? colors.pineTint : colors.paperDeep,
                }}
              >
                <Row gap={6}>
                  <Avatar name={m.author?.name} src={m.author?.profilePicture} size="xs" />
                  <T style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink }} numberOfLines={1}>
                    {mine ? 'You' : m.author?.name || 'Member'}{team ? ' · Hateymalo' : ''}
                  </T>
                </Row>
                <T variant="body" style={{ fontSize: 15 }}>{m.body}</T>
                <T variant="caption" accessibilityLabel={formatDateTime(m.at)}>{timeAgo(m.at)}</T>
              </View>
            );
          })
        ) : (
          <T variant="small">No messages yet.{canAct ? ' Ask the team anything about this sponsorship.' : ''}</T>
        )}
        {canAct ? (
          <View style={{ gap: 8 }}>
            <Field value={msg} onChangeText={setMsg} placeholder="Write a message to the Hateymalo team…" multiline maxLength={3000} accessibilityLabel="Message" />
            <Button title="Send" icon={Send} size="sm" loading={busy === 'MSG'} disabled={!msg.trim()} style={{ alignSelf: 'flex-end' }} onPress={sendMessage} />
          </View>
        ) : null}
      </Section>

      {/* History */}
      {history.length ? (
        <Section icon={Clock} title="History">
          {history.map((h, i) => (
            <Row key={h._id || i} gap={12} style={{ alignItems: 'flex-start' }}>
              <View style={{ alignItems: 'center', width: 14 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 5, backgroundColor: i === 0 ? colors.brand : colors.sand }} />
                {i < history.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 28, backgroundColor: colors.sand, marginTop: 2 }} /> : null}
              </View>
              <View style={{ flex: 1, gap: 2, paddingBottom: 6 }}>
                <Row gap={6} wrap>
                  <StageChip stage={h.stage} />
                  <T variant="caption">{formatDateTime(h.at)}</T>
                </Row>
                {h.note ? <T variant="small" style={{ color: colors.inkSoft }}>{h.note}</T> : null}
                {h.by?.name ? <T variant="caption">by {h.by.name}</T> : null}
              </View>
            </Row>
          ))}
        </Section>
      ) : null}

      {canAct && editable ? (
        <Button title="Withdraw proposal" icon={Undo2} variant="danger" full loading={busy === 'WITHDRAW'} onPress={withdraw} />
      ) : null}
      <View style={{ height: space.md }} />

      {canAct ? (
        <SponsorProposalSheet visible={editOpen} onClose={() => setEditOpen(false)} deal={deal} onSaved={(d) => d && setDeal(d)} />
      ) : null}
    </Screen>
  );
}
