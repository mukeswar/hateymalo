import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ArrowUpRight, Play, VolumeX } from 'lucide-react-native';
import API from '../../lib/api';
import { useSettings } from '../../context/SettingsContext';
import { colors, fonts, radius, space } from '../../theme';
import { T } from '../ui';
import { cappedCampaigns, countImpression, openAdClick, trackAdEvent } from './adTracker';

// Sponsored content slots (docs/ADS.md "Rendering rules"). Same placement keys as the website:
// home.banner, feed.inline, content.footer, events.list. Renders NOTHING (no gap, no placeholder)
// when there is no ad, the request fails or ads are switched off in platform settings.

const TICK_MS = 250;

/* ---------------- data ---------------- */

// GET /ads/serve for one placement. Re-fetches when the placement or cause changes.
export const useAds = (placement, { category = '', limit } = {}) => {
  const { settings } = useSettings();
  const off = settings?.adsEnabled === false;
  const [state, setState] = useState({ ads: [], placement: null });

  useEffect(() => {
    let alive = true;
    if (off || !placement) {
      setState({ ads: [], placement: null });
      return undefined;
    }
    (async () => {
      try {
        const exclude = await cappedCampaigns();
        const params = { placement, surface: 'APP' };
        if (category && category !== 'All') params.category = category;
        if (limit) params.limit = limit;
        if (exclude.length) params.exclude = exclude.join(',');
        const res = await API.get('/ads/serve', { params });
        if (!alive) return;
        const data = res.data?.data || {};
        setState({ ads: Array.isArray(data.ads) ? data.ads : [], placement: data.placement || null });
      } catch {
        if (alive) setState({ ads: [], placement: null });
      }
    })();
    return () => { alive = false; };
  }, [placement, category, limit, off]);

  return off ? { ads: [], placement: null } : state;
};

// Mixes ads into a list after every `every`-th item. Each ad is used once
// (a token counts one impression), so a list shows at most `ads.length` ads.
export const interleaveAds = (items, ads, every = 6) => {
  if (!ads?.length || !items?.length) return items;
  const out = [];
  let k = 0;
  items.forEach((it, i) => {
    out.push(it);
    if ((i + 1) % every === 0 && k < ads.length) {
      out.push({ __ad: ads[k], _id: `ad-${ads[k].token}` });
      k += 1;
    }
  });
  return out;
};

/* ---------------- visibility ---------------- */

