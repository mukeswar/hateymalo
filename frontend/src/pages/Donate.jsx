import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import DonationModal from '../components/DonationModal';
import FinancialTransparencySection from '../components/FinancialTransparencySection';
import Avatar from '../components/ui/Avatar';
import { Reveal } from '../components/ui/motion';
import { useAuth } from '../context/AuthContext';
import {
  HandHeart,
  ShieldCheck,
  ReceiptText,
  QrCode,
  Copy,
  Check,
  ArrowRight,
  Server,
  BellRing,
  Sprout,
  Wallet,
  FileCheck2,
  Eye,
  ChevronDown,
  Users,
  PauseCircle,
  Megaphone,
} from 'lucide-react';

const npr = (n) => `रु ${Number(n || 0).toLocaleString('en-IN')}`;

const ALLOCATIONS = [
  {
    icon: Server,
    title: 'Keeping the platform free',
    body: 'Hosting, database and uptime, so anyone can post a help request without paying anything.',
  },
  {
    icon: BellRing,
    title: 'Reaching nearby helpers',
    body: 'Notifications that let verified volunteers close by know when someone needs a hand.',
  },
  {
    icon: Sprout,
    title: 'Supplies for volunteer drives',
    body: 'Gloves, waste bags, saplings and stationery for community campaigns, logged with receipts.',
  },
];

const STEPS = [
  {
    icon: Wallet,
    title: 'Pay directly',
    body: 'Scan the official QR or send to the listed wallet from eSewa, Khalti, Fonepay or your bank.',
  },
  {
    icon: FileCheck2,
    title: 'Log your contribution',
    body: 'Record the amount and method here so it is added to the public totals with a transaction ID.',
  },
  {
    icon: ReceiptText,
    title: 'Follow every rupee',
    body: 'Campaign organisers publish each expense with receipts. Open any campaign ledger to see them.',
  },
];

const CampaignSkeleton = () => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3].map((n) => (
      <div key={n} className="h-72 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
    ))}
  </div>
);

