import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Copy, Plus, Trash2 } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { confirm } from '../../lib/confirm';
import { formatNPR, humanize } from '../../lib/format';
import { colors, fonts, space } from '../../theme';
import { Button, Card, Chip, Field, Row, Select, T } from '../ui';
import { ToggleRow } from '../admin/people/PeopleKit';
import { Box, DateField, MoneyField, Notice, Section, SmallIconButton, UrlField, digits, isDateInput, isHttpUrl, toDateInput } from '../sponsorship/AdminSponsorKit';
import { AdCreative } from './AdSlot';
import {
  AD_FORMATS,
  CTAS,
  CTA_LABELS,
  CreativeStatusChip,
  FORMAT_LABELS,
  LABEL_TEXTS,
  OBJECTIVES,
  PRICING_LABELS,
  PRICING_MODELS,
  SURFACES,
  SURFACE_LABELS,
  priceLine,
  rateCardText,
} from './AdBits';

// Create / edit form for one ad campaign (POST /ads/campaigns, PUT /ads/campaigns/:id).
// Used by sponsor/ads/new, sponsor/ads/[id] and admin/ad-campaign/[id]. Advertisers never type
// a price: the server quotes from the placements' rate cards. Ad managers (canManageAds) may
// set a custom flat price / rate.

const DAY = 24 * 60 * 60 * 1000;
let keySeq = 0;
const nextKey = () => `k${Date.now()}-${(keySeq += 1)}`;

export const blankCreative = (format = 'NATIVE') => ({
  _key: nextKey(),
  name: '',
  format,
  imageUrl: '',
  videoUrl: '',
  posterUrl: '',
  headline: '',
  body: '',
  cta: 'LEARN_MORE',
  altText: '',
  labelText: 'Sponsored',
  skipAfterSeconds: '5',
  isActive: true,
});

const toForm = (c) => {
  if (!c) {
    const start = new Date();
    return {
      advertiser: '',
      title: '',
      objective: 'AWARENESS',
      description: '',
      destinationUrl: '',
      appendUtm: true,
      startDate: toDateInput(start),
      endDate: toDateInput(new Date(start.getTime() + 30 * DAY)),
      pricingModel: 'FLAT',
      budget: '',
      placements: [],
      surfaces: ['WEB', 'APP'],
      categories: [],
      frequencyCapPerDay: '3',
      creatives: [blankCreative()],
      customFlat: '',
      customRate: '',
    };
  }
  return {
    advertiser: c.advertiser?._id || c.advertiser || '',
    title: c.title || '',
    objective: c.objective || 'AWARENESS',
    description: c.description || '',
    destinationUrl: c.destinationUrl || '',
    appendUtm: c.appendUtm !== false,
    startDate: toDateInput(c.startDate),
    endDate: toDateInput(c.endDate),
    pricingModel: c.pricingModel || 'FLAT',
    budget: c.budget ? String(c.budget) : '',
    placements: c.placements || [],
    surfaces: c.surfaces?.length ? c.surfaces : ['WEB', 'APP'],
    categories: c.categories || [],
    frequencyCapPerDay: String(c.frequencyCapPerDay ?? 3),
    creatives: (c.creatives || []).map((k) => ({ ...k, _key: String(k._id), skipAfterSeconds: String(k.skipAfterSeconds ?? 5) })),
    customFlat: '',
    customRate: '',
  };
};