// Polls the ad's on-screen rectangle (works inside any ScrollView / FlatList without
// wiring the parent's scroll position). Only counts while the screen is focused and
// the app is in the foreground. Calls onVisible(fraction) each tick.
const useOnScreen = (ref, { enabled, onTick }) => {
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active' || AppState.currentState == null);
  const tickRef = useRef(onTick);
  tickRef.current = onTick;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  const live = enabled && focused && appActive;
  useEffect(() => {
    if (!live) {
      tickRef.current?.(0);
      return undefined;
    }
    const id = setInterval(() => {
      const node = ref.current;
      if (!node?.measureInWindow) return;
      node.measureInWindow((x, y, w, h) => {
        if (!w || !h) { tickRef.current?.(0); return; }
        const win = Dimensions.get('window');
        const vw = Math.max(0, Math.min(x + w, win.width) - Math.max(x, 0));
        const vh = Math.max(0, Math.min(y + h, win.height) - Math.max(y, 0));
        tickRef.current?.((vw * vh) / (w * h), vw >= 1 && vh >= 1);
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [live, ref]);

  return live;
};

// IMPRESSION once rendered and ≥ 1px on screen; VIEWABLE after ≥ 50% for 1 s (2 s video).
const useAdMeasurement = (ad, { ready, preview, viewableMs = 1000 }) => {
  const ref = useRef(null);
  const state = useRef({ impressed: false, viewable: false, since: 0 });
  const [fraction, setFraction] = useState(0);
  const [impressed, setImpressed] = useState(false);

  useEffect(() => { state.current = { impressed: false, viewable: false, since: 0 }; setImpressed(false); }, [ad?.token]);

  const onTick = useCallback((f, anyPixel) => {
    setFraction((prev) => (Math.abs(prev - f) > 0.01 ? f : prev));
    if (preview || !ad) return;
    const s = state.current;
    if (!s.impressed && anyPixel) {
      s.impressed = true;
      trackAdEvent(ad.token, 'IMPRESSION');
      countImpression(ad.campaignId, ad.frequencyCapPerDay);
      setImpressed(true);
    }
    if (s.impressed && !s.viewable) {
      if (f >= 0.5) {
        if (!s.since) s.since = Date.now();
        else if (Date.now() - s.since >= viewableMs) {
          s.viewable = true;
          trackAdEvent(ad.token, 'VIEWABLE');
        }
      } else {
        s.since = 0;
      }
    }
  }, [ad, preview, viewableMs]);

  const live = useOnScreen(ref, { enabled: !!ad && ready, onTick });
  return { ref, fraction: live ? fraction : 0, impressed: preview || impressed };
};

/* ---------------- pieces ---------------- */

const Label = ({ ad, light }) => (
  <View style={styles.labelRow}>
    <View style={[styles.labelChip, light && { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
      <T style={styles.labelText}>{ad.labelText || 'Sponsored'}</T>
    </View>
    {ad.advertiserName ? (
      <T variant="caption" numberOfLines={1} style={[{ flexShrink: 1 }, light && { color: colors.white }]}>by {ad.advertiserName}</T>
    ) : null}
  </View>
);

const CtaButton = ({ ad, onPress }) => (
  <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={`${ad.ctaLabel || 'Learn more'} — opens ${ad.advertiserName || 'the advertiser'}'s site`} style={({ pressed }) => [styles.cta, pressed && { backgroundColor: colors.brandDark }]}>
    <T style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.white }}>{ad.ctaLabel || 'Learn more'}</T>
    <ArrowUpRight size={15} color={colors.white} />
  </Pressable>
);

const a11yName = (ad) => `${ad.labelText || 'Sponsored'}: ${ad.headline || ad.altText || ad.advertiserName || 'advertisement'}${ad.advertiserName ? `, by ${ad.advertiserName}` : ''}`;

/* ---------------- video ---------------- */

const AdVideo = ({ ad, preview, aspect, onClick }) => {
  const [skipped, setSkipped] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const flags = useRef({ started: false, q25: false, q50: false, q75: false, done: false });
  const player = useVideoPlayer(ad.videoUrl || null, (p) => {
    p.muted = true;
    p.loop = false;
    p.timeUpdateEventInterval = 0.5;
  });
  const { ref, fraction, impressed } = useAdMeasurement(ad, { ready: ready || !!ad.posterUrl, preview, viewableMs: 2000 });
  const send = (type) => { if (!preview) trackAdEvent(ad.token, type); };

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') setReady(true);
    if (status === 'error') setFailed(true);
  });
  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    if (isPlaying && !flags.current.started) {
      flags.current.started = true;
      send('VIDEO_START');
    }
  });
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    const d = player.duration || 0;
    if (currentTime >= (ad.skipAfterSeconds || 0)) setCanSkip(true);
    if (!d) return;
    const f = flags.current;
    const p = currentTime / d;
    if (p >= 0.25 && !f.q25) { f.q25 = true; send('VIDEO_Q25'); }
    if (p >= 0.5 && !f.q50) { f.q50 = true; send('VIDEO_Q50'); }
    if (p >= 0.75 && !f.q75) { f.q75 = true; send('VIDEO_Q75'); }
  });
  useEventListener(player, 'playToEnd', () => {
    if (!flags.current.done) {
      flags.current.done = true;
      send('VIDEO_COMPLETE');
    }
  });

  // Autoplay muted only while at least half of the video is on screen.
  const shouldPlay = !skipped && !failed && ready && impressed && fraction >= 0.5 && !flags.current.done;
  useEffect(() => {
    try {
      if (shouldPlay) player.play();
      else player.pause();
    } catch { /* player released */ }
  }, [shouldPlay, player]);

  const skip = () => {
    setSkipped(true);
    try { player.pause(); } catch { /* ignore */ }
    if (!flags.current.done) send('VIDEO_SKIP');
  };

  if (failed && !ad.posterUrl) return null;
  // The VideoView stays mounted (on web the player only loads once attached to it);
  // the poster covers it until playback can start, after a skip or on error.
  const showPoster = skipped || failed || !ready;

  return (
    <View ref={ref} collapsable={false} style={[styles.media, { aspectRatio: aspect }]}>
      {!failed ? (
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} />
      ) : null}
      {showPoster ? (
        <>
          {ad.posterUrl ? <Image source={{ uri: ad.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.night }]} />}
          <Pressable onPress={onClick} style={styles.playOverlay} accessibilityRole="link" accessibilityLabel={`Watch — opens ${ad.advertiserName || 'the advertiser'}'s site`}>
            <View style={styles.playBtn}><Play size={22} color={colors.white} fill={colors.white} /></View>
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.muted} accessibilityLabel="Muted"><VolumeX size={14} color={colors.white} /></View>
          {canSkip ? (
            <Pressable onPress={skip} style={styles.skip} accessibilityRole="button" accessibilityLabel="Skip video">
              <T style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.white }}>Skip</T>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
};

