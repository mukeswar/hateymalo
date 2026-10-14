import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { Award, Sparkles, Trophy, HandHeart, Trees, Heart, BookOpen, PenLine } from 'lucide-react';

// Badges come from the API with an emoji icon; show a matching line icon instead.
const ICONS_BY_ID = {
  first_helper: Trophy,
  active_volunteer: HandHeart,
  environmental_hero: Trees,
  community_contributor: Heart,
  education_helper: BookOpen,
  active_writer: PenLine,
};

const ICONS_BY_EMOJI = {
  '🏆': Trophy,
  '🤝': HandHeart,
  '🌳': Trees,
  '❤️': Heart,
  '❤': Heart,
  '📚': BookOpen,
  '📝': PenLine,
};

const stripEmoji = (s = '') => String(s).replace(/[\p{Extended_Pictographic}️‍]/gu, '').trim();

const BadgeList = ({ userId }) => {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const res = await API.get(`/badges/user/${userId}`);
        if (res.data.success) {
          setBadges(res.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch user badges:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchBadges();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-hidden="true">
        <div className="h-20 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
        <div className="h-20 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="surface-sunken p-5 flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-marigold-tint text-marigold-text flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" aria-hidden="true" />
        </span>
        <p className="text-sm text-ink-soft">
          No badges yet. Badges are earned by joining help requests, events and community drives.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <Award className="w-4 h-4 text-marigold-text" aria-hidden="true" />
        Badges earned <span className="chip bg-marigold-tint text-marigold-text">{badges.length}</span>
      </h4>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {badges.map((b) => {
          const Icon = ICONS_BY_ID[b.id] || ICONS_BY_EMOJI[b.icon] || Award;
          return (
            <li key={b.id} className="card card-hover p-4 flex items-center gap-3.5">
              <span className="w-11 h-11 rounded-2xl bg-marigold-tint text-marigold-text flex items-center justify-center shrink-0 ring-1 ring-marigold/30">
                <Icon className="w-5 h-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h5 className="font-semibold text-ink text-sm leading-snug">{stripEmoji(b.title)}</h5>
                {b.description && <p className="text-xs text-muted leading-snug mt-0.5">{b.description}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default BadgeList;
