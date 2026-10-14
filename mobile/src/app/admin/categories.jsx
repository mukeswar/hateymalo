import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { FolderKanban, Pencil, Plus, Trash2 } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { findSection } from '../../lib/adminAccess';
import { confirm } from '../../lib/confirm';
import { Button, Card, Chip, EmptyState, ErrorState, Field, Loading, Row, Screen, Sheet, T } from '../../components/ui';
import { ListGap, PanelIntro, useAdminList, useBusy } from '../../components/admin/content/kit';
import { colors, space } from '../../theme';

// Same defaults the web's "Add activity category" form sends.
const NEW_FORM = { name: '', description: '', iconName: 'FolderKanban', color: '#94201B' };

// Activity categories — SuperAdminDashboard "categories" tab + category modal,
// plus editing name/description (PUT /categories/:id, which the API supports).
export default function AdminCategoriesScreen() {
  const { showToast } = useToast();
  const params = useLocalSearchParams();
  const { data: categories, setData, loading, refreshing, error, reload, refresh } = useAdminList('/categories');
  const [busy, run] = useBusy();
  const [editing, setEditing] = useState(null); // null | { _id?, name, description, ... }
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.create) setEditing({ ...NEW_FORM });
  }, [params.create]);

  const save = async () => {
    if (!editing?.name?.trim()) {
      setFormError('Category name is required.');
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      if (editing._id) {
        const res = await API.put(`/categories/${editing._id}`, { name: editing.name.trim(), description: editing.description });
        if (res.data.success) {
          showToast('Category updated', 'success');
          setData((prev) => prev.map((c) => (c._id === editing._id ? { ...c, ...res.data.data, postCount: c.postCount } : c)));
          setEditing(null);
        }
      } else {
        const res = await API.post('/categories', { ...editing, name: editing.name.trim() });
        if (res.data.success) {
          showToast('Category created and available on public site!', 'success');
          setEditing(null);
          reload();
        }
      }
    } catch (err) {
      showToast(errorMessage(err, editing._id ? 'Category update failed' : 'Category creation failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = (cat) =>
    run(`toggle-${cat._id}`, async () => {
      const next = cat.isActive === false; // currently inactive -> activate
      try {
        const res = await API.put(`/categories/${cat._id}`, { isActive: next });
        if (res.data.success) {
          showToast(next ? 'Category activated' : 'Category deactivated (hidden from new posts)', 'success');
          setData((prev) => prev.map((c) => (c._id === cat._id ? { ...c, isActive: next } : c)));
        }
      } catch (err) {
        showToast(errorMessage(err, 'Toggle category failed'), 'error');
      }
    });

  const remove = async (cat) => {
    if (!(await confirm('Delete category?', `Delete "${cat.name}"? Existing posts keep their category text.`, { confirmText: 'Delete' }))) return;
    await run(`delete-${cat._id}`, async () => {
      try {
        const res = await API.delete(`/categories/${cat._id}`);
        if (res.data.success) {
          showToast('Category deleted', 'success');
          setData((prev) => prev.filter((c) => c._id !== cat._id));
        }
      } catch (err) {
        showToast(errorMessage(err, 'Delete category failed'), 'error');
      }
    });
  };

  const renderItem = ({ item: cat }) => {
    const inactive = cat.isActive === false;
    return (
      <Card style={{ gap: space.md, backgroundColor: inactive ? colors.paper : colors.white }}>
        <View style={{ gap: 4 }}>
          <Row wrap gap={8}>
            <T variant="h3">{cat.name}</T>
            <Chip
              label={inactive ? 'Inactive' : 'Active'}
              tone={inactive ? { bg: colors.paperDeep, fg: colors.muted } : { bg: colors.pineTint, fg: colors.pine }}
              style={{ paddingVertical: 3, paddingHorizontal: 10 }}
            />
          </Row>
          <T variant="small" numberOfLines={2}>{cat.description || 'Activity Category'}</T>
          {typeof cat.postCount === 'number' ? (
            <T variant="caption">{cat.postCount} approved {cat.postCount === 1 ? 'post' : 'posts'}</T>
          ) : null}
        </View>
        <Row wrap gap={8}>
          <Button
            title={inactive ? 'Activate' : 'Deactivate'}
            variant={inactive ? 'pine' : 'ghost'}
            size="sm"
            loading={busy === `toggle-${cat._id}`}
            disabled={!!busy}
            onPress={() => toggleActive(cat)}
          />
          <Button title="Edit" variant="soft" size="sm" icon={Pencil} disabled={!!busy} onPress={() => setEditing({ _id: cat._id, name: cat.name, description: cat.description || '' })} />
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            accessibilityLabel={`Delete category ${cat.name}`}
            loading={busy === `delete-${cat._id}`}
            disabled={!!busy}
            onPress={() => remove(cat)}
          />
        </Row>
      </Card>
    );
  };

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: findSection('categories').label }} />
      <FlatList
        data={loading ? [] : categories}
        keyExtractor={(c) => c._id}
        renderItem={renderItem}
        ItemSeparatorComponent={ListGap}
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl * 2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.lg }}>
            <PanelIntro title="Activity categories" count={categories.length} description="Categories added here appear on the public post and blog forms." />
            <Button title="Add category" icon={Plus} onPress={() => { setFormError(''); setEditing({ ...NEW_FORM }); }} full />
          </View>
        }
        ListEmptyComponent={
          loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : <EmptyState icon={FolderKanban} title="No categories yet" />
        }
      />
      <Sheet
        visible={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit category' : 'Add activity category'}
        footer={<Button title={editing?._id ? 'Save changes' : 'Add category'} onPress={save} loading={saving} full />}
      >
        <Field
          label="Category name *"
          value={editing?.name || ''}
          onChangeText={(v) => setEditing((e) => ({ ...e, name: v }))}
          placeholder="e.g. Disaster Relief"
          error={formError}
        />
        <Field
          label="Description"
          value={editing?.description || ''}
          onChangeText={(v) => setEditing((e) => ({ ...e, description: v }))}
          placeholder="Brief description…"
        />
        {editing?._id ? <T variant="small">Renaming does not change the category text on existing posts.</T> : null}
      </Sheet>
    </Screen>
  );
}
