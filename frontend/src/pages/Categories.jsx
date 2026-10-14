import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { Reveal } from '../components/ui/motion';
import {
  HeartHandshake,
  BookOpen,
  GraduationCap,
  FileText,
  Sparkles,
  Trash2,
  Trees,
  Users,
  Smile,
  Megaphone,
  Briefcase,
  MoreHorizontal,
  ArrowRight,
  LayoutGrid,
} from 'lucide-react';

const ICON_MAP = {
  HeartHandshake: HeartHandshake,
  BookOpen: BookOpen,
  GraduationCap: GraduationCap,
  FileText: FileText,
  Sparkles: Sparkles,
  Trash2: Trash2,
  Trees: Trees,
  Users: Users,
  Smile: Smile,
  Megaphone: Megaphone,
  Briefcase: Briefcase,
  MoreHorizontal: MoreHorizontal,
};

// Rotating, calm tile accents drawn from the design tokens.
const TONES = [
  { icon: 'bg-brand-tint text-brand', glow: 'from-brand-tint' },
  { icon: 'bg-pine-tint text-pine', glow: 'from-pine-tint' },
  { icon: 'bg-marigold-tint text-marigold-text', glow: 'from-marigold-tint' },
  { icon: 'bg-sky-tint text-sky-ink', glow: 'from-sky-tint' },
];

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await API.get('/categories?activeOnly=true');
        if (res.data.success) {
          setCategories(res.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="pb-20">
      {/* Header */}
      <header className="container-page pt-10 sm:pt-14 pb-10">
        <div className="max-w-2xl">
          <p className="eyebrow">
            <LayoutGrid className="w-4 h-4" aria-hidden="true" /> Causes
            <span className="deva normal-case tracking-normal font-semibold text-ink-soft">· सरोकारहरू</span>
          </p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-bold text-ink">Pick a cause close to your heart</h1>
          <p className="mt-3 text-muted text-lg">
            From riverbank clean-ups to homework help, every cause gathers the requests people have shared. Choose one to see where you can pitch in.
          </p>
        </div>
      </header>

      <div className="container-page">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-hidden="true">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-56 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="card max-w-lg mx-auto p-10 sm:p-14 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-paper-deep text-brand flex items-center justify-center">
              <LayoutGrid className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-ink">No causes to show right now</h2>
            <p className="mt-2 text-muted">You can still browse every open help request.</p>
            <Link to="/explore" className="btn btn-primary mt-6">
              Browse help requests <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat, i) => {
              const IconComponent = ICON_MAP[cat.icon] || HeartHandshake;
              const tone = TONES[i % TONES.length];
              const count = cat.postCount || 0;
              return (
                <Reveal key={cat._id} delay={Math.min(i, 6) * 60} className="h-full">
                  <Link
                    to={`/explore?category=${encodeURIComponent(cat.name)}`}
                    className="group card card-hover relative h-full overflow-hidden p-6 sm:p-7 flex flex-col gap-5"
                  >
                    <div
                      className={`pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br ${tone.glow} to-transparent opacity-70 transition-transform duration-700 group-hover:scale-125`}
                      aria-hidden="true"
                    />
                    <div className="relative flex items-start justify-between gap-4">
                      <span className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105 ${tone.icon}`}>
                        <IconComponent className="w-7 h-7" aria-hidden="true" />
                      </span>
                      <span className="chip bg-paper-deep text-ink-soft">
                        {count} {count === 1 ? 'request' : 'requests'}
                      </span>
                    </div>

                    <div className="relative flex-grow">
                      <h2 className="text-xl font-semibold text-ink group-hover:text-brand transition-colors">{cat.name}</h2>
                      <p className="mt-1.5 text-muted leading-relaxed line-clamp-3">
                        {cat.description || 'Community help and collaboration requests.'}
                      </p>
                    </div>

                    <div className="relative pt-4 border-t border-sand flex items-center justify-between text-sm font-semibold text-brand">
                      <span>See requests</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Categories;
