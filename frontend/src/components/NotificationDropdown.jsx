import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Heart,
  UserPlus,
  MessageSquare,
  Megaphone,
  CheckCheck,
} from 'lucide-react';

const NotificationDropdown = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await API.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resolve where a notification should link, based on which entity it references.
  const getDestination = (n) => {
    const blogId = n.blog?._id || n.blog;
    const eventId = n.event?._id || n.event;
    const postId = n.post?._id || n.post;
    const announcementId = n.announcement?._id || n.announcement;
    if (blogId) return `/blogs/${blogId}`;
    if (eventId) return `/events/${eventId}`;
    if (postId) return `/post/${postId}`; // route is singular: /post/:id
    if (announcementId) return `/`; // announcements surface on the homepage banner
    return null;
  };

  const handleMarkAsRead = async (n) => {
    try {
      await API.put(`/notifications/${n._id}/read`);
      setNotifications((prev) =>
        prev.map((x) => (x._id === n._id ? { ...x, read: true } : x))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setIsOpen(false);

      const dest = getDestination(n);
      if (dest) navigate(dest);
    } catch (error) {
      console.error('Failed to mark notification read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await API.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all read:', error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'POST_APPROVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'POST_REJECTED':
        return <AlertTriangle className="w-4 h-4 text-[#C8382C] shrink-0" />;
      case 'INTEREST':
        return <Heart className="w-4 h-4 text-rose-600 fill-rose-600 shrink-0" />;
      case 'JOIN':
        return <UserPlus className="w-4 h-4 text-teal-600 shrink-0" />;
      case 'COMMENT':
      case 'REPLY':
        return <MessageSquare className="w-4 h-4 text-sky-600 shrink-0" />;
      case 'POST_UPDATE':
      case 'ANNOUNCEMENT':
      case 'EVENT':
        return <Megaphone className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-[#C8382C] shrink-0" />;
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 border border-slate-200/60 shadow-2xs transition-all flex items-center justify-center cursor-pointer shrink-0"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#C8382C] text-[9px] font-black text-white shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl p-4 shadow-2xl z-50 border border-slate-200 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-[#C8382C] border border-rose-200">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleMarkAsRead(n)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all duration-200 flex items-start gap-3 border ${
                    n.read
                      ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      : 'bg-rose-50/50 border-rose-200 text-slate-900 shadow-xs hover:bg-rose-50'
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-xl bg-white border border-slate-200 shrink-0">
                    {getIcon(n.type)}
                  </div>
                  
                  <div className="space-y-0.5 flex-grow">
                    <p className="text-xs font-extrabold text-slate-900 leading-tight">{n.title}</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-slate-500 pt-0.5 font-medium">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {!n.read && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C8382C] shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs font-semibold text-slate-500">
                🔔 No notifications yet. You're all caught up!
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