const Donate = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [settings, setSettings] = useState(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [openLedger, setOpenLedger] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await API.get('/settings');
        if (res.data.success) {
          setSettings(res.data.data);
        }
      } catch (error) {
        console.error('Failed to load platform settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await API.get('/donations/campaigns');
      if (res.data.success) setCampaigns(res.data.data);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setCampaignsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Only show payment details an administrator actually published.
  const qrImageUrl = settings?.paymentQrCode || '';
  const qrInstructions = settings?.paymentInstructions || 'Scan with eSewa, Khalti, or Fonepay to make a direct voluntary contribution.';
  const qrPhone = settings?.paymentPhone || '';

  const copyPhoneToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrPhone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2500);
    } catch {
      /* clipboard unavailable — number stays visible for manual copy */
    }
  };

  const openDonation = (campaign = null) => {
    setSelectedCampaign(campaign);
    setShowModal(true);
  };

  const donationsDisabled = settings && settings.allowPublicDonations === false;

  if (donationsDisabled) {
    return (
      <div className="container-page py-20 sm:py-28">
        <div className="max-w-xl mx-auto text-center card p-8 sm:p-12 space-y-4 animate-rise">
          <div className="w-16 h-16 rounded-2xl bg-marigold-tint text-marigold-text flex items-center justify-center mx-auto">
            <PauseCircle className="w-8 h-8" aria-hidden="true" />
          </div>
          <span className="eyebrow deva justify-center">सहयोग अस्थायी रूपमा रोकिएको छ</span>
          <h1 className="text-3xl font-bold text-ink">Donations are paused for now</h1>
          <p className="text-muted">
            Voluntary contributions are currently turned off by the platform administrators. Please check back soon. You can still help by joining a request or volunteering your time.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link to="/explore" className="btn btn-primary">
              See help requests <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link to="/" className="btn btn-ghost">Back home</Link>
          </div>
        </div>
      </div>
    );
  }

  const ledgerCampaign = campaigns.find((c) => c._id === openLedger);

  return (
    <div className="pb-20">
      {/* ============ HEADER ============ */}
      <section className="relative overflow-hidden border-b border-sand bg-paper-deep/60">
        <div className="absolute inset-0 grain opacity-60" aria-hidden="true" />
        <div className="container-page relative pt-10 sm:pt-14 pb-12 sm:pb-16 grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7 space-y-5 animate-rise">
            <span className="eyebrow deva">हातेमालो सहयोग</span>
            <h1 className="text-4xl sm:text-5xl font-bold text-ink leading-[1.08]">
              Give if you can, and see exactly where it goes.
            </h1>
            <p className="text-muted text-lg max-w-2xl">
              Every contribution is voluntary. Hateymalo charges no fees to people asking for help, and every campaign publishes its expenses with receipts, so you never have to take anyone's word for it.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button type="button" onClick={() => openDonation(null)} className="btn btn-primary btn-lg">
                <HandHeart className="w-5 h-5" aria-hidden="true" /> Support the platform
              </button>
              <a href="#campaigns" className="btn btn-ghost btn-lg">
                Browse campaigns
              </a>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-4 text-sm text-ink-soft">
              <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-pine" aria-hidden="true" /> Voluntary, no pressure</li>
              <li className="flex items-center gap-2"><ReceiptText className="w-4 h-4 text-pine" aria-hidden="true" /> Public expense ledgers</li>
              <li className="flex items-center gap-2"><FileCheck2 className="w-4 h-4 text-pine" aria-hidden="true" /> Transaction ID for every gift</li>
            </ul>
          </div>

          {/* Payment card */}
          <aside className="lg:col-span-5 card p-6 sm:p-7 space-y-5 animate-rise" aria-labelledby="pay-direct-title">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="chip bg-pine-tint text-pine"><QrCode className="w-3.5 h-3.5" aria-hidden="true" /> Official payment details</span>
                <h2 id="pay-direct-title" className="text-2xl font-bold text-ink mt-3">Scan &amp; pay directly</h2>
              </div>
            </div>
            <p className="text-ink-soft text-sm leading-relaxed">{qrInstructions}</p>

            {qrImageUrl ? (
              <div className="surface-sunken p-4 flex flex-col items-center gap-2">
                <img
                  src={qrImageUrl}
                  alt="Hateymalo official donation QR code"
                  className="w-full max-w-[220px] h-auto rounded-xl bg-white p-2 border border-sand object-contain"
                />
                <span className="text-xs text-muted">eSewa · Khalti · Fonepay</span>
              </div>
            ) : (
              <div className="surface-sunken p-5 text-sm text-muted text-center">
                {settings ? 'The official QR code has not been published yet.' : 'Loading payment details…'}
              </div>
            )}

            {qrPhone && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-sand px-4 py-3">
                <div className="min-w-0">
                  <span className="text-xs text-muted block">Official wallet ID / mobile</span>
                  <span className="font-semibold text-ink tabular-nums break-all">{qrPhone}</span>
                </div>
                <button
                  type="button"
                  onClick={copyPhoneToClipboard}
                  className="w-10 h-10 shrink-0 rounded-full border border-sand bg-white hover:border-ink flex items-center justify-center transition-colors"
                  aria-label={copiedPhone ? 'Copied' : 'Copy wallet number'}
                >
                  {copiedPhone ? <Check className="w-4 h-4 text-pine" aria-hidden="true" /> : <Copy className="w-4 h-4 text-ink-soft" aria-hidden="true" />}
                </button>
              </div>
            )}
            <span className="sr-only" role="status" aria-live="polite">{copiedPhone ? 'Wallet number copied' : ''}</span>

            <button type="button" onClick={() => openDonation(null)} className="btn btn-pine w-full">
              Already paid? Log your contribution <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </aside>
        </div>
      </section>

      {/* ============ CAMPAIGNS ============ */}
      <section id="campaigns" className="container-page py-16 sm:py-20 scroll-mt-24">
        <Reveal className="max-w-2xl space-y-3 mb-10">
          <span className="eyebrow deva">अभियानहरू</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">Campaigns you can follow all the way through</h2>
          <p className="text-muted text-lg">Each campaign shows what has been raised, who is organising it, and an open ledger of what has been spent.</p>
        </Reveal>

        {campaignsLoading ? (
          <CampaignSkeleton />
        ) : campaigns.length === 0 ? (
          <div className="card p-10 text-center max-w-xl mx-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-sky-tint text-sky-ink flex items-center justify-center mx-auto">
              <Megaphone className="w-7 h-7" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-semibold text-ink">No campaigns are running right now</h3>
            <p className="text-muted">You can still support the platform itself, which keeps help requests free for everyone.</p>
            <button type="button" onClick={() => openDonation(null)} className="btn btn-primary">
              Support the platform
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((c, i) => {
              const pct = c.goalAmount ? Math.min(100, Math.round((c.raisedAmount / c.goalAmount) * 100)) : 0;
              const completed = c.status === 'COMPLETED';
              const ledgerOpen = openLedger === c._id;
              return (
                <Reveal key={c._id} delay={(i % 3) * 80} className="h-full">
                  <article className="card card-hover h-full p-6 flex flex-col">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={c.creator?.name} src={c.creator?.profilePicture} size="sm" />
                        <div className="min-w-0 leading-tight">
                          <span className="text-xs text-muted block">Organised by</span>
                          <span className="text-sm font-semibold text-ink truncate block">{c.creator?.name || 'Hateymalo'}</span>
                        </div>
                      </div>
                      {completed ? (
                        <span className="chip bg-pine-tint text-pine shrink-0">Goal reached</span>
                      ) : (
                        <span className="chip bg-marigold-tint text-marigold-text shrink-0">Active</span>
                      )}
                    </div>

                    <h3 className="text-xl font-semibold text-ink leading-snug mb-2">{c.title}</h3>
                    {c.description && <p className="text-sm text-muted line-clamp-3 mb-5">{c.description}</p>}

                    <div className="mt-auto space-y-4">
                      <div>
                        <div
                          className="progress-track"
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${c.title}: ${pct}% of goal raised`}
                        >
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-baseline justify-between mt-2.5 text-sm">
                          <span>
                            <strong className="font-display text-lg text-ink">{npr(c.raisedAmount)}</strong>
                            <span className="text-muted"> of {npr(c.goalAmount)}</span>
                          </span>
                          <span className="font-semibold text-marigold-text tabular-nums">{pct}%</span>
                        </div>
                        <p className="text-xs text-muted mt-1 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" aria-hidden="true" />
                          {c.donorsCount || 0} {c.donorsCount === 1 ? 'supporter' : 'supporters'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!completed && (
                          <button type="button" onClick={() => openDonation(c)} className="btn btn-primary btn-sm flex-1">
                            <HandHeart className="w-4 h-4" aria-hidden="true" /> Contribute
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setOpenLedger(ledgerOpen ? null : c._id)}
                          className="btn btn-ghost btn-sm flex-1"
                          aria-expanded={ledgerOpen}
                          aria-controls="campaign-ledger"
                        >
                          <Eye className="w-4 h-4" aria-hidden="true" /> {ledgerOpen ? 'Hide ledger' : 'Where the money goes'}
                        </button>
                      </div>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        )}

        {ledgerCampaign && (
          <div id="campaign-ledger" className="mt-10 animate-rise">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-xl font-semibold text-ink">
                Ledger · <span className="text-ink-soft">{ledgerCampaign.title}</span>
              </h3>
              <button type="button" onClick={() => setOpenLedger(null)} className="btn btn-ghost btn-sm">
                <ChevronDown className="w-4 h-4 rotate-180" aria-hidden="true" /> Close
              </button>
            </div>
            <FinancialTransparencySection
              key={ledgerCampaign._id}
              campaignId={ledgerCampaign._id}
              isOrganizer={!!user && ledgerCampaign.creator?._id === user._id}
            />
          </div>
        )}
      </section>

      {/* ============ WHERE THE MONEY GOES ============ */}
      <section id="transparency" className="bg-white border-y border-sand scroll-mt-24">
        <div className="container-page py-16 sm:py-20">
          <Reveal className="max-w-2xl space-y-3 mb-10">
            <span className="eyebrow deva">पैसा कहाँ जान्छ</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">Where platform support goes</h2>
            <p className="text-muted text-lg">
              Hateymalo has no subscription fees. Voluntary platform support is used for running costs and volunteer logistics, nothing more.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {ALLOCATIONS.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="surface-sunken h-full p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white text-pine flex items-center justify-center shadow-[var(--shadow-soft)]">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-ink">{title}</h3>
                  <p className="text-sm text-ink-soft leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="container-page py-16 sm:py-20">
        <Reveal className="max-w-2xl space-y-3 mb-10">
          <span className="eyebrow deva">कसरी काम गर्छ</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">How giving works</h2>
        </Reveal>
        <ol className="grid md:grid-cols-3 gap-6">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <Reveal as="li" key={title} delay={i * 80} className="card p-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-brand-tint text-brand font-display font-bold flex items-center justify-center">{i + 1}</span>
                <Icon className="w-5 h-5 text-ink-soft" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-ink">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{body}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ============ CLOSING ============ */}
      <section className="container-page">
        <Reveal className="rounded-[var(--radius-card)] bg-pine text-white relative overflow-hidden p-8 sm:p-12 text-center">
          <div className="absolute inset-0 grain opacity-40" aria-hidden="true" />
          <div className="relative space-y-4 max-w-xl mx-auto">
            <span className="eyebrow deva !text-marigold justify-center">हातेमालो</span>
            <h2 className="text-3xl font-bold">Money is one way to help. Time is another.</h2>
            <p className="text-white/80">
              If giving isn't right for you today, that's completely fine. Joining a request or an event matters just as much.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button type="button" onClick={() => openDonation(null)} className="btn bg-white text-pine hover:bg-paper">
                Make a contribution
              </button>
              <Link to="/explore" className="btn btn-light">See help requests</Link>
            </div>
          </div>
        </Reveal>
      </section>

      <DonationModal
        isOpen={showModal}
        campaign={selectedCampaign}
        onClose={() => setShowModal(false)}
        onSuccess={fetchCampaigns}
      />
    </div>
  );
};

export default Donate;
