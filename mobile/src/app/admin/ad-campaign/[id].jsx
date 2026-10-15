import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useToast } from '../../../context/ToastContext';
import CampaignDetail from '../../../components/ads/CampaignDetail';

// Staff view of one ad campaign (web: SuperAdminDashboard "ads" tab → campaign drawer).
// Opened from admin/ads (also via /admin?tab=ads&campaign=<id> notification links).
// Reviewers approve / reject (per creative too) and pause / resume with a note;
// ad managers can edit and set a custom flat price or rate.
export default function AdminAdCampaign() {
  const { id } = useLocalSearchParams();
  const { showToast } = useToast();
  return <CampaignDetail id={typeof id === 'string' ? id : ''} mode="staff" showToast={showToast} />;
}
