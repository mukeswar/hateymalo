import React, { useState } from 'react';
import { View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Button, Field, Row, Sheet, T } from './ui';
import { colors, radius, space } from '../theme';

// Port of frontend/src/components/RejectionModal.jsx as a bottom sheet.
// Props: { isOpen, onClose, onConfirm(reason), postTitle }.
const RejectionModal = ({ isOpen, onClose, onConfirm, postTitle }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    // The web form marks the reason as required.
    if (!reason.trim()) {
      setError('Please give the author a reason.');
      return;
    }
    setError('');
    onConfirm?.(reason);
    setReason('');
  };

  return (
    <Sheet
      visible={!!isOpen}
      onClose={onClose}
      title="Reject post"
      footer={
        <>
          <Button title="Confirm rejection" onPress={handleSubmit} full />
          <Button title="Cancel" variant="ghost" onPress={onClose} full />
        </>
      }
    >
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={20} color={colors.brand} />
        </View>
        <T variant="small" style={{ flex: 1 }}>Your feedback is sent to the author so they can improve it.</T>
      </Row>
      <View style={{ gap: 6 }}>
        <T variant="semibold" style={{ fontSize: 14.5 }}>Post title</T>
        <View style={{ backgroundColor: colors.paperDeep, borderRadius: radius.sm, padding: space.md }}>
          <T variant="medium">“{postTitle}”</T>
        </View>
      </View>
      <Field
        label="Rejection reason *"
        multiline
        value={reason}
        onChangeText={(v) => {
          setReason(v);
          if (error) setError('');
        }}
        placeholder="e.g., Please provide more details regarding safety measures, or this content contains commercial advertisement."
        hint="Be specific and kind — the author will read this."
        error={error}
        autoFocus
      />
    </Sheet>
  );
};

export default RejectionModal;
