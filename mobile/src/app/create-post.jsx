import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Info, LogIn, PlusCircle, ShieldCheck } from 'lucide-react-native';
import API, { errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { Button, Card, Divider, EmptyState, Field, Loading, Row, Screen, Select, T } from '../components/ui';
import { colors, fonts, radius, space } from '../theme';

// Port of frontend/src/pages/CreatePost.jsx — same payload to POST /posts.
const FALLBACK_CATEGORIES = [
  'Help Request',
  'Education Support',
  'Assignment Guidance',
  'Writing Support',
  'Cleaning Campaign',
  'Street Cleaning',
  'Tree Plantation',
  'Social Help',
  'Community Activity',
  'Awareness Campaign',
  'Project Collaboration',
  'Other',
];

const StepHeading = ({ n, title, hint }) => (
  <Row gap={12} style={{ alignItems: 'flex-start' }}>
    <View style={styles.stepNum}>
      <T style={{ fontFamily: fonts.displayBold, fontSize: 16, color: colors.brand }}>{n}</T>
    </View>
    <View style={{ flex: 1 }}>
      <T variant="h2">{title}</T>
      {hint ? <T variant="small">{hint}</T> : null}
    </View>
  </Row>
);

// "YYYY-MM-DD" or "YYYY-MM-DD HH:MM" (local time) → Date; '' → undefined; bad → null.
const parseDateTime = (s) => {
  const v = s.trim();
  if (!v) return undefined;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0));
  return Number.isNaN(d.getTime()) ? null : d;
};

export default function CreatePostScreen() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { settings } = useSettings();
  // Mirrors the backend: member posts go to the moderation queue unless the
  // Super Admin has turned "Require post approval" off.
  const needsApproval = settings ? settings.requirePostApproval !== false : true;

  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(FALLBACK_CATEGORIES[0]);
  const [location, setLocation] = useState('Kathmandu, Nepal');
  const [imageUrl, setImageUrl] = useState('');
  const [requiredMembers, setRequiredMembers] = useState('5');
  const [dateTime, setDateTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [errors, setErrors] = useState({});

  // Load only ACTIVE admin-managed categories so deactivated ones can't be selected.
  useEffect(() => {
    (async () => {
      try {
        const res = await API.get('/categories?activeOnly=true');
        if (res.data.success && res.data.data.length > 0) {
          const names = res.data.data.map((c) => c.name);
          setCategories(names);
          setCategory(names[0]);
        }
      } catch {
        /* keep fallback list */
      }
    })();
  }, []);

  useEffect(() => {
    setPreviewFailed(false);
  }, [imageUrl]);

  if (authLoading) return <Screen><Loading /></Screen>;
  if (!user) {
    return (
      <Screen>
        <EmptyState
          icon={LogIn}
          title="Sign in to ask for help"
          message="You need an account to post a help request."
          action="Sign in"
          onAction={() => router.push('/login')}
        />
      </Screen>
    );
  }

  const showPreview = /^https?:\/\/\S+$/i.test(imageUrl.trim()) && !previewFailed;

  const handleSubmit = async () => {
    const nextErrors = {};
    if (!title.trim()) nextErrors.title = 'Title is required';
    if (!description.trim()) nextErrors.description = 'Description is required';
    if (!location.trim()) nextErrors.location = 'Location is required';
    const when = parseDateTime(dateTime);
    if (when === null) nextErrors.dateTime = 'Use YYYY-MM-DD HH:MM, e.g. 2026-11-02 07:30';
    setErrors(nextErrors);
    if (!title || !description || !category || !location) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    if (nextErrors.dateTime) {
      showToast(nextErrors.dateTime, 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/posts', {
        title,
        description,
        category,
        location,
        images: imageUrl ? [imageUrl] : undefined,
        requiredMembers: parseInt(requiredMembers, 10) || 1,
        dateTime: when,
      });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        router.replace('/dashboard');
      }
    } catch (error) {
      // Covers the daily post limit and prohibited-word messages from the server.
      showToast(errorMessage(error, 'Failed to create post'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Row gap={6}>
          <PlusCircle size={14} color={colors.brand} />
          <T variant="eyebrow">New request</T>
          <T variant="eyebrowDeva" style={{ color: colors.inkSoft }}>· सहयोग माग्नुहोस्</T>
        </Row>
        <T variant="display">Ask the community for a hand</T>
        <T style={{ color: colors.muted }}>
          Share what you need or the drive you're organising. A clear title, a place and a little context help people say yes.
        </T>
      </View>

      {needsApproval ? (
        <View style={styles.notice}>
          <ShieldCheck size={20} color={colors.sky} />
          <T variant="small" style={{ flex: 1, color: colors.inkSoft }}>
            <T style={{ fontFamily: fonts.semibold, color: colors.ink, fontSize: 14 }}>A moderator reviews every request first.</T>{' '}
            Your post will show as pending until it's approved — this keeps the platform safe and free of spam.
          </T>
        </View>
      ) : null}

      <Card style={{ gap: space.xl }}>
        <View style={{ gap: space.lg }}>
          <StepHeading n={1} title="What do you need?" hint="Lead with the action, e.g. who, what and when." />
          <Field
            label="Title *"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Bagmati riverbank clean-up this Saturday"
            error={errors.title}
          />
          <View style={{ gap: 6 }}>
            <Select label="Cause *" options={categories} value={category} onChange={setCategory} />
            <T variant="small">Helps people who care about this cause find your request.</T>
          </View>
          <Field
            label="Description *"
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="The background, what helpers will do, anything to bring, and where to meet…"
            hint="Tip: mention any tools, skills or timing helpers should know about."
            error={errors.description}
            inputStyle={{ minHeight: 140 }}
          />
        </View>

        <Divider />

        <View style={{ gap: space.lg }}>
          <StepHeading n={2} title="Where, when and how many?" />
          <Field
            label="Location *"
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Patan Durbar Square, Lalitpur"
            error={errors.location}
          />
          <Field
            label="Helpers needed"
            value={String(requiredMembers)}
            onChangeText={(v) => setRequiredMembers(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />
          <Field
            label="Date & time"
            value={dateTime}
            onChangeText={setDateTime}
            placeholder="YYYY-MM-DD HH:MM"
            autoCapitalize="none"
            hint="Optional — leave blank if it's flexible."
            error={errors.dateTime}
          />
        </View>

        <Divider />

        <View style={{ gap: space.lg }}>
          <StepHeading n={3} title="Add a photo" hint="Optional, but a real photo of the place or need helps a lot." />
          <Field
            label="Image URL"
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://…"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {imageUrl.trim() ? (
            <View style={styles.preview}>
              {showPreview ? (
                <Image
                  source={{ uri: imageUrl.trim() }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  onError={() => setPreviewFailed(true)}
                  accessibilityLabel="Preview of your photo"
                />
              ) : (
                <Row style={{ paddingHorizontal: space.xl }}>
                  <Info size={16} color={colors.muted} />
                  <T variant="small" style={{ flex: 1 }}>We can't preview this link yet. Check it's a direct link to an image.</T>
                </Row>
              )}
            </View>
          ) : null}
        </View>

        <Divider />

        <View style={{ gap: 10 }}>
          <Button
            title={needsApproval ? 'Submit for review' : 'Publish request'}
            size="lg"
            full
            loading={loading}
            onPress={handleSubmit}
          />
          <Button title="Cancel" variant="ghost" full onPress={() => (router.canGoBack() ? router.back() : router.replace('/dashboard'))} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepNum: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.skyTint, borderRadius: radius.card, padding: space.lg },
  preview: {
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
