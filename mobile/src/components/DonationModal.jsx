import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { Check, CheckCircle2, Copy, HandHeart, Landmark, QrCode, ShieldCheck, Wallet } from 'lucide-react-native';
import API, { errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Chip, Field, Row, Sheet, T } from './ui';
import { colors, fonts, radius, space } from '../theme';

// Port of frontend/src/components/DonationModal.jsx as a bottom sheet.
// Props: { isOpen, onClose, campaign (null = platform support), onSuccess }.
const PRESETS = [500, 1000, 2500, 5000];

const PAYMENT_METHODS = [
  { name: 'eSewa', hint: 'Digital wallet' },
  { name: 'Khalti', hint: 'Digital wallet' },
  { name: 'Fonepay', hint: 'QR payment' },
  { name: 'Bank Transfer', hint: 'Direct to bank' },
];

const StepLabel = ({ n, children }) => (
  <Row gap={10} style={{ marginBottom: 10 }}>
    <View style={styles.stepNum}>
      <T style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.brand }}>{n}</T>
    </View>
    <T variant="semibold" style={{ fontSize: 14.5, flex: 1 }}>{children}</T>
  </Row>
);

const DonationModal = ({ isOpen, onClose, campaign = null, onSuccess }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [amount, setAmount] = useState(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('eSewa');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [donationResult, setDonationResult] = useState(null);
  const [settings, setSettings] = useState(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // A fresh opening always starts at the form, not a previous receipt.
    setStep(1);
    setDonationResult(null);
    (async () => {
      try {
        const res = await API.get('/settings');
        if (res.data.success) setSettings(res.data.data);
      } catch {
        /* payment details stay hidden */
      }
    })();
  }, [isOpen]);

  const finalAmount = customAmount ? parseFloat(customAmount) : amount;
  const displayAmount = Number.isFinite(finalAmount) ? finalAmount.toLocaleString('en-IN') : '0';
  // Only show payment details an administrator actually published.
  const qrImageUrl = settings?.paymentQrCode || '';
  const qrInstructions = settings?.paymentInstructions || 'Scan with eSewa, Khalti, or Fonepay to make a direct voluntary contribution.';
  const qrPhone = settings?.paymentPhone || '';

  const handleDonateSubmit = async () => {
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
        onSuccess?.();
      }
    } catch (error) {
      showToast(errorMessage(error, 'Donation failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyPhone = async () => {
    try {
      await Clipboard.setStringAsync(qrPhone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2500);
    } catch {
      /* the number stays visible */
    }
  };

  if (step === 2) {
    return (
      <Sheet visible={!!isOpen} onClose={onClose} title="Thank you" footer={<Button title="Done" variant="pine" onPress={onClose} full />}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View style={styles.success}>
            <CheckCircle2 size={34} color={colors.pine} />
          </View>
          <T variant="eyebrowDeva">धन्यवाद</T>
          <T variant="h1" style={{ textAlign: 'center' }}>Thank you for your support</T>
          <T variant="small" style={{ textAlign: 'center' }}>
            Your voluntary contribution of{' '}
            <T style={{ fontFamily: fonts.bold, color: colors.pine, fontSize: 14 }}>
              NPR {Number(donationResult?.amount || 0).toLocaleString('en-IN')}
            </T>{' '}
            has been recorded.
          </T>
        </View>
        <View style={styles.receipt}>
          {[
            ['Transaction ID', donationResult?.transactionId],
            ['Payment method', donationResult?.paymentMethod],
            ['Date', donationResult?.createdAt ? new Date(donationResult.createdAt).toLocaleDateString() : '—'],
          ].map(([k, v], i) => (
            <View key={k} style={[styles.receiptRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.sand }]}>
              <T variant="small">{k}</T>
              <T variant="semibold" style={{ flexShrink: 1, textAlign: 'right' }} selectable>{v}</T>
            </View>
          ))}
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={!!isOpen}
      onClose={onClose}
      title={campaign ? campaign.title : 'Support the Hateymalo platform'}
      footer={
        <>
          <Row gap={6}>
            <ShieldCheck size={16} color={colors.pine} />
            <T variant="caption" style={{ flex: 1 }}>
              {user ? 'You will receive a transaction ID.' : 'Please log in to record a contribution.'}
            </T>
          </Row>
          <Button title={`Confirm NPR ${displayAmount}`} icon={HandHeart} size="lg" loading={loading} onPress={handleDonateSubmit} full />
        </>
      }
    >
      <View style={{ gap: 4 }}>
        <T variant="eyebrowDeva">{campaign ? 'अभियानलाई सहयोग' : 'हातेमालोलाई सहयोग'}</T>
        <T variant="small">Entirely voluntary. Pay directly, then log it here so it appears in the public totals.</T>
      </View>

      <View>
        <StepLabel n={1}>Choose an amount (NPR)</StepLabel>
        <View style={styles.grid}>
          {PRESETS.map((val) => {
            const active = !customAmount && amount === val;
            return (
              <Pressable
                key={val}
                onPress={() => {
                  setAmount(val);
                  setCustomAmount('');
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.preset, active && { backgroundColor: colors.brand, borderColor: colors.brand }]}
              >
                <T style={{ fontFamily: fonts.semibold, fontSize: 15, color: active ? colors.white : colors.ink }}>
                  रु {val.toLocaleString('en-IN')}
                </T>
              </Pressable>
            );
          })}
        </View>
        <Field
          style={{ marginTop: 10 }}
          keyboardType="numeric"
          placeholder="Or enter another amount"
          value={customAmount}
          onChangeText={(v) => setCustomAmount(v.replace(/[^0-9.]/g, ''))}
          accessibilityLabel="Custom amount in NPR"
          hint="Minimum NPR 10. Any amount is welcome."
        />
      </View>

      <View>
        <StepLabel n={2}>How did you pay?</StepLabel>
        <View style={styles.grid}>
          {PAYMENT_METHODS.map((pm) => {
            const active = paymentMethod === pm.name;
            const Icon = pm.name === 'Bank Transfer' ? Landmark : Wallet;
            return (
              <Pressable
                key={pm.name}
                onPress={() => setPaymentMethod(pm.name)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.method, active && { borderColor: colors.pine, backgroundColor: colors.pineTint }]}
              >
                <Icon size={16} color={active ? colors.pine : colors.muted} />
                <View style={{ flex: 1 }}>
                  <T variant="semibold" style={{ fontSize: 14 }}>{pm.name}</T>
                  <T variant="caption">{pm.hint}</T>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <StepLabel n={3}>A note of encouragement (optional)</StepLabel>
        <Field value={message} onChangeText={setMessage} placeholder="e.g., Best wishes for the campaign!" accessibilityLabel="Message" />
      </View>

      <View style={styles.qrBox}>
        <Chip label="Official scan & pay" icon={QrCode} tone={{ bg: colors.pineTint, fg: colors.pine }} style={{ alignSelf: 'center' }} />
        {qrImageUrl ? (
          <Image source={{ uri: qrImageUrl }} style={styles.qr} contentFit="contain" accessibilityLabel="Hateymalo official payment QR code" />
        ) : (
          <T variant="small" style={{ textAlign: 'center', paddingVertical: 12 }}>
            {settings ? 'The official QR code has not been published yet.' : 'Loading payment details…'}
          </T>
        )}
        <T variant="small" style={{ textAlign: 'center', color: colors.inkSoft }}>{qrInstructions}</T>
        {qrPhone ? (
          <View style={styles.phone}>
            <T variant="semibold" style={{ flex: 1 }} selectable>{qrPhone}</T>
            <Pressable onPress={copyPhone} accessibilityLabel={copiedPhone ? 'Copied' : 'Copy wallet number'} style={styles.copyBtn}>
              {copiedPhone ? <Check size={16} color={colors.pine} /> : <Copy size={16} color={colors.muted} />}
            </Pressable>
          </View>
        ) : null}
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 46,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.sand,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  method: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.sand,
    backgroundColor: colors.white,
  },
  qrBox: { backgroundColor: colors.paperDeep, borderRadius: radius.md, padding: space.lg, gap: 10, alignItems: 'stretch' },
  qr: { width: 180, height: 180, alignSelf: 'center', borderRadius: radius.sm, backgroundColor: colors.white },
  phone: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.sand, paddingLeft: 12 },
  copyBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  success: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.pineTint, alignItems: 'center', justifyContent: 'center' },
  receipt: { backgroundColor: colors.paperDeep, borderRadius: radius.md, paddingHorizontal: space.lg },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10 },
});

export default DonationModal;
