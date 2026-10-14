import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { ArrowRight, CheckCircle2, FileText, Lock, Plus, Send, Share2, Trash2 } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { confirm } from '../../lib/confirm';
import { formatDate, formatDateTime, formatNPR, humanize, timeAgo } from '../../lib/format';
import { colors, fonts, radius, space } from '../../theme';
import { Avatar, Button, Chip, Divider, Field, Row, StatusChip, T } from '../ui';
import { ToggleRow } from '../admin/people/PeopleKit';
import {
  CONTRACTED_STAGES,
  DELIVERABLE_STATUSES,
  DELIVERABLE_TYPES,
  IN_KIND_STATUSES,
  PAYMENT_METHODS,
  RESOURCE_TYPES,
  VALUATION_METHODS,
  Box,
  DateField,
  KV,
  LinkList,
  MoneyField,
  Notice,
  PickChips,
  RowListEditor,
  Section,
  UrlField,
  allowedMoves,
  has,
  intOr0,
  isDateInput,
  isHttpUrl,
  lines,
  priceText,
  toDateInput,
  useSponsorApi,
} from './AdminSponsorKit';

// Full deal workspace shared by the staff deal screen (admin/sponsor-deal/[id])
// and the organiser workspace (sponsor/organize/[id], inside a sheet).
// Everything is gated by the `viewer` flags the server returns with the deal;
// money fields are only rendered when the API includes them.

export const useDeal = (id) => useSponsorApi(id ? `/sponsorship/deals/${id}` : null, { fallback: 'Could not load this deal.' });

const IN_KIND_NOTE = 'estimated value — not cash';

const termsFromDeal = (d) => ({
  tier: d.tier?._id || '',
  isCustomQuote: !!d.isCustomQuote,
  cashAmount: d.cashAmount ? String(d.cashAmount) : '',
  inKindItems: (d.inKindItems || []).map((i) => ({ ...i, quantity: i.quantity ? String(i.quantity) : '', estimatedValue: i.estimatedValue ? String(i.estimatedValue) : '' })),
  agreement: {
    documentUrl: d.agreement?.documentUrl || '',
    terms: d.agreement?.terms || '',
    signedAt: toDateInput(d.agreement?.signedAt),
    signedByName: d.agreement?.signedByName || '',
  },
  showOnPublicPage: d.showOnPublicPage !== false,
});

const reportFromDeal = (d) => ({
  summary: d.report?.summary || '',
  highlights: (d.report?.highlights || []).join('\n'),
  mediaUrls: (d.report?.mediaUrls || []).join('\n'),
});

/* ---------- Pieces ---------- */

const InKindList = ({ items = [] }) =>
  items.length ? (
    <View style={{ gap: 6 }}>
      {items.map((i) => (
        <Box key={i._id || i.description} tone="paper">
          <Row style={{ justifyContent: 'space-between' }} gap={8}>
            <T variant="medium" style={{ flex: 1 }}>{`${humanize(i.type)}: ${i.description}`}</T>
            {i.status ? <StatusChip status={i.status === 'RECEIVED' ? 'COMPLETED' : i.status === 'PLEDGED' ? 'PENDING' : i.status} label={humanize(i.status)} /> : null}
          </Row>
          {i.quantity ? <T variant="small">{`${i.quantity} ${i.unit || ''}`.trim()}</T> : null}
          {has(i.estimatedValue) ? (
            <T variant="small">{`${formatNPR(i.estimatedValue)} ${IN_KIND_NOTE}${i.valuationMethod ? ` · ${humanize(i.valuationMethod)}` : ''}`}</T>
          ) : null}
        </Box>
      ))}
    </View>
  ) : null;

