import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Play, SkipForward, VolumeX, Volume2 } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { prefersReducedMotion } from '../ui/motion';
import { clickUrl, countImpression, serveAd, trackEvent } from './adTracking';

/* --------------------------------------------------------------------------
   Sponsored ad slot. Implements docs/ADS.md "Rendering rules":
   - fetches /ads/serve when it mounts; renders nothing when there is no ad,
     the request fails, an image cannot load, or settings.adsEnabled is false
   - always shows the label ("Sponsored") and "by {advertiserName}"
   - IMPRESSION once the creative has loaded and >= 1px is on screen in a
     visible tab; VIEWABLE after >= 50% stays visible for 1s (2s for video)
   - video: muted autoplay only (never with reduced motion), Skip after
     skipAfterSeconds, start / quartile / complete / skip events
   - click opens API_BASE + clickPath in a new tab (rel="noopener sponsored")
   -------------------------------------------------------------------------- */

const ratioStyle = (size, fallback) => {
  const w = Number(size?.width) || 0;
  const h = Number(size?.height) || 0;
  return { aspectRatio: w && h ? `${w} / ${h}` : fallback };
};

const AdLabel = ({ ad, onDark = false }) => (
  <p className={`flex min-w-0 items-center gap-2 text-xs ${onDark ? 'text-white/85' : 'text-muted'}`}>
    <span className={`chip !px-2 !py-0 shrink-0 ${onDark ? 'bg-white/15 text-white' : 'bg-paper-deep text-ink-soft'}`}>{ad.labelText || 'Sponsored'}</span>
    {ad.advertiserName && <span className="truncate">by {ad.advertiserName}</span>}
  </p>
);

// Link (or inert span in previews) that every click target of the ad goes through
const AdLink = ({ ad, preview, className, children, label, tabIndex }) => {
  if (preview || !ad.clickPath) {
    return <span className={className}>{children}</span>;
  }
  return (
    <a href={clickUrl(ad.clickPath)} target="_blank" rel="noopener sponsored" className={className} aria-label={label} tabIndex={tabIndex}>
      {children}
    </a>
  );
};

/**
 * One ad. Used by <AdSlot> (tracked) and by the campaign editor / admin
 * review as a live preview (`preview` = no tracking, no click-through).
 * layout: 'wide' (banners, footers, top of lists) or 'card' (in-feed grid cell)
 */
