import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Download, ShieldCheck, Trash2, Users, UserCog } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { confirm } from '../../lib/confirm';
import { findSection } from '../../lib/adminAccess';
import { colors, space } from '../../theme';
import { Button, Card, ChipBar, EmptyState, ErrorState, Loading, Row, Screen, Select, Sheet, T } from '../../components/ui';
import {
  AccessEditorSheet,
  AccountStatus,
  MEMBER_LEVELS,
  PersonHeader,
  SearchBox,
  StatusPill,
  SuspendSheet,
  VerifyButton,
  exportCSV,
  matches,
  useAccessCatalog,
  useAdminUsers,
  verifyUser,
} from '../../components/admin/people/PeopleKit';

const TITLE = findSection('members')?.label || 'Members';

const FILTERS = [
  { value: 'All', label: 'All' },
  { value: 'USER', label: 'Members' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'UNVERIFIED', label: 'Unverified' },
  { value: 'SUSPENDED', label: 'Suspended / banned' },
];

const STAFF = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'];

// Web: SuperAdminDashboard "members" tab + AdminDashboard "verification" tab (member level & badge).
export default function AdminMembers() {
  const { user, can, isSuperAdmin } = useAuth();
  const { showToast } = useToast();
  const { users, setUsers, loading, refreshing, error, reload, refresh } = useAdminUsers();
  const catalog = useAccessCatalog(isSuperAdmin);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [levelFor, setLevelFor] = useState(null);
  const [suspending, setSuspending] = useState(null);
  const [editingAccess, setEditingAccess] = useState(null);

  const replace = (next) => setUsers((prev) => prev.map((u) => (u._id === next._id ? { ...u, ...next } : u)));

  const list = useMemo(
    () =>
      users
        .filter((u) => {
          if (filter === 'USER') return u.role === 'USER';
          if (filter === 'STAFF') return STAFF.includes(u.role);
          if (filter === 'VERIFIED') return u.isVerified;
          if (filter === 'UNVERIFIED') return !u.isVerified;
          if (filter === 'SUSPENDED') return u.isSuspended || u.isBanned;
          return true;
        })
        .filter((u) => matches(query, u.name, u.email)),
    [users, filter, query]
  );

  const handleDelete = async (m) => {
    if (!(await confirm('Delete this account?', `Delete ${m.name}'s account and all their contributions permanently?`, { confirmText: 'Delete' }))) return;
    try {
      const res = await API.delete(`/admin/users/${m._id}`);
      if (res.data?.success) {
        showToast('User account deleted', 'success');
        setUsers((prev) => prev.filter((u) => u._id !== m._id));
      }
    } catch (err) {
      showToast(errorMessage(err, 'Delete user failed'), 'error');
    }
  };

  const renderItem = ({ item: m }) => {
    const isSelf = m._id === user?._id;
    return (
      <Card style={{ marginHorizontal: space.lg, gap: space.md }}>
        <PersonHeader person={m} />
        <Row gap={6} wrap>
          <StatusPill label={m.role.replace('_', ' ')} bg={STAFF.includes(m.role) ? colors.brandTint : colors.paperDeep} fg={STAFF.includes(m.role) ? colors.brand : colors.inkSoft} />
          <StatusPill label={m.memberLevel || 'NEW MEMBER'} />
          <AccountStatus person={m} />
        </Row>
        {m.isBanned && m.banReason ? <T variant="small">Ban reason: {m.banReason}</T> : null}
        {m.isSuspended && m.suspensionReason ? <T variant="small">Suspension reason: {m.suspensionReason}</T> : null}
        <Row gap={8} wrap>
          <VerifyButton
            verified={m.isVerified}
            offLabel="Grant badge"
            onPress={() => verifyUser(m, m.memberLevel, !m.isVerified, { showToast, onDone: replace })}
          />
          <Button title="Member level" icon={UserCog} variant="ghost" size="sm" onPress={() => setLevelFor(m)} />
          {m.role !== 'SUPER_ADMIN' && !isSelf ? (
            <Button
              title={m.isSuspended ? 'Unsuspend' : 'Suspend'}
              variant="soft"
              size="sm"
              onPress={() => setSuspending(m)}
            />
          ) : null}
          {isSuperAdmin && m.role === 'USER' ? (
            <Button title="Make staff" icon={ShieldCheck} variant="ghost" size="sm" onPress={() => setEditingAccess(m)} />
          ) : null}
          <Button title="Profile" variant="text" size="sm" onPress={() => router.push(`/profile/${m._id}`)} />
          {can('canDeleteUsers') && !isSelf ? (
            <Button title="Delete" icon={Trash2} variant="danger" size="sm" onPress={() => handleDelete(m)} />
          ) : null}
        </Row>
      </Card>
    );
  };

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
            <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T variant="small">{users.length} accounts · roles, verification levels and suspension status</T>
              </Row>
              <SearchBox value={query} onChangeText={setQuery} placeholder="Search name or email…" />
            </View>
            <ChipBar options={FILTERS} value={filter} onChange={setFilter} />
            <View style={{ paddingHorizontal: space.lg }}>
              <Button title="Export CSV" icon={Download} variant="ghost" size="sm" onPress={() => exportCSV(users, 'hateymalo_members', showToast)} />
            </View>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <ErrorState message={error} onRetry={() => reload()} />
          ) : (
            <EmptyState icon={Users} title={users.length ? 'No members match' : 'No members yet'} message={users.length ? 'Try another search or filter.' : 'Registered members will appear here.'} />
          )
        }
      />

      <Sheet visible={!!levelFor} onClose={() => setLevelFor(null)} title={levelFor ? `Member level · ${levelFor.name}` : ''}>
        {levelFor ? (
          <>
            <Select
              label="Member level"
              options={MEMBER_LEVELS}
              value={levelFor.memberLevel || 'NEW MEMBER'}
              onChange={(lvl) =>
                verifyUser(levelFor, lvl, levelFor.isVerified, {
                  showToast,
                  onDone: (next) => { replace(next); setLevelFor(next); },
                })
              }
            />
            <VerifyButton
              verified={levelFor.isVerified}
              onLabel="Verified badge active"
              offLabel="Grant verification badge"
              onPress={() =>
                verifyUser(levelFor, levelFor.memberLevel, !levelFor.isVerified, {
                  showToast,
                  onDone: (next) => { replace(next); setLevelFor(next); },
                })
              }
            />
          </>
        ) : null}
      </Sheet>

      <SuspendSheet person={suspending} onClose={() => setSuspending(null)} onDone={replace} showToast={showToast} />

      <AccessEditorSheet
        person={editingAccess}
        catalog={catalog}
        onClose={() => setEditingAccess(null)}
        onSaved={() => reload()}
        showToast={showToast}
        confirm={confirm}
      />
    </Screen>
  );
}