const StageMover = ({ deal, onDeal, showToast }) => {
  const moves = allowedMoves(deal.stage, deal.viewer);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  if (!moves.length) {
    return <T variant="small">{deal.stage === 'WITHDRAWN' ? 'The sponsor withdrew this proposal.' : 'No stage changes are available to you here.'}</T>;
  }
  const go = async (to) => {
    const destructive = ['DECLINED', 'CANCELLED'].includes(to);
    if (!(await confirm(`Move to ${humanize(to)}?`, to === 'AGREED' ? 'Agreeing copies the deliverables template onto this deal and notifies the sponsor.' : 'The sponsor will be notified.', { confirmText: humanize(to), destructive }))) return;
    setBusy(to);
    try {
      const res = await API.put(`/sponsorship/deals/${deal._id}/stage`, { stage: to, note: note.trim() });
      onDeal(res.data.data);
      setNote('');
      showToast(res.data?.message || 'Stage updated', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Could not change the stage'), 'error');
    } finally {
      setBusy('');
    }
  };
  return (
    <View style={{ gap: 10 }}>
      <Field label="Note for the history (optional)" value={note} onChangeText={setNote} maxLength={500} />
      <Row wrap gap={8}>
        {moves.map((to) => (
          <Button
            key={to}
            title={humanize(to)}
            icon={ArrowRight}
            size="sm"
            variant={to === 'AGREED' || to === 'FULFILLED' ? 'pine' : ['DECLINED', 'CANCELLED'].includes(to) ? 'danger' : 'ghost'}
            loading={busy === to}
            disabled={!!busy}
            onPress={() => go(to)}
          />
        ))}
      </Row>
    </View>
  );
};

const TermsEditor = ({ deal, onDeal, showToast }) => {
  const [t, setT] = useState(() => termsFromDeal(deal));
  const [saving, setSaving] = useState(false);
  const tiersApi = useSponsorApi(deal.opportunity?._id ? `/sponsorship/tiers?opportunity=${deal.opportunity._id}` : null);
  useEffect(() => { setT(termsFromDeal(deal)); }, [deal]);
  const set = (k) => (v) => setT((x) => ({ ...x, [k]: v }));
  const setAg = (k) => (v) => setT((x) => ({ ...x, agreement: { ...x.agreement, [k]: v } }));
  const locked = ['WITHDRAWN', 'DECLINED', 'CANCELLED'].includes(deal.stage);

  const save = async () => {
    if (t.agreement.documentUrl && !isHttpUrl(t.agreement.documentUrl)) return showToast('Agreement document must be an http(s) link', 'error');
    if (!isDateInput(t.agreement.signedAt)) return showToast('Signed date must look like 2026-11-20', 'error');
    if (t.inKindItems.some((i) => !String(i.description || '').trim())) return showToast('Each in-kind item needs a description', 'error');
    setSaving(true);
    try {
      const res = await API.put(`/sponsorship/deals/${deal._id}`, {
        tier: t.tier || null,
        isCustomQuote: t.isCustomQuote,
        cashAmount: intOr0(t.cashAmount),
        inKindItems: t.inKindItems.map((i) => ({
          ...(i._id ? { _id: i._id } : {}),
          type: i.type,
          description: String(i.description).trim(),
          quantity: intOr0(i.quantity),
          unit: String(i.unit || '').trim(),
          estimatedValue: intOr0(i.estimatedValue),
          valuationMethod: i.valuationMethod,
          status: i.status,
          receivedAt: i.receivedAt || null,
        })),
        agreement: { ...t.agreement, signedAt: t.agreement.signedAt || null },
        showOnPublicPage: t.showOnPublicPage,
      });
      onDeal(res.data.data);
      showToast(res.data?.message || 'Terms saved', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Could not save the terms'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (locked) return <Notice tone="paper">Reopen this deal (move it back to review) before changing its terms.</Notice>;
  const tiers = tiersApi.data || [];
  return (
    <View style={{ gap: space.lg }}>
      <View style={{ gap: 8 }}>
        <T variant="semibold" style={{ fontSize: 14.5 }}>Tier</T>
        <Row wrap gap={8}>
          <Chip label="No tier (custom)" active={!t.tier} onPress={() => set('tier')('')} />
          {tiers.map((x) => (
            <Chip key={x._id} label={`${x.name} · ${priceText(x)}${x.isActive ? '' : ' (inactive)'}`} active={t.tier === x._id} onPress={() => set('tier')(x._id)} />
          ))}
        </Row>
      </View>
      <ToggleRow title="Custom quote" hint="The package differs from the published tier." value={t.isCustomQuote} onValueChange={set('isCustomQuote')} />
      <MoneyField label="Contracted cash (NPR)" value={t.cashAmount} onChangeText={set('cashAmount')} hint="Agreeing the deal needs cash above 0 or an active in-kind item." />
      <RowListEditor
        title="In-kind items"
        hint={`Values are an ${IN_KIND_NOTE}; they never count as cash revenue.`}
        rows={t.inKindItems}
        onChange={set('inKindItems')}
        blank={{ type: 'MATERIALS', description: '', quantity: '', unit: '', estimatedValue: '', valuationMethod: 'NOT_VALUED', status: 'PLEDGED' }}
        addLabel="Add in-kind item"
        renderRow={(i, up) => (
          <>
            <PickChips label="Type" options={RESOURCE_TYPES.filter((x) => x !== 'CASH')} value={i.type} onChange={(type) => up({ type })} />
            <Field label="Description" value={i.description} onChangeText={(description) => up({ description })} maxLength={300} />
            <Row gap={12}>
              <View style={{ flex: 1 }}><Field label="Quantity" value={i.quantity} onChangeText={(v) => up({ quantity: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><Field label="Unit" value={i.unit} onChangeText={(unit) => up({ unit })} maxLength={30} /></View>
            </Row>
            <MoneyField label={`Value (NPR, ${IN_KIND_NOTE})`} value={i.estimatedValue} onChangeText={(estimatedValue) => up({ estimatedValue })} />
            <PickChips label="Valuation method" options={VALUATION_METHODS} value={i.valuationMethod} onChange={(valuationMethod) => up({ valuationMethod })} />
            <PickChips label="Status" options={IN_KIND_STATUSES} value={i.status} onChange={(status) => up({ status, receivedAt: status === 'RECEIVED' ? i.receivedAt || new Date().toISOString() : null })} />
          </>
        )}
      />
      <T variant="semibold" style={{ fontSize: 14.5 }}>Agreement</T>
      <UrlField label="Signed agreement link" value={t.agreement.documentUrl} onChangeText={setAg('documentUrl')} preview={false} />
      <Field label="Key terms" value={t.agreement.terms} onChangeText={setAg('terms')} multiline maxLength={4000} />
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}><DateField label="Signed on" value={t.agreement.signedAt} onChangeText={setAg('signedAt')} /></View>
        <View style={{ flex: 1 }}><Field label="Signed by" value={t.agreement.signedByName} onChangeText={setAg('signedByName')} maxLength={120} /></View>
      </Row>
      <ToggleRow title="Show on the public campaign page" hint="Only once agreed, and only with the sponsor's logo approval." value={t.showOnPublicPage} onValueChange={set('showOnPublicPage')} />
      <Button title="Save terms" icon={CheckCircle2} onPress={save} loading={saving} />
    </View>
  );
};

const Messages = ({ deal, onDeal, showToast }) => {
  const v = deal.viewer || {};
  const canPost = v.isManager || v.isOrganizer || v.isFinance;
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await API.post(`/sponsorship/deals/${deal._id}/messages`, { body: body.trim(), internal });
      onDeal(res.data.data);
      setBody('');
      showToast(internal ? 'Internal note added' : 'Message sent to the sponsor', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Could not send the message'), 'error');
    } finally {
      setSending(false);
    }
  };
  const msgs = deal.messages || [];
  return (
    <View style={{ gap: 10 }}>
      {!msgs.length ? <T variant="small">No messages yet.</T> : null}
      {msgs.map((m) => {
        const ours = m.authorSide === 'HATEYMALO';
        return (
          <View
            key={m._id}
            style={{
              alignSelf: ours ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
              backgroundColor: m.internal ? colors.marigoldTint : ours ? colors.pineTint : colors.white,
              borderColor: m.internal ? '#F1D9A8' : colors.sand,
              borderWidth: 1,
              borderRadius: radius.md,
              padding: space.md,
              gap: 4,
            }}
          >
            <Row gap={6}>
              <Avatar name={m.author?.name} src={m.author?.profilePicture} size="xs" />
              <T variant="caption" style={{ fontFamily: fonts.semibold, flexShrink: 1 }} numberOfLines={1}>{m.author?.name || (ours ? 'Hateymalo' : 'Sponsor')}</T>
              {m.internal ? <Lock size={12} color={colors.marigoldText} /> : null}
              <T variant="caption" style={{ color: colors.muted }}>{timeAgo(m.at)}</T>
            </Row>
            {m.internal ? <T variant="caption" style={{ color: colors.marigoldText }}>Internal note — hidden from the sponsor</T> : null}
            <T variant="body" selectable>{m.body}</T>
          </View>
        );
      })}
      {canPost ? (
        <View style={{ gap: 8 }}>
          <Field label={internal ? 'Internal note' : 'Message to the sponsor'} value={body} onChangeText={setBody} multiline maxLength={3000} />
          <ToggleRow title="Internal note" hint="Visible to staff and organisers only." value={internal} onValueChange={setInternal} warn />
          <Button title={internal ? 'Add note' : 'Send'} icon={Send} onPress={send} loading={sending} disabled={!body.trim()} />
        </View>
      ) : (
        <T variant="small" style={{ color: colors.muted }}>Your role can read this thread but not post in it.</T>
      )}
    </View>
  );
};

const DeliverableRow = ({ deal, item, onDeal, showToast }) => {
  const v = deal.viewer || {};
  const canEdit = v.isManager || v.isOrganizer || v.isBrand;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ status: item.status, proofUrls: (item.proofUrls || []).join('\n'), proofNote: item.proofNote || '', dueDate: toDateInput(item.dueDate) });
  const [busy, setBusy] = useState('');
  useEffect(() => {
    setF({ status: item.status, proofUrls: (item.proofUrls || []).join('\n'), proofNote: item.proofNote || '', dueDate: toDateInput(item.dueDate) });
  }, [item]);
  const statuses = v.isManager ? DELIVERABLE_STATUSES : DELIVERABLE_STATUSES.filter((s) => s !== 'WAIVED' || item.status === 'WAIVED');

  const save = async () => {
    const urls = lines(f.proofUrls);
    if (urls.some((u) => !isHttpUrl(u))) return showToast('Each proof must be an http(s) link', 'error');
    if (!isDateInput(f.dueDate)) return showToast('Due date must look like 2026-11-20', 'error');
    if (f.status === 'DONE' && !urls.length && !f.proofNote.trim()) return showToast('Add a proof link or note before marking this done', 'error');
    setBusy('save');
    try {
      const res = await API.put(`/sponsorship/deals/${deal._id}/deliverables/${item._id}`, { proofUrls: urls, proofNote: f.proofNote.trim(), dueDate: f.dueDate || null, status: f.status });
      onDeal(res.data.data);
      setOpen(false);
      showToast(res.data?.message || 'Deliverable saved', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Could not save the deliverable'), 'error');
    } finally {
      setBusy('');
    }
  };
  const remove = async () => {
    if (!(await confirm(`Remove "${item.title}"?`, 'This deliverable will be deleted from the deal.', { confirmText: 'Remove' }))) return;
    setBusy('del');
    try {
      const res = await API.delete(`/sponsorship/deals/${deal._id}/deliverables/${item._id}`);
      onDeal(res.data.data);
      showToast('Deliverable removed', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Could not remove the deliverable'), 'error');
      setBusy('');
    }
  };

  return (
    <Box>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} gap={8}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="semibold">{item.title}</T>
          <T variant="small">{humanize(item.type)}{item.dueDate ? ` · due ${formatDate(item.dueDate)}` : ''}</T>
        </View>
        <StatusChip status={item.status === 'DONE' ? 'COMPLETED' : item.status === 'WAIVED' ? 'CANCELLED' : item.status} label={humanize(item.status)} />
      </Row>
      <LinkList urls={item.proofUrls} />
      {item.proofNote ? <T variant="small">{item.proofNote}</T> : null}
      {item.completedBy?.name ? <T variant="caption" style={{ color: colors.muted }}>{`${humanize(item.status)} by ${item.completedBy.name}${item.completedAt ? ` · ${formatDate(item.completedAt)}` : ''}`}</T> : null}
      {canEdit && !open ? (
        <Row gap={8} wrap>
          <Button title="Update" size="sm" variant="ghost" onPress={() => setOpen(true)} />
          {v.isManager ? <Button title="Remove" icon={Trash2} size="sm" variant="danger" loading={busy === 'del'} onPress={remove} /> : null}
        </Row>
      ) : null}
      {open ? (
        <View style={{ gap: 10 }}>
          <PickChips label="Status" options={statuses} value={f.status} onChange={(status) => setF((x) => ({ ...x, status }))} />
          <Field label="Proof links" value={f.proofUrls} onChangeText={(proofUrls) => setF((x) => ({ ...x, proofUrls }))} multiline autoCapitalize="none" autoCorrect={false} hint="One http(s) link per line (photos, posts, videos)." />
          <Field label="Proof note" value={f.proofNote} onChangeText={(proofNote) => setF((x) => ({ ...x, proofNote }))} multiline maxLength={1000} />
          <DateField label="Due date" value={f.dueDate} onChangeText={(dueDate) => setF((x) => ({ ...x, dueDate }))} />
          <Row gap={8}>
            <Button title="Cancel" variant="ghost" size="sm" onPress={() => setOpen(false)} />
            <Button title="Save" size="sm" loading={busy === 'save'} onPress={save} />
          </Row>
        </View>
      ) : null}
    </Box>
  );
};

const Deliverables = ({ deal, onDeal, showToast }) => {
  const v = deal.viewer || {};
  const canAdd = v.isManager || v.isOrganizer;
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ title: '', type: 'OTHER', dueDate: '' });
  const [saving, setSaving] = useState(false);
  const add = async () => {
    if (!f.title.trim()) return showToast('Deliverable title is required', 'error');
    if (!isDateInput(f.dueDate)) return showToast('Due date must look like 2026-11-20', 'error');
    setSaving(true);
    try {
      const res = await API.post(`/sponsorship/deals/${deal._id}/deliverables`, { title: f.title.trim(), type: f.type, dueDate: f.dueDate || null });
      onDeal(res.data.data);
      setF({ title: '', type: 'OTHER', dueDate: '' });
      setAdding(false);
      showToast('Deliverable added', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Could not add the deliverable'), 'error');
    } finally {
      setSaving(false);
    }
  };
  const list = deal.deliverables || [];
  return (
    <View style={{ gap: 10 }}>
      {!list.length ? <T variant="small">{CONTRACTED_STAGES.includes(deal.stage) ? 'No deliverables on this deal.' : 'Deliverables are copied from the campaign template when the deal is agreed.'}</T> : null}
      {list.map((d) => <DeliverableRow key={d._id} deal={deal} item={d} onDeal={onDeal} showToast={showToast} />)}
      {canAdd ? (
        adding ? (
          <Box tone="paper">
            <Field label="Title" value={f.title} onChangeText={(title) => setF((x) => ({ ...x, title }))} maxLength={200} />
            <PickChips label="Type" options={DELIVERABLE_TYPES} value={f.type} onChange={(type) => setF((x) => ({ ...x, type }))} />
            <DateField label="Due date" value={f.dueDate} onChangeText={(dueDate) => setF((x) => ({ ...x, dueDate }))} />
            <Row gap={8}>
              <Button title="Cancel" variant="ghost" size="sm" onPress={() => setAdding(false)} />
              <Button title="Add deliverable" size="sm" loading={saving} onPress={add} />
            </Row>
          </Box>
        ) : (
          <Button title="Add deliverable" icon={Plus} variant="ghost" size="sm" onPress={() => setAdding(true)} />
        )
      ) : null}
    </View>
  );
};

const Payments = ({ deal, onDeal, showToast }) => {
  const [f, setF] = useState({ amount: '', method: 'BANK_TRANSFER', reference: '', receivedAt: toDateInput(new Date()), note: '' });
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');
  const contracted = CONTRACTED_STAGES.includes(deal.stage);
  const record = async () => {
    if (!(intOr0(f.amount) >= 1)) return showToast('Amount must be at least Rs. 1', 'error');
    if (f.method !== 'CASH' && !f.reference.trim()) return showToast('Add the bank or transaction reference', 'error');
    if (!isDateInput(f.receivedAt)) return showToast('Received date must look like 2026-11-20', 'error');
    setBusy('add');
    try {
      const res = await API.post(`/sponsorship/deals/${deal._id}/payments`, { amount: intOr0(f.amount), method: f.method, reference: f.reference.trim(), receivedAt: f.receivedAt || undefined, note: f.note.trim() });
      onDeal(res.data.data);
      setF((x) => ({ ...x, amount: '', reference: '', note: '' }));
      showToast(res.data?.message || 'Payment recorded', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Could not record the payment'), 'error');
    } finally {
      setBusy('');
    }
  };
  const remove = async (p) => {
    if (!(await confirm(`Remove ${formatNPR(p.amount)} payment?`, reason.trim() ? `Reason: ${reason.trim()}` : 'Tip: add a reason below first — it is kept in the audit log.', { confirmText: 'Remove' }))) return;
    setBusy(p._id);
    try {
      const res = await API.delete(`/sponsorship/deals/${deal._id}/payments/${p._id}`, { params: reason.trim() ? { reason: reason.trim() } : undefined });
      onDeal(res.data.data);
      setReason('');
      showToast(res.data?.message || 'Payment removed', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Could not remove the payment'), 'error');
    } finally {
      setBusy('');
    }
  };
  const payments = deal.payments || [];
  return (
    <View style={{ gap: 10 }}>
      <Row wrap gap={8}>
        {has(deal.cashAmount) ? <Chip label={`Contracted ${formatNPR(deal.cashAmount)}`} tone={{ bg: colors.paperDeep, fg: colors.ink }} /> : null}
        {has(deal.amountReceived) ? <Chip label={`Received ${formatNPR(deal.amountReceived)}`} tone={{ bg: colors.pineTint, fg: colors.pine }} /> : null}
        {has(deal.cashAmount) && has(deal.amountReceived) ? (
          <Chip label={`Outstanding ${formatNPR(Math.max(0, deal.cashAmount - deal.amountReceived))}`} tone={{ bg: colors.marigoldTint, fg: colors.marigoldText }} />
        ) : null}
      </Row>
      {!payments.length ? <T variant="small">No payments recorded.</T> : null}
      {payments.map((p) => (
        <Box key={p._id}>
          <Row style={{ justifyContent: 'space-between' }} gap={8}>
            <T variant="semibold">{formatNPR(p.amount)}</T>
            <T variant="caption" style={{ color: colors.muted }}>{formatDate(p.receivedAt)}</T>
          </Row>
          <T variant="small">{`${humanize(p.method)}${p.reference ? ` · ${p.reference}` : ''}`}</T>
          {p.note ? <T variant="small">{p.note}</T> : null}
          {p.recordedBy?.name ? <T variant="caption" style={{ color: colors.muted }}>{`Recorded by ${p.recordedBy.name}`}</T> : null}
          <Button title="Remove" icon={Trash2} variant="danger" size="sm" loading={busy === p._id} onPress={() => remove(p)} />
        </Box>
      ))}
      {payments.length ? <Field label="Reason for removing a payment (audit log)" value={reason} onChangeText={setReason} maxLength={300} /> : null}
      {contracted ? (
        <Box tone="paper">
          <T variant="semibold">Record a payment</T>
          <MoneyField label="Amount (NPR)" value={f.amount} onChangeText={(amount) => setF((x) => ({ ...x, amount }))} />
          <PickChips label="Method" options={PAYMENT_METHODS} value={f.method} onChange={(method) => setF((x) => ({ ...x, method }))} />
          <Field label={f.method === 'CASH' ? 'Reference (optional)' : 'Bank / transaction reference'} value={f.reference} onChangeText={(reference) => setF((x) => ({ ...x, reference }))} maxLength={120} autoCapitalize="characters" />
          <DateField label="Received on" value={f.receivedAt} onChangeText={(receivedAt) => setF((x) => ({ ...x, receivedAt }))} />
          <Field label="Note" value={f.note} onChangeText={(note) => setF((x) => ({ ...x, note }))} maxLength={300} />
          <Button title="Record payment" icon={Plus} variant="pine" loading={busy === 'add'} onPress={record} />
        </Box>
      ) : (
        <T variant="small" style={{ color: colors.muted }}>Payments can be recorded once the deal is agreed.</T>
      )}
    </View>
  );
};

const Report = ({ deal, onDeal, showToast }) => {
  const v = deal.viewer || {};
  const canEdit = (v.isManager || v.isOrganizer) && CONTRACTED_STAGES.includes(deal.stage);
  const [f, setF] = useState(() => reportFromDeal(deal));
  const [busy, setBusy] = useState('');
  useEffect(() => { setF(reportFromDeal(deal)); }, [deal]);
  const save = async (share) => {
    const urls = lines(f.mediaUrls);
    if (urls.some((u) => !isHttpUrl(u))) return showToast('Each media item must be an http(s) link', 'error');
    if (share && !f.summary.trim()) return showToast('Write the report summary before sharing it', 'error');
    if (share && !(await confirm('Share the impact report?', 'The sponsor will see it in their portal and get a notification.', { confirmText: 'Share', destructive: false }))) return;
    setBusy(share ? 'share' : 'save');
    try {
      const res = await API.put(`/sponsorship/deals/${deal._id}/report`, { summary: f.summary.trim(), highlights: lines(f.highlights), mediaUrls: urls, ...(share ? { share: true } : {}) });
      onDeal(res.data.data);
      showToast(res.data?.message || 'Report saved', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Could not save the report'), 'error');
    } finally {
      setBusy('');
    }
  };
  if (!canEdit) {
    if (!deal.report?.summary) return <T variant="small">{CONTRACTED_STAGES.includes(deal.stage) ? 'No impact report yet.' : 'Impact reports are written once the deal is agreed.'}</T>;
    return (
      <Box>
        <T variant="body">{deal.report.summary}</T>
        {deal.report.highlights?.length ? <T variant="small">• {deal.report.highlights.join('\n• ')}</T> : null}
        <LinkList urls={deal.report.mediaUrls} />
        <T variant="caption" style={{ color: colors.muted }}>{deal.report.sharedAt ? `Shared ${formatDateTime(deal.report.sharedAt)}` : 'Not shared with the sponsor yet'}</T>
      </Box>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      <T variant="caption" style={{ color: deal.report?.sharedAt ? colors.pine : colors.muted }}>
        {deal.report?.sharedAt ? `Shared with the sponsor ${formatDateTime(deal.report.sharedAt)} — saving updates what they see.` : 'Not shared with the sponsor yet.'}
      </T>
      <Field label="Summary" value={f.summary} onChangeText={(summary) => setF((x) => ({ ...x, summary }))} multiline maxLength={8000} />
      <Field label="Highlights" value={f.highlights} onChangeText={(highlights) => setF((x) => ({ ...x, highlights }))} multiline hint="One highlight per line (e.g. 312 volunteers)." />
      <Field label="Photo / video links" value={f.mediaUrls} onChangeText={(mediaUrls) => setF((x) => ({ ...x, mediaUrls }))} multiline autoCapitalize="none" autoCorrect={false} hint="One http(s) link per line." />
      <Row gap={8}>
        <Button title="Save" icon={FileText} variant="ghost" loading={busy === 'save'} disabled={!!busy} onPress={() => save(false)} style={{ flex: 1 }} />
        <Button title={deal.report?.sharedAt ? 'Save & re-share' : 'Save & share'} icon={Share2} variant="pine" loading={busy === 'share'} disabled={!!busy} onPress={() => save(true)} style={{ flex: 1 }} />
      </Row>
    </View>
  );
};

/* ---------- Main ---------- */

export default function AdminDealDetail({ deal, onDeal, showToast }) {
  const v = deal.viewer || {};
  const s = deal.sponsor || {};
  const sponsorStatusTone = s.verificationStatus === 'VERIFIED' ? 'VERIFIED' : s.verificationStatus === 'REJECTED' ? 'REJECTED' : 'PENDING';
  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: 6 }}>
        <Row wrap gap={8}>
          <StatusChip status={deal.stage === 'AGREED' || deal.stage === 'FULFILLED' ? 'COMPLETED' : ['DECLINED', 'WITHDRAWN', 'CANCELLED'].includes(deal.stage) ? 'CANCELLED' : 'PENDING'} label={humanize(deal.stage)} />
          {deal.tier?.name ? <Chip label={deal.tier.name} tone={{ bg: colors.skyTint, fg: colors.sky }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} /> : null}
          {deal.isCustomQuote ? <Chip label="Custom quote" tone={{ bg: colors.paperDeep, fg: colors.inkSoft }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} /> : null}
        </Row>
        <T variant="h2">{s.name || 'Sponsor'}</T>
        <T variant="small">{deal.opportunity?.title}{deal.opportunity?.startDate ? ` · ${formatDate(deal.opportunity.startDate)}` : ''}</T>
      </View>

      <Section title="Sponsor">
        <Box>
          <Row gap={8}>
            <StatusChip status={sponsorStatusTone} label={humanize(s.verificationStatus || 'PENDING')} />
            {s.type ? <T variant="small">{humanize(s.type)}</T> : null}
          </Row>
          <KV label="Website" value={s.website} />
          <KV label="Contact" value={s.contactName} />
          <KV label="Email" value={s.contactEmail} />
          <KV label="Phone" value={s.contactPhone} />
          <KV label="PAN" value={s.panNumber} />
          <Divider />
          <Row gap={10}>
            {isHttpUrl(deal.logoUrl) ? (
              <Image source={{ uri: deal.logoUrl }} style={{ width: 64, height: 40, borderRadius: 6, backgroundColor: colors.paperDeep }} contentFit="contain" accessibilityLabel={`${s.name} logo`} />
            ) : null}
            <T variant="small" style={{ flex: 1, color: deal.logoUsageApproved ? colors.pine : colors.marigoldText }}>
              {!deal.logoUrl ? 'No logo chosen for this deal yet.' : deal.logoUsageApproved ? `Logo use approved${deal.logoApprovedAt ? ` ${formatDate(deal.logoApprovedAt)}` : ''}.` : 'Logo use not approved by the sponsor yet — it stays off public pages and artwork.'}
            </T>
          </Row>
        </Box>
      </Section>

      <Section title="Proposal" hint={deal.createdAt ? `Sent ${formatDateTime(deal.createdAt)}` : undefined}>
        <Box>
          {deal.proposal?.message ? <T variant="body" selectable>{deal.proposal.message}</T> : <T variant="small">No message.</T>}
          {deal.proposal?.contributionTypes?.length ? (
            <Row wrap gap={6}>
              {deal.proposal.contributionTypes.map((c) => <Chip key={c} label={humanize(c)} tone={{ bg: colors.paperDeep, fg: colors.inkSoft }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} />)}
            </Row>
          ) : null}
          {has(deal.proposal?.amount) ? <KV label="Proposed cash" value={formatNPR(deal.proposal.amount)} strong /> : null}
          {deal.tier && has(deal.tier.price) ? <KV label={`${deal.tier.name} price`} value={priceText(deal.tier)} /> : null}
        </Box>
        <InKindList items={deal.inKindItems} />
      </Section>

      <Section title="Stage">
        <StageMover deal={deal} onDeal={onDeal} showToast={showToast} />
      </Section>

      {v.isManager ? (
        <Section title="Commercial terms" hint="Managers only. Cash and in-kind values stay hidden from organisers and brand staff.">
          <TermsEditor deal={deal} onDeal={onDeal} showToast={showToast} />
        </Section>
      ) : deal.agreement?.documentUrl || deal.agreement?.signedAt || has(deal.cashAmount) ? (
        <Section title="Agreement">
          <Box>
            {has(deal.cashAmount) ? <KV label="Contracted cash" value={formatNPR(deal.cashAmount)} strong /> : null}
            {has(deal.inKindEstimatedValue) && deal.inKindEstimatedValue > 0 ? <KV label={`In-kind (${IN_KIND_NOTE})`} value={formatNPR(deal.inKindEstimatedValue)} /> : null}
            <KV label="Signed on" value={formatDate(deal.agreement?.signedAt)} />
            <KV label="Signed by" value={deal.agreement?.signedByName} />
            {deal.agreement?.terms ? <T variant="small">{deal.agreement.terms}</T> : null}
            <LinkList urls={deal.agreement?.documentUrl ? [deal.agreement.documentUrl] : []} />
          </Box>
        </Section>
      ) : null}

      <Section title="Messages" hint="Internal notes are never shown to the sponsor.">
        <Messages deal={deal} onDeal={onDeal} showToast={showToast} />
      </Section>

      <Section title="Deliverables" hint="Done needs a proof link or note. Only managers can waive.">
        <Deliverables deal={deal} onDeal={onDeal} showToast={showToast} />
      </Section>

      {v.isFinance && deal.payments ? (
        <Section title="Payments" hint="Finance only. Received cash is tracked separately from in-kind value.">
          <Payments deal={deal} onDeal={onDeal} showToast={showToast} />
        </Section>
      ) : null}

      <Section title="Impact report">
        <Report deal={deal} onDeal={onDeal} showToast={showToast} />
      </Section>

      <Section title="History">
        <View style={{ gap: 8 }}>
          {(deal.history || []).slice().reverse().map((h) => (
            <Row key={h._id} gap={10} style={{ alignItems: 'flex-start' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.sand, marginTop: 7 }} />
              <View style={{ flex: 1 }}>
                <T variant="small" style={{ color: colors.ink }}>{`${humanize(h.stage)}${h.note ? ` — ${h.note}` : ''}`}</T>
                <T variant="caption" style={{ color: colors.muted }}>{`${h.by?.name || 'Someone'} · ${formatDateTime(h.at)}`}</T>
              </View>
            </Row>
          ))}
          {!deal.history?.length ? <T variant="small">No history yet.</T> : null}
        </View>
      </Section>
    </View>
  );
}
