import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errorMessage } from '../lib/api';
import { colors } from '../theme';
import { Button, Divider, Field, Row, Screen, T } from '../components/ui';
import { FormError, PasswordToggle } from '../components/account/FormBits';

const STAFF = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'];

// Port of frontend/src/pages/Login.jsx (presented as a modal).
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const { login } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async () => {
    setFormError('');
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setFormError('Please enter your email and password.');
      showToast('Please enter your email and password.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await login(cleanEmail, password);
      if (!res?.success) throw new Error(res?.message || 'Invalid email or password. Please try again.');
      showToast('Welcome back to HATEYMALO!', 'success');
      // Staff land in the command center (like the website); members return to where they were.
      if (STAFF.includes(res.data?.role)) router.replace('/admin');
      else if (router.canGoBack()) router.back();
      else router.replace('/dashboard');
    } catch (error) {
      const msg = errorMessage(error, error?.response ? 'Invalid email or password. Please try again.' : error?.message);
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentStyle={{ paddingTop: 24 }}>
      <View style={{ gap: 6 }}>
        <T variant="eyebrowDeva">फेरि स्वागत छ</T>
        <T variant="display">Welcome back</T>
        <T variant="body" style={{ color: colors.muted }}>
          Log in to see your requests, the drives you've joined and new activity.
        </T>
      </View>

      <FormError message={formError} />

      <Field
        label="Email address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        right={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />}
      />

      <Button
        title={loading ? 'Logging in…' : 'Log in'}
        iconRight={loading ? undefined : ArrowRight}
        size="lg"
        full
        loading={loading}
        onPress={handleSubmit}
      />

      <Divider style={{ marginTop: 8 }} />
      <Row gap={6} wrap>
        <T variant="body">New to Hateymalo?</T>
        <T
          variant="semibold"
          style={{ color: colors.brand }}
          accessibilityRole="link"
          onPress={() => router.replace('/register')}
        >
          Create an account
        </T>
      </Row>

      <View style={{ marginTop: 12, gap: 2 }}>
        <T variant="h3" style={{ color: colors.brand }}>मद्दत मागौँ। सहयोग गरौँ। सँगै परिवर्तन ल्याऔँ।</T>
        <T variant="small">Ask for help. Offer help. Change things together.</T>
      </View>
    </Screen>
  );
}
