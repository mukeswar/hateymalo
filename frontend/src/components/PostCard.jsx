import React from 'react';
import { Link } from 'react-router-dom';
import VerificationBadge from './VerificationBadge';
import Avatar from './ui/Avatar';
import { Tilt } from './ui/motion';
import { MapPin, CalendarDays, Heart, ArrowUpRight, CheckCircle2 } from 'lucide-react';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1549819363-10acf530e110?auto=format&fit=crop&w=800&q=70';

const formatDate = (d) => {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const PostCard = ({ post }) => {
  if (!post) return null;

  const {
    _id,
    title,
    description,
    category,
    location,
    images = [],
    creator,
    joinedUsers = [],
    interestedUsers = [],
    requiredMembers,
    dateTime,
    status,
  } = post;

  const coverImage = images.length > 0 ? images[0] : FALLBACK_IMAGE;
  const joined = joinedUsers.length;
  const needed = Number(requiredMembers) || 0;
  const pct = needed > 0 ? Math.min(100, Math.round((joined / needed) * 100)) : null;
  const when = formatDate(dateTime);
  const completed = status === 'COMPLETED';

  return (
    <Tilt max={4} className="h-full rounded-[var(--radius-card)]">
      <Link
        to={`/post/${_id}`}
        className="group card card-hover h-full overflow-hidden flex flex-col focus-visible:!outline-offset-4"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-paper-deep">
          <img
            src={coverImage}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {category && <span className="chip bg-white/95 text-ink shadow-sm">{category}</span>}
            {completed && (
              <span className="chip bg-pine text-white shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Completed
              </span>
            )}
          </div>
          {location && (
            <span className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 text-white text-sm font-medium drop-shadow">
              <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{location}</span>
            </span>
          )}
        </div>

        <div className="p-5 flex flex-col gap-3 flex-grow">
          <h3 className="font-display text-lg font-semibold text-ink leading-snug line-clamp-2 group-hover:text-brand transition-colors">
            {title}
          </h3>
          {description && <p className="text-sm text-muted leading-relaxed line-clamp-2">{description}</p>}

          <div className="mt-auto space-y-3 pt-2">
            {pct !== null && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-ink-soft">
                    {joined} of {needed} helpers joined
                  </span>
                  <span className="text-muted">{pct}%</span>
                </div>
                <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Helpers joined">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-sand">
              {creator ? (
                <span className="flex items-center gap-2 min-w-0">
                  <Avatar name={creator.name} src={creator.profilePicture} size="xs" />
                  <span className="text-xs font-medium text-ink-soft truncate">{creator.name}</span>
                  <VerificationBadge level={creator.memberLevel} isVerified={creator.isVerified} showLabel={false} />
                </span>
              ) : (
                <span />
              )}
              <span className="flex items-center gap-3 text-xs text-muted shrink-0">
                {when && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" /> {when}
                  </span>
                )}
                <span className="flex items-center gap-1" title={`${interestedUsers.length} interested`}>
                  <Heart className="w-3.5 h-3.5" aria-hidden="true" /> {interestedUsers.length}
                </span>
                <ArrowUpRight className="w-4 h-4 text-brand opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </Tilt>
  );
};

export default PostCard;
