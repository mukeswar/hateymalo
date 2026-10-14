import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ShieldCheck, ReceiptText, Plus, Eye, X, Target, HandCoins, ArrowDownRight, Wallet } from 'lucide-react';

const npr = (n) => `NPR ${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');

const SummaryTile = ({ icon: Icon, label, value, tone }) => (
  <div className="surface-sunken p-4 sm:p-5 space-y-1.5">
    <p className="text-xs text-muted font-semibold flex items-center gap-1.5">
      <Icon className={`w-4 h-4 ${tone}`} aria-hidden="true" /> {label}
    </p>
    <p className="font-display text-xl sm:text-2xl font-bold text-ink tabular-nums">{value}</p>
  </div>
);

const FinancialTransparencySection = ({ campaignId, isOrganizer }) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Expense form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [spentDate, setSpentDate] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTransparency = async () => {
    try {
      const res = await API.get(`/donations/campaigns/${campaignId}/transparency`);
      if (res.data.success) {
        setLedgerData(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch financial transparency:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (campaignId) fetchTransparency();
  }, [campaignId]);

  useEffect(() => {
    if (!previewImage) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewImage]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!title || !amount || parseFloat(amount) <= 0) {
      showToast('Please provide valid title and amount in NPR', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await API.post(`/donations/campaigns/${campaignId}/expenses`, {
        title,
        amount: parseFloat(amount),
        spentDate: spentDate ? new Date(spentDate) : undefined,
        proofImages: proofUrl ? [proofUrl] : [],
        notes,
      });

      if (res.data.success) {
        showToast('Expense record and receipt added to transparency ledger!', 'success');
        setTitle('');
        setAmount('');
        setSpentDate('');
        setProofUrl('');
        setNotes('');
        setShowExpenseForm(false);
        fetchTransparency();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to add expense', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="h-64 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" aria-label="Loading ledger" />;
  }

  if (!ledgerData) {
    return (
      <div className="card p-6 text-center text-muted">
        We couldn't load this ledger right now. Please try again in a moment.
      </div>
    );
  }

  const { campaign, totalCollected, totalSpent, netRemainingBalance, expenses } = ledgerData;
  const goalAmount = campaign.goalAmount;
  const remainingGoal = Math.max(0, goalAmount - totalCollected);
  const raisedPct = goalAmount ? Math.min(100, Math.round((totalCollected / goalAmount) * 100)) : 0;
  const spentPct = totalCollected ? Math.min(100, Math.round((totalSpent / totalCollected) * 100)) : 0;
  const canLog = isOrganizer || isAdmin;

  return (
    <section className="card p-5 sm:p-8 space-y-7" aria-labelledby={`ledger-title-${campaignId}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-pine-tint text-pine flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h3 id={`ledger-title-${campaignId}`} className="text-xl font-semibold text-ink">Transparency ledger</h3>
            <p className="text-sm text-muted">Every expense, with the receipt where one was attached.</p>
          </div>
        </div>

        {canLog && (
          <button
            type="button"
            onClick={() => setShowExpenseForm(!showExpenseForm)}
            className={`btn btn-sm shrink-0 ${showExpenseForm ? 'btn-ghost' : 'btn-pine'}`}
            aria-expanded={showExpenseForm}
          >
            {showExpenseForm ? <X className="w-4 h-4" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
            {showExpenseForm ? 'Cancel' : 'Add expense record'}
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SummaryTile icon={Target} label="Goal" value={npr(goalAmount)} tone="text-ink-soft" />
        <SummaryTile icon={HandCoins} label="Raised" value={npr(totalCollected)} tone="text-pine" />
        <SummaryTile icon={ArrowDownRight} label="Spent" value={npr(totalSpent)} tone="text-brand" />
        <SummaryTile icon={Wallet} label="Balance held" value={npr(netRemainingBalance)} tone="text-marigold-text" />
      </div>

      {/* Bars */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-ink-soft font-semibold">Raised of goal</span>
            <span className="text-muted tabular-nums">{raisedPct}%{remainingGoal > 0 ? ` · ${npr(remainingGoal)} to go` : ''}</span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuenow={raisedPct} aria-valuemin={0} aria-valuemax={100} aria-label="Raised of goal">
            <div className="progress-fill" style={{ width: `${raisedPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-ink-soft font-semibold">Spent of raised</span>
            <span className="text-muted tabular-nums">{spentPct}%</span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuenow={spentPct} aria-valuemin={0} aria-valuemax={100} aria-label="Spent of raised">
            <div className="h-full rounded-full bg-pine transition-[width] duration-1000" style={{ width: `${spentPct}%` }} />
          </div>
        </div>
      </div>

      {/* Expense Upload Form */}
      {canLog && showExpenseForm && (
        <form onSubmit={handleAddExpense} className="surface-sunken p-5 sm:p-6 space-y-4 animate-rise">
          <h4 className="font-semibold text-ink">Log a new expense</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={`exp-title-${campaignId}`} className="field-label">Expense title *</label>
              <input
                id={`exp-title-${campaignId}`}
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 50 heavy-duty trash bags and gloves"
                className="field"
              />
            </div>
            <div>
              <label htmlFor={`exp-amount-${campaignId}`} className="field-label">Amount spent (NPR) *</label>
              <input
                id={`exp-amount-${campaignId}`}
                type="number"
                required
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 4500"
                className="field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={`exp-proof-${campaignId}`} className="field-label">Receipt image URL</label>
              <input
                id={`exp-proof-${campaignId}`}
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://…"
                className="field"
              />
              <p className="text-xs text-muted mt-1">A photo of the bill helps supporters trust the record.</p>
            </div>
            <div>
              <label htmlFor={`exp-date-${campaignId}`} className="field-label">Date spent</label>
              <input
                id={`exp-date-${campaignId}`}
                type="date"
                value={spentDate}
                onChange={(e) => setSpentDate(e.target.value)}
                className="field"
              />
            </div>
          </div>

          <div>
            <label htmlFor={`exp-notes-${campaignId}`} className="field-label">Notes / vendor details</label>
            <input
              id={`exp-notes-${campaignId}`}
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Purchased from a local hardware store with VAT bill"
              className="field"
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="btn btn-pine">
              {submitting ? 'Saving…' : 'Save expense record'}
            </button>
          </div>
        </form>
      )}

      {/* Itemized expenses */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-ink-soft flex items-center gap-1.5">
          <ReceiptText className="w-4 h-4 text-pine" aria-hidden="true" /> Itemised expenses
          <span className="text-muted font-normal">({expenses.length} {expenses.length === 1 ? 'record' : 'records'})</span>
        </h4>

        {expenses.length > 0 ? (
          <>
            {/* Desktop / tablet table */}
            <div className="hidden sm:block overflow-x-auto rounded-2xl border border-sand">
              <table className="w-full text-left text-sm">
                <thead className="bg-paper text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Item</th>
                    <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Date</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Amount</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand bg-white">
                  {expenses.map((exp) => (
                    <tr key={exp._id} className="hover:bg-paper/60 transition-colors align-top">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{exp.title}</p>
                        {exp.notes && <p className="text-xs text-muted mt-0.5">{exp.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{fmtDate(exp.spentDate)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-ink tabular-nums whitespace-nowrap">{npr(exp.amount)}</td>
                      <td className="px-4 py-3">
                        {exp.proofImages && exp.proofImages.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(exp.proofImages[0])}
                            className="inline-flex items-center gap-1.5 font-semibold text-sky-ink hover:underline min-h-8"
                          >
                            <Eye className="w-4 h-4" aria-hidden="true" /> View
                          </button>
                        ) : (
                          <span className="text-muted">Not attached</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-paper border-t border-sand">
                  <tr>
                    <th scope="row" colSpan={2} className="px-4 py-3 font-semibold text-ink">Total spent</th>
                    <td className="px-4 py-3 text-right font-bold text-ink tabular-nums whitespace-nowrap">{npr(totalSpent)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile list */}
            <ul className="sm:hidden divide-y divide-sand rounded-2xl border border-sand bg-white">
              {expenses.map((exp) => (
                <li key={exp._id} className="p-4 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-ink">{exp.title}</p>
                    <p className="font-semibold text-ink tabular-nums whitespace-nowrap">{npr(exp.amount)}</p>
                  </div>
                  {exp.notes && <p className="text-xs text-muted">{exp.notes}</p>}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-soft">{fmtDate(exp.spentDate)}</span>
                    {exp.proofImages && exp.proofImages.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(exp.proofImages[0])}
                        className="inline-flex items-center gap-1.5 font-semibold text-sky-ink min-h-10"
                      >
                        <Eye className="w-4 h-4" aria-hidden="true" /> Receipt
                      </button>
                    ) : (
                      <span className="text-muted">No receipt</span>
                    )}
                  </div>
                </li>
              ))}
              <li className="p-4 flex items-center justify-between bg-paper rounded-b-2xl">
                <span className="font-semibold text-ink">Total spent</span>
                <span className="font-bold text-ink tabular-nums">{npr(totalSpent)}</span>
              </li>
            </ul>
          </>
        ) : (
          <div className="surface-sunken p-6 text-center text-sm text-muted">
            No expenses have been logged yet. Anything spent from this campaign will appear here.
          </div>
        )}
      </div>

      {/* Receipt preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-in"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPreviewImage(null);
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="receipt-preview-title" className="card !rounded-3xl max-w-xl w-full p-4 sm:p-5 space-y-3 animate-pop">
            <div className="flex justify-between items-center">
              <span id="receipt-preview-title" className="font-semibold text-ink">Receipt</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-paper-deep"
                aria-label="Close receipt"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <img src={previewImage} alt="Expense receipt" className="w-full max-h-[70vh] object-contain rounded-2xl bg-paper" />
          </div>
        </div>
      )}
    </section>
  );
};

export default FinancialTransparencySection;
