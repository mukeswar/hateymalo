import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Building2, Download, Plus, ShieldCheck, Trash2 } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { confirm } from '../../lib/confirm';
import { findSection } from '../../lib/adminAccess';
import { colors, space } from '../../theme';
import { Button, Card, EmptyState, ErrorState, Field, Loading, Row, Screen, Select, Sheet, T } from '../../components/ui';
import { PersonHeader, SearchBox, StatusPill, VerifyButton, exportCSV, matches, useAdminUsers, verifyUser } from '../../components/admin/people/PeopleKit';

const TITLE = findSection('orgs')?.label || 'Organizations';

// orgDetails.orgType values the User model accepts.
const ORG_TYPES = ['NGO', 'School', 'College', 'Community Group', 'Social Organization', 'Club'];

// No password field: the server applies its own default for admin-registered
// organisation accounts (the web sends that same default silently).
const EMPTY_ORG = { name: '', email: '', location: 'Kathmandu, Nepal', phone: '', regNumber: '', orgType: 'NGO', description: '' };

export default function AdminOrgs() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const { users, setUsers, loading, refreshing, error, reload, refresh } = useAdminUsers();
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_ORG);
  const [saving, setSaving] = useState(false);

  const orgs = useMemo(() => users.filter((u) => u.memberLevel === 'ORGANIZATION'), [users]);
  const list = useMemo(() => orgs.filter((o) => matches(query, o.name, o.email)), [orgs, query]);
  const replace = (next) => setUsers((prev) => prev.map((u) => (u._id === next._id ? { ...u, ...next } : u)));
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      showToast('Name and email are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await API.post('/admin/organizations', form);
      if (res.data?.success) {
        showToast(res.data.message, 'success');
        setShowCreate(false);
        setForm(EMPTY_ORG);
        reload();
      }
    } catch (err) {
      showToast(errorMessage(err, 'Failed to register organization'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (org) => {
    if (!(await confirm('Delete this organization?', `Delete ${org.name}'s account and all their contributions permanently?`, { confirmText: 'Delete' }))) return;
    try {
      const res = await API.delete(`/admin/users/${org._id}`);
      if (res.data?.success) {
        showToast('User account deleted', 'success');
        setUsers((prev) => prev.filter((u) => u._id !== org._id));
      }
    } catch (err) {
      showToast(errorMessage(err, 'Delete user failed'), 'error');
    }
  };

  const renderItem = ({ item: org }) => (
    <Card style={{ marginHorizontal: space.lg, gap: space.md }}>
      <PersonHeader person={org} />
      <Row gap={6} wrap>
        {org.orgDetails?.regNumber ? <StatusPill label={`Reg. ${org.orgDetails.regNumber}`} /> : <StatusPill label="No reg. number" />}
        {org.orgDetails?.orgType ? <StatusPill label={org.orgDetails.orgType} bg={colors.skyTint} fg={colors.sky} /> : null}
        {org.isSuspended ? <StatusPill label="Suspended" bg={colors.brandTint} fg={colors.brand} /> : null}
      </Row>
      {org.location ? <T variant="small">{org.location}</T> : null}
      <Row gap={8} wrap>
        <VerifyButton
          verified={org.isVerified}
          onLabel="Verified NGO"
          offLabel="Verify org"
          onPress={() => verifyUser(org, 'ORGANIZATION', !org.isVerified, { showToast, onDone: replace })}
        />
        <Button title="View" variant="ghost" size="sm" onPress={() => router.push(`/profile/${org._id}`)} />
        {can('canDeleteUsers') ? <Button title="Delete" icon={Trash2} variant="danger" size="sm" onPress={() => handleDelete(org)} /> : null}
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
          <View style={{ gap: space.md, padding: space.lg, paddingBottom: 0 }}>
            <T variant="small">{orgs.length} organisations · register institutions, verify NGO credentials and review partner profiles.</T>
            <Row gap={8} wrap>
              {can('canManageOrganizations') ? <Button title="Add organization" icon={Plus} size="sm" onPress={() => setShowCreate(true)} /> : null}
              <Button title="Export CSV" icon={Download} variant="ghost" size="sm" onPress={() => exportCSV(orgs, 'hateymalo_organizations', showToast)} />
            </Row>
            <SearchBox value={query} onChangeText={setQuery} placeholder="Search organization name or email…" />
          </View>
        }
        ListEmptyComponent={
          error ? (
            <ErrorState message={error} onRetry={() => reload()} />
          ) : (
            <EmptyState icon={Building2} title={query ? 'No organizations match' : 'No organizations yet'} message={query ? 'Try another search.' : 'Registered organizations will appear here.'} />
          )
        }
      />

      <Sheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add NGO / partner organization"
        footer={<Button title="Register & verify organization" icon={Building2} onPress={handleCreate} loading={saving} full />}
      >
        <Field label="Organization name *" value={form.name} onChangeText={set('name')} placeholder="Registered organization name" />
        <Field label="Contact email *" value={form.email} onChangeText={set('email')} placeholder="contact@org.org.np" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        <Field label="Contact phone" value={form.phone} onChangeText={set('phone')} placeholder="Official phone number" keyboardType="phone-pad" />
        <Field label="Reg / license no." value={form.regNumber} onChangeText={set('regNumber')} placeholder="SWC-12345" autoCapitalize="characters" />
        <Select label="Org type" options={ORG_TYPES} value={form.orgType} onChange={set('orgType')} />
        <Field label="Location" value={form.location} onChangeText={set('location')} placeholder="e.g. Kathmandu, Nepal" />
        <Field label="Mission / description" value={form.description} onChangeText={set('description')} placeholder="Brief mission statement…" multiline />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <ShieldCheck size={16} color={colors.pine} />
          <T variant="small" style={{ flex: 1 }}>The account is created as a verified organisation. Its sign-in details are set by the server; share access with the organisation separately.</T>
        </View>
      </Sheet>
    </Screen>
  );
}
