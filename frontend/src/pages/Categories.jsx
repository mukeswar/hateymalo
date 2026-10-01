import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
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
  Grid,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase tracking-widest">
          <Grid className="w-4 h-4" /> Category Directory
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Browse Causes & Help Domains</h1>
        <p className="text-sm text-slate-600 max-w-2xl">
          Explore specialized collaboration channels ranging from local street sanitation to academic guidance and environmental restoration.
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="h-48 rounded-2xl animate-pulse bg-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {categories.map((cat) => {
            const IconComponent = ICON_MAP[cat.icon] || HeartHandshake;
            return (
              <Link
                key={cat._id}
                to={`/explore?category=${encodeURIComponent(cat.name)}`}
                className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-teal-500/50 hover:bg-slate-50 transition-all duration-300 flex flex-col justify-between space-y-4 group shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                    {cat.postCount || 0} Posts
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {cat.description || 'Community help and collaboration category.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-700">
                  <span>Explore Drives</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default Categories;
