import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Heart,
} from 'lucide-react';

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase tracking-widest">
          <Calendar className="w-4 h-4" /> Official Assemblies & Initiatives
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Official Admin Events</h1>
        <p className="text-sm text-slate-600 max-w-2xl">
          Participate in curated civic assemblies, national tree plantation summits, and youth volunteer drives organized by platform administrators.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['ALL', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === st
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            {st === 'ALL' ? 'All Events' : st}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-80 rounded-3xl animate-pulse bg-slate-200" />
          ))}
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const joinedCount = event.joinedUsers ? event.joinedUsers.length : 0;
            const isFull = joinedCount >= event.maxParticipants;

            return (
              <div
                key={event._id}
                className="group bg-white rounded-3xl overflow-hidden border border-slate-200 hover:border-teal-500/50 transition-all duration-300 flex flex-col justify-between shadow-md"
              >
                {/* Cover Image */}
                <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={event.coverImage || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80'}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />
                  
                  <div className="absolute top-3 left-3">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/90 text-slate-900">
                      {event.category}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                      event.status === 'UPCOMING'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : event.status === 'ONGOING'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4 flex-grow flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-2">
                      {event.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-teal-700 font-semibold truncate max-w-[170px]">
                        <MapPin className="w-3.5 h-3.5 text-[#C8382C]" /> {event.location}
                      </span>
                      <span className="flex items-center gap-1.5 text-sky-700 font-semibold">
                        <Calendar className="w-3.5 h-3.5" /> {new Date(event.date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-700" /> {event.startTime} - {event.endTime}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                        <Users className="w-3.5 h-3.5" /> {joinedCount} / {event.maxParticipants}
                      </span>
                    </div>
                  </div>

                  <Link
                    to={`/events/${event._id}`}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-800 border border-slate-200 transition-all flex items-center justify-center gap-1.5"
                  >
                    View Event Details <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
          <p className="text-slate-600 text-sm">No official events found for this filter.</p>
        </div>
      )}

    </div>
  );
};

export default Events;
