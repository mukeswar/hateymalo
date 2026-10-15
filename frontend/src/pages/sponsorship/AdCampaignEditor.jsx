import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { BackLink, Modal, NotFoundCard, PageSkeleton, errMsg } from '../../components/sponsorship/shared';
import CreativesEditor from '../../components/ads/CreativesEditor';
import {
  FORMAT_LABELS, OBJECTIVES, OBJECTIVE_LABELS, PRICING_LABELS, PRICING_MODELS, SURFACES, SURFACE_LABELS,
  AdChip, emptyCreative, nprAd, toDateInput,
} from '../../components/ads/adShared';
import { AlertTriangle, Calculator, Save, Send } from 'lucide-react';

const DAY_MS = 24 * 60 * 60 * 1000;
const isHttp = (v) => typeof v === 'string' && /^https?:\/\/\S+$/i.test(v.trim());
const plusDays = (n) => toDateInput(new Date(Date.now() + n * DAY_MS));

const blank = (advertiser = '') => ({
  advertiser,
  title: '',
  objective: 'AWARENESS',
  description: '',
  destinationUrl: '',
  appendUtm: true,
  startDate: plusDays(1),
  endDate: plusDays(15),
  pricingModel: 'FLAT',
  budget: '',
  placements: [],
  surfaces: ['WEB', 'APP'],
  categories: [],
  frequencyCapPerDay: 3,
  creatives: [emptyCreative('NATIVE')],
});

const fromCampaign = (c) => ({
  advertiser: String(c.advertiser?._id || c.advertiser || ''),
  title: c.title || '',
  objective: c.objective || 'AWARENESS',
  description: c.description || '',
  destinationUrl: c.destinationUrl || '',
  appendUtm: c.appendUtm !== false,
  startDate: toDateInput(c.startDate),
  endDate: toDateInput(c.endDate),
  pricingModel: c.pricingModel || 'FLAT',
  budget: c.budget || '',
  placements: c.placements || [],
  surfaces: c.surfaces || [],
  categories: c.categories || [],
  frequencyCapPerDay: c.frequencyCapPerDay ?? 3,
  creatives: (c.creatives || []).map((k) => ({ ...emptyCreative(k.format), ...k })),
});

// Indicative only — the server quotes from the same rate cards when saving (docs/ADS.md "Pricing rules")
const estimate = (form, placements) => {
  const chosen = placements.filter((p) => form.placements.includes(p.key));
  if (!chosen.length) return { ok: false, text: 'Choose at least one placement to see a price.' };
  if (form.pricingModel === 'FLAT') {
    if (chosen.some((p) => !p.rateCard?.flatPerDay)) return { ok: false, text: 'A chosen placement is not sold at a flat price. Choose CPM or CPC, or contact our team.' };
    const days = Math.max(1, Math.round((new Date(form.endDate) - new Date(form.startDate)) / DAY_MS));
    if (!Number.isFinite(days)) return { ok: false, text: 'Set the dates to see a price.' };
    const perDay = chosen.reduce((s, p) => s + p.rateCard.flatPerDay, 0);
    return { ok: true, text: `${nprAd(perDay)} per day × ${days} day${days === 1 ? '' : 's'} = ${nprAd(perDay * days)}` };
  }
  const key = form.pricingModel === 'CPM' ? 'cpm' : 'cpc';
  if (chosen.some((p) => !p.rateCard?.[key])) return { ok: false, text: `A chosen placement is not sold by ${form.pricingModel}. Choose another pricing model or contact our team.` };
  const rate = Math.max(...chosen.map((p) => p.rateCard[key]));
  return { ok: true, text: `${nprAd(rate)} ${form.pricingModel === 'CPM' ? 'per 1,000 impressions' : 'per click'}, up to your budget` };
};

const Section = ({ title, hint, children, id }) => (
  <section aria-labelledby={id} className="card p-5 sm:p-6 space-y-4">
    <div>
      <h2 id={id} className="text-xl font-bold text-ink">{title}</h2>
      {hint && <p className="text-sm text-muted mt-0.5">{hint}</p>}
    </div>
    {children}
  </section>
);

const Toggle = ({ on, onClick, children }) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onClick}
    className={`chip !py-1.5 !px-3.5 border transition-colors ${on ? 'bg-ink text-white border-ink' : 'bg-white text-ink-soft border-sand hover:border-ink/40'}`}
  >
    {children}
  </button>
);

