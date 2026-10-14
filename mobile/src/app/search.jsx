import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarDays,
  HandHelping,
  MapPin,
  Search,
  SearchX,
  Users,
} from 'lucide-react-native';
import API, { errorMessage } from '../lib/api';
import { colors, fonts, radius } from '../theme';
import { Avatar, Button, Card, Chip, ChipBar, Field, Row, Screen, Skeleton, T } from '../components/ui';
import PostCard from '../components/PostCard';

// Port of frontend/src/pages/GlobalSearch.jsx (GET /search).
const EMPTY = { posts: [], events: [], blogs: [], members: [], organizations: [] };

const SectionTitle = ({ icon: Icon, title, count, tone }) => (
  <Row gap={10}>
    <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={18} color={tone.fg} />
    </View>
    <T variant="h2">{title}</T>
    <Chip label={String(count)} tone={{ bg: colors.paperDeep, fg: colors.inkSoft }} style={{ paddingVertical: 2, paddingHorizontal: 10 }} />
  </Row>
);

export default function GlobalSearch() {
  const params = useLocalSearchParams();
  const initialQuery = String(params.query || params.search || '');

  const [query, setQuery] = useState(initialQuery);
  const [entityType, setEntityType] = useState('ALL');
  const [results, setResults] = useState(EMPTY);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const queryRef = useRef(initialQuery);
  queryRef.current = query;

  const performSearch = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      const q = queryRef.current.trim();
      if (q) qs.append('query', q);
      if (entityType) qs.append('entityType', entityType);
      const res = await API.get(`/search?${qs.toString()}`);
      if (res.data?.success) {
        setResults({ ...EMPTY, ...res.data.data });
        setTotalCount(res.data.count || 0);
      }
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Search failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [entityType]);

  useEffect(() => { performSearch(); }, [performSearch]);

  // A new ?query= from another screen (e.g. Account search box) re-runs the search.
  useEffect(() => {
    if (initialQuery !== queryRef.current) {
      setQuery(initialQuery);
      queryRef.current = initialQuery;
      performSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const handleSubmit = () => performSearch();

  const tabs = [
    { value: 'ALL', label: `All · ${totalCount}` },
    { value: 'POSTS', label: `Help requests · ${results.posts.length}` },
    { value: 'EVENTS', label: `Events · ${results.events.length}` },
    { value: 'BLOGS', label: `Stories · ${results.blogs.length}` },
    { value: 'MEMBERS', label: `Members · ${results.members.length}` },
    { value: 'ORGANIZATIONS', label: `Organisations · ${results.organizations.length}` },
  ];

  const show = (key, list) => (entityType === 'ALL' || entityType === key) && list.length > 0;
  const q = query.trim();

  return (
    <Screen refreshing={false} onRefresh={performSearch}>
      <View style={{ gap: 6 }}>
        <T variant="eyebrowDeva">खोज्नुहोस्</T>
        <T variant="h1">Find people, help and stories</T>
        <T variant="body" style={{ color: colors.muted }}>
          Search help requests, events, stories, members and organisations across Nepal.
        </T>
      </View>

      <View style={{ gap: 10 }}>
        <Field
          value={query}
          onChangeText={setQuery}
          placeholder="Keywords, places, skills, organisations…"
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
          autoCorrect={false}
          accessibilityLabel="Search Hateymalo"
          right={<Search size={18} color={colors.muted} />}
        />
        <Button title="Search" onPress={handleSubmit} full />
      </View>

      <View style={{ marginHorizontal: -16 }}>
        <ChipBar options={tabs} value={entityType} onChange={setEntityType} />
      </View>

      {error ? <T variant="small" style={{ color: colors.brand }}>{error}</T> : null}

      {loading ? (
        <View style={{ gap: 14 }} accessibilityLabel="Searching">
          {[1, 2, 3].map((n) => <Skeleton key={n} height={180} radius={radius.card} />)}
        </View>
      ) : totalCount > 0 ? (
        <View style={{ gap: 32 }}>
          {show('POSTS', results.posts) ? (
            <View style={{ gap: 14 }}>
              <SectionTitle icon={HandHelping} title="Help requests" count={results.posts.length} tone={{ bg: colors.brandTint, fg: colors.brand }} />
              {results.posts.map((post) => <PostCard key={post._id} post={post} />)}
            </View>
          ) : null}

          {show('EVENTS', results.events) ? (
            <View style={{ gap: 12 }}>
              <SectionTitle icon={CalendarDays} title="Events" count={results.events.length} tone={{ bg: colors.skyTint, fg: colors.sky }} />
              {results.events.map((ev) => (
                <Card key={ev._id} onPress={() => router.push(`/event/${ev._id}`)} accessibilityLabel={ev.title} style={{ gap: 8 }}>
                  {ev.category ? <Chip label={ev.category} tone={{ bg: colors.skyTint, fg: colors.sky }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} /> : null}
                  <T variant="h3" numberOfLines={2}>{ev.title}</T>
                  {ev.description ? <T variant="small" numberOfLines={2}>{ev.description}</T> : null}
                  <Row gap={6}>
                    <T style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>View event</T>
                    <ArrowRight size={15} color={colors.ink} />
                  </Row>
                </Card>
              ))}
            </View>
          ) : null}

          {show('BLOGS', results.blogs) ? (
            <View style={{ gap: 12 }}>
              <SectionTitle icon={BookOpen} title="Stories" count={results.blogs.length} tone={{ bg: colors.marigoldTint, fg: colors.marigoldText }} />
              {results.blogs.map((b) => (
                <Card key={b._id} onPress={() => router.push(`/blog/${b._id}`)} accessibilityLabel={b.title} style={{ gap: 10 }}>
                  <T variant="h3" numberOfLines={2}>{b.title}</T>
                  {b.author?.name ? (
                    <Row gap={8}>
                      <Avatar name={b.author.name} src={b.author.profilePicture} size="xs" />
                      <T variant="small" numberOfLines={1} style={{ flexShrink: 1 }}>By {b.author.name}</T>
                    </Row>
                  ) : null}
                </Card>
              ))}
            </View>
          ) : null}

          {show('MEMBERS', results.members) ? (
            <View style={{ gap: 10 }}>
              <SectionTitle icon={Users} title="Members" count={results.members.length} tone={{ bg: colors.pineTint, fg: colors.pine }} />
              {results.members.map((m) => (
                <Card key={m._id} onPress={() => router.push(`/profile/${m._id}`)} accessibilityLabel={m.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }} padded={false}>
                  <Avatar name={m.name} src={m.profilePicture} size="md" />
                  <View style={{ flex: 1 }}>
                    <Row gap={6}>
                      <T variant="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{m.name}</T>
                      {m.isVerified ? <BadgeCheck size={16} color={colors.pine} accessibilityLabel="Verified" /> : null}
                    </Row>
                    {m.location ? (
                      <Row gap={4}>
                        <MapPin size={13} color={colors.muted} />
                        <T variant="small" numberOfLines={1} style={{ flexShrink: 1 }}>{m.location}</T>
                      </Row>
                    ) : null}
                  </View>
                </Card>
              ))}
            </View>
          ) : null}

          {show('ORGANIZATIONS', results.organizations) ? (
            <View style={{ gap: 12 }}>
              <SectionTitle icon={Building2} title="Organisations" count={results.organizations.length} tone={{ bg: colors.skyTint, fg: colors.sky }} />
              {results.organizations.map((org) => {
                const name = org.orgDetails?.orgName || org.name;
                const description = org.orgDetails?.description || org.bio;
                return (
                  <Card key={org._id} onPress={() => router.push(`/profile/${org._id}`)} accessibilityLabel={name} style={{ flexDirection: 'row', gap: 14 }}>
                    <Avatar name={name} src={org.profilePicture} size="lg" rounded={false} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <T variant="h3">{name}</T>
                      <Row gap={6} wrap>
                        <Chip label={org.orgDetails?.orgType || 'Organisation'} tone={{ bg: colors.skyTint, fg: colors.sky }} style={{ paddingVertical: 2, paddingHorizontal: 10 }} />
                        {org.isVerified ? (
                          <Chip label="Verified" icon={BadgeCheck} tone={{ bg: colors.pineTint, fg: colors.pine }} style={{ paddingVertical: 2, paddingHorizontal: 10 }} />
                        ) : null}
                      </Row>
                      {description ? <T variant="small" numberOfLines={2}>{description}</T> : null}
                    </View>
                  </Card>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : !error ? (
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 32 }}>
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.paperDeep, alignItems: 'center', justifyContent: 'center' }}>
            <SearchX size={26} color={colors.inkSoft} />
          </View>
          <T variant="h2" style={{ textAlign: 'center' }}>Nothing found{q ? ` for “${q}”` : ''}</T>
          <T variant="small" style={{ textAlign: 'center' }}>Try a shorter word, a nearby place, or a different category.</T>
          <Row gap={10} wrap style={{ justifyContent: 'center', marginTop: 4 }}>
            <Button title="Browse help requests" size="sm" onPress={() => router.push('/explore')} />
            <Button title="See members" size="sm" variant="ghost" onPress={() => router.push('/members')} />
          </Row>
        </Card>
      ) : null}
    </Screen>
  );
}