const payloadOf = (f, { isManager, isNew }) => {
  const body = {
    title: f.title.trim(),
    objective: f.objective,
    description: f.description.trim(),
    destinationUrl: f.destinationUrl.trim(),
    appendUtm: !!f.appendUtm,
    startDate: f.startDate,
    endDate: f.endDate,
    pricingModel: f.pricingModel,
    budget: f.pricingModel === 'FLAT' ? 0 : Number(f.budget) || 0,
    placements: f.placements,
    surfaces: f.surfaces,
    categories: f.categories,
    frequencyCapPerDay: Math.min(50, Number(f.frequencyCapPerDay) || 0),
    creatives: f.creatives.map((k) => ({
      ...(k._id ? { _id: k._id } : {}),
      name: (k.name || '').trim(),
      format: k.format,
      imageUrl: (k.imageUrl || '').trim(),
      videoUrl: k.format === 'VIDEO' ? (k.videoUrl || '').trim() : '',
      posterUrl: k.format === 'VIDEO' ? (k.posterUrl || '').trim() : '',
      headline: (k.headline || '').trim(),
      body: (k.body || '').trim(),
      cta: k.cta,
      altText: (k.altText || '').trim(),
      labelText: k.labelText || 'Sponsored',
      skipAfterSeconds: Math.min(30, Number(k.skipAfterSeconds) || 0),
      isActive: k.isActive !== false,
    })),
  };
  if (isNew) body.advertiser = f.advertiser;
  if (isManager) {
    if (f.pricingModel === 'FLAT' && f.customFlat !== '') body.flatPrice = Number(f.customFlat) || 0;
    if (f.pricingModel !== 'FLAT' && f.customRate !== '') body.rate = Number(f.customRate) || 0;
  }
  return body;
};

const validate = (f, isNew) => {
  if (isNew && !f.advertiser) return 'Choose which sponsor account this campaign is for';
  if (!f.title.trim()) return 'Give the campaign a title';
  if (!isHttpUrl(f.destinationUrl)) return 'The destination must be an http(s) link';
  if (!f.startDate || !f.endDate || !isDateInput(f.startDate) || !isDateInput(f.endDate)) return 'Use the format YYYY-MM-DD for both dates';
  if (f.endDate <= f.startDate) return 'The end date must be after the start date';
  if (!f.surfaces.length) return 'Choose the website, the app, or both';
  if (f.pricingModel !== 'FLAT' && f.placements.length && !(Number(f.budget) > 0)) return 'Set a total budget for CPM or CPC pricing';
  for (const [i, k] of f.creatives.entries()) {
    const n = k.name || `Creative ${i + 1}`;
    for (const key of ['imageUrl', 'videoUrl', 'posterUrl']) if (k[key] && !isHttpUrl(k[key])) return `${n}: links must start with http(s)://`;
    if (k.format === 'IMAGE' && !k.imageUrl) return `${n}: an image link is required`;
    if (k.format === 'NATIVE' && (!k.imageUrl || !k.headline.trim())) return `${n}: a sponsored card needs a headline and an image`;
    if (k.format === 'VIDEO' && !k.videoUrl) return `${n}: a video link is required`;
  }
  return '';
};

// Same arithmetic as the server's quoteFromRateCard — shown as an estimate only.
const estimate = (f, placements) => {
  const chosen = placements.filter((p) => f.placements.includes(p.key));
  if (!chosen.length || !isDateInput(f.startDate) || !isDateInput(f.endDate) || f.endDate <= f.startDate) return null;
  if (f.pricingModel === 'FLAT') {
    if (chosen.some((p) => !p.rateCard?.flatPerDay)) return { error: 'A chosen placement is not sold at a flat price — choose CPM or CPC.' };
    const days = Math.max(1, Math.round((new Date(f.endDate) - new Date(f.startDate)) / DAY));
    return { text: `${formatNPR(chosen.reduce((s, p) => s + p.rateCard.flatPerDay, 0) * days)} for ${days} day${days === 1 ? '' : 's'}` };
  }
  const key = f.pricingModel === 'CPM' ? 'cpm' : 'cpc';
  if (chosen.some((p) => !p.rateCard?.[key])) return { error: `A chosen placement is not sold by ${f.pricingModel} — choose another model.` };
  return { text: `${formatNPR(Math.max(...chosen.map((p) => p.rateCard[key])))} ${f.pricingModel === 'CPM' ? 'per 1,000 impressions' : 'per click'}` };
};

const sansReviewFree = (f) => JSON.stringify({ ...f, frequencyCapPerDay: null, customFlat: null, customRate: null });

