import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { Award, Sparkles } from 'lucide-react';

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
    return <div className="h-16 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />;
  }

  if (badges.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 text-center flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
        <span>No community badges unlocked yet. Participate in help posts & events to earn badges!</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-amber-600" /> Unlocked Community Badges ({badges.length})
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {badges.map((b) => (
          <div
            key={b.id}
            className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-xs flex items-center gap-3 hover:border-amber-400 transition-all"
          >
            <div className="text-2xl p-2 rounded-xl bg-amber-50 border border-amber-200 shrink-0">
              {b.icon}
            </div>
            <div>
              <h5 className="font-bold text-slate-900 text-xs">{b.title}</h5>
              <p className="text-[10px] text-slate-600 leading-tight mt-0.5">{b.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BadgeList;
