import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { HandHeart, X, CheckCircle2, ShieldCheck, Wallet, QrCode, Copy, Check, Landmark } from 'lucide-react';

const PRESETS = [500, 1000, 2500, 5000];

const PAYMENT_METHODS = [
  { name: 'eSewa', hint: 'Digital wallet' },
  { name: 'Khalti', hint: 'Digital wallet' },
  { name: 'Fonepay', hint: 'QR payment' },
  { name: 'Bank Transfer', hint: 'Direct to bank' },
];

const StepLabel = ({ n, children, htmlFor }) => {
  const Tag = htmlFor ? 'label' : 'p';
  return (
    <Tag htmlFor={htmlFor} className="flex items-center gap-2.5 mb-3 text-sm font-semibold text-ink">
      <span className="w-6 h-6 rounded-full bg-brand-tint text-brand text-xs font-bold flex items-center justify-center shrink-0">{n}</span>
      {children}
    </Tag>
  );
};

const DonationModal = ({ isOpen, onClose, campaign = null, onSuccess }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [amount, setAmount] = useState(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('eSewa');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: form, 2: success confirmation
  const [donationResult, setDonationResult] = useState(null);
  const [settings, setSettings] = useState(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // A fresh opening always starts at the form, not a previous receipt.
      setStep(1);
      setDonationResult(null);
      const fetchSettings = async () => {
        try {
          const res = await API.get('/settings');
          if (res.data.success) {
            setSettings(res.data.data);
          }
        } catch (error) {
          console.error('Failed to load settings in modal:', error);
        }
      };
      fetchSettings();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const finalAmount = customAmount ? parseFloat(customAmount) : amount;
  const displayAmount = Number.isFinite(finalAmount) ? finalAmount.toLocaleString('en-IN') : '0';
  // Only show payment details an administrator actually published.
  const qrImageUrl = settings?.paymentQrCode || '';
  const qrInstructions = settings?.paymentInstructions || 'Scan with eSewa, Khalti, or Fonepay to make a direct voluntary contribution.';
  const qrPhone = settings?.paymentPhone || '';

  const handleDonateSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast('Please log in to make a donation', 'info');
      return;
    }

    if (!finalAmount || finalAmount < 10) {
      showToast('Minimum donation amount is NPR 10', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/donations', {
        campaignId: campaign ? campaign._id : null,
        type: campaign ? 'CAMPAIGN' : 'PLATFORM',
        amount: finalAmount,
        paymentMethod,
        donorMessage: message,
      });

      if (res.data.success) {
        setDonationResult(res.data.data);
        setStep(2);
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Donation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyPhoneToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrPhone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2500);
    } catch {
      /* clipboard unavailable — the number stays visible */
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/50 backdrop-blur-sm animate-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="donation-modal-title"
        className="card !rounded-t-3xl !rounded-b-none sm:!rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto relative animate-pop"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-paper-deep transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {step === 1 ? (
          <form onSubmit={handleDonateSubmit} noValidate>
            {/* Header */}
            <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-sand pr-16">
              <span className="eyebrow deva">{campaign ? 'अभियानलाई सहयोग' : 'हातेमालोलाई सहयोग'}</span>
              <h2 id="donation-modal-title" className="text-2xl sm:text-3xl font-bold text-ink mt-1 leading-tight">
                {campaign ? campaign.title : 'Support the Hateymalo platform'}
              </h2>
              <p className="text-sm text-muted mt-1.5">
                Entirely voluntary. Pay directly, then log it here so it appears in the public totals.
              </p>
            </div>

            <div className="px-6 sm:px-8 py-6 grid md:grid-cols-5 gap-7">
              <div className="md:col-span-3 space-y-7">
                {/* 1. Amount */}
                <fieldset>
                  <legend className="sr-only">Amount</legend>
                  <StepLabel n={1}>Choose an amount (NPR)</StepLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRESETS.map((val) => {
                      const active = !customAmount && amount === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            setAmount(val);
                            setCustomAmount('');
                          }}
                          className={`min-h-11 rounded-xl text-sm font-semibold border transition-all tabular-nums ${
                            active
                              ? 'bg-brand text-white border-brand shadow-[var(--shadow-brand)]'
                              : 'bg-white text-ink border-sand hover:border-ink'
                          }`}
                        >
                          रु {val.toLocaleString('en-IN')}
                        </button>
                      );
                    })}
                  </div>
                  <label htmlFor="donation-custom-amount" className="sr-only">Custom amount in NPR</label>
                  <input
                    id="donation-custom-amount"
                    type="number"
                    inputMode="numeric"
                    min={10}
                    placeholder="Or enter another amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="field mt-3"
                  />
                  <p className="text-xs text-muted mt-1.5">Minimum NPR 10. Any amount is welcome.</p>
                </fieldset>

                {/* 2. Method */}
                <fieldset>
                  <legend className="sr-only">Payment method</legend>
                  <StepLabel n={2}>How did you pay?</StepLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((pm) => {
                      const active = paymentMethod === pm.name;
                      const Icon = pm.name === 'Bank Transfer' ? Landmark : Wallet;
                      return (
                        <button
                          key={pm.name}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setPaymentMethod(pm.name)}
                          className={`min-h-12 px-3 py-2 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                            active ? 'border-pine bg-pine-tint ring-1 ring-pine' : 'border-sand bg-white hover:border-ink'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-pine' : 'text-muted'}`} aria-hidden="true" />
                          <span className="leading-tight">
                            <span className="block text-sm font-semibold text-ink">{pm.name}</span>
                            <span className="block text-xs text-muted">{pm.hint}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* 3. Message */}
                <div>
                  <StepLabel n={3} htmlFor="donation-message">A note of encouragement <span className="font-normal text-muted">(optional)</span></StepLabel>
                  <input
                    id="donation-message"
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g., Best wishes for the campaign!"
                    className="field"
                  />
                </div>
              </div>

              {/* QR side */}
              <aside className="md:col-span-2 surface-sunken p-5 flex flex-col items-center text-center gap-3 self-start">
                <span className="chip bg-pine-tint text-pine"><QrCode className="w-3.5 h-3.5" aria-hidden="true" /> Official scan &amp; pay</span>
                {qrImageUrl ? (
                  <img
                    src={qrImageUrl}
                    alt="Hateymalo official payment QR code"
                    className="w-full max-w-[180px] h-auto rounded-xl bg-white p-2 border border-sand object-contain"
                  />
                ) : (
                  <p className="text-sm text-muted py-4">
                    {settings ? 'The official QR code has not been published yet.' : 'Loading payment details…'}
                  </p>
                )}
                <p className="text-sm text-ink-soft leading-snug">{qrInstructions}</p>
                {qrPhone && (
                  <div className="w-full bg-white rounded-xl border border-sand pl-3 pr-1 py-1 flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink text-sm tabular-nums break-all text-left">{qrPhone}</span>
                    <button
                      type="button"
                      onClick={copyPhoneToClipboard}
                      className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-paper-deep"
                      aria-label={copiedPhone ? 'Copied' : 'Copy wallet number'}
                    >
                      {copiedPhone ? <Check className="w-4 h-4 text-pine" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
                )}
              </aside>
            </div>

            {/* Footer */}
            <div className="px-6 sm:px-8 py-5 border-t border-sand bg-paper/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky bottom-0">
              <p className="text-xs text-muted flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-pine shrink-0" aria-hidden="true" />
                {user ? 'You will receive a transaction ID.' : 'Please log in to record a contribution.'}
              </p>
              <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full sm:w-auto">
                <HandHeart className="w-5 h-5" aria-hidden="true" />
                {loading ? 'Recording…' : `Confirm NPR ${displayAmount}`}
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Success Confirmation */
          <div className="px-6 sm:px-10 py-10 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-pine-tint text-pine flex items-center justify-center mx-auto animate-pop">
              <CheckCircle2 className="w-9 h-9" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <span className="eyebrow deva justify-center">धन्यवाद</span>
              <h2 id="donation-modal-title" className="text-3xl font-bold text-ink">Thank you for your support</h2>
              <p className="text-muted">
                Your voluntary contribution of <strong className="text-pine">NPR {Number(donationResult?.amount || 0).toLocaleString('en-IN')}</strong> has been recorded.
              </p>
            </div>

            <dl className="max-w-md mx-auto surface-sunken p-5 text-sm text-left divide-y divide-sand">
              <div className="flex justify-between gap-4 pb-2.5">
                <dt className="text-muted">Transaction ID</dt>
                <dd className="font-mono font-semibold text-ink break-all text-right">{donationResult?.transactionId}</dd>
              </div>
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-muted">Payment method</dt>
                <dd className="font-semibold text-ink">{donationResult?.paymentMethod}</dd>
              </div>
              <div className="flex justify-between gap-4 pt-2.5">
                <dt className="text-muted">Date</dt>
                <dd className="text-ink">{donationResult?.createdAt ? new Date(donationResult.createdAt).toLocaleDateString() : '—'}</dd>
              </div>
            </dl>

            <button type="button" onClick={onClose} className="btn btn-pine">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationModal;