const CreativeEditor = ({ k, i, update, remove, duplicate, canAdd, advertiserName, allowedFormats }) => {
  const set = (key) => (v) => update({ [key]: v });
  const preview = {
    token: `preview-${k._key}`,
    format: k.format,
    imageUrl: isHttpUrl(k.imageUrl) ? k.imageUrl.trim() : '',
    videoUrl: isHttpUrl(k.videoUrl) ? k.videoUrl.trim() : '',
    posterUrl: isHttpUrl(k.posterUrl) ? k.posterUrl.trim() : '',
    headline: k.headline,
    body: k.body,
    cta: k.cta,
    ctaLabel: CTA_LABELS[k.cta],
    altText: k.altText,
    labelText: k.labelText,
    skipAfterSeconds: Number(k.skipAfterSeconds) || 0,
    advertiserName,
  };
  const previewable = k.format === 'VIDEO' ? !!preview.videoUrl : k.format === 'NATIVE' ? !!(preview.imageUrl && k.headline) : !!preview.imageUrl;
  return (
    <Box tone="paper" style={{ gap: space.md }}>
      <Row style={{ justifyContent: 'space-between' }} gap={8}>
        <T variant="semibold" style={{ flex: 1 }} numberOfLines={1}>{k.name || `Creative ${i + 1}`}</T>
        {k._id ? <CreativeStatusChip status={k.status} /> : <Chip label="New" tone={{ bg: colors.skyTint, fg: colors.sky }} style={{ paddingVertical: 2, paddingHorizontal: 9 }} />}
      </Row>
      {k.status === 'REJECTED' && k.rejectionReason ? <Notice tone="warn">{`Rejected: ${k.rejectionReason}`}</Notice> : null}
      <Field label="Name (internal)" value={k.name} onChangeText={set('name')} placeholder={`Creative ${i + 1}`} maxLength={120} />
      <Select label="Format" options={AD_FORMATS.map((v) => ({ value: v, label: FORMAT_LABELS[v] }))} value={k.format} onChange={set('format')} />
      {allowedFormats && !allowedFormats.includes(k.format) ? (
        <Notice>{`None of the chosen placements shows ${FORMAT_LABELS[k.format].toLowerCase()} ads, so this creative will not be shown there.`}</Notice>
      ) : null}
      {k.format === 'VIDEO' ? (
        <>
          <Field label="Video link (MP4)" value={k.videoUrl} onChangeText={set('videoUrl')} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://…" error={k.videoUrl && !isHttpUrl(k.videoUrl) ? 'Use an http(s) link' : undefined} />
          <UrlField label="Poster image (optional)" value={k.posterUrl} onChangeText={set('posterUrl')} preview={false} />
          <Field label="Show “Skip” after (seconds, 0–30)" value={String(k.skipAfterSeconds ?? '')} onChangeText={(v) => set('skipAfterSeconds')(digits(v).slice(0, 2))} keyboardType="number-pad" />
        </>
      ) : (
        <UrlField label="Image link" value={k.imageUrl} onChangeText={set('imageUrl')} preview={false} hint="http(s) link to a JPG/PNG/WebP image." />
      )}
      <Field label={k.format === 'NATIVE' ? 'Headline (required)' : 'Headline'} value={k.headline} onChangeText={set('headline')} maxLength={90} />
      {k.format !== 'IMAGE' ? <Field label="Body text" value={k.body} onChangeText={set('body')} multiline maxLength={300} /> : null}
      <Field label="Alt text (describes the image)" value={k.altText} onChangeText={set('altText')} maxLength={200} />
      <Select label="Button" options={CTAS.map((v) => ({ value: v, label: CTA_LABELS[v] }))} value={k.cta} onChange={set('cta')} />
      <Select label="Label" options={LABEL_TEXTS} value={k.labelText} onChange={set('labelText')} />
      <ToggleRow title="Active" hint="Inactive creatives are kept but never shown." value={k.isActive !== false} onValueChange={set('isActive')} />
      <View style={{ gap: 6 }}>
        <T variant="caption">Preview</T>
        {previewable ? <AdCreative ad={preview} preview /> : <T variant="small">Fill in the required links{k.format === 'NATIVE' ? ' and headline' : ''} to see a preview.</T>}
      </View>
      <Row gap={8} style={{ justifyContent: 'flex-end' }}>
        <SmallIconButton icon={Copy} label={`Duplicate creative ${i + 1}`} onPress={duplicate} disabled={!canAdd} />
        <SmallIconButton icon={Trash2} label={`Remove creative ${i + 1}`} tone="danger" onPress={remove} />
      </Row>
    </Box>
  );
};

