import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { Stack } from 'expo-router';
import { Download, Lock } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { findSection } from '../../lib/adminAccess';
import { formatDateTime, humanize } from '../../lib/format';
import { colors, space } from '../../theme';
import { Button, Card, ChipBar, EmptyState, ErrorState, Loading, Row, Screen, T } from '../../components/ui';
import { SearchBox, StatusPill, exportCSV, matches } from '../../components/admin/people/PeopleKit';

const TITLE = findSection('logs')?.label || 'Activity logs';
const PAGE = 20;

// Web: "logs" tab — GET /super-admin/audit-logs (Super Admin only; newest 100 entries from the server).
// Filters and paging are applied on the device.
export default function AdminLogs() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [limit, setLimit] = useState(PAGE);

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    try {
      const res = await API.get('/super-admin/audit-logs');
      if (res.data?.success) setLogs(res.data.data || []);
      setError('');
      setLimit(PAGE);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the activity log.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const types = useMemo(() => [...new Set(logs.map((l) => l.targetType).filter(Boolean))].sort(), [logs]);
  const filtered = useMemo(
    () =>
      logs
        .filter((l) => type === 'All' || l.targetType === type)
        .filter((l) => matches(query, l.action, l.details, l.admin?.name, l.adminName, l.admin?.email)),
    [logs, type, query]
  );
  const visible = filtered.slice(0, limit);

  const renderItem = ({ item: log }) => (
    <Card style={{ marginHorizontal: space.lg, gap: 6 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <StatusPill label={log.targetType || '—'} />
        <T variant="caption">{formatDateTime(log.createdAt)}</T>
      </Row>
      <T variant="semibold" style={{ color: colors.brand }}>{log.action}</T>
      {log.details ? <T variant="small">{log.details}</T> : null}
      <T variant="caption">
        By {log.admin?.name || log.adminName || 'System Admin'}
        {log.admin?.role || log.adminRole ? ` · ${humanize(log.admin?.role || log.adminRole)}` : ''}
        {log.ipAddress ? ` · ${log.ipAddress}` : ''}
      </T>
    </Card>
  );

  if (loading) return <><Stack.Screen options={{ title: TITLE }} /><Loading /></>;

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: TITLE }} />
      <FlatList
        data={visible}
        keyExtractor={(l) => l._id}
        renderItem={renderItem}
        contentContainerStyle={{ gap: space.md, paddingBottom: space.xxl * 2 }}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={0.4}
        onEndReached={() => { if (limit < filtered.length) setLimit((n) => n + PAGE); }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, paddingTop: space.lg }}>
            <View style={{ gap: space.md, paddingHorizontal: space.lg }}>
              <T variant="small">Administrative changes, deletions and policy enforcement actions · latest {logs.length} entries.</T>
              <SearchBox value={query} onChangeText={(v) => { setQuery(v); setLimit(PAGE); }} placeholder="Search action, details or staff member…" />
            </View>
            {types.length ? (
              <ChipBar
                options={[{ value: 'All', label: 'All' }, ...types.map((t) => ({ value: t, label: humanize(t) }))]}
                value={type}
                onChange={(t) => { setType(t); setLimit(PAGE); }}
              />
            ) : null}
            <View style={{ paddingHorizontal: space.lg }}>
              <Button title="Export logs CSV" icon={Download} variant="ghost" size="sm" onPress={() => exportCSV(logs, 'hateymalo_audit_logs', showToast)} />
            </View>
          </View>
        }
        ListFooterComponent={
          filtered.length > visible.length ? (
            <View style={{ padding: space.lg }}>
              <Button title={`Show more (${filtered.length - visible.length} left)`} variant="soft" onPress={() => setLimit((n) => n + PAGE)} full />
            </View>
          ) : null
        }
        ListEmptyComponent={
          error ? (
            <ErrorState message={error} onRetry={() => load()} />
          ) : (
            <EmptyState icon={Lock} title={logs.length ? 'No entries match' : 'No audit log entries yet'} message={logs.length ? 'Try another search or type.' : 'Staff actions such as settings changes and staff edits are recorded here.'} />
          )
        }
      />
    </Screen>
  );
}
