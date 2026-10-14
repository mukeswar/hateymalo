import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Award, Heart, Link2, MapPin, RotateCcw } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errorMessage } from '../lib/api';
import { colors, radius } from '../theme';
import { Avatar, Button, Field, Row, Sheet, T } from './ui';

// Port of frontend/src/components/EditProfileModal.jsx as a bottom sheet.
// Props: { isOpen, onClose }. Photos are image links (the app has no file upload).
const EditProfileModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [interests, setInterests] = useState('');
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setProfilePicture(user.profilePicture || '');
      setLocation(user.location || '');
      setBio(user.bio || '');
      setSkills(user.skills ? user.skills.join(', ') : '');
      setInterests(user.interests ? user.interests.join(', ') : '');
      setNameError('');
    }
  }, [user, isOpen]);

  if (!user) return null;

  const close = () => { if (!loading) onClose?.(); };

  const handleSubmit = async () => {
    if (!name.trim()) { setNameError('Full name is required.'); return; }
    setNameError('');
    setLoading(true);
    try {
      await updateProfile({ name, profilePicture, location, bio, skills, interests });
      showToast('Profile updated successfully!', 'success');
      onClose?.();
    } catch (error) {
      showToast(errorMessage(error, 'Failed to update profile'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // A photo uploaded on the website is stored as a data: URL — keep it, but don't dump it in the field.
  const isDataUrl = profilePicture.startsWith('data:');

  return (
    <Sheet
      visible={!!isOpen}
      onClose={close}
      title="Edit your profile"
      footer={
        <Row gap={10}>
          <Button title="Cancel" variant="ghost" onPress={close} style={{ flex: 1 }} />
          <Button title={loading ? 'Saving…' : 'Save changes'} onPress={handleSubmit} loading={loading} style={{ flex: 1 }} />
        </Row>
      }
    >
      <T variant="small" style={{ marginTop: -8 }}>This is what other members see on your public profile.</T>

      <View style={{ backgroundColor: colors.paperDeep, borderRadius: radius.card, padding: 16, gap: 12, alignItems: 'center' }}>
        <Avatar name={name || user.name} src={profilePicture} size="xl" />
        <T variant="semibold" style={{ fontSize: 14.5 }}>Profile photo</T>
        <Field
          style={{ alignSelf: 'stretch' }}
          value={isDataUrl ? '' : profilePicture}
          onChangeText={setProfilePicture}
          placeholder={isDataUrl ? 'Uploaded photo selected' : 'https://…'}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Image URL"
          hint="Paste a link to an image (PNG, JPG or WebP)."
          right={<Link2 size={16} color={colors.muted} />}
        />
        {profilePicture ? (
          <Button title="Remove photo" icon={RotateCcw} variant="ghost" size="sm" onPress={() => setProfilePicture('')} />
        ) : null}
      </View>

      <Field
        label="Full name *"
        value={name}
        onChangeText={setName}
        autoComplete="name"
        textContentType="name"
        error={nameError}
      />

      <View style={{ gap: 6 }}>
        <Row gap={6}>
          <MapPin size={15} color={colors.muted} />
          <T variant="semibold" style={{ fontSize: 14.5 }}>Location / district</T>
        </Row>
        <Field value={location} onChangeText={setLocation} placeholder="e.g. Kathmandu, Nepal" accessibilityLabel="Location / district" />
      </View>

      <Field
        label="About you"
        multiline
        value={bio}
        onChangeText={setBio}
        placeholder="A few lines about yourself and how you like to help."
      />

      <View style={{ gap: 6 }}>
        <Row gap={6}>
          <Award size={15} color={colors.pine} />
          <T variant="semibold" style={{ fontSize: 14.5 }}>Skills</T>
        </Row>
        <Field
          value={skills}
          onChangeText={setSkills}
          placeholder="e.g. First aid, Teaching, Cooking"
          hint="Separate each skill with a comma."
          accessibilityLabel="Skills"
        />
      </View>

      <View style={{ gap: 6 }}>
        <Row gap={6}>
          <Heart size={15} color={colors.brand} />
          <T variant="semibold" style={{ fontSize: 14.5 }}>Causes you care about</T>
        </Row>
        <Field
          value={interests}
          onChangeText={setInterests}
          placeholder="e.g. Tree plantation, Blood donation, Youth mentoring"
          hint="Separate with commas. Helps match you with help requests near you."
          accessibilityLabel="Causes you care about"
        />
      </View>
    </Sheet>
  );
};

export { EditProfileModal };
export default EditProfileModal;