/** /sponsor/ads/new and /sponsor/ads/:id/edit */
const AdCampaignEditor = () => {
  const { id } = useParams();
  const editing = !!id;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const { showToast } = useToast();

  const [accounts, setAccounts] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [campaign, setCampaign] = useState(null);
  const [form, setForm] = useState(null);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null); // { submit } — approved-campaign warning

  useEffect(() => {
    API.get('/ads/placements').then((r) => setPlacements(r.data?.data || [])).catch(() => setPlacements([]));
    API.get('/categories?activeOnly=true').then((r) => setCategories((r.data?.data || []).map((c) => c.name))).catch(() => {});
    API.get('/sponsorship/accounts/mine')
      .then((r) => setAccounts(r.data?.data || []))
      .catch(() => setAccounts([]));
  }, []);

  useEffect(() => {
    if (!editing) return;
    API.get(`/ads/campaigns/${id}`)
      .then((r) => {
        setCampaign(r.data.data);
        setForm(fromCampaign(r.data.data));
      })
      .catch(() => setMissing(true));
  }, [editing, id]);

  const writable = useMemo(() => (accounts || []).filter((a) => ['OWNER', 'EDITOR'].includes(a.myRole) && a.verificationStatus !== 'REJECTED'), [accounts]);

  useEffect(() => {
    if (editing || form || accounts === null) return;
    const pre = params.get('account');
    setForm(blank(writable.find((a) => a._id === pre)?._id || writable[0]?._id || ''));
  }, [editing, form, accounts, writable, params]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleIn = (key, value) => setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value] }));

  if (missing) return <NotFoundCard title="Campaign not found" body="It may have been deleted, or you no longer have access." to="/sponsor/ads" cta="Back to ad campaigns" />;
  if (!form || accounts === null) return <PageSkeleton label="Loading campaign editor" />;

  if (editing && campaign && !campaign.viewer?.canEdit) {
    return <NotFoundCard title="This campaign can't be edited" body="Ended or archived campaigns are locked, and viewers have read-only access." to={`/sponsor/ads/${id}`} cta="Back to the campaign" />;
  }
  if (!editing && !writable.length) {
    return <NotFoundCard title="No account can advertise yet" body="You need to be an owner or editor of a sponsor account that has not been rejected." to="/sponsor/portal" cta="Go to the sponsor portal" />;
  }

  const account = editing ? campaign?.advertiser : accounts.find((a) => a._id === form.advertiser);
  const chosen = placements.filter((p) => form.placements.includes(p.key));
  const allowedFormats = chosen.length ? [...new Set(chosen.flatMap((p) => p.formats || []))] : [];
  const previewSize = chosen[0] ? { width: chosen[0].width, height: chosen[0].height } : null;
  const quote = estimate(form, placements);
  const live = editing && ['APPROVED', 'PAUSED'].includes(campaign?.status);
  const isReviewer = can('canReviewAds');
  const canSubmitNow = !editing || ['DRAFT', 'REJECTED'].includes(campaign?.status);

  const payload = () => {
    const body = {
      title: form.title,
      objective: form.objective,
      description: form.description,
      destinationUrl: form.destinationUrl.trim(),
      appendUtm: form.appendUtm,
      startDate: form.startDate,
      endDate: form.endDate,
      pricingModel: form.pricingModel,
      budget: form.pricingModel === 'FLAT' ? 0 : Number(form.budget) || 0,
      placements: form.placements,
      surfaces: form.surfaces,
      categories: form.categories,
      frequencyCapPerDay: Number(form.frequencyCapPerDay) || 0,
      creatives: form.creatives.map((k) => {
        const out = {
          name: k.name, format: k.format, imageUrl: k.imageUrl.trim(), videoUrl: k.videoUrl.trim(), posterUrl: k.posterUrl.trim(),
          headline: k.headline, body: k.body, cta: k.cta, altText: k.altText, skipAfterSeconds: Number(k.skipAfterSeconds) || 0,
          labelText: k.labelText, isActive: k.isActive !== false,
        };
        if (k._id) out._id = k._id;
        return out;
      }),
    };
    if (!editing) body.advertiser = form.advertiser;
    return body;
  };

  const validate = () => {
    if (!form.advertiser) return 'Choose the sponsor account';
    if (!form.title.trim()) return 'Give the campaign a title';
    if (!isHttp(form.destinationUrl)) return 'The destination must be a full http(s) link';
    if (!form.startDate || !form.endDate) return 'Choose start and end dates';
    if (form.endDate <= form.startDate) return 'The end date must be after the start date';
    if (!form.surfaces.length) return 'Choose the website, the app, or both';
    if (form.pricingModel !== 'FLAT' && !(Number(form.budget) > 0)) return 'Set a total budget for CPM or CPC pricing';
    return '';
  };

  const save = async (submit) => {
    const problem = validate();
    if (problem) {
      showToast(problem, 'error');
      return;
    }
    setSaving(true);
    try {
      const res = editing ? await API.put(`/ads/campaigns/${id}`, payload()) : await API.post('/ads/campaigns', payload());
      const saved = res.data.data;
      let msg = res.data.message || 'Campaign saved';
      if (submit) {
        try {
          const sub = await API.post(`/ads/campaigns/${saved._id}/submit`, {});
          msg = sub.data.message || 'Submitted for review';
        } catch (e) {
          showToast(`Saved, but not submitted: ${errMsg(e, 'please check the campaign')}`, 'warning');
          navigate(`/sponsor/ads/${saved._id}`);
          return;
        }
      }
      showToast(msg, 'success');
      navigate(`/sponsor/ads/${saved._id}`);
    } catch (e) {
      showToast(errMsg(e, 'Could not save the campaign'), 'error');
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  };

  const requestSave = (submit) => {
    if (live && !isReviewer) setConfirm({ submit });
    else save(submit);
  };

  return (
    <div className="pb-20">
      <div className="container-page pt-8 space-y-6">
        <BackLink to={editing ? `/sponsor/ads/${id}` : '/sponsor/ads'}>{editing ? 'Back to the campaign' : 'Ad campaigns'}</BackLink>
        <header className="space-y-2">
          <span className="eyebrow">{editing ? 'Edit ad campaign' : 'New ad campaign'}</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">{editing ? campaign?.title : 'Create an ad campaign'}</h1>
          {editing && <AdChip value={campaign?.deliveryStatus} />}
        </header>

        {live && !isReviewer && (
          <div className="flex gap-3 rounded-2xl border border-marigold/50 bg-marigold-tint p-4 text-sm text-marigold-text" role="note">
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p>
              This campaign is approved. Saving changes (except the daily frequency cap) sends it back to review and it <strong>stops showing</strong> until our team approves it again.
            </p>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            requestSave(false);
          }}
          className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start"
        >
          <div className="lg:col-span-2 space-y-6 min-w-0">
            <Section id="ed-basics" title="Campaign" hint="What the ad is for and where clicks go.">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="ed-account" className="field-label">Sponsor account</label>
                  {editing ? (
                    <p id="ed-account" className="field bg-paper">{account?.name}</p>
                  ) : (
                    <select id="ed-account" className="field" value={form.advertiser} onChange={(e) => set({ advertiser: e.target.value })}>
                      {writable.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                    </select>
                  )}
                  {account && account.verificationStatus !== 'VERIFIED' && (
                    <p className="mt-1 text-xs text-marigold-text">This account is not verified yet. You can submit, but the ad can only be approved after verification.</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="ed-title" className="field-label">Title <span className="text-brand">*</span></label>
                  <input id="ed-title" className="field" maxLength={140} required value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Monsoon blood drive — volunteers wanted" />
                </div>
                <div>
                  <label htmlFor="ed-objective" className="field-label">Goal</label>
                  <select id="ed-objective" className="field" value={form.objective} onChange={(e) => set({ objective: e.target.value })}>
                    {OBJECTIVES.map((o) => <option key={o} value={o}>{OBJECTIVE_LABELS[o]}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="ed-dest" className="field-label">Destination link <span className="text-brand">*</span></label>
                  <input id="ed-dest" type="url" inputMode="url" className={`field font-mono !text-xs ${form.destinationUrl && !isHttp(form.destinationUrl) ? '!border-brand' : ''}`} required value={form.destinationUrl} onChange={(e) => set({ destinationUrl: e.target.value })} placeholder="https://your-site.com/page" />
                </div>
                <label htmlFor="ed-utm" className="sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-2xl border border-sand p-3 hover:bg-paper">
                  <input id="ed-utm" type="checkbox" checked={form.appendUtm} onChange={(e) => set({ appendUtm: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-[#B5232C]" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">Add tracking tags to the link</span>
                    <span className="block text-xs text-muted">Adds utm_source=hateymalo and utm_medium=sponsored so your own analytics can see these visits.</span>
                  </span>
                </label>
                <div className="sm:col-span-2">
                  <label htmlFor="ed-desc" className="field-label">Notes for our review team (optional)</label>
                  <textarea id="ed-desc" rows={3} className="field" maxLength={2000} value={form.description} onChange={(e) => set({ description: e.target.value })} />
                </div>
              </div>
            </Section>

            <Section id="ed-where" title="Where and when" hint="Placements are the places on Hateymalo where your ad can appear.">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ed-start" className="field-label">Start date</label>
                  <input id="ed-start" type="date" className="field" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="ed-end" className="field-label">End date</label>
                  <input id="ed-end" type="date" className="field" min={form.startDate} value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} />
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="field-label">Placements</legend>
                {placements.length === 0 ? (
                  <p className="text-sm text-muted">No placements are on sale right now.</p>
                ) : (
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {placements.map((p) => {
                      const on = form.placements.includes(p.key);
                      const rc = p.rateCard || {};
                      return (
                        <li key={p._id}>
                          <label htmlFor={`ed-pl-${p.key}`} className={`flex h-full cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${on ? 'border-ink bg-paper' : 'border-sand hover:bg-paper'}`}>
                            <input id={`ed-pl-${p.key}`} type="checkbox" checked={on} onChange={() => toggleIn('placements', p.key)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#B5232C]" />
                            <span className="min-w-0 space-y-1">
                              <span className="block font-semibold text-ink">{p.name}</span>
                              {p.description && <span className="block text-xs text-muted">{p.description}</span>}
                              <span className="block text-xs text-ink-soft">
                                {(p.formats || []).map((f) => FORMAT_LABELS[f]).join(' · ')}
                                {p.width && p.height ? ` · ${p.width}×${p.height}px` : ''}
                              </span>
                              <span className="flex flex-wrap gap-1.5 pt-1">
                                <span className="chip bg-paper-deep text-ink-soft">{rc.flatPerDay ? `${nprAd(rc.flatPerDay)}/day` : 'No flat price'}</span>
                                <span className="chip bg-paper-deep text-ink-soft">{rc.cpm ? `${nprAd(rc.cpm)} CPM` : 'No CPM'}</span>
                                <span className="chip bg-paper-deep text-ink-soft">{rc.cpc ? `${nprAd(rc.cpc)} CPC` : 'No CPC'}</span>
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </fieldset>

              <fieldset>
                <legend className="field-label">Show on</legend>
                <div className="flex flex-wrap gap-2">
                  {SURFACES.map((s) => <Toggle key={s} on={form.surfaces.includes(s)} onClick={() => toggleIn('surfaces', s)}>{SURFACE_LABELS[s]}</Toggle>)}
                </div>
              </fieldset>

              <fieldset>
                <legend className="field-label">Causes (optional)</legend>
                <p className="-mt-1 mb-2 text-xs text-muted">Pick causes to show the ad only next to matching posts, stories and events. Leave empty to show it everywhere. Ads never target people, only pages.</p>
                {categories.length ? (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => <Toggle key={c} on={form.categories.includes(c)} onClick={() => toggleIn('categories', c)}>{c}</Toggle>)}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No active causes to choose from.</p>
                )}
              </fieldset>

              <div className="sm:max-w-xs">
                <label htmlFor="ed-freq" className="field-label">Times per device per day</label>
                <input id="ed-freq" type="number" min="0" max="50" inputMode="numeric" className="field" value={form.frequencyCapPerDay} onChange={(e) => set({ frequencyCapPerDay: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })} aria-describedby="ed-freq-hint" />
                <p id="ed-freq-hint" className="mt-1 text-xs text-muted">0 = no limit. Counted on each device, without identifying anyone.</p>
              </div>
            </Section>

            <Section id="ed-creatives" title="Creatives" hint="The ad itself. Every ad carries a visible “Sponsored” label and your organisation’s name.">
              <CreativesEditor
                value={form.creatives}
                onChange={(creatives) => set({ creatives })}
                advertiserName={account?.name || ''}
                allowedFormats={allowedFormats}
                previewSize={previewSize}
                idPrefix="ed-cr"
              />
            </Section>
          </div>

          {/* Pricing + actions */}
          <aside className="space-y-6 lg:sticky lg:top-24">
            <Section id="ed-price" title="Pricing" hint="Prices come from the placements’ rate cards. You never type a price.">
              <fieldset className="space-y-2">
                <legend className="sr-only">Pricing model</legend>
                {PRICING_MODELS.map((m) => (
                  <label key={m} htmlFor={`ed-pm-${m}`} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 ${form.pricingModel === m ? 'border-ink bg-paper' : 'border-sand hover:bg-paper'}`}>
                    <input id={`ed-pm-${m}`} type="radio" name="pricingModel" checked={form.pricingModel === m} onChange={() => set({ pricingModel: m })} className="mt-0.5 h-5 w-5 shrink-0 accent-[#B5232C]" />
                    <span>
                      <span className="block text-sm font-semibold text-ink">{PRICING_LABELS[m].label}</span>
                      <span className="block text-xs text-muted">{PRICING_LABELS[m].hint}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              {form.pricingModel !== 'FLAT' && (
                <div>
                  <label htmlFor="ed-budget" className="field-label">Total budget (NPR)</label>
                  <input id="ed-budget" type="number" min="1" inputMode="numeric" className="field" value={form.budget} onChange={(e) => set({ budget: e.target.value })} aria-describedby="ed-budget-hint" />
                  <p id="ed-budget-hint" className="mt-1 text-xs text-muted">The ad stops showing when spend reaches this amount.</p>
                </div>
              )}
              <div className={`rounded-2xl p-4 text-sm ${quote.ok ? 'bg-pine-tint text-pine' : 'bg-paper-deep text-ink-soft'}`}>
                <p className="flex items-center gap-2 font-semibold"><Calculator className="h-4 w-4" aria-hidden="true" /> Estimate from the rate card</p>
                <p className="mt-1">{quote.text}</p>
                <p className="mt-2 text-xs opacity-80">The server confirms the price when you save.</p>
              </div>
              {editing && campaign && (
                <div className="rounded-2xl border border-sand p-4 text-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Saved quote</p>
                  <p className="mt-1 font-semibold text-ink tabular-nums">
                    {campaign.pricingModel === 'FLAT'
                      ? campaign.flatPrice ? `${nprAd(campaign.flatPrice)} for the whole run` : 'Not priced yet'
                      : campaign.rate ? `${nprAd(campaign.rate)} ${campaign.pricingModel === 'CPM' ? 'per 1,000 impressions' : 'per click'} · budget ${nprAd(campaign.budget)}` : 'Not priced yet'}
                  </p>
                  {campaign.customPrice && <p className="mt-1 text-xs text-muted">A price agreed with our team. It is kept while pricing model, placements and dates stay the same.</p>}
                </div>
              )}
            </Section>

            <div className="card p-5 space-y-3">
              <button type="submit" disabled={saving} className="btn btn-ghost w-full min-h-11">
                <Save className="h-4 w-4" aria-hidden="true" /> {saving ? 'Saving…' : editing ? 'Save changes' : 'Save as draft'}
              </button>
              {canSubmitNow && (
                <button type="button" disabled={saving} onClick={() => requestSave(true)} className="btn btn-primary w-full min-h-11">
                  <Send className="h-4 w-4" aria-hidden="true" /> Save and submit for review
                </button>
              )}
              <p className="text-xs text-muted">Our team checks every ad against the ad guidelines before it runs, usually within two working days.</p>
            </div>
          </aside>
        </form>
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} labelledBy="ed-confirm-title">
        <div className="p-6 sm:p-7 space-y-4">
          <span className="w-12 h-12 rounded-2xl bg-marigold-tint text-marigold-text flex items-center justify-center"><AlertTriangle className="w-6 h-6" aria-hidden="true" /></span>
          <h2 id="ed-confirm-title" className="text-xl font-bold text-ink pr-10">Send this campaign back to review?</h2>
          <p className="text-sm text-ink-soft">
            “{campaign?.title}” is approved. If you change anything other than the daily frequency cap, it stops showing until our team approves the changes.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setConfirm(null)} className="btn btn-ghost">Keep editing</button>
            <button type="button" disabled={saving} onClick={() => save(confirm?.submit)} className="btn btn-primary">{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdCampaignEditor;
