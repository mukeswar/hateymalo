import React from 'react';
import { Redirect, Stack, useSegments } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { EmptyState, Loading, Screen } from '../../components/ui';
import { ADMIN_GROUPS, canAccessSection, findSection } from '../../lib/adminAccess';
import { stackScreenOptions } from '../../lib/navigation';

// Staff-only area (ProtectedAdminRoute on the web). Each section screen is also
// checked against its permission so a deep link can't open a forbidden section;
// the server enforces the same rules regardless.
export default function AdminLayout() {
  const auth = useAuth();
  const segments = useSegments();

  if (auth.loading) return <Loading />;
  if (!auth.user) return <Redirect href="/login" />;
  if (!auth.isAdmin) return <Redirect href="/dashboard" />;

  const sectionId = segments[1];
  const section = sectionId ? findSection(sectionId) : null;
  if (section && !canAccessSection(section.need, auth)) {
    return (
      <Screen edges={['top', 'bottom']}>
        <EmptyState icon={ShieldAlert} title="No access" message={`Your role does not include ${section.label}. Ask a Super Admin to grant it.`} />
      </Screen>
    );
  }

  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Admin' }} />
      {ADMIN_GROUPS.flatMap((g) => g.items).map((item) => (
        <Stack.Screen key={item.id} name={item.id} options={{ title: item.label }} />
      ))}
    </Stack>
  );
}