/* ---------------- creative ---------------- */

// One served ad. `preview` renders the same card without tracking or click-through
// (used by the advertiser's creative editor).
export const AdCreative = ({ ad, placementInfo, preview = false, style }) => {
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);
  const fmt = ad?.format;
  const { ref } = useAdMeasurement(fmt === 'VIDEO' ? null : ad, { ready: loaded, preview });

  useEffect(() => { setLoaded(false); setBroken(false); }, [ad?.imageUrl, ad?.token]);

  if (!ad || broken) return null;
  const click = () => { if (!preview) openAdClick(ad); };
  const wide = placementInfo?.width > 0 && placementInfo?.height > 0 ? placementInfo.width / placementInfo.height : null;

  if (fmt === 'VIDEO') {
    if (!ad.videoUrl) return null;
    return (
      <View style={[styles.card, style]} accessible={false} accessibilityLabel={a11yName(ad)}>
        <View style={{ padding: space.md, paddingBottom: space.sm }}><Label ad={ad} /></View>
        <AdVideo ad={ad} preview={preview} aspect={16 / 9} onClick={click} />
        {ad.headline || ad.body ? (
          <View style={{ paddingHorizontal: space.md, paddingTop: space.md, gap: 4 }}>
            {ad.headline ? <T variant="h3" numberOfLines={2}>{ad.headline}</T> : null}
            {ad.body ? <T variant="small" numberOfLines={3}>{ad.body}</T> : null}
          </View>
        ) : null}
        <View style={{ padding: space.md, flexDirection: 'row' }}><CtaButton ad={ad} onPress={click} /></View>
      </View>
    );
  }

  if (!ad.imageUrl) return null;
  const image = (aspect) => (
    <Image
      source={{ uri: ad.imageUrl }}
      style={[styles.media, { aspectRatio: aspect }]}
      contentFit="cover"
      transition={150}
      onLoad={() => setLoaded(true)}
      onError={() => setBroken(true)}
      accessibilityLabel={ad.altText || ad.headline || `Advertisement by ${ad.advertiserName}`}
    />
  );

  if (fmt === 'NATIVE') {
    return (
      <Pressable
        ref={ref}
        collapsable={false}
        onPress={click}
        accessibilityRole="link"
        accessibilityLabel={a11yName(ad)}
        style={({ pressed }) => [styles.card, pressed && !preview && { opacity: 0.95 }, style]}
      >
        <View style={{ padding: space.md, paddingBottom: space.sm }}><Label ad={ad} /></View>
        {image(1.91)}
        <View style={{ padding: space.md, gap: 6 }}>
          <T variant="h3" numberOfLines={2}>{ad.headline}</T>
          {ad.body ? <T variant="small" numberOfLines={3}>{ad.body}</T> : null}
          <View style={{ flexDirection: 'row', marginTop: 4 }}><CtaButton ad={ad} onPress={click} /></View>
        </View>
      </Pressable>
    );
  }

  // IMAGE
  return (
    <Pressable
      ref={ref}
      collapsable={false}
      onPress={click}
      accessibilityRole="link"
      accessibilityLabel={a11yName(ad)}
      style={({ pressed }) => [styles.card, pressed && !preview && { opacity: 0.95 }, style]}
    >
      <View style={{ padding: space.md, paddingBottom: space.sm }}><Label ad={ad} /></View>
      {image(wide ? Math.max(1.2, Math.min(wide, 4)) : 16 / 9)}
      <View style={{ height: space.sm }} />
    </Pressable>
  );
};

/* ---------------- slot ---------------- */

export default function AdSlot({ placement, category = '', limit, style, itemStyle }) {
  const { ads, placement: info } = useAds(placement, { category, limit });
  if (!ads.length) return null;
  return (
    <View style={[{ gap: space.md }, style]}>
      {ads.map((ad) => <AdCreative key={ad.token} ad={ad} placementInfo={info} style={itemStyle} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.sand, overflow: 'hidden' },
  media: { width: '100%', backgroundColor: colors.paperDeep, overflow: 'hidden' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labelChip: { backgroundColor: colors.paperDeep, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 2 },
  labelText: { fontFamily: fonts.bold, fontSize: 11.5, letterSpacing: 0.4, color: colors.inkSoft },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brand, borderRadius: radius.pill, paddingHorizontal: 16, height: 38 },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(26,23,20,0.6)', alignItems: 'center', justifyContent: 'center' },
  muted: { position: 'absolute', left: 10, bottom: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(26,23,20,0.55)', alignItems: 'center', justifyContent: 'center' },
  skip: { position: 'absolute', right: 10, bottom: 10, backgroundColor: 'rgba(26,23,20,0.7)', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6 },
});