export default function CampaignEditor({ campaign = null, onSaved, onCancel, showToast, isManager = false, accountsPath = null, initialAdvertiser = '' }) {
  const isNew = !campaign;
  const initial = useMemo(() => {
    const f = toForm(campaign);
    if (isNew && initialAdvertiser) f.advertiser = initialAdvertiser;
    return f;
  }, [campaign, isNew, initialAdvertiser]);
  const [form, setForm] = useState(initial);
  const [placements, setPlacements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { setForm(initial); }, [initial]);

  useEffect(() => {
    let alive = true;
    API.get('/ads/placements').then((r) => alive && setPlacements(r.data?.data || [])).catch(() => {});
    API.get('/categories?activeOnly=true').then((r) => alive && setCategories((r.data?.data || []).map((c) => c.name))).catch(() => {});
    if (isNew) {
      const reqs = [API.get('/sponsorship/accounts/mine').then((r) => r.data?.data || []).catch(() => [])];
      if (accountsPath) reqs.push(API.get(accountsPath).then((r) => r.data?.data || []).catch(() => []));
      Promise.all(reqs).then((lists) => {
        if (!alive) return;
        const seen = new Set();
        const merged = lists.flat().filter((a) => {
          if (seen.has(a._id)) return false;
          seen.add(a._id);
          // Advertisers need OWNER/EDITOR; rejected accounts cannot advertise
          return a.verificationStatus !== 'REJECTED' && (!a.myRole || a.myRole !== 'VIEWER' || isManager);
        });
        setAccounts(merged);
        if (merged.length === 1) setForm((f) => (f.advertiser ? f : { ...f, advertiser: merged[0]._id }));
      });
    }
    return () => { alive = false; };
  }, [isNew, accountsPath, isManager]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleIn = (k, v) => setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));
  const updateCreative = (i) => (patch) => setForm((f) => ({ ...f, creatives: f.creatives.map((k, j) => (j === i ? { ...k, ...patch } : k)) }));

  const chosen = placements.filter((p) => form.placements.includes(p.key));
  const allowedFormats = chosen.length ? [...new Set(chosen.flatMap((p) => p.formats || []))] : null;
  const est = estimate(form, placements);
  const pricingChanged = campaign && (form.pricingModel !== initial.pricingModel || form.startDate !== initial.startDate || form.endDate !== initial.endDate || JSON.stringify([...form.placements].sort()) !== JSON.stringify([...initial.placements].sort()));
  const advertiserName = isNew ? accounts.find((a) => a._id === form.advertiser)?.name || 'Your organisation' : campaign.advertiser?.name || '';
  const unknownPlacements = form.placements.filter((k) => placements.length && !placements.some((p) => p.key === k));

  const save = async () => {
    const msg = validate(form, isNew);
    if (msg) { setErr(msg); showToast?.(msg, 'warning'); return; }
    setErr('');
    if (campaign && ['APPROVED', 'PAUSED'].includes(campaign.status) && !campaign.viewer?.canReview && sansReviewFree(form) !== sansReviewFree(initial)) {
      const ok = await confirm(
        'Send the campaign back to review?',
        'This campaign is approved. Saving these changes stops it from showing until our team reviews it again (changing only the daily frequency cap does not).',
        { confirmText: 'Save and resubmit', destructive: false }
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const body = payloadOf(form, { isManager, isNew });
      const res = isNew ? await API.post('/ads/campaigns', body) : await API.put(`/ads/campaigns/${campaign._id}`, body);
      showToast?.(res.data?.message || 'Campaign saved', 'success');
      onSaved?.(res.data?.data);
    } catch (e) {
      const m = errorMessage(e, 'Could not save the campaign');
      setErr(m);
      showToast?.(m, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: space.xl }}>
      {isNew ? (
        <Section title="Advertiser" hint="Ads run under one of your sponsor accounts. A campaign can only be approved once that account is verified.">
          {accounts.length ? (
            <Select label="Sponsor account" options={accounts.map((a) => ({ value: a._id, label: `${a.name}${a.verificationStatus === 'VERIFIED' ? '' : ' (verification pending)'}` }))} value={form.advertiser} onChange={set('advertiser')} />
          ) : (
            <Notice>You need a sponsor account (as owner or editor) before you can advertise. Create one in the sponsor portal.</Notice>
          )}
        </Section>
      ) : null}

      <Section title="Campaign">
        <Field label="Title" value={form.title} onChangeText={set('title')} maxLength={140} placeholder="e.g. Clean Kathmandu week" />
        <Select label="Objective" options={OBJECTIVES.map((v) => ({ value: v, label: humanize(v) }))} value={form.objective} onChange={set('objective')} />
        <Field label="Description (for our reviewers)" value={form.description} onChangeText={set('description')} multiline maxLength={2000} />
        <UrlField label="Destination link" value={form.destinationUrl} onChangeText={set('destinationUrl')} preview={false} hint="Where people go when they tap the ad." />
        <ToggleRow title="Add UTM tags" hint="Adds utm_source=hateymalo so your analytics can tell these visits apart." value={form.appendUtm} onValueChange={set('appendUtm')} />
      </Section>

      <Section title="Schedule">
        <Row gap={10} style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}><DateField label="Start" value={form.startDate} onChangeText={set('startDate')} /></View>
          <View style={{ flex: 1 }}><DateField label="End" value={form.endDate} onChangeText={set('endDate')} /></View>
        </Row>
      </Section>

      <Section title="Placements" hint="Where the ad can appear. Prices come from each placement's rate card.">
        {placements.length ? placements.map((p) => {
          const on = form.placements.includes(p.key);
          return (
            <Card key={p._id} onPress={() => toggleIn('placements', p.key)} style={[{ gap: 4 }, on && { borderColor: colors.ink, borderWidth: 2 }]} accessibilityLabel={`${p.name}${on ? ', selected' : ''}`}>
              <Row style={{ justifyContent: 'space-between' }} gap={8}>
                <T variant="semibold" style={{ flex: 1 }}>{p.name}</T>
                <Chip label={on ? 'Selected' : 'Add'} active={on} />
              </Row>
              {p.description ? <T variant="small">{p.description}</T> : null}
              <T variant="caption" style={{ color: colors.pine, fontFamily: fonts.semibold }}>{rateCardText(p.rateCard)}</T>
              <T variant="caption">
                {[(p.formats || []).map((f) => FORMAT_LABELS[f]).join(', '), (p.surfaces || []).map((s) => SURFACE_LABELS[s]).join(' + '), p.width && p.height ? `${p.width}×${p.height}px` : null, `up to ${p.maxAds} ad${p.maxAds === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
              </T>
            </Card>
          );
        }) : <T variant="small">No placements are on sale right now.</T>}
        {unknownPlacements.length ? <Notice>{`No longer offered: ${unknownPlacements.join(', ')}. Remove them before saving.`}</Notice> : null}
        {unknownPlacements.map((k) => <Button key={k} title={`Remove ${k}`} size="sm" variant="ghost" onPress={() => toggleIn('placements', k)} />)}
      </Section>

      <Section title="Pricing">
        <Select label="Pricing model" options={PRICING_MODELS.map((v) => ({ value: v, label: PRICING_LABELS[v] }))} value={form.pricingModel} onChange={set('pricingModel')} />
        {form.pricingModel !== 'FLAT' ? (
          <MoneyField label="Total budget (NPR)" value={form.budget} onChangeText={set('budget')} hint="The ad stops showing when spend reaches this amount." />
        ) : null}
        <Box tone="pine">
          <T variant="semibold" style={{ fontSize: 14.5 }}>Quote</T>
          {campaign ? (
            <>
              <T variant="small" style={{ color: colors.inkSoft }}>{`Saved price: ${priceLine(campaign)}${campaign.pricingModel !== 'FLAT' && campaign.budget ? ` · budget ${formatNPR(campaign.budget)}` : ''}`}</T>
              {campaign.customPrice ? <T variant="caption">Custom price agreed with our team{pricingChanged && !isManager ? ' — changing the model, placements or dates replaces it with the rate-card price.' : '.'}</T> : null}
            </>
          ) : null}
          {est?.error ? <T variant="small" style={{ color: colors.brand }}>{est.error}</T> : est?.text ? <T variant="small" style={{ color: colors.inkSoft }}>{`${campaign ? 'Rate-card estimate for these choices' : 'Estimate'}: ${est.text}`}</T> : <T variant="small">Choose placements and dates to see the price.</T>}
          <T variant="caption">The server calculates the final price from the rate cards when you save.</T>
        </Box>
        {isManager ? (
          <Box>
            <T variant="semibold" style={{ fontSize: 14.5 }}>Custom price (ad managers)</T>
            {form.pricingModel === 'FLAT' ? (
              <MoneyField label="Flat price for the whole run (NPR)" value={form.customFlat} onChangeText={set('customFlat')} hint="Leave empty to keep the current / rate-card price." />
            ) : (
              <MoneyField label={`Rate (NPR ${form.pricingModel === 'CPM' ? 'per 1,000 impressions' : 'per click'})`} value={form.customRate} onChangeText={set('customRate')} hint="Leave empty to keep the current / rate-card rate." />
            )}
          </Box>
        ) : null}
      </Section>

      <Section title="Audience">
        <View style={{ gap: 8 }}>
          <T variant="semibold" style={{ fontSize: 14.5 }}>Show on</T>
          <Row wrap gap={8}>
            {SURFACES.map((s) => <Chip key={s} label={SURFACE_LABELS[s]} active={form.surfaces.includes(s)} onPress={() => toggleIn('surfaces', s)} />)}
          </Row>
        </View>
        <View style={{ gap: 8 }}>
          <T variant="semibold" style={{ fontSize: 14.5 }}>Causes (optional)</T>
          <T variant="small">Leave empty to show everywhere. With causes chosen, the ad shows only next to posts, stories and events of those causes.</T>
          <Row wrap gap={8}>
            {[...new Set([...categories, ...form.categories])].map((c) => <Chip key={c} label={c} active={form.categories.includes(c)} onPress={() => toggleIn('categories', c)} />)}
          </Row>
        </View>
        <Field label="Max times one device sees it per day (0 = no limit)" value={form.frequencyCapPerDay} onChangeText={(v) => set('frequencyCapPerDay')(digits(v).slice(0, 2))} keyboardType="number-pad" />
      </Section>

      <Section title="Creatives" hint={`${form.creatives.length}/10 · changed creatives are reviewed again.`}>
        {form.creatives.map((k, i) => (
          <CreativeEditor
            key={k._key}
            k={k}
            i={i}
            advertiserName={advertiserName}
            allowedFormats={allowedFormats}
            canAdd={form.creatives.length < 10}
            update={updateCreative(i)}
            remove={() => setForm((f) => ({ ...f, creatives: f.creatives.filter((_, j) => j !== i) }))}
            duplicate={() => setForm((f) => ({ ...f, creatives: [...f.creatives, { ...k, _id: undefined, status: undefined, rejectionReason: '', _key: nextKey(), name: `${k.name || `Creative ${i + 1}`} copy` }] }))}
          />
        ))}
        {form.creatives.length < 10 ? <Button title="Add creative" icon={Plus} variant="ghost" size="sm" onPress={() => setForm((f) => ({ ...f, creatives: [...f.creatives, blankCreative()] }))} /> : null}
      </Section>

      {err ? <Notice>{err}</Notice> : null}
      <Row gap={10}>
        {onCancel ? <Button title="Cancel" variant="ghost" onPress={onCancel} style={{ flex: 1 }} /> : null}
        <Button title={isNew ? 'Save draft' : 'Save changes'} onPress={save} loading={saving} disabled={isNew && !accounts.length} style={{ flex: 1 }} />
      </Row>
    </View>
  );
}
