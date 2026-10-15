import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { Reveal } from '../components/ui/motion';
import AdSlot from '../components/ads/AdSlot';
import { MapPin, Clock, Users, ArrowRight, Sparkles, CalendarX2, CalendarDays, Ban } from 'lucide-react';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=70';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All events' },
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'ONGOING', label: 'Happening now' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_STYLE = {
  UPCOMING: { label: 'Upcoming', cls: 'bg-sky-tint text-sky-ink' },
  ONGOING: { label: 'Happening now', cls: 'bg-marigold-tint text-marigold-text' },
  COMPLETED: { label: 'Completed', cls: 'bg-pine-tint text-pine' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-brand text-white' },
};

const dateParts = (d) => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return {
    month: date.toLocaleDateString('en-GB', { month: 'short' }),
    day: date.getDate(),
    weekday: date.toLocaleDateString('en-GB', { weekday: 'short' }),
    full: date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  };
};

const capacity = (event) => {
  const joined = event.joinedUsers ? event.joinedUsers.length : 0;
  const max = Number(event.maxParticipants) || 0;
  const pct = max > 0 ? Math.min(100, Math.round((joined / max) * 100)) : 0;
  return { joined, max, pct, isFull: max > 0 && joined >= max };
};

const DateBlock = ({ date, cancelled, large = false }) => {
  const p = dateParts(date);
  if (!p) return null;
  return (
    <div
      className={`shrink-0 flex flex-col items-center justify-center rounded-2xl bg-white text-center shadow-[var(--shadow-soft)] border border-sand ${
        large ? 'w-20 h-20' : 'w-16 h-16'
      } ${cancelled ? 'opacity-80' : ''}`}
      aria-label={p.full}
    >
      <span className={`text-xs font-bold uppercase tracking-wider ${cancelled ? 'text-muted' : 'text-brand'}`}>{p.month}</span>
      <span className={`font-display font-bold leading-none text-ink ${large ? 'text-3xl' : 'text-2xl'} ${cancelled ? 'line-through decoration-brand/60' : ''}`}>
        {p.day}
      </span>
    </div>
  );
};

