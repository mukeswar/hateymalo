import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import API, { errorMessage } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Button, Field, Loading, Select, Sheet, T } from '../ui';
import { InKindEditor, MultiChips, RESOURCE_TYPES, cleanInKind, idOf, priceText, toInt } from './SponsorBits';

// Edit a proposal while it is still open (PUT /deals/:id/sponsor UPDATE_PROPOSAL).
const CUSTOM = '__custom__';

export default function SponsorProposalSheet({ visible, onClose, deal, onSaved }) {
  const { showToast } = useToast();
  const [tiers, setTiers] = useState(null);
  const [tierId, setTierId] = useState(CUSTOM);
  const [types, setTypes] = useState([]);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [inKind, setInKind] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !deal) return;
    setTierId(idOf(deal.tier) || CUSTOM);
    setTypes(deal.proposal?.contributionTypes || []);
    setAmount(deal.proposal?.amount ? String(deal.proposal.amount) : '');
    setMessage(deal.proposal?.message || '');
    setInKind(
      (deal.inKindItems || [])
        .filter((i) => i.status !== 'CANCELLED')
        .map((i) => ({
          type: i.type,
          description: i.description,
          quantity: i.quantity ? String(i.quantity) : '',
          unit: i.unit || '',
          estimatedValue: i.estimatedValue ? String(i.estimatedValue) : '',
          valuationMethod: i.valuationMethod === 'NOT_VALUED' || i.valuationMethod === 'STAFF_ESTIMATE' ? 'SPONSOR_DECLARED' : i.valuationMethod,
        })),
    );
    setTiers(null);
    const oppId = idOf(deal.opportunity);
    API.get(`/sponsorship/opportunities/${oppId}`)
      .then((res) => setTiers(res.data?.data?.tiers || []))
      .catch(() => setTiers([]));
  }, [visible, deal]);

  const save = async () => {
    if (tierId === CUSTOM && !message.trim()) return showToast('Describe what you would like to contribute', 'error');
    setSaving(true);
    try {
      const res = await API.put(`/sponsorship/deals/${deal._id}/sponsor`, {
        action: 'UPDATE_PROPOSAL',
        message: message.trim(),
        amount: toInt(amount),
        contributionTypes: types,
        inKindItems: cleanInKind(inKind),
        tier: tierId === CUSTOM ? null : tierId,
      });
      showToast('Proposal updated', 'success');
      onSaved?.(res.data?.data);
      onClose();
    } catch (err) {
      showToast(errorMessage(err, 'Could not update the proposal'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const currentTierId = idOf(deal?.tier);
  const tierOptions = [
    ...(tiers || [])
      .filter((t) => t.slotsLeft !== 0 || t._id === currentTierId)
      .map((t) => ({ value: t._id, label: `${t.name} · ${priceText(t)}` })),
    { value: CUSTOM, label: 'Custom package' },
  ];

  return (
    <Sheet visible={visible} onClose={onClose} title="Edit proposal" footer={<Button title="Save proposal" full size="lg" loading={saving} onPress={save} />}>
      <T variant="small">The team is notified when you change your proposal.</T>
      {tiers === null ? <Loading style={{ minHeight: 60 }} /> : <Select label="Package" options={tierOptions} value={tierId} onChange={setTierId} />}
      <MultiChips label="Contribution types" options={RESOURCE_TYPES} values={types} onChange={setTypes} />
      <Field
        label="Cash amount (NPR)"
        value={amount}
        onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        hint="Projected only until the team agrees the terms."
      />
      <InKindEditor items={inKind} onChange={setInKind} />
      <View>
        <Field label="Message" value={message} onChangeText={setMessage} multiline maxLength={4000} />
      </View>
    </Sheet>
  );
}