export const AdView = ({ ad, layout = 'wide', size = null, preview = false, onGone }) => {
  const rootRef = useRef(null);
  const videoRef = useRef(null);
  const sent = useRef({});
  const [rendered, setRendered] = useState(false);
  const [failed, setFailed] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [inView, setInView] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const reduced = prefersReducedMotion();
  const isVideo = ad.format === 'VIDEO';
  const tracked = !preview && !!ad.token;

  // New creative → start over
  useEffect(() => {
    sent.current = {};
    setRendered(false);
    setFailed(false);
    setSkipped(false);
    setCanSkip(false);
  }, [ad.token, ad.imageUrl, ad.videoUrl, ad.format]);

  const fire = (type) => {
    if (!tracked || sent.current[type]) return;
    if (type !== 'IMPRESSION' && !sent.current.IMPRESSION) return;
    sent.current[type] = true;
    trackEvent(ad.token, type);
  };

  // Visibility measurement
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !rendered || failed || typeof IntersectionObserver === 'undefined') return undefined;
    let ratio = 0;
    let viewTimer = null;
    const needMs = isVideo ? 2000 : 1000;
    const check = () => {
      const tabVisible = document.visibilityState === 'visible';
      if (tracked && !sent.current.IMPRESSION && tabVisible && ratio > 0) {
        fire('IMPRESSION');
        countImpression(ad.campaignId, ad.frequencyCapPerDay);
      }
      const half = tabVisible && ratio >= 0.5;
      setInView(half);
      if (tracked && sent.current.IMPRESSION && !sent.current.VIEWABLE && half) {
        if (!viewTimer) {
          viewTimer = setTimeout(() => {
            viewTimer = null;
            fire('VIEWABLE');
          }, needMs);
        }
      } else if (viewTimer) {
        clearTimeout(viewTimer);
        viewTimer = null;
      }
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
        check();
      },
      { threshold: [0, 0.01, 0.25, 0.5, 0.75, 1] }
    );
    io.observe(el);
    document.addEventListener('visibilitychange', check);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', check);
      if (viewTimer) clearTimeout(viewTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered, failed, ad.token, tracked, isVideo]);

  // Muted autoplay while at least half the video is on screen (never with reduced motion)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isVideo || skipped || reduced) return;
    if (inView) v.play?.().catch(() => {});
    else v.pause?.();
  }, [inView, isVideo, skipped, reduced]);

  useEffect(() => {
    if (failed && !preview) onGone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed]);

  if (failed) {
    return preview ? (
      <p className="rounded-2xl border border-dashed border-brand/40 bg-brand-tint px-4 py-6 text-center text-sm font-semibold text-brand">
        This {isVideo ? 'video' : 'image'} could not be loaded. Check the link.
      </p>
    ) : null;
  }
  if (skipped) return null;

  const title = ad.headline || ad.altText || ad.advertiserName || 'Advertisement';
  const ariaLabel = `${ad.labelText || 'Sponsored'}: ${title}`;
  const cta = ad.ctaLabel || 'Learn more';
  const hasImage = !!ad.imageUrl;

  const onTime = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const p = v.currentTime / v.duration;
    if (p >= 0.25) fire('VIDEO_Q25');
    if (p >= 0.5) fire('VIDEO_Q50');
    if (p >= 0.75) fire('VIDEO_Q75');
    if (!canSkip && v.currentTime >= (Number(ad.skipAfterSeconds) || 0)) setCanSkip(true);
  };

  const skip = () => {
    if (preview) {
      // Previews just rewind so the reviewer can watch again
      const v = videoRef.current;
      if (v) {
        v.pause?.();
        v.currentTime = 0;
      }
      setCanSkip(false);
      return;
    }
    fire('VIDEO_SKIP');
    videoRef.current?.pause?.();
    setSkipped(true);
    onGone?.();
  };

  const media = (() => {
    if (isVideo) {
      return (
        <div className="relative w-full overflow-hidden rounded-2xl bg-night" style={ratioStyle(size, '16 / 9')}>
          <video
            ref={videoRef}
            src={ad.videoUrl}
            poster={ad.posterUrl || undefined}
            muted={muted}
            playsInline
            preload="metadata"
            controls={reduced}
            aria-label={ad.altText || ad.headline || 'Sponsored video'}
            onLoadedMetadata={() => setRendered(true)}
            onLoadedData={() => setRendered(true)}
            onError={() => setFailed(true)}
            onPlay={() => {
              setPlaying(true);
              fire('VIDEO_START');
            }}
            onPause={() => setPlaying(false)}
            onTimeUpdate={onTime}
            onEnded={() => {
              fire('VIDEO_Q25');
              fire('VIDEO_Q50');
              fire('VIDEO_Q75');
              fire('VIDEO_COMPLETE');
            }}
            className="h-full w-full object-cover"
          />
          {!reduced && (
            <div className="absolute bottom-3 left-3 flex gap-2">
              {!playing && (
                <button type="button" onClick={() => videoRef.current?.play?.().catch(() => {})} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink/70 text-white hover:bg-ink" aria-label="Play video">
                  <Play className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              <button type="button" onClick={() => setMuted((m) => !m)} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink/70 text-white hover:bg-ink" aria-label={muted ? 'Turn sound on' : 'Mute'} aria-pressed={!muted}>
                {muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          )}
          {canSkip && (
            <button type="button" onClick={skip} className="absolute bottom-3 right-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink/80 px-4 text-sm font-semibold text-white hover:bg-ink">
              Skip <SkipForward className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      );
    }
    if (!hasImage) return null;
    const isNative = ad.format === 'NATIVE';
    const style = isNative ? { aspectRatio: layout === 'card' ? '4 / 3' : undefined } : ratioStyle(size, layout === 'card' ? '1 / 1' : '4 / 1');
    return (
      <AdLink ad={ad} preview={preview} label={ariaLabel} tabIndex={isNative ? -1 : undefined} className={`group block w-full overflow-hidden bg-paper-deep ${isNative ? (layout === 'card' ? '' : 'h-full min-h-[10rem]') : 'rounded-2xl'}`}>
        <img
          src={ad.imageUrl}
          alt={isNative ? '' : ad.altText || ad.headline || `Advertisement by ${ad.advertiserName || 'a sponsor'}`}
          loading="lazy"
          onLoad={() => setRendered(true)}
          onError={() => setFailed(true)}
          style={style}
          className={`h-full w-full ${isNative ? 'object-cover' : 'object-cover'} motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-[1.02]`}
        />
      </AdLink>
    );
  })();

  const ctaBtn = (
    <AdLink ad={ad} preview={preview} label={`${cta} — ${title} (opens in a new tab)`} className="btn btn-sm btn-ghost min-h-10 self-start">
      {cta} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
    </AdLink>
  );

  // IMAGE: the picture is the ad
  if (ad.format === 'IMAGE') {
    return (
      <aside ref={rootRef} aria-label={ariaLabel} className="space-y-2" data-ad-format="IMAGE">
        <AdLabel ad={ad} />
        {media}
      </aside>
    );
  }

  // VIDEO: player, then headline + CTA
  if (isVideo) {
    return (
      <aside ref={rootRef} aria-label={ariaLabel} className="card overflow-hidden p-3 sm:p-4 space-y-3" data-ad-format="VIDEO">
        <AdLabel ad={ad} />
        {media}
        {(ad.headline || ad.body || ad.clickPath || preview) && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              {ad.headline && <p className="font-display text-lg font-semibold leading-snug text-ink">{ad.headline}</p>}
              {ad.body && <p className="text-sm text-muted line-clamp-2">{ad.body}</p>}
            </div>
            {ctaBtn}
          </div>
        )}
      </aside>
    );
  }

  // NATIVE sponsored card
  if (layout === 'card') {
    return (
      <aside ref={rootRef} aria-label={ariaLabel} className="card h-full overflow-hidden flex flex-col" data-ad-format="NATIVE">
        {media}
        <div className="p-5 flex flex-col gap-2.5 flex-grow">
          <AdLabel ad={ad} />
          <AdLink ad={ad} preview={preview} className="font-display text-lg font-semibold text-ink leading-snug line-clamp-2 hover:text-brand">
            {ad.headline}
          </AdLink>
          {ad.body && <p className="text-sm text-muted leading-relaxed line-clamp-3">{ad.body}</p>}
          <div className="mt-auto pt-2">{ctaBtn}</div>
        </div>
      </aside>
    );
  }
  return (
    // Container query: side-by-side only when the slot itself is wide enough (also in narrow previews)
    <aside ref={rootRef} aria-label={ariaLabel} className="@container card overflow-hidden" data-ad-format="NATIVE">
      <div className="grid grid-cols-1 @xl:grid-cols-5">
        <div className="min-w-0 @xl:col-span-2 aspect-[16/9] @xl:aspect-auto">{media}</div>
        <div className="@xl:col-span-3 p-5 @xl:p-6 flex flex-col gap-2.5 justify-center min-w-0">
          <AdLabel ad={ad} />
          <AdLink ad={ad} preview={preview} className="font-display text-xl font-semibold text-ink leading-snug hover:text-brand">
            {ad.headline}
          </AdLink>
          {ad.body && <p className="text-sm text-muted leading-relaxed line-clamp-3">{ad.body}</p>}
          <div className="pt-1">{ctaBtn}</div>
        </div>
      </div>
    </aside>
  );
};

/**
 * <AdSlot placement="home.banner" category="Health" layout="wide" className="…" />
 * Renders nothing at all (no wrapper, no gap) unless an ad is actually served.
 */
const AdSlot = ({ placement, category = '', layout = 'wide', className = '' }) => {
  const { settings } = useSettings();
  const off = settings?.adsEnabled === false;
  const [served, setServed] = useState(null);
  const [gone, setGone] = useState(false);
  const cat = category && category !== 'All' ? category : '';

  useEffect(() => {
    if (off) return undefined;
    const ctrl = new AbortController();
    let release = null;
    setGone(false);
    serveAd({ placement, category: cat, signal: ctrl.signal })
      .then((r) => {
        if (!r) return;
        if (ctrl.signal.aborted) {
          r.release();
          return;
        }
        release = r.release;
        setServed(r);
      })
      .catch(() => {});
    return () => {
      ctrl.abort();
      release?.();
      setServed(null);
    };
  }, [placement, cat, off]);

  if (off || !served || gone) return null;
  return (
    <div className={className}>
      <AdView ad={served.ad} size={served.placement} layout={layout} onGone={() => setGone(true)} />
    </div>
  );
};

export default AdSlot;
