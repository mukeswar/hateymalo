import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ShieldCheck,
  Receipt,
  Plus,
  DollarSign,
  TrendingUp,
  FileCheck,
  Image,
  Eye,
  X,
} from 'lucide-react';

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
    return <div className="h-40 bg-slate-800/40 animate-pulse rounded-3xl" />;
  }

  if (!ledgerData) return null;

  const { campaign, totalCollected, totalSpent, netRemainingBalance, expenses } = ledgerData;
  const goalAmount = campaign.goalAmount;
  const remainingGoal = Math.max(0, goalAmount - totalCollected);

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6 border border-emerald-500/30 bg-emerald-950/10 shadow-xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-500/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white">Financial Transparency & Expense Ledger</h3>
            <p className="text-xs text-emerald-300/80">Itemized expense reports with supporting receipt proofs</p>
          </div>
        </div>

        {(isOrganizer || isAdmin) && (
          <button
            onClick={() => setShowExpenseForm(!showExpenseForm)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" /> {showExpenseForm ? 'Cancel' : 'Add Expense Record'}
          </button>
        )}
      </div>

      {/* Campaign Fund Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Fundraising Goal</p>
          <p className="text-xl font-black text-white">NPR {goalAmount.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-1">
          <p className="text-[10px] text-emerald-400 font-semibold uppercase">Total Raised</p>
          <p className="text-xl font-black text-emerald-300">NPR {totalCollected.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-rose-500/30 bg-rose-950/20 space-y-1">
          <p className="text-[10px] text-rose-400 font-semibold uppercase">Total Spent</p>
          <p className="text-xl font-black text-rose-300">NPR {totalSpent.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 space-y-1">
          <p className="text-[10px] text-amber-400 font-semibold uppercase">Remaining Balance</p>
          <p className="text-xl font-black text-amber-300">NPR {netRemainingBalance.toLocaleString()}</p>
        </div>
      </div>

      {/* Expense Upload Form */}
      {(isOrganizer || isAdmin) && showExpenseForm && (
        <form onSubmit={handleAddExpense} className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-4 animate-in fade-in duration-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Log New Expense & Upload Receipt Proof
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Expense Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 50 Heavy Duty Trash Bags & Rubber Gloves"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Amount Spent (NPR) *</label>
              <input
                type="number"
                required
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 4500"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Receipt Image URL (Proof)</label>
              <input
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Spent Date</label>
              <input
                type="date"
                value={spentDate}
                onChange={(e) => setSpentDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Vendor Details</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Purchased from New Road Hardware Store with official VAT bill."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs shadow-md"
            >
              {submitting ? 'Logging...' : 'Save Expense Record'}
            </button>
          </div>
        </form>
      )}

      {/* Itemized Expenses Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Receipt className="w-4 h-4 text-emerald-400" /> Itemized Expense Log ({expenses.length} records)
        </h4>

        {expenses.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 font-bold uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Expense Item</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Proof Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {expenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-3">
                      <p className="font-bold text-white">{exp.title}</p>
                      {exp.notes && <p className="text-[11px] text-slate-400 mt-0.5">{exp.notes}</p>}
                    </td>
                    <td className="p-3 text-slate-400">
                      {new Date(exp.spentDate).toLocaleDateString()}
                    </td>
                    <td className="p-3 font-bold text-rose-300">
                      NPR {exp.amount.toLocaleString()}
                    </td>
                    <td className="p-3">
                      {exp.proofImages && exp.proofImages.length > 0 ? (
                        <button
                          onClick={() => setPreviewImage(exp.proofImages[0])}
                          className="flex items-center gap-1 text-teal-400 hover:text-teal-300 font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Receipt
                        </button>
                      ) : (
                        <span className="text-slate-500 italic">No image attached</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900/60 text-center text-xs text-slate-400">
            No expenses logged yet.
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-panel max-w-xl w-full p-4 rounded-3xl space-y-3 relative border border-slate-700">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white">Receipt Proof Document</span>
              <button onClick={() => setPreviewImage(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={previewImage} alt="Receipt proof" className="w-full max-h-96 object-contain rounded-2xl" />
          </div>
        </div>
      )}

    </div>
  );
};

export default FinancialTransparencySection;
