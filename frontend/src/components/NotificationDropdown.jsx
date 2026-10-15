import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Heart,
  UserPlus,
  MessageSquare,
  Megaphone,
  CheckCheck,
  Handshake,
  ReceiptText,
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

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  // Resolve where a notification should link, based on which entity it references.
  const getDestination = (n) => {
    // Sponsorship, advertising (and any future) notifications carry an in-app path
    if (typeof n.link === 'string' && n.link.startsWith('/') && !n.link.startsWith('//')) return n.link;
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
        return { Icon: CheckCircle2, cls: 'bg-pine-tint text-pine' };
      case 'POST_REJECTED':
        return { Icon: AlertTriangle, cls: 'bg-brand-tint text-brand' };
      case 'INTEREST':
        return { Icon: Heart, cls: 'bg-brand-tint text-brand' };
      case 'JOIN':
        return { Icon: UserPlus, cls: 'bg-pine-tint text-pine' };
      case 'COMMENT':
      case 'REPLY':
        return { Icon: MessageSquare, cls: 'bg-sky-tint text-sky-ink' };
      case 'POST_UPDATE':
      case 'ANNOUNCEMENT':
      case 'EVENT':
        return { Icon: Megaphone, cls: 'bg-marigold-tint text-marigold-text' };
      case 'SPONSORSHIP':
        return { Icon: Handshake, cls: 'bg-marigold-tint text-marigold-text' };
      case 'ADVERTISING':
        return { Icon: Megaphone, cls: 'bg-sky-tint text-sky-ink' };
      case 'BILLING':
        return { Icon: ReceiptText, cls: 'bg-pine-tint text-pine' };
      case 'WARNING':
        return { Icon: AlertTriangle, cls: 'bg-marigold-tint text-marigold-text' };
      default:
        return { Icon: Bell, cls: 'bg-paper-deep text-ink-soft' };
    }
  };

  const formatWhen = (d) => {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${date.toLocaleDateString()}`;
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        className="relative w-10 h-10 rounded-full flex items-center justify-center text-ink-soft hover:bg-paper-deep transition-colors shrink-0"
      >
        <Bell className="w-[18px] h-[18px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-brand text-white text-[10px] font-bold leading-none ring-2 ring-paper"
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-[4.5rem] sm:top-auto sm:mt-2 sm:w-96 card !rounded-2xl z-50 overflow-hidden animate-in zoom-in-95 origin-top-right"
          role="region"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-sand">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-semibold text-ink">Notifications</h3>
              {unreadCount > 0 && <span className="chip bg-brand-tint text-brand">{unreadCount} new</span>}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-sm font-semibold text-pine hover:text-pine-dark inline-flex items-center gap-1.5 rounded-full px-2 py-1 hover:bg-pine-tint transition-colors"
              >
                <CheckCheck className="w-4 h-4" aria-hidden="true" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[22rem] overflow-y-auto overscroll-contain">
            {notifications.length > 0 ? (
              <ul className="divide-y divide-sand">
                {notifications.map((n) => {
                  const { Icon, cls } = getIcon(n.type);
                  return (
                    <li key={n._id}>
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(n)}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                          n.read ? 'hover:bg-paper' : 'bg-brand-tint/40 hover:bg-brand-tint/70'
                        }`}
                      >
                        <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cls}`}>
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </span>
                        <span className="flex-grow min-w-0 space-y-0.5">
                          <span className={`block text-sm leading-snug ${n.read ? 'font-medium text-ink-soft' : 'font-semibold text-ink'}`}>
                            {n.title}
                          </span>
                          {n.message && <span className="block text-sm text-muted leading-snug">{n.message}</span>}
                          <span className="block text-xs text-muted pt-0.5">{formatWhen(n.createdAt)}</span>
                        </span>
                        {!n.read && (
                          <span className="w-2.5 h-2.5 rounded-full bg-brand shrink-0 mt-1.5">
                            <span className="sr-only">Unread</span>
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-6 py-10 text-center">
                <span className="w-12 h-12 mx-auto rounded-full bg-paper-deep text-muted flex items-center justify-center">
                  <BellOff className="w-5 h-5" aria-hidden="true" />
                </span>
                <p className="mt-3 text-sm font-semibold text-ink">You're all caught up</p>
                <p className="text-sm text-muted">New activity on your posts will show up here.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
