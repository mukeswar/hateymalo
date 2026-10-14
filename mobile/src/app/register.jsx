import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, Ban } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { errorMessage } from '../lib/api';
import { colors, radius } from '../theme';
import { Button, Divider, Field, Row, Screen, T } from '../components/ui';
import { FormError, PasswordToggle } from '../components/account/FormBits';

// Port of frontend/src/pages/Register.jsx (presented as a modal).
export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profilePicture, setProfilePicture] = useState('');
  const [location, setLocation] = useState('Kathmandu, Nepal');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [interests, setInterests] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const { register } = useAuth();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const registrationsClosed = !!settings && settings.allowRegistrations === false;

  const fail = (msg) => {
    setFormError(msg);
    showToast(msg, 'error');
  };

  const handleSubmit = async () => {
    setFormError('');
    if (registrationsClosed) {
      fail('Registration is currently disabled by the administrators.');
      return;
    }
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      fail('Please fill required fields (Name, Email, Password)');
      return;
    }
    if (password.length < 6) {
      fail('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name: cleanName,
        email: cleanEmail,
        password,
        profilePicture: profilePicture.trim() || undefined,
        location: location.trim(),
        bio: bio.trim(),
        skills: skills.trim(),
        interests: interests.trim(),
      });
      if (!res?.success) throw new Error(res?.message || 'Registration failed. Please check inputs.');
      showToast('Account created successfully! Welcome to HATEYMALO.', 'success');
      if (router.canGoBack()) router.back();
      else router.replace('/dashboard');
    } catch (error) {
      fail(errorMessage(error, error?.response ? 'Registration failed. Please check inputs.' : error?.message));
    } finally {
      setLoading(false);
    }
  };

  const editable = !registrationsClosed && !loading;

  return (
    <Screen contentStyle={{ paddingTop: 24 }}>
      <View style={{ gap: 6 }}>
        <T variant="eyebrowDeva">हातेमालोमा स्वागत छ</T>
        <T variant="display">Join the community</T>
        <T variant="body" style={{ color: colors.muted }}>
          Create a free account to ask for help, offer your time, and join drives near you.
        </T>
      </View>

      {registrationsClosed ? (
        <View
          accessibilityRole="text"
          style={{
            flexDirection: 'row',
            gap: 12,
            backgroundColor: colors.marigoldTint,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: '#F2D3A0',
            padding: 14,
          }}
        >
          <Ban size={20} color={colors.marigoldText} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <T variant="semibold">Registration is currently closed</T>
            <T variant="small" style={{ color: colors.inkSoft, marginTop: 2 }}>
              New sign-ups have been paused by the administrators. Please check back later.
            </T>
          </View>
        </View>
      ) : null}

      <View style={{ gap: 16, opacity: registrationsClosed ? 0.5 : 1 }} pointerEvents={registrationsClosed ? 'none' : 'auto'}>
        <FormError message={formError} />

        <T variant="h3">Your account</T>
        <Field
          label="Full name *"
          value={name}
          onChangeText={setName}
          placeholder="Your full name"
          autoComplete="name"
          textContentType="name"
          editable={editable}
        />
        <Field
          label="Email address *"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          editable={editable}
        />
        <Field
          label="Password *"
          value={password}
          onChangeText={setPassword}
          placeholder="Choose a password"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          hint="At least 6 characters."
          editable={editable}
          right={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />}
        />

        <Divider style={{ marginTop: 4 }} />
        <View>
          <T variant="h3">About you</T>
          <T variant="small">Optional — you can fill these in later from your profile.</T>
        </View>
        <Field
          label="Location"
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Lalitpur, Nepal"
          editable={editable}
        />
        <Field
          label="Profile photo URL"
          value={profilePicture}
          onChangeText={setProfilePicture}
          placeholder="https://…"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
        />
        <Field
          label="Bio"
          multiline
          value={bio}
          onChangeText={setBio}
          placeholder="A few lines about yourself and how you'd like to help."
          editable={editable}
        />
        <Field
          label="Skills"
          value={skills}
          onChangeText={setSkills}
          placeholder="e.g. Teaching, First aid"
          hint="Separate with commas."
          editable={editable}
        />
        <Field
          label="Causes you care about"
          value={interests}
          onChangeText={setInterests}
          placeholder="e.g. Plantation, Youth tutoring"
          hint="Separate with commas."
          editable={editable}
        />

        <Button
          title={loading ? 'Creating your account…' : 'Create account'}
          iconRight={loading ? undefined : ArrowRight}
          size="lg"
          full
          loading={loading}
          disabled={registrationsClosed}
          onPress={handleSubmit}
        />
      </View>

      <Divider style={{ marginTop: 8 }} />
      <Row gap={6} wrap>
        <T variant="body">Already a member?</T>
        <T variant="semibold" style={{ color: colors.brand }} accessibilityRole="link" onPress={() => router.replace('/login')}>
          Log in
        </T>
      </Row>

      <View style={{ marginTop: 12, gap: 2 }}>
        <T variant="h3" style={{ color: colors.brand }}>हातेमालो — हात मिलाऔँ।</T>
        <T variant="small">Neighbours helping neighbours, hand in hand.</T>
      </View>
    </Screen>
  );
}
