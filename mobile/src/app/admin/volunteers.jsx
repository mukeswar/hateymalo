import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Download, Trash2, UserPlus } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { confirm } from '../../lib/confirm';
import { findSection } from '../../lib/adminAccess';
import { colors, space } from '../../theme';
import { Button, Card, ChipBar, EmptyState, ErrorState, Loading, Row, Screen, Select, T } from '../../components/ui';
import { PersonHeader, SearchBox, VerifyButton, exportCSV, matches, useAdminUsers, verifyUser } from '../../components/admin/people/PeopleKit';

const TITLE = findSection('volunteers')?.label || 'Volunteers';

// Tier levels the backend accepts for regular members (User.memberLevel enum).
const TIERS = ['NEW MEMBER', 'TRUSTED MEMBER', 'VERIFIED MEMBER'];
const FILTERS = [{ value: 'All', label: 'All tiers' }, ...TIERS.map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() })), { value: 'ORGANIZATION', label: 'Organization' }];

export default function AdminVolunteers() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const { users, setUsers, loading, refreshing, error, reload, refresh } = useAdminUsers();
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState('All');

  const volunteers = useMemo(() => users.filter((u) => u.role === 'USER'), [users]);
  const list = useMemo(
    () =>
      volunteers
        .filter((v) => tier === 'All' || (v.memberLevel || 'NEW MEMBER') === tier)
        .filter((v) => matches(query, v.name, v.email)),
    [volunteers, tier, query]
  );
  const replace = (next) => setUsers((prev) => prev.map((u) => (u._id === next._id ? { ...u, ...next } : u)));

  const handleDelete = async (v) => {
    if (!(await confirm('Delete this account?', `Delete ${v.name}'s account and all their contributions permanently?`, { confirmText: 'Delete' }))) return;
    try {
      const res = await API.delete(`/admin/users/${v._id}`);
      if (res.data?.success) {
        showToast('User account deleted', 'success');
        setUsers((prev) => prev.filter((u) => u._id !== v._id));
      }
    } catch (err) {
      showToast(errorMessage(err, 'Delete user failed'), 'error');
    }
  };

  const renderItem = ({ item: v }) => (
    <Card style={{ marginHorizontal: space.lg, gap: space.md }}>
      <PersonHeader person={v} />
      {v.location ? <T variant="small">{v.location}</T> : null}
      {v.memberLevel === 'ORGANIZATION' ? (
        <T variant="small">Organisation account — manage its level from Organizations.</T>
      ) : (
        <Select
          label="Tier level"
          options={TIERS}
          value={v.memberLevel || 'NEW MEMBER'}
          onChange={(lvl) => verifyUser(v, lvl, v.isVerified, { showToast, onDone: replace })}
        />
      )}
      <Row gap={8} wrap>
        <VerifyButton verified={v.isVerified} onPress={() => verifyUser(v, v.memberLevel, !v.isVerified, { showToast, onDone: replace })} />
        <Button title="Profile" variant="ghost" size="sm" onPress={() => router.push(`/profile/${v._id}`)} />
        {can('canDeleteUsers') ? <Button title="Delete" icon={Trash2} variant="danger" size="sm" onPress={() => handleDelete(v)} /> : null}
      </Row>
    </Card>
  );

  if (loading) return <><Stack.Screen options={{ title: TITLE }} /><Loading /></>;

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: TITLE }} />
      <FlatList
        data={list}
        keyExtractor={(u) => u._id}
        renderItem={renderItem}
        contentContainerStyle={{ gap: space.md, paddingBottom: space.xxl * 2 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, paddingTop: space.lg }}>
            <View style={{ gap: space.md, paddingHorizontal: space.lg }}>
              <T variant="small">{volunteers.length} members · manage volunteer levels and verify credentials.</T>
              <SearchBox value={query} onChangeText={setQuery} placeholder="Search volunteer name or email…" />
            </View>
            <ChipBar options={FILTERS} value={tier} onChange={setTier} />
            <View style={{ paddingHorizontal: space.lg }}>
              <Button title="Export volunteers CSV" icon={Download} variant="ghost" size="sm" onPress={() => exportCSV(volunteers, 'hateymalo_volunteers', showToast)} />
            </View>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <ErrorState message={error} onRetry={() => reload()} />
          ) : (
            <EmptyState icon={UserPlus} title="No volunteers found" message="No volunteers match this search or tier." />
          )
        }
      />
    </Screen>
  );
}
