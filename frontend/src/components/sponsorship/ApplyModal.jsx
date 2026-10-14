import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Loader2, Plus, Send, ArrowRight, AlertTriangle } from 'lucide-react';
import API from '../../services/api';
import { useToast } from '../../context/ToastContext';
import AccountForm from './AccountForm';
import {
  Chip,
  InKindEditor,
  LogoTile,
  Modal,
  TIER_LEVELS,
  TypeToggles,
  UrlPreviewField,
  VERIFICATION,
  cleanInKind,
  errMsg,
  isHttpUrl,
  npr,
} from './shared';

const CUSTOM = '__custom__';

// Apply-to-sponsor flow: choose (or create) a sponsor account, a tier or a
// custom package, what you are contributing, then send the proposal.
const ApplyModal = ({ open, onClose, opportunity, initialTier }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const tiers = opportunity?.tiers || [];

  const [accounts, setAccounts] = useState(null);
  const [creating, setCreating] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [account, setAccount] = useState('');
  const [tier, setTier] = useState(CUSTOM);
  const [types, setTypes] = useState(['CASH']);
  const [amount, setAmount] = useState('');
  const [inKind, setInKind] = useState([]);
  const [message, setMessage] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingDeal, setExistingDeal] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    setExistingDeal(null);
    const t = initialTier && tiers.find((x) => x._id === initialTier && x.slotsLeft !== 0);
    setTier(t ? t._id : tiers.find((x) => x.slotsLeft !== 0)?._id || CUSTOM);
    API.get('/sponsorship/accounts/mine')
      .then((res) => {
        const list = (res.data?.data || []).filter((a) => ['OWNER', 'EDITOR'].includes(a.myRole));
        setAccounts(list);
        const usable = list.find((a) => a.verificationStatus !== 'REJECTED');
        setAccount(usable?._id || '');
        setCreating(list.length === 0);
      })
      .catch(() => {
        setAccounts([]);
        setCreating(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTier]);

  const selectedAccount = accounts?.find((a) => a._id === account);
  const selectedTier = tiers.find((t) => t._id === tier);

  useEffect(() => {
    // Default the logo to the account's first logo when switching accounts
    setLogoUrl(selectedAccount?.logos?.[0]?.url || '');
  }, [account]); // eslint-disable-line react-hooks/exhaustive-deps

  const createAccount = async (payload) => {
    setSavingAccount(true);
    try {
      const res = await API.post('/sponsorship/accounts', payload);
      const acc = res.data.data;
      setAccounts((prev) => [acc, ...(prev || [])]);
      setAccount(acc._id);
      setCreating(false);
      showToast(res.data.message || 'Sponsor account created', 'success');
    } catch (err) {
      showToast(errMsg(err, 'Could not create the sponsor account'), 'error');
    } finally {
      setSavingAccount(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!account) return setError('Choose which organisation is sponsoring.');
    if (tier === CUSTOM && !message.trim()) return setError('Describe the package you have in mind in the message.');
    if (logoUrl && !isHttpUrl(logoUrl)) return setError('The logo link must start with http:// or https://');
    const items = cleanInKind(inKind);
    const payload = {
      sponsorAccount: account,
      tier: tier === CUSTOM ? undefined : tier,
      isCustomQuote: tier === CUSTOM,
      message: message.trim(),
      contributionTypes: [...new Set([...types, ...items.map((i) => i.type)])],
      inKindItems: items,
      logoUrl: logoUrl.trim() || undefined,
    };
    if (amount !== '') payload.amount = Number(amount) || 0;
    setSubmitting(true);
    try {
      const res = await API.post(`/sponsorship/opportunities/${opportunity._id}/apply`, payload);
      showToast(res.data.message || 'Proposal sent', 'success');
      onClose();
      navigate(`/sponsor/portal/deals/${res.data.data._id}`);
    } catch (err) {
      const dealId = err?.response?.data?.dealId;
      if (err?.response?.status === 409 && dealId) setExistingDeal(dealId);
      else setError(errMsg(err, 'Could not send the proposal'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="apply-title" wide>
      <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-sand pr-16">
        <span className="eyebrow deva">प्रायोजन प्रस्ताव</span>
        <h2 id="apply-title" className="text-2xl sm:text-3xl font-bold text-ink mt-1 leading-tight">Sponsor “{opportunity?.title}”</h2>
        <p className="text-sm text-muted mt-1.5">Nothing is binding yet. The team reviews your proposal and agrees final terms with you in your sponsor portal.</p>
      </div>

      {accounts === null ? (
        <div className="p-10 flex justify-center" role="status" aria-live="polite">
          <Loader2 className="w-6 h-6 animate-spin text-muted" aria-hidden="true" />
          <span className="sr-only">Loading your sponsor accounts</span>
        </div>
      ) : creating ? (
        <div className="px-6 sm:px-8 py-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-pine-tint text-pine flex items-center justify-center shrink-0"><Building2 className="w-5 h-5" aria-hidden="true" /></span>
            <div>
              <h3 className="text-lg font-semibold text-ink">Register your organisation</h3>
              <p className="text-sm text-muted">You'll be its owner. You can add team members and more details later in the sponsor portal.</p>
            </div>
          </div>
          <AccountForm compact idPrefix="apply-acc" onSubmit={createAccount} saving={savingAccount} submitLabel="Create and continue" onCancel={accounts.length ? () => setCreating(false) : undefined} />
        </div>
      ) : existingDeal ? (
        <div className="px-6 sm:px-8 py-10 text-center space-y-4" role="alert">
          <span className="mx-auto w-14 h-14 rounded-2xl bg-marigold-tint text-marigold-text flex items-center justify-center"><AlertTriangle className="w-7 h-7" aria-hidden="true" /></span>
          <h3 className="text-xl font-semibold text-ink">You already have an active proposal for this campaign</h3>
          <p className="text-muted max-w-md mx-auto">Open it to follow its progress, update the proposal or message the team.</p>
          <Link to={`/sponsor/portal/deals/${existingDeal}`} onClick={onClose} className="btn btn-primary">Open my proposal <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="px-6 sm:px-8 py-6 space-y-7">
          {/* 1. Account */}
          <fieldset className="space-y-3">
            <legend className="text-base font-semibold text-ink mb-2">1. Who is sponsoring?</legend>
            <div className="grid sm:grid-cols-2 gap-3">
              {accounts.map((a) => {
                const blocked = a.verificationStatus === 'REJECTED';
                const on = account === a._id;
                return (
                  <label key={a._id} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand transition-all ${on ? 'border-brand bg-brand-tint/40 shadow-[var(--shadow-soft)]' : 'border-sand bg-white hover:border-ink/30'} ${blocked ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <input type="radio" name="apply-account" className="sr-only" checked={on} disabled={blocked} onChange={() => setAccount(a._id)} />
                    <LogoTile url={a.logos?.[0]?.url} name={a.name} className="w-11 h-11" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink truncate">{a.name}</span>
                      <Chip map={VERIFICATION} value={a.verificationStatus} />
                    </span>
                    {on && <CheckCircle2 className="w-5 h-5 text-brand shrink-0" aria-hidden="true" />}
                  </label>
                );
              })}
              <button type="button" onClick={() => setCreating(true)} className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-sand text-sm font-semibold text-ink-soft hover:border-ink/40 hover:text-ink">
                <Plus className="w-4 h-4" aria-hidden="true" /> Register another organisation
              </button>
            </div>
          </fieldset>

          {/* 2. Package */}
          <fieldset className="space-y-3">
            <legend className="text-base font-semibold text-ink mb-2">2. Choose a package</legend>
            <div className="grid sm:grid-cols-2 gap-3">
              {tiers.map((t) => {
                const soldOut = t.slotsLeft === 0;
                const on = tier === t._id;
                const lvl = TIER_LEVELS[t.level] || TIER_LEVELS.CUSTOM;
                return (
                  <label key={t._id} className={`p-4 rounded-2xl border transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${soldOut ? 'opacity-55 cursor-not-allowed bg-paper' : 'cursor-pointer'} ${on ? 'border-brand bg-brand-tint/40 shadow-[var(--shadow-soft)]' : 'border-sand bg-white hover:border-ink/30'}`}>
                    <input type="radio" name="apply-tier" className="sr-only" checked={on} disabled={soldOut} onChange={() => setTier(t._id)} />
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{t.name}</span>
                      <span className={`chip ${lvl.cls}`}>{lvl.label}</span>
                    </span>
                    <span className="block font-display text-lg font-bold text-ink mt-1">{t.price > 0 ? npr(t.price) : t.priceNote || 'By quotation'}</span>
                    <span className="block text-xs text-muted">{soldOut ? 'Sold out' : t.slotsLeft === null ? 'Open slots' : `${t.slotsLeft} slot${t.slotsLeft === 1 ? '' : 's'} left`}</span>
                  </label>
                );
              })}
              <label className={`p-4 rounded-2xl border cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand transition-all ${tier === CUSTOM ? 'border-brand bg-brand-tint/40 shadow-[var(--shadow-soft)]' : 'border-sand bg-white hover:border-ink/30'}`}>
                <input type="radio" name="apply-tier" className="sr-only" checked={tier === CUSTOM} onChange={() => setTier(CUSTOM)} />
                <span className="font-semibold text-ink">Custom package</span>
                <span className="block text-sm text-muted mt-1">Propose your own mix of cash, goods or services.</span>
              </label>
            </div>
          </fieldset>

          {/* 3. Contribution */}
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-ink">3. What you'd contribute</h3>
            <TypeToggles legend="Contribution types" value={types} onChange={setTypes} />
            <div className="max-w-xs">
              <label htmlFor="apply-amount" className="field-label">Cash amount (NPR, optional)</label>
              <input
                id="apply-amount"
                type="number"
                min="0"
                inputMode="numeric"
                className="field"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={selectedTier?.price ? String(selectedTier.price) : 'e.g. 50000'}
                aria-describedby="apply-amount-hint"
              />
              <p id="apply-amount-hint" className="text-xs text-muted mt-1">
                {selectedTier?.price ? `Leave blank to propose the package price (${npr(selectedTier.price)}).` : 'Whole rupees. Final amounts are agreed with the team.'}
              </p>
            </div>
            <div>
              <p className="field-label">In-kind support (optional)</p>
              <p className="text-xs text-muted -mt-1 mb-3">Goods or services instead of cash, such as water, transport or printing. Values are estimates and are never counted as cash.</p>
              <InKindEditor items={inKind} onChange={setInKind} idPrefix="apply-ik" />
            </div>
          </div>

          {/* 4. Message + logo */}
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-ink">4. Message and logo</h3>
            <div>
              <label htmlFor="apply-msg" className="field-label">
                Message {tier === CUSTOM ? <span className="text-brand">*</span> : <span className="text-muted font-normal">(optional)</span>}
              </label>
              <textarea id="apply-msg" className="field min-h-[110px]" maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell the team why you'd like to support this campaign and anything they should know." />
            </div>
            {selectedAccount?.logos?.length > 0 && (
              <div>
                <p className="field-label">Use one of your logos</p>
                <div className="flex flex-wrap gap-2">
                  {selectedAccount.logos.map((l) => (
                    <button
                      key={l._id || l.url}
                      type="button"
                      aria-pressed={logoUrl === l.url}
                      onClick={() => setLogoUrl(l.url)}
                      className={`flex items-center gap-2 p-1.5 pr-3 rounded-2xl border text-sm ${logoUrl === l.url ? 'border-brand bg-brand-tint/40' : 'border-sand bg-white hover:border-ink/30'}`}
                    >
                      <LogoTile url={l.url} name={selectedAccount.name} className="w-10 h-10" dark={l.background === 'DARK'} />
                      {l.label || 'Logo'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <UrlPreviewField id="apply-logo" label="Logo link (optional)" value={logoUrl} onChange={setLogoUrl} name={selectedAccount?.name} hint="Your logo is only used after you explicitly approve it in the portal." />
          </div>

          {error && <p className="text-sm text-brand font-medium" role="alert">{error}</p>}

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2 border-t border-sand">
            <button type="button" onClick={onClose} className="btn btn-ghost mt-4">Cancel</button>
            <button type="submit" disabled={submitting || !account} className="btn btn-primary mt-4">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />} Send proposal
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ApplyModal;
