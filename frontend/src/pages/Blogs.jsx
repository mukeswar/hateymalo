import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import {
  BookOpen,
  Eye,
  Heart,
  PlusCircle,
  Sparkles,
  ArrowRight,
  User,
  Calendar,
  Search,
} from 'lucide-react';

const Blogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category && category !== 'All') params.append('category', category);

      const res = await API.get(`/blogs?${params.toString()}`);
      if (res.data.success) {
        setBlogs(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [category]);

  const featuredBlogs = blogs.filter((b) => b.isFeatured);
  const regularBlogs = blogs;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Header & Submit Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase tracking-widest">
            <BookOpen className="w-4 h-4" /> Community Stories & Voices
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Community Blog Directory</h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Read inspiring stories of mutual aid, volunteer experiences, and civic impact shared by citizens across Nepal.
          </p>
        </div>

        <Link
          to="/create-blog"
          className="px-5 py-3 rounded-2xl font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-lg transition-all text-sm flex items-center justify-center gap-2 shrink-0"
        >
          <PlusCircle className="w-4 h-4" /> Write & Submit Blog
        </Link>
      </div>

      {/* Featured Stories Carousel/Grid */}
      {featuredBlogs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-700 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> Featured Stories
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredBlogs.map((blog) => (
              <Link
                key={blog._id}
                to={`/blogs/${blog._id}`}
                className="group relative rounded-3xl overflow-hidden bg-white border border-amber-300 h-72 sm:h-80 shadow-lg flex flex-col justify-end p-6"
              >
                <img
                  src={blog.coverImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80'}
                  alt={blog.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                
                <div className="relative z-10 space-y-2 text-white">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500 text-slate-950">
                    Featured • {blog.category}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                    {blog.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-slate-200 pt-2 border-t border-white/20">
                    <span className="flex items-center gap-1.5 font-medium">
                      <User className="w-3.5 h-3.5 text-teal-400" /> {blog.author?.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-slate-300"><Eye className="w-3.5 h-3.5" /> {blog.views}</span>
                      <span className="flex items-center gap-1 text-rose-400 font-bold"><Heart className="w-3.5 h-3.5 fill-rose-400" /> {blog.reactions?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stories..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-900 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['All', 'Community Story', 'Volunteer Experience', 'Environment', 'Education', 'Social Impact'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                category === cat
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Blogs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-80 rounded-3xl animate-pulse bg-slate-200" />
          ))}
        </div>
      ) : regularBlogs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {regularBlogs.map((blog) => (
            <Link
              key={blog._id}
              to={`/blogs/${blog._id}`}
              className="group bg-white rounded-3xl overflow-hidden border border-slate-200 hover:border-teal-500/50 transition-all duration-300 flex flex-col justify-between shadow-md"
            >
              <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                <img
                  src={blog.coverImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80'}
                  alt={blog.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/90 text-slate-900">
                    {blog.category}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-4 flex-grow flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-2">
                    {blog.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {blog.content.replace(/<[^>]*>?/gm, '')}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      <User className="w-3.5 h-3.5 text-teal-700" /> {blog.author?.name}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" /> {new Date(blog.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 font-semibold">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Eye className="w-3.5 h-3.5" /> {blog.views} views
                    </span>
                    <span className="flex items-center gap-1 text-rose-600">
                      <Heart className="w-3.5 h-3.5 fill-rose-600" /> {blog.reactions?.length || 0}
                    </span>
                  </div>
                </div>

                <div className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-800 border border-slate-200 transition-all flex items-center justify-center gap-1.5">
                  Read Full Story <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <p className="text-slate-600 text-sm">No published stories found.</p>
        </div>
      )}

    </div>
  );
};

export default Blogs;