const CapacityMeter = ({ event, dark = false }) => {
  const { joined, max, pct, isFull } = capacity(event);
  if (!max) return null;
  return (
    <div>
      <div className={`flex items-center justify-between text-xs mb-1.5 ${dark ? 'text-white/90' : ''}`}>
        <span className={`flex items-center gap-1.5 font-semibold ${dark ? '' : 'text-ink-soft'}`}>
          <Users className="w-3.5 h-3.5" aria-hidden="true" /> {joined} of {max} joined
        </span>
        <span className={dark ? 'text-white/80' : isFull ? 'font-semibold text-brand' : 'text-muted'}>
          {isFull ? 'Fully booked' : `${Math.max(0, max - joined)} seats left`}
        </span>
      </div>
      <div
        className={`progress-track ${dark ? '!bg-white/20' : ''}`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Seats taken"
      >
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const StatusChip = ({ status, className = '' }) => {
  const s = STATUS_STYLE[status];
  if (!s) return null;
  return (
    <span className={`chip ${s.cls} ${className}`}>
      {status === 'CANCELLED' && <Ban className="w-3.5 h-3.5" aria-hidden="true" />}
      {s.label}
    </span>
  );
};

const FeaturedEvent = ({ event }) => {
  const cancelled = event.status === 'CANCELLED';
  return (
    <Link
      to={`/events/${event._id}`}
      className="group card card-hover overflow-hidden grid md:grid-cols-5 focus-visible:!outline-offset-4"
    >
      <div className="relative md:col-span-3 aspect-[16/10] md:aspect-auto md:min-h-[22rem] bg-paper-deep overflow-hidden">
        <img
          src={event.coverImage || FALLBACK_IMAGE}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04] ${
            cancelled ? 'grayscale-[60%]' : ''
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
          <span className="chip bg-marigold-tint text-marigold-text shadow-sm">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Featured
          </span>
          {event.category && <span className="chip bg-white/95 text-ink shadow-sm">{event.category}</span>}
        </div>
      </div>
      <div className="md:col-span-2 p-6 sm:p-8 flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <DateBlock date={event.date} cancelled={cancelled} large />
          <div className="min-w-0 space-y-2">
            <StatusChip status={event.status} />
            <h2 className={`text-2xl sm:text-3xl font-bold text-ink leading-tight group-hover:text-brand transition-colors ${cancelled ? 'line-through decoration-brand/50' : ''}`}>
              {event.title}
            </h2>
          </div>
        </div>
        {event.description && <p className="text-muted leading-relaxed line-clamp-3">{event.description}</p>}
        <ul className="space-y-2 text-sm text-ink-soft">
          {event.location && (
            <li className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand shrink-0" aria-hidden="true" /> <span className="truncate">{event.location}</span>
            </li>
          )}
          {(event.startTime || event.endTime) && (
            <li className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand shrink-0" aria-hidden="true" /> {event.startTime} – {event.endTime}
            </li>
          )}
        </ul>
        <div className="mt-auto space-y-4">
          {!cancelled && <CapacityMeter event={event} />}
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink group-hover:text-brand transition-colors">
            View event <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
};

const EventCard = ({ event }) => {
  const cancelled = event.status === 'CANCELLED';
  return (
    <Link
      to={`/events/${event._id}`}
      className={`group card card-hover h-full overflow-hidden flex flex-col focus-visible:!outline-offset-4 ${
        event.isFeatured ? 'ring-2 ring-marigold/60' : ''
      }`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper-deep">
        <img
          src={event.coverImage || FALLBACK_IMAGE}
          alt=""
          loading="lazy"
          className={`w-full h-full object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04] ${
            cancelled ? 'grayscale-[60%]' : ''
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-1.5">
          <span className="flex flex-wrap gap-1.5">
            {event.isFeatured && (
              <span className="chip bg-marigold-tint text-marigold-text shadow-sm">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Featured
              </span>
            )}
            {event.category && <span className="chip bg-white/95 text-ink shadow-sm">{event.category}</span>}
          </span>
          <StatusChip status={event.status} className="shadow-sm" />
        </div>
      </div>

      <div className="relative px-5 pb-5 flex flex-col gap-3 flex-grow">
        <div className="-mt-8 relative z-10">
          <DateBlock date={event.date} cancelled={cancelled} />
        </div>
        <h3 className={`font-display text-lg font-semibold text-ink leading-snug line-clamp-2 group-hover:text-brand transition-colors ${cancelled ? 'line-through decoration-brand/50' : ''}`}>
          {event.title}
        </h3>
        {event.description && <p className="text-sm text-muted leading-relaxed line-clamp-2">{event.description}</p>}

        <div className="mt-auto space-y-3 pt-2">
          <div className="space-y-1.5 text-sm text-ink-soft">
            {event.location && (
              <p className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-brand shrink-0" aria-hidden="true" /> <span className="truncate">{event.location}</span>
              </p>
            )}
            {(event.startTime || event.endTime) && (
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand shrink-0" aria-hidden="true" /> {event.startTime} – {event.endTime}
              </p>
            )}
          </div>
          {cancelled ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-brand pt-3 border-t border-sand">
              <CalendarX2 className="w-4 h-4" aria-hidden="true" /> This event has been cancelled
            </p>
          ) : (
            <div className="pt-3 border-t border-sand">
              <CapacityMeter event={event} />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await API.get('/events');
      if (res.data.success) {
        setEvents(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = events.filter((e) =>
    statusFilter === 'ALL' ? true : e.status === statusFilter
  );

  // Spotlight the first featured, non-cancelled event (the API already sorts featured first).
  const spotlight = filteredEvents.find((e) => e.isFeatured && e.status !== 'CANCELLED');
  const gridEvents = spotlight ? filteredEvents.filter((e) => e._id !== spotlight._id) : filteredEvents;

  return (
    <div className="pb-20">
      {/* Header */}
      <header className="bg-paper-deep/60 border-b border-sand grain">
        <div className="container-page pt-10 sm:pt-14 pb-8 space-y-6">
          <div className="max-w-2xl space-y-3 animate-rise">
            <span className="eyebrow">
              <CalendarDays className="w-4 h-4" aria-hidden="true" /> Events · <span className="deva normal-case tracking-normal">कार्यक्रम</span>
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-ink leading-[1.08]">Show up, together</h1>
            <p className="text-muted text-lg leading-relaxed">
              Community gatherings, clean-ups and volunteer drives organised by the HATEYMALO team. Pick one, save a seat, and come lend a hand.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
            <div role="tablist" aria-label="Filter events by status" className="flex items-center gap-2 pb-1 w-max">
              {STATUS_FILTERS.map((st) => {
                const active = statusFilter === st.value;
                return (
                  <button
                    key={st.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStatusFilter(st.value)}
                    className={`min-h-10 px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-all border ${
                      active
                        ? 'bg-ink text-white border-ink shadow-[var(--shadow-soft)]'
                        : 'bg-white text-ink-soft border-sand hover:border-ink'
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <div className="container-page pt-10 space-y-10">
        {/* Sponsored card at the top of the list (nothing when no ad is served) */}
        <AdSlot placement="events.list" layout="wide" />
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading events">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-96 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <>
            {spotlight && (
              <Reveal>
                <FeaturedEvent event={spotlight} />
              </Reveal>
            )}
            {gridEvents.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {gridEvents.map((event, i) => (
                  <Reveal key={event._id} delay={(i % 3) * 80} className="h-full">
                    <EventCard event={event} />
                  </Reveal>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="card p-10 sm:p-14 text-center max-w-xl mx-auto space-y-4">
            <span className="mx-auto w-14 h-14 rounded-full bg-paper-deep flex items-center justify-center">
              <CalendarX2 className="w-6 h-6 text-muted" aria-hidden="true" />
            </span>
            <h2 className="text-2xl font-bold text-ink">No events here yet</h2>
            <p className="text-muted">
              {statusFilter === 'ALL'
                ? 'There are no events scheduled right now. New gatherings will appear here as soon as they are announced.'
                : 'Nothing matches this filter. Try looking at all events instead.'}
            </p>
            {statusFilter !== 'ALL' && (
              <button type="button" onClick={() => setStatusFilter('ALL')} className="btn btn-ghost">
                Show all events
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;
