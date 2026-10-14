import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Image } from 'expo-image';
import { ImageIcon, Lightbulb, LogIn, PenLine, Send, ShieldCheck } from 'lucide-react-native';
import API, { errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { colors, fonts, radius, space } from '../theme';
import { T, Button, Card, Field, Loading, Row, Screen, Select, EmptyState } from '../components/ui';
import { BLOG_CATEGORIES } from '../components/blogs/BlogBits';

// Port of frontend/src/pages/CreateBlog.jsx (signed-in only, like the web's ProtectedRoute).

const isHttpUrl = (s) => /^https?:\/\/\S+$/i.test(s);

const goToStories = () => (router.canGoBack() ? router.back() : router.replace('/blogs'));

export default function CreateBlogScreen() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(BLOG_CATEGORIES[0]);
  const [coverImage, setCoverImage] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  if (authLoading) return <Loading />;

  if (!user) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Write a story' }} />
        <EmptyState
          icon={LogIn}
          title="Sign in to write a story"
          message="You need an account to share stories with the community."
          action="Sign in"
          onAction={() => router.push('/login')}
        />
      </Screen>
    );
  }

  // Mirrors the API: staff stories and stories written while approval is off publish immediately.
  const needsReview = !isAdmin && settings?.requireBlogApproval !== false;

  const handleSubmit = async () => {
    if (!title || !content) {
      showToast('Title and story content are required', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/blogs', {
        title,
        category,
        coverImage: coverImage || undefined,
        content,
      });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        goToStories();
      }
    } catch (error) {
      showToast(errorMessage(error, 'Blog submission failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const showPreview = isHttpUrl(coverImage) && !previewFailed;

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Write a story' }} />

      <View style={{ gap: 8 }}>
        <Row gap={6}>
          <PenLine size={15} color={colors.brand} />
          <T variant="eyebrow">Write a story ·</T>
          <T variant="eyebrowDeva">कथा लेख्नुहोस्</T>
        </Row>
        <T variant="display">Tell us what happened</T>
        <T variant="body" style={{ color: colors.muted }}>
          A volunteer day, a neighbour who helped, a lesson from the field — write it the way you'd tell a friend.
        </T>
      </View>

      <View style={[styles.note, { backgroundColor: needsReview ? colors.skyTint : colors.pineTint }]}>
        <ShieldCheck size={20} color={needsReview ? colors.sky : colors.pine} />
        {needsReview ? (
          <T variant="small" style={styles.noteText}>
            <T style={[styles.noteStrong, { color: colors.sky }]}>Reviewed before publishing. </T>
            New stories are saved as <T style={styles.noteBold}>pending</T> and appear in Stories once an administrator approves them.
          </T>
        ) : (
          <T variant="small" style={styles.noteText}>
            <T style={[styles.noteStrong, { color: colors.pine }]}>Published right away. </T>
            Your story will appear in Stories as soon as you submit it.
          </T>
        )}
      </View>

      <Card style={{ gap: space.xl }}>
        <Field
          label="Title *"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. What five weeks of cleaning the Bagmati taught me"
          inputStyle={{ fontFamily: fonts.display, fontSize: 18 }}
          returnKeyType="next"
        />

        <Select label="Category" options={BLOG_CATEGORIES} value={category} onChange={setCategory} />

        <Field
          label="Cover image link (optional)"
          value={coverImage}
          onChangeText={(v) => {
            setCoverImage(v);
            setPreviewFailed(false);
          }}
          placeholder="https://…"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          hint="Paste a link to a photo you have the right to share."
        />

        <View style={styles.preview}>
          {showPreview ? (
            <Image
              source={{ uri: coverImage }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              onError={() => setPreviewFailed(true)}
              accessibilityLabel="Cover image preview"
            />
          ) : (
            <View style={{ alignItems: 'center', gap: 8, paddingHorizontal: space.lg }}>
              <ImageIcon size={24} color={colors.muted} />
              <T variant="small" style={{ textAlign: 'center' }}>
                {previewFailed ? "We couldn't load that image — check the link." : 'Your cover image preview will appear here'}
              </T>
            </View>
          )}
        </View>

        <View style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="semibold" style={{ fontSize: 14.5 }}>Your story *</T>
            <T variant="caption" accessibilityLiveRegion="polite">
              {words} {words === 1 ? 'word' : 'words'}
            </T>
          </Row>
          <Field
            value={content}
            onChangeText={setContent}
            placeholder="Start with the moment it began…"
            multiline
            accessibilityLabel="Your story"
            inputStyle={{ minHeight: 260, lineHeight: 24 }}
          />
          <Row gap={8} style={{ alignItems: 'flex-start' }}>
            <Lightbulb size={16} color={colors.marigoldText} style={{ marginTop: 2 }} />
            <T variant="small" style={{ flex: 1 }}>
              Leave a blank line between paragraphs. Please don't share private details like phone numbers or home addresses.
            </T>
          </Row>
        </View>

        <View style={{ gap: 10, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: colors.sand }}>
          <Button
            title={loading ? 'Submitting…' : needsReview ? 'Submit for review' : 'Publish story'}
            icon={Send}
            onPress={handleSubmit}
            loading={loading}
            full
            size="lg"
          />
          <Button title="Cancel" variant="ghost" onPress={goToStories} full />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: radius.card, padding: space.lg },
  noteText: { flex: 1, color: colors.inkSoft, lineHeight: 21 },
  noteStrong: { fontFamily: fonts.semibold },
  noteBold: { fontFamily: fonts.semibold, color: colors.inkSoft },
  preview: {
    height: 150,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.sand,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
