import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { ArrowDownRight, Eye, HandCoins, Plus, ReceiptText, ShieldCheck, Target, Wallet, X } from 'lucide-react-native';
import API, { errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, Field, ProgressBar, Row, Sheet, Skeleton, T } from './ui';
import { colors, fonts, radius, space } from '../theme';

// Port of frontend/src/components/FinancialTransparencySection.jsx — `{ campaignId, isOrganizer }`.
const npr = (n) => `NPR ${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');

const SummaryTile = ({ icon: Icon, label, value, tone }) => (
  <View style={styles.tile}>
    <Row gap={6}>
      <Icon size={15} color={tone} />
      <T variant="caption" style={{ fontFamily: fonts.semibold }}>{label}</T>
    </Row>
    <T style={{ fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 25, color: colors.ink }} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </T>
  </View>
);

const FinancialTransparencySection = ({ campaignId, isOrganizer }) => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [spentDate, setSpentDate] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTransparency = useCallback(async () => {
    try {
      const res = await API.get(`/donations/campaigns/${campaignId}/transparency`);
      if (res.data.success) setLedgerData(res.data.data);
    } catch {
      /* handled by the empty state below */
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (campaignId) fetchTransparency();
  }, [campaignId, fetchTransparency]);

  const handleAddExpense = async () => {
    if (!title || !amount || parseFloat(amount) <= 0) {
      showToast('Please provide valid title and amount in NPR', 'error');
      return;
    }
    // No native date picker in the foundation, so the date is typed as YYYY-MM-DD.
    let parsedDate;
    if (spentDate.trim()) {
      parsedDate = new Date(spentDate.trim());
      if (!/^\d{4}-\d{2}-\d{2}$/.test(spentDate.trim()) || Number.isNaN(parsedDate.getTime())) {
        showToast('Please enter the date as YYYY-MM-DD', 'error');
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await API.post(`/donations/campaigns/${campaignId}/expenses`, {
        title,
        amount: parseFloat(amount),
        spentDate: parsedDate,
        proofImages: proofUrl ? [proofUrl.trim()] : [],
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
      showToast(errorMessage(error, 'Failed to add expense'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Skeleton height={240} radius={radius.card} />;

  if (!ledgerData) {
    return (
      <Card>
        <T variant="small" style={{ textAlign: 'center' }}>We couldn't load this ledger right now. Please try again in a moment.</T>
      </Card>
    );
  }

  const { campaign, totalCollected, totalSpent, netRemainingBalance, expenses = [] } = ledgerData;
  const goalAmount = campaign?.goalAmount || 0;
  const remainingGoal = Math.max(0, goalAmount - totalCollected);
  const raisedPct = goalAmount ? Math.min(100, Math.round((totalCollected / goalAmount) * 100)) : 0;
  const spentPct = totalCollected ? Math.min(100, Math.round((totalSpent / totalCollected) * 100)) : 0;
  const canLog = isOrganizer || isAdmin;

  return (
    <Card style={{ gap: space.xl }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={styles.iconTile}>
          <ShieldCheck size={22} color={colors.pine} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="h2">Transparency ledger</T>
          <T variant="small">Every expense, with the receipt where one was attached.</T>
        </View>
      </View>

      {canLog ? (
        <Button
          title={showExpenseForm ? 'Cancel' : 'Add expense record'}
          icon={showExpenseForm ? X : Plus}
          variant={showExpenseForm ? 'ghost' : 'pine'}
          size="sm"
          style={{ alignSelf: 'flex-start' }}
          onPress={() => setShowExpenseForm(!showExpenseForm)}
        />
      ) : null}

      <View style={styles.tiles}>
        <SummaryTile icon={Target} label="Goal" value={npr(goalAmount)} tone={colors.inkSoft} />
        <SummaryTile icon={HandCoins} label="Raised" value={npr(totalCollected)} tone={colors.pine} />
        <SummaryTile icon={ArrowDownRight} label="Spent" value={npr(totalSpent)} tone={colors.brand} />
        <SummaryTile icon={Wallet} label="Balance held" value={npr(netRemainingBalance)} tone={colors.marigoldText} />
      </View>

      <View style={{ gap: space.lg }}>
        <View style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="semibold" style={{ fontSize: 14 }}>Raised of goal</T>
            <T variant="caption">{raisedPct}%{remainingGoal > 0 ? ` · ${npr(remainingGoal)} to go` : ''}</T>
          </Row>
          <ProgressBar value={raisedPct} />
        </View>
        <View style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="semibold" style={{ fontSize: 14 }}>Spent of raised</T>
            <T variant="caption">{spentPct}%</T>
          </Row>
          <ProgressBar value={spentPct} color={colors.pine} />
        </View>
      </View>

      {canLog && showExpenseForm ? (
        <View style={styles.sunken}>
          <T variant="semibold">Log a new expense</T>
          <Field label="Expense title *" value={title} onChangeText={setTitle} placeholder="e.g. 50 heavy-duty trash bags and gloves" />
          <Field
            label="Amount spent (NPR) *"
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric"
            placeholder="e.g. 4500"
          />
          <Field
            label="Receipt image URL"
            value={proofUrl}
            onChangeText={setProofUrl}
            placeholder="https://…"
            autoCapitalize="none"
            keyboardType="url"
            hint="A photo of the bill helps supporters trust the record."
          />
          <Field label="Date spent" value={spentDate} onChangeText={setSpentDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          <Field
            label="Notes / vendor details"
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Purchased from a local hardware store with VAT bill"
          />
          <Button title="Save expense record" variant="pine" loading={submitting} onPress={handleAddExpense} style={{ alignSelf: 'flex-end' }} />
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <Row gap={6}>
          <ReceiptText size={16} color={colors.pine} />
          <T variant="semibold" style={{ fontSize: 14.5, color: colors.inkSoft }}>Itemised expenses</T>
          <T variant="small">({expenses.length} {expenses.length === 1 ? 'record' : 'records'})</T>
        </Row>

        {expenses.length > 0 ? (
          <View style={styles.list}>
            {expenses.map((exp, i) => (
              <View key={exp._id} style={[styles.item, i > 0 && styles.itemBorder]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <T variant="semibold" style={{ flex: 1 }}>{exp.title}</T>
                  <T variant="semibold">{npr(exp.amount)}</T>
                </View>
                {exp.notes ? <T variant="caption">{exp.notes}</T> : null}
                <Row style={{ justifyContent: 'space-between' }}>
                  <T variant="small" style={{ color: colors.inkSoft }}>{fmtDate(exp.spentDate)}</T>
                  {exp.proofImages && exp.proofImages.length > 0 ? (
                    <Pressable onPress={() => setPreviewImage(exp.proofImages[0])} accessibilityRole="button" style={styles.receiptBtn} hitSlop={6}>
                      <Eye size={16} color={colors.sky} />
                      <T style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.sky }}>Receipt</T>
                    </Pressable>
                  ) : (
                    <T variant="small">No receipt</T>
                  )}
                </Row>
              </View>
            ))}
            <View style={[styles.item, styles.itemBorder, { backgroundColor: colors.paper, flexDirection: 'row', justifyContent: 'space-between' }]}>
              <T variant="semibold">Total spent</T>
              <T variant="bold">{npr(totalSpent)}</T>
            </View>
          </View>
        ) : (
          <View style={styles.sunken}>
            <T variant="small" style={{ textAlign: 'center' }}>
              No expenses have been logged yet. Anything spent from this campaign will appear here.
            </T>
          </View>
        )}
      </View>

      <Sheet visible={!!previewImage} onClose={() => setPreviewImage(null)} title="Receipt">
        {previewImage ? (
          <Image source={{ uri: previewImage }} style={styles.preview} contentFit="contain" accessibilityLabel="Expense receipt" />
        ) : null}
      </Sheet>
    </Card>
  );
};

const styles = StyleSheet.create({
  iconTile: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.pineTint, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.paperDeep, borderRadius: radius.md, padding: space.md, gap: 4 },
  sunken: { backgroundColor: colors.paperDeep, borderRadius: radius.md, padding: space.lg, gap: space.md },
  list: { borderWidth: 1, borderColor: colors.sand, borderRadius: 16, backgroundColor: colors.white, overflow: 'hidden' },
  item: { padding: space.lg, gap: 6 },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.sand },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36 },
  preview: { width: '100%', height: 420, borderRadius: 16, backgroundColor: colors.paperDeep },
});

export default FinancialTransparencySection;
