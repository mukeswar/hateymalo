import React, { useState } from 'react';
import { View } from 'react-native';
import { Eye, EyeOff, KeyRound } from 'lucide-react-native';
import API, { errorMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { colors, radius } from '../theme';
import { Button, Card, Field, Row, T } from './ui';

// Port of frontend/src/components/ChangePasswordCard.jsx — lets any signed-in
// member (including admins) change their own password. No props.
const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

const ChangePasswordCard = () => {
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));

  const handleSubmit = async () => {
    setError('');
    if (!form.currentPassword) return setError('Enter your current password.');
    if (form.newPassword.length < 8) return setError('New password must be at least 8 characters.');
    if (form.newPassword !== form.confirmPassword) return setError('The new passwords do not match.');

    setSaving(true);
    try {
      const res = await API.put('/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      if (res.data?.success) {
        showToast('Password updated successfully', 'success');
        setForm(EMPTY);
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not update the password. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const common = { secureTextEntry: !show, autoCapitalize: 'none', autoCorrect: false };

  return (
    <Card style={{ gap: 14 }}>
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.brandTint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <KeyRound size={18} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="h3">Account security</T>
          <T variant="small">Change your password. Use at least 8 characters that you don't use anywhere else.</T>
        </View>
      </Row>

      <Field
        label="Current password"
        value={form.currentPassword}
        onChangeText={update('currentPassword')}
        autoComplete="current-password"
        textContentType="password"
        {...common}
      />
      <Field
        label="New password"
        value={form.newPassword}
        onChangeText={update('newPassword')}
        autoComplete="new-password"
        textContentType="newPassword"
        {...common}
      />
      <Field
        label="Confirm new password"
        value={form.confirmPassword}
        onChangeText={update('confirmPassword')}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        {...common}
      />

      {error ? (
        <T
          accessibilityRole="alert"
          variant="medium"
          style={{ fontSize: 14, color: colors.brand, backgroundColor: colors.brandTint, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10 }}
        >
          {error}
        </T>
      ) : null}

      <Row gap={10} wrap>
        <Button title={saving ? 'Updating…' : 'Update password'} onPress={handleSubmit} loading={saving} />
        <Button
          title={show ? 'Hide passwords' : 'Show passwords'}
          icon={show ? EyeOff : Eye}
          variant="ghost"
          size="sm"
          onPress={() => setShow((s) => !s)}
        />
      </Row>
    </Card>
  );
};

export { ChangePasswordCard };
export default ChangePasswordCard;
