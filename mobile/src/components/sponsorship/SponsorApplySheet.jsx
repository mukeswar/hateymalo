import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, Building2, Check, Info, Plus } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { formatNPR } from '../../lib/format';
import { colors, fonts, radius } from '../../theme';
import { Button, Field, Loading, Row, Select, Sheet, T } from '../ui';
import {
  ACCOUNT_TYPES,
  InKindEditor,
  InfoNote,
  MultiChips,
  RESOURCE_TYPES,
  SponsorLogo,
  UrlImageField,
  VerificationChip,
  cleanInKind,
  isHttpUrl,
  priceText,
  toInt,
} from './SponsorBits';

// "Apply to sponsor" form: POST /sponsorship/opportunities/:id/apply.
const CUSTOM = '__custom__';

const OptionRow = ({ selected, onPress, disabled, children, label }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="radio"
    accessibilityState={{ selected, disabled }}
    accessibilityLabel={label}
    style={({ pressed }) => ({
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: radius.md,
      borderWidth: selected ? 2 : 1,
      borderColor: selected ? colors.brand : colors.sand,
      backgroundColor: disabled ? colors.paperDeep : pressed ? colors.paperDeep : colors.white,
      opacity: disabled ? 0.6 : 1,
    })}
  >
    <View style={{ flex: 1, gap: 2 }}>{children}</View>
    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? colors.brand : colors.sand, backgroundColor: selected ? colors.brand : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {selected ? <Check size={13} color={colors.white} /> : null}
    </View>
  </Pressable>
);

