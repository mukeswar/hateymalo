import React, { useState } from 'react';
import { View } from 'react-native';
import { Flag } from 'lucide-react-native';
import API, { errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Field, Sheet, T } from './ui';
import { colors, radius, space } from '../theme';

// Port of frontend/src/components/ReportModal.jsx as a bottom sheet.
// Props: { isOpen, onClose, targetType, targetId, targetTitle }.
const TARGET_LABELS = { USER: 'member', POST: 'request', COMMENT: 'comment', BLOG: 'story' };

const ReportModal = ({ isOpen, onClose, targetType, targetId, targetTitle }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const label = TARGET_LABELS[targetType] || (targetType ? String(targetType).toLowerCase() : 'content');

  const handleSubmitReport = async () => {
    if (!user) {
      showToast('Please log in to submit safety reports', 'info');
      return;
    }
    if (!reason.trim()) {
      showToast('Please specify a report reason', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/reports', { targetType, targetId, reason: reason.trim() });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        setReason('');
        onClose?.();
      }
    } catch (error) {
      showToast(errorMessage(error, 'Report submission failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet
      visible={!!isOpen}
      onClose={onClose}
      title={`Report this ${label}`}
      footer={
        <>
          <Button title="Submit report" icon={Flag} onPress={handleSubmitReport} loading={loading} full />
          <Button title="Cancel" variant="ghost" onPress={onClose} full />
        </>
      }
    >
      <T variant="small">Our moderators review every report privately.</T>
      {targetTitle ? (
        <View style={{ backgroundColor: colors.paperDeep, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.md }}>
          <T variant="semibold" style={{ color: colors.inkSoft }} numberOfLines={1}>“{targetTitle}”</T>
        </View>
      ) : null}
      <Field
        label="What's wrong? *"
        multiline
        value={reason}
        onChangeText={setReason}
        placeholder="e.g. spam, harassment, misleading information or a suspected scam…"
        autoFocus
      />
    </Sheet>
  );
};

export default ReportModal;
