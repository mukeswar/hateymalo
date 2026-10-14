import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Stack } from 'expo-router';
import { ShieldAlert, ShieldCheck, UserPlus, Users } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { confirm } from '../../lib/confirm';
import { findSection } from '../../lib/adminAccess';
import { colors, space } from '../../theme';
import { Button, Card, EmptyState, ErrorState, Field, Loading, Row, Screen, Sheet, T } from '../../components/ui';
import {
  AccessChecklist,
  AccessEditorSheet,
  FINANCE_PERMS,
  PersonHeader,
  RolePicker,
  SearchBox,
  StatusPill,
  matches,
  permissionLabel,
  presetFor,
  useAccessCatalog,
  useAdminUsers,
} from '../../components/admin/people/PeopleKit';

const TITLE = findSection('admins')?.label || 'Admins & roles';
const STAFF = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'];
const EMPTY_STAFF = { name: '', email: '', password: '', role: 'MODERATOR', permissions: [] };

// Web: "admins" tab (Super Admin only; the layout guards it). Staff list from GET /admin/users,
// permission catalogue from GET /super-admin/access-catalog, add → POST /super-admin/staff,
// edit / promote → PUT /super-admin/staff/:id/permissions, remove → DELETE /super-admin/staff/:id.
export default function AdminAdmins() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { users, setUsers, loading, refreshing, error, reload, refresh } = useAdminUsers();
  const catalog = useAccessCatalog(true);

  const [editing, setEditing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF);
  const [saving, setSaving] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const [promoteQuery, setPromoteQuery] = useState('');

  const staff = useMemo(() => users.filter((u) => STAFF.includes(u.role)), [users]);
  const candidates = useMemo(
    () => users.filter((u) => u.role === 'USER' && !u.isBanned).filter((u) => matches(promoteQuery, u.name, u.email)).slice(0, 30),
    [users, promoteQuery]
  );

  const openAdd = () => {
    setStaffForm({ ...EMPTY_STAFF, permissions: presetFor(catalog, 'MODERATOR') });
    setShowAdd(true);
  };

  const handleCreate = async () => {
    if (!staffForm.name.trim() || !staffForm.email.trim() || !staffForm.password) {
      showToast('Name, email and password are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await API.post('/super-admin/staff', staffForm);
      if (res.data?.success) {
        showToast(res.data.message, 'success');
        setShowAdd(false);
        setStaffForm(EMPTY_STAFF);
        reload();
      }
    } catch (err) {
      showToast(errorMessage(err, 'Staff creation failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (s) => {
    if (!(await confirm('Remove staff/admin access?', `This deletes ${s.name}'s account (${s.email}).`, { confirmText: 'Remove' }))) return;
    try {
      const res = await API.delete(`/super-admin/staff/${s._id}`);
      if (res.data?.success) {
        showToast('Staff user deleted', 'success');
        setUsers((prev) => prev.filter((m) => m._id !== s._id));
      }
    } catch (err) {
      showToast(errorMessage(err, 'Delete staff failed'), 'error');
    }
  };

  const renderItem = ({ item: s }) => {
    const perms = s.permissions?.length ? s.permissions : presetFor(catalog, s.role);
    return (
      <Card style={{ marginHorizontal: space.lg, gap: space.md }}>
        <PersonHeader person={s} showBadge={false} right={<StatusPill label={s.role.replace('_', ' ')} bg={colors.brandTint} fg={colors.brand} />} />
        {s.role === 'SUPER_ADMIN' ? (
          <StatusPill label="Full access" bg={colors.pineTint} fg={colors.pine} />
        ) : (
          <View style={{ gap: 6 }}>
            <Row gap={6} wrap>
              {perms.map((p) => (
                <StatusPill
                  key={p}
                  label={permissionLabel(catalog, p)}
                  bg={FINANCE_PERMS.includes(p) ? colors.marigoldTint : colors.paperDeep}
                  fg={FINANCE_PERMS.includes(p) ? colors.marigoldText : colors.inkSoft}
                />
              ))}
            </Row>
            {!s.permissions?.length ? <T variant="caption">(role default)</T> : null}
          </View>
        )}
        {s.role !== 'SUPER_ADMIN' && s._id !== user?._id ? (
          <Row gap={8} wrap>
            <Button title="Edit access" icon={ShieldCheck} variant="ghost" size="sm" onPress={() => setEditing(s)} />
            <Button title="Remove" variant="danger" size="sm" onPress={() => handleRemove(s)} />
          </Row>
        ) : null}
      </Card>
    );
  };

  if (loading) return <><Stack.Screen options={{ title: TITLE }} /><Loading /></>;

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: TITLE }} />
      <FlatList
        data={staff}
        keyExtractor={(u) => u._id}
        renderItem={renderItem}
        contentContainerStyle={{ gap: space.md, paddingBottom: space.xxl * 2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, padding: space.lg, paddingBottom: 0 }}>
            <T variant="small">Choose exactly what each admin or moderator can see and do. Finance access is never given by default.</T>
            <Row gap={8} wrap>
              <Button title="Add staff" icon={UserPlus} size="sm" onPress={openAdd} />
              <Button title="Promote a member" icon={ShieldCheck} variant="ghost" size="sm" onPress={() => { setPromoteQuery(''); setShowPromote(true); }} />
            </Row>
          </View>
        }
        ListEmptyComponent={
          error ? <ErrorState message={error} onRetry={() => reload()} /> : <EmptyState icon={ShieldAlert} title="No staff accounts found" />
        }
      />

      <Sheet
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add staff account"
        footer={<Button title="Create staff account" onPress={handleCreate} loading={saving} full />}
      >
        <Field label="Full name" value={staffForm.name} onChangeText={(v) => setStaffForm((f) => ({ ...f, name: v }))} />
        <Field
          label="Email address"
          value={staffForm.email}
          onChangeText={(v) => setStaffForm((f) => ({ ...f, email: v }))}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Field
          label="Password"
          value={staffForm.password}
          onChangeText={(v) => setStaffForm((f) => ({ ...f, password: v }))}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <RolePicker value={staffForm.role} onChange={(role) => setStaffForm((f) => ({ ...f, role, permissions: presetFor(catalog, role) }))} />
        <T variant="small">Changing the role resets the ticks below to that role's defaults. Adjust them as needed.</T>
        <AccessChecklist catalog={catalog} value={staffForm.permissions || []} onChange={(permissions) => setStaffForm((f) => ({ ...f, permissions }))} />
      </Sheet>

      <Sheet visible={showPromote} onClose={() => setShowPromote(false)} title="Promote a member to staff">
        <SearchBox value={promoteQuery} onChangeText={setPromoteQuery} placeholder="Search member name or email…" />
        {candidates.length ? (
          candidates.map((m) => (
            <Pressable
              key={m._id}
              onPress={() => {
                setShowPromote(false);
                // iOS cannot present a second modal while the first is still animating out
                setTimeout(() => setEditing(m), 400);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Make ${m.name} staff`}
              style={({ pressed }) => [{ padding: 10, borderRadius: 14, backgroundColor: pressed ? colors.paperDeep : colors.white, borderWidth: 1, borderColor: colors.sand }]}
            >
              <PersonHeader person={m} />
            </Pressable>
          ))
        ) : (
          <EmptyState icon={Users} title="No members found" message="Only regular member accounts can be promoted." />
        )}
      </Sheet>

      <AccessEditorSheet
        person={editing}
        catalog={catalog}
        onClose={() => setEditing(null)}
        onSaved={() => reload()}
        showToast={showToast}
        confirm={confirm}
      />
    </Screen>
  );
}