export default function SponsorApplySheet({ visible, onClose, opp, initialTier = null }) {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState(null);
  const [accountId, setAccountId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newAcc, setNewAcc] = useState({ name: '', type: 'COMPANY', logo: '' });
  const [savingAcc, setSavingAcc] = useState(false);

  const [tierId, setTierId] = useState(CUSTOM);
  const [types, setTypes] = useState([]);
  const [amount, setAmount] = useState('');
  const [inKind, setInKind] = useState([]);
  const [message, setMessage] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingDeal, setExistingDeal] = useState(null);

  const tiers = opp?.tiers || [];
  const eligible = (accounts || []).filter((a) => ['OWNER', 'EDITOR'].includes(a.myRole) && a.verificationStatus !== 'REJECTED');
  const account = eligible.find((a) => a._id === accountId) || null;
  const tier = tiers.find((t) => t._id === tierId) || null;

  const loadAccounts = useCallback(async () => {
    try {
      const res = await API.get('/sponsorship/accounts/mine');
      const list = res.data?.data || [];
      setAccounts(list);
      const ok = list.filter((a) => ['OWNER', 'EDITOR'].includes(a.myRole) && a.verificationStatus !== 'REJECTED');
      setAccountId((cur) => (cur && ok.some((a) => a._id === cur) ? cur : ok[0]?._id || null));
      setCreating(ok.length === 0);
    } catch (err) {
      setAccounts([]);
      showToast(errorMessage(err, 'Could not load your sponsor accounts'), 'error');
    }
  }, [showToast]);

  useEffect(() => {
    if (!visible) return;
    setExistingDeal(null);
    const preset = initialTier && tiers.some((t) => t._id === initialTier && !(t.slotsLeft === 0)) ? initialTier : CUSTOM;
    setTierId(preset);
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialTier]);

  // Default the logo to the chosen account's first logo.
  useEffect(() => {
    if (account) setLogoUrl(account.logos?.[0]?.url || '');
  }, [account?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const createAccount = async () => {
    if (!newAcc.name.trim()) return showToast('Organisation name is required', 'error');
    if (newAcc.logo && !isHttpUrl(newAcc.logo)) return showToast('Logo must be an http(s) image link', 'error');
    setSavingAcc(true);
    try {
      const res = await API.post('/sponsorship/accounts', {
        name: newAcc.name.trim(),
        type: newAcc.type,
        logos: newAcc.logo ? [{ label: 'Primary', url: newAcc.logo.trim(), background: 'ANY' }] : [],
      });
      const acc = res.data?.data;
      showToast(res.data?.message || 'Sponsor account created', 'success');
      setAccounts((prev) => [acc, ...(prev || [])]);
      setAccountId(acc?._id);
      setCreating(false);
      setNewAcc({ name: '', type: 'COMPANY', logo: '' });
    } catch (err) {
      showToast(errorMessage(err, 'Could not create the sponsor account'), 'error');
    } finally {
      setSavingAcc(false);
    }
  };

  const submit = async () => {
    if (!account) return showToast('Choose which sponsor account is applying', 'error');
    if (!tier && !message.trim()) return showToast('Describe what you would like to contribute', 'error');
    if (logoUrl && !isHttpUrl(logoUrl)) return showToast('Logo must be an http(s) image link', 'error');
    const body = {
      sponsorAccount: account._id,
      isCustomQuote: !tier,
      message: message.trim(),
      contributionTypes: types,
      inKindItems: cleanInKind(inKind),
    };
    if (tier) body.tier = tier._id;
    if (String(amount).trim()) body.amount = toInt(amount);
    if (logoUrl.trim()) body.logoUrl = logoUrl.trim();
    setSubmitting(true);
    try {
      const res = await API.post(`/sponsorship/opportunities/${opp._id}/apply`, body);
      showToast(res.data?.message || 'Proposal sent', 'success');
      onClose();
      router.push(`/sponsor/portal/deal/${res.data?.data?._id}`);
    } catch (err) {
      const dealId = err?.response?.status === 409 ? err.response.data?.dealId : null;
      if (dealId) setExistingDeal(dealId);
      showToast(errorMessage(err, 'Could not send your proposal'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const footer = existingDeal ? (
    <Button
      title="Open your existing proposal"
      iconRight={ArrowRight}
      variant="pine"
      full
      size="lg"
      onPress={() => { onClose(); router.push(`/sponsor/portal/deal/${existingDeal}`); }}
    />
  ) : (
    <Button title="Send proposal" full size="lg" loading={submitting} disabled={!account || creating} onPress={submit} />
  );

  return (
    <Sheet visible={visible} onClose={onClose} title="Sponsor this campaign" footer={footer}>
      <T variant="small">
        {opp?.title ? `Applying to “${opp.title}”. ` : ''}Nothing is binding until the Hateymalo team agrees the terms with you.
      </T>

      {existingDeal ? (
        <InfoNote icon={Info} tone="sky">This sponsor account already has an active proposal for this campaign. Open it to continue the conversation.</InfoNote>
      ) : null}

      {/* 1. Sponsor account */}
      <View style={{ gap: 10 }}>
        <T variant="h3">1 · Who is sponsoring?</T>
        {accounts === null ? (
          <Loading style={{ minHeight: 80 }} />
        ) : (
          <>
            {eligible.map((a) => (
              <OptionRow key={a._id} selected={!creating && a._id === accountId} onPress={() => { setAccountId(a._id); setCreating(false); }} label={a.name}>
                <Row gap={10}>
                  <SponsorLogo uri={a.logos?.[0]?.url} name={a.name} size={32} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <T variant="semibold" numberOfLines={1}>{a.name}</T>
                    <VerificationChip status={a.verificationStatus} />
                  </View>
                </Row>
              </OptionRow>
            ))}
            {(accounts || []).length > eligible.length ? (
              <T variant="caption">Accounts where you are a viewer, or that were not approved, cannot apply.</T>
            ) : null}
            {creating ? (
              <View style={{ gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.sand, backgroundColor: colors.white }}>
                <Row gap={8}>
                  <Building2 size={18} color={colors.pine} />
                  <T variant="semibold">New sponsor account</T>
                </Row>
                <Field label="Organisation name" value={newAcc.name} onChangeText={(v) => setNewAcc((s) => ({ ...s, name: v }))} maxLength={140} />
                <Select options={ACCOUNT_TYPES} value={newAcc.type} onChange={(v) => setNewAcc((s) => ({ ...s, type: v }))} />
                <UrlImageField label="Logo link (optional)" value={newAcc.logo} onChangeText={(v) => setNewAcc((s) => ({ ...s, logo: v }))} />
                <T variant="caption">You can add PAN, contacts and more logos later in the sponsor portal.</T>
                <Row gap={8}>
                  {eligible.length ? <Button title="Cancel" variant="ghost" size="sm" onPress={() => setCreating(false)} style={{ flex: 1 }} /> : null}
                  <Button title="Create account" variant="pine" size="sm" loading={savingAcc} onPress={createAccount} style={{ flex: 1 }} />
                </Row>
              </View>
            ) : (
              <Button title="Use a new sponsor account" icon={Plus} variant="ghost" size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => setCreating(true)} />
            )}
          </>
        )}
      </View>

      {/* 2. Package */}
      <View style={{ gap: 10 }}>
        <T variant="h3">2 · Choose a package</T>
        {tiers.map((t) => {
          const soldOut = t.slotsLeft === 0;
          return (
            <OptionRow key={t._id} selected={tierId === t._id} disabled={soldOut} onPress={() => setTierId(t._id)} label={`${t.name}, ${priceText(t)}${soldOut ? ', sold out' : ''}`}>
              <T variant="semibold">{t.name}</T>
              <T style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.pine }}>{priceText(t)}</T>
              <T variant="caption">{soldOut ? 'Sold out' : t.slotsLeft === null ? 'Open to several sponsors' : `${t.slotsLeft} ${t.slotsLeft === 1 ? 'slot' : 'slots'} left`}</T>
            </OptionRow>
          );
        })}
        <OptionRow selected={tierId === CUSTOM} onPress={() => setTierId(CUSTOM)} label="Custom package">
          <T variant="semibold">Custom package</T>
          <T variant="caption">Propose your own mix of cash, goods or services.</T>
        </OptionRow>
      </View>

      {/* 3. Contribution */}
      <View style={{ gap: 12 }}>
        <T variant="h3">3 · Your contribution</T>
        <MultiChips label="What can you contribute?" options={RESOURCE_TYPES} values={types} onChange={setTypes} />
        <Field
          label="Cash amount (NPR, optional)"
          value={amount}
          onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          placeholder={tier?.price ? String(tier.price) : 'e.g. 50000'}
          hint={tier?.price ? `Leave empty to propose the package price (${formatNPR(tier.price)}).` : 'Whole rupees. Projected only until agreed.'}
        />
        <InKindEditor items={inKind} onChange={setInKind} />
        <Field
          label={tier ? 'Message (optional)' : 'Message'}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={4000}
          placeholder="Tell the team what you'd like to offer and any conditions."
          hint={tier ? undefined : 'Required for a custom package.'}
        />
      </View>

      {/* 4. Logo */}
      {account ? (
        <View style={{ gap: 10 }}>
          <T variant="h3">4 · Logo (optional)</T>
          <T variant="small">The logo you would like used. It only appears publicly after you approve it on the deal.</T>
          {account.logos?.length ? (
            <Row gap={8} wrap>
              {account.logos.map((l) => {
                const on = logoUrl === l.url;
                return (
                  <Pressable
                    key={l._id || l.url}
                    onPress={() => setLogoUrl(l.url)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={l.label}
                    style={{ borderRadius: 14, borderWidth: 2, borderColor: on ? colors.brand : 'transparent', padding: 2 }}
                  >
                    <SponsorLogo uri={l.url} name={account.name} size={40} />
                  </Pressable>
                );
              })}
            </Row>
          ) : null}
          <UrlImageField label="Logo link" value={logoUrl} onChangeText={setLogoUrl} />
        </View>
      ) : null}
    </Sheet>
  );
}

