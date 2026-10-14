import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import CommentSection from '../components/CommentSection';
import Avatar from '../components/ui/Avatar';
import { Reveal } from '../components/ui/motion';
import {
  CalendarDays,
  MapPin,
  Clock,
  Users,
  ArrowLeft,
  Heart,
  UserCheck,
  UserPlus,
  ShieldCheck,
  Ban,
  CalendarX2,
  Sparkles,
} from 'lucide-react';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1600&q=70';

const STATUS_STYLE = {
  UPCOMING: { label: 'Upcoming', cls: 'bg-sky-tint text-sky-ink' },
  ONGOING: { label: 'Happening now', cls: 'bg-marigold-tint text-marigold-text' },
  COMPLETED: { label: 'Completed', cls: 'bg-pine-tint text-pine' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-brand text-white' },
};

const MAX_FACES = 12;

const Fact = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3 min-w-0">
    <span className="w-10 h-10 shrink-0 rounded-xl bg-brand-tint text-brand flex items-center justify-center">
      <Icon className="w-5 h-5" aria-hidden="true" />
    </span>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <div className="text-ink font-medium leading-snug break-words">{children}</div>
    </div>
  </div>
);

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEvent = async () => {
    try {
      const res = await API.get(`/events/${id}`);
      if (res.data.success) {
        setEvent(res.data.data);
      }
    } catch (error) {
      showToast('Failed to load event details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="container-page pt-8 pb-20 space-y-6" aria-busy="true" aria-label="Loading event">
        <div className="h-5 w-40 bg-paper-deep animate-pulse rounded-full" />
        <div className="h-72 sm:h-[26rem] bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-80 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
          <div className="h-80 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container-page py-20">
        <div className="card max-w-md mx-auto p-10 text-center space-y-4">
          <span className="mx-auto w-14 h-14 rounded-full bg-paper-deep flex items-center justify-center">
            <CalendarX2 className="w-6 h-6 text-muted" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold text-ink">We couldn't find this event</h1>
          <p className="text-muted">It may have been removed, or the link may be incorrect.</p>
          <Link to="/events" className="btn btn-primary">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to events
          </Link>
        </div>
      </div>
    );
  }

  const {
    title,
    description,
    coverImage,
    category,
    location,
    date,
    startTime,
    endTime,
    maxParticipants,
    status,
    creator,
    isFeatured,
    joinedUsers = [],
    interestedUsers = [],
  } = event;

  const isJoined = user && joinedUsers.some((u) => u._id === user._id || u === user._id);
  const isInterested = user && interestedUsers.some((u) => u._id === user._id || u === user._id);
  const joinedCount = joinedUsers.length;
  const isFull = joinedCount >= maxParticipants;
  const cancelled = status === 'CANCELLED';
  const max = Number(maxParticipants) || 0;
  const pct = max > 0 ? Math.min(100, Math.round((joinedCount / max) * 100)) : 0;
  const seatsLeft = Math.max(0, max - joinedCount);

  const dateObj = new Date(date);
  const validDate = !Number.isNaN(dateObj.getTime());
  const dateLabel = validDate
    ? dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  const dateNepali = validDate
    ? dateObj.toLocaleDateString('ne-NP', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const statusStyle = STATUS_STYLE[status];

  const handleJoinToggle = async () => {
    if (!user) {
      showToast('Please log in to join official events', 'info');
      navigate('/login');
      return;
    }

    setActionLoading(true);
    try {
      const res = await API.post(`/events/${id}/join`);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchEvent();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Join failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInterestToggle = async () => {
    if (!user) {
      showToast('Please log in to mark interest', 'info');
      navigate('/login');
      return;
    }

    setActionLoading(true);
    try {
      const res = await API.post(`/events/${id}/interest`);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchEvent();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const faces = joinedUsers.slice(0, MAX_FACES);
  const extraFaces = joinedUsers.length - faces.length;

  return (
    <div className="container-page pt-6 sm:pt-8 pb-20 space-y-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate('/events')}
        className="inline-flex items-center gap-2 min-h-10 text-sm font-semibold text-ink-soft hover:text-brand transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All events
      </button>

      {/* Cancelled banner */}
      {cancelled && (
        <div role="alert" className="flex items-start gap-3 rounded-[var(--radius-card)] border border-brand/30 bg-brand-tint p-4 sm:p-5 animate-rise">
          <span className="w-10 h-10 shrink-0 rounded-full bg-brand text-white flex items-center justify-center">
            <Ban className="w-5 h-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-lg font-bold text-brand-dark">This event has been cancelled</p>
            <p className="text-sm text-ink-soft">
              Registration is closed. Please don't travel to the venue for this event. We'll share any new dates on the events page.
            </p>
          </div>
        </div>
      )}

      {/* Cover */}
      <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-paper-deep h-64 sm:h-[24rem] lg:h-[28rem] shadow-[var(--shadow-soft)] animate-in">
        <img
          src={coverImage || FALLBACK_IMAGE}
          alt=""
          className={`w-full h-full object-cover ${cancelled ? 'grayscale-[60%]' : ''}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2">
          {category && <span className="chip bg-white/95 text-ink shadow-sm">{category}</span>}
          {statusStyle && (
            <span className={`chip shadow-sm ${statusStyle.cls}`}>
              {cancelled && <Ban className="w-3.5 h-3.5" aria-hidden="true" />}
              {statusStyle.label}
            </span>
          )}
          {isFeatured && (
            <span className="chip bg-marigold-tint text-marigold-text shadow-sm">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Featured
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
        {/* RSVP panel — appears right after the cover on mobile, sticky in the right column on desktop */}
        <aside className="lg:col-start-3 lg:row-start-1">
          <div className="card p-6 space-y-5 lg:sticky lg:top-28">
            <div className="space-y-1">
              <span className="eyebrow deva">सहभागी हुनुहोस्</span>
              <h2 className="text-2xl font-bold text-ink">Save your seat</h2>
              <p className="text-sm text-muted">Free to join. Let the organisers know you're coming.</p>
            </div>

            {max > 0 && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-3xl font-bold text-ink tabular-nums">
                    {joinedCount}
                    <span className="text-base font-medium text-muted"> / {max}</span>
                  </span>
                  <span className={`text-sm font-semibold ${isFull ? 'text-brand' : 'text-pine'}`}>
                    {isFull ? 'Fully booked' : `${seatsLeft} ${seatsLeft === 1 ? 'seat' : 'seats'} left`}
                  </span>
                </div>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Seats taken"
                >
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted">{joinedCount} registered · capacity {max}</p>
              </div>
            )}

            {/* Join / Leave */}
            <button
              type="button"
              onClick={handleJoinToggle}
              disabled={actionLoading || cancelled || (isFull && !isJoined)}
              className={`btn btn-lg w-full ${
                isJoined ? 'btn-ghost' : cancelled || isFull ? 'bg-paper-deep text-muted' : 'btn-primary'
              }`}
            >
              {cancelled ? (
                <>
                  <Ban className="w-4 h-4" aria-hidden="true" /> Event cancelled
                </>
              ) : isJoined ? (
                <>
                  <UserCheck className="w-4 h-4" aria-hidden="true" /> You're going · Cancel registration
                </>
              ) : isFull ? (
                'Event fully booked'
              ) : (
                <>
                  <UserPlus className="w-4 h-4" aria-hidden="true" /> Register &amp; join
                </>
              )}
            </button>

            {/* Interest */}
            <button
              type="button"
              onClick={handleInterestToggle}
              disabled={actionLoading}
              aria-pressed={!!isInterested}
              className={`btn w-full ${isInterested ? 'bg-brand-tint text-brand border border-brand/30' : 'btn-ghost'}`}
            >
              <Heart className={`w-4 h-4 ${isInterested ? 'fill-brand' : ''}`} aria-hidden="true" />
              {isInterested ? 'Interested' : "I'm interested"}
              <span className="text-muted font-medium">· {interestedUsers.length}</span>
            </button>

            {/* Organiser */}
            {creator && (
              <div className="pt-5 border-t border-sand">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Organised by</p>
                <div className="flex items-center gap-3">
                  <Avatar name={creator.name} src={creator.profilePicture} size="md" />
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{creator.name}</p>
                    <p className="text-xs text-pine flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> HATEYMALO team
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main column */}
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1 space-y-8 min-w-0">
          <div className="space-y-6">
            <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-ink leading-[1.1] ${cancelled ? 'line-through decoration-brand/50 decoration-2' : ''}`}>
              {title}
            </h1>

            <div className="card p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Fact icon={CalendarDays} label="Date">
                {dateLabel}
                {dateNepali && <span className="block text-sm text-muted font-normal deva">{dateNepali}</span>}
              </Fact>
              <Fact icon={Clock} label="Time">
                {startTime || endTime ? `${startTime || ''} – ${endTime || ''}` : 'To be announced'}
              </Fact>
              <Fact icon={MapPin} label="Location">
                {location || 'To be announced'}
              </Fact>
              {max > 0 && (
                <Fact icon={Users} label="Capacity">
                  {max} participants
                </Fact>
              )}
            </div>
          </div>

          <Reveal as="section" className="space-y-3">
            <h2 className="text-2xl font-bold text-ink">About this event</h2>
            <p className="text-ink-soft text-base sm:text-lg leading-relaxed whitespace-pre-line max-w-[68ch]">{description}</p>
          </Reveal>

          {/* Attendees */}
          <Reveal as="section" className="card p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                <Users className="w-5 h-5 text-pine" aria-hidden="true" /> Who's going
              </h2>
              <span className="chip bg-pine-tint text-pine">
                {joinedCount}
                {max > 0 ? ` / ${max}` : ''}
              </span>
            </div>
            {joinedUsers.length > 0 ? (
              <>
                <ul className="flex flex-wrap gap-x-4 gap-y-3">
                  {faces.map((u) => (
                    <li key={u._id || u} className="flex items-center gap-2 min-w-0">
                      <Avatar name={u.name || 'Participant'} src={u.profilePicture} size="sm" className="ring-2 ring-white" />
                      <span className="text-sm font-medium text-ink-soft truncate max-w-[10rem]">{u.name || 'Participant'}</span>
                    </li>
                  ))}
                </ul>
                {extraFaces > 0 && <p className="text-sm text-muted">and {extraFaces} more</p>}
              </>
            ) : (
              <p className="text-muted">
                {cancelled ? 'No one is registered for this event.' : 'No one has registered yet — be the first to join.'}
              </p>
            )}
          </Reveal>

          {/* Discussion */}
          <CommentSection postId={id} />
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
