import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Heart, X, CheckCircle2, ShieldCheck, Wallet, Sparkles, QrCode, Copy, Check } from 'lucide-react';

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

  if (!isOpen) return null;

  const finalAmount = customAmount ? parseFloat(customAmount) : amount;
  const qrImageUrl = settings?.paymentQrCode || 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=HAATEMALO-DONATION-OFFICIAL-QR';
  const qrInstructions = settings?.paymentInstructions || 'Scan with eSewa, Khalti, or Fonepay to make a direct voluntary contribution.';
  const qrPhone = settings?.paymentPhone || '+977 9800000000';

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

  const copyPhoneToClipboard = () => {
    navigator.clipboard.writeText(qrPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 1 ? (
          <form onSubmit={handleDonateSubmit} className="space-y-6">
            
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#C8382C] flex items-center justify-center border border-rose-200 mx-auto shadow-xs">
                <Heart className="w-6 h-6 fill-[#C8382C]" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">
                {campaign ? `Fundraising for "${campaign.title}"` : 'Support HAATEMALO Platform'}
              </h3>
              <p className="text-xs text-slate-600">
                100% Voluntary contribution for community aid & mutual collaboration in Nepal.
              </p>
            </div>

            {/* Split View: Left Form / Right QR Code */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              
              {/* Left 3 cols: Amount & Options */}
              <div className="md:col-span-3 space-y-5">
                
                {/* Amount Presets */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select Amount (NPR)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[500, 1000, 2500, 5000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setAmount(val);
                          setCustomAmount('');
                        }}
                        className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                          !customAmount && amount === val
                            ? 'bg-[#C8382C] text-white shadow-md'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        NPR {val}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    placeholder="Or enter custom amount in NPR..."
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#C8382C] rounded-xl p-3 text-sm text-slate-900 outline-none mt-2 placeholder-slate-400"
                  />
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Payment Provider
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'eSewa', label: 'eSewa (💚 Direct)', color: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
                      { name: 'Khalti', label: 'Khalti (💜 Digital Wallet)', color: 'border-purple-300 bg-purple-50 text-purple-900' },
                      { name: 'Fonepay', label: 'Fonepay (❤️ QR Code)', color: 'border-rose-300 bg-rose-50 text-rose-900' },
                      { name: 'Bank Transfer', label: 'Bank Transfer (🏦 Direct)', color: 'border-sky-300 bg-sky-50 text-sky-900' },
                    ].map((pm) => (
                      <button
                        key={pm.name}
                        type="button"
                        onClick={() => setPaymentMethod(pm.name)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center gap-2 ${
                          paymentMethod === pm.name
                            ? `${pm.color} shadow-xs border-2 font-extrabold`
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Wallet className="w-3.5 h-3.5" /> {pm.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Donor Note */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Message of Encouragement (Optional)
                  </label>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g., Best wishes for the campaign!"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#C8382C] rounded-xl p-3 text-xs text-slate-900 outline-none placeholder-slate-400"
                  />
                </div>

              </div>

              {/* Right 2 cols: Static QR Code */}
              <div className="md:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between items-center text-center space-y-3">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <QrCode className="w-3 h-3" /> Official Scan & Pay QR
                </span>

                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs max-w-[170px]">
                  <img
                    src={qrImageUrl}
                    alt="Official Payment QR"
                    className="w-full h-auto rounded-lg object-contain"
                  />
                </div>

                <p className="text-[11px] text-slate-600 leading-tight">{qrInstructions}</p>

                <div className="w-full bg-white p-2 rounded-xl border border-slate-200 text-[10px] flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-800">{qrPhone}</span>
                  <button
                    type="button"
                    onClick={copyPhoneToClipboard}
                    className="p-1 text-slate-500 hover:text-slate-900"
                    title="Copy Phone Number"
                  >
                    {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl font-bold bg-[#C8382C] hover:bg-[#b02e23] text-white shadow-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? 'Processing Transaction...' : `Confirm Voluntary NPR ${finalAmount} Donation`}
            </button>

          </form>
        ) : (
          /* Step 2: Success Confirmation */
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-300 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-slate-900">Thank You for Your Support!</h3>
              <p className="text-sm text-slate-600">
                Your voluntary donation of <strong className="text-emerald-700 font-bold">NPR {donationResult?.amount}</strong> has been logged.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-mono text-teal-800 font-bold">{donationResult?.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Gateway:</span>
                <span className="font-bold text-slate-900">{donationResult?.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="text-slate-700">{new Date(donationResult?.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-bold bg-teal-700 text-white text-xs shadow-md"
            >
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default DonationModal;
