import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  LayoutDashboard,
  Clock,
  FileText,
  BookOpen,
  Calendar,
  AlertTriangle,
  MessageSquare,
  Users,
  Building2,
  HeartHandshake,
  DollarSign,
  Receipt,
  CreditCard,
  Bell,
  Megaphone,
  Mail,
  ShieldAlert,
  Settings,
  Lock,
  Search,
  UserPlus,
  FolderKanban,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Menu,
  X,
  CheckCircle2,
  Inbox,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  Check,
  Filter,
  RefreshCw,
  Eye,
  Download,
  UserX,
  UserCheck,
  Award,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

const SuperAdminDashboard = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  // Search & Filter state per module
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Real Database Dynamic States
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeActivities: 0,
    upcomingEvents: 0,
    pendingApprovals: 0,
    totalDonations: 'Rs. 0',
    totalDonationsAmount: 0,
    pendingReports: 0,
    totalBlogs: 0,
    totalOrgs: 0,
  });

  // Data Collections
  const [pendingApprovalsList, setPendingApprovalsList] = useState([]);
  const [recentActivitiesList, setRecentActivitiesList] = useState([]);
  const [recentDonationsList, setRecentDonationsList] = useState([]);
  const [activityOverviewData, setActivityOverviewData] = useState([]);
  const [categoryDonutData, setCategoryDonutData] = useState([]);

  const [postsList, setPostsList] = useState([]);
  const [blogsList, setBlogsList] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [commentsList, setCommentsList] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [donationsList, setDonationsList] = useState([]);
  const [campaignsList, setCampaignsList] = useState([]);
  const [expensesList, setExpensesList] = useState([]);
  const [auditLogsList, setAuditLogsList] = useState([]);
  const [settingsData, setSettingsData] = useState({});

  // Modals
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '', description: '', location: 'Kathmandu, Nepal', date: '', startTime: '09:00 AM', endTime: '05:00 PM', maxParticipants: 50, category: 'Community Activity'
  });

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: '', email: '', password: '', role: 'ADMIN', permissions: ['canApprovePosts', 'canManageUsers']
  });

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', iconName: 'FolderKanban', color: '#94201B' });

  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ title: '', description: '', goalAmount: 50000 });

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ campaignId: '', title: '', amount: '', notes: '', spentDate: '' });

  const [showOrgModal, setShowOrgModal] = useState(false);
  const [orgForm, setOrgForm] = useState({
    name: '',
    email: '',
    password: 'orgPassword123',
    location: 'Kathmandu, Nepal',
    phone: '',
    regNumber: '',
    orgType: 'NGO',
    description: '',
  });

  const [rejectingItem, setRejectingItem] = useState(null); // { id, type }
  const [rejectionReason, setRejectionReason] = useState('');

  const [suspendingUser, setSuspendingUser] = useState(null);
  const [suspensionReasonInput, setSuspensionReasonInput] = useState('');

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!orgForm.name || !orgForm.email) {
      showToast('Name and email are required', 'error');
      return;
    }
    try {
      const res = await API.post('/admin/organizations', orgForm);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        setShowOrgModal(false);
        setOrgForm({
          name: '',
          email: '',
          password: 'orgPassword123',
          location: 'Kathmandu, Nepal',
          phone: '',
          regNumber: '',
          orgType: 'NGO',
          description: '',
        });
        fetchTabData('orgs');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to register organization', 'error');
    }
  };

  // 1. Fetch Overview & Live Metrics
  const fetchDashboardData = async () => {
    try {
      const [analyticsRes, pendingRes, postsRes, donationsRes, reportsRes] = await Promise.all([
        API.get('/super-admin/analytics?timeRange=30_DAYS'),
        API.get('/super-admin/approval-center?contentType=POSTS'),
        API.get('/posts?status=ALL'),
        API.get('/donations/campaigns'),
        API.get('/reports'),
      ]);

      if (analyticsRes.data.success) {
        const s = analyticsRes.data.data.summary;
        const c = analyticsRes.data.data.charts;

        setStats((prev) => ({
          ...prev,
          totalMembers: s.totalUsers || 0,
          activeActivities: s.activeActivities || 0,
          upcomingEvents: s.upcomingEvents || 0,
          pendingApprovals: s.pendingPosts || 0,
          totalDonationsAmount: s.totalDonationsAmount || 0,
          totalDonations: `Rs. ${(s.totalDonationsAmount || 0).toLocaleString()}`,
          totalBlogs: s.publishedBlogs || 0,
        }));

        if (c.userGrowth && c.userGrowth.length > 0) {
          setActivityOverviewData(c.userGrowth.map((u) => ({ date: u.date, val: u.count })));
        } else {
          setActivityOverviewData([{ date: 'Today', val: s.totalUsers || 0 }]);
        }

        if (c.postsByCategory && c.postsByCategory.length > 0) {
          const colors = ['#0F766E', '#B91C1C', '#C2410C', '#D97706', '#64748B', '#94A3B8'];
          setCategoryDonutData(
            c.postsByCategory.map((item, idx) => ({
              name: item.category,
              value: item.count,
              color: colors[idx % colors.length],
            }))
          );
        }
      }

      if (pendingRes.data.success) setPendingApprovalsList(pendingRes.data.data);
      if (postsRes.data.success) setRecentActivitiesList(postsRes.data.data.slice(0, 5));
      if (donationsRes.data.success) setRecentDonationsList(donationsRes.data.data.slice(0, 5));
      if (reportsRes.data.success) {
        setReportsList(reportsRes.data.data);
        setStats((prev) => ({ ...prev, pendingReports: reportsRes.data.count || 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch dynamic admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tab-specific dynamic backend data
  const fetchTabData = async (tab) => {
    try {
      if (tab === 'posts') {
        const res = await API.get('/posts?status=ALL');
        if (res.data.success) setPostsList(res.data.data);
      } else if (tab === 'blogs') {
        const res = await API.get('/blogs?status=ALL');
        if (res.data.success) setBlogsList(res.data.data);
      } else if (tab === 'events') {
        const res = await API.get('/events');
        if (res.data.success) setEventsList(res.data.data);
      } else if (tab === 'reports') {
        const res = await API.get('/reports');
        if (res.data.success) setReportsList(res.data.data);
      } else if (tab === 'comments') {
        const res = await API.get('/admin/comments');
        if (res.data.success) setCommentsList(res.data.data);
      } else if (tab === 'members' || tab === 'orgs' || tab === 'volunteers' || tab === 'admins') {
        const res = await API.get('/admin/users');
        if (res.data.success) {
          setMembersList(res.data.data);
          const orgCount = res.data.data.filter((u) => u.memberLevel === 'ORGANIZATION').length;
          setStats((prev) => ({ ...prev, totalOrgs: orgCount }));
        }
      } else if (tab === 'categories') {
        const res = await API.get('/categories');
        if (res.data.success) setCategoriesList(res.data.data);
      } else if (tab === 'donations') {
        const res = await API.get('/admin/donations');
        if (res.data.success) setDonationsList(res.data.data);
      } else if (tab === 'campaigns') {
        const res = await API.get('/donations/campaigns');
        if (res.data.success) setCampaignsList(res.data.data);
      } else if (tab === 'expenses') {
        const res = await API.get('/admin/expenses');
        if (res.data.success) setExpensesList(res.data.data);
      } else if (tab === 'logs') {
        const res = await API.get('/super-admin/audit-logs');
        if (res.data.success) setAuditLogsList(res.data.data);
      } else if (tab === 'settings') {
        const res = await API.get('/super-admin/settings');
        if (res.data.success) setSettingsData(res.data.data);
      } else if (tab === 'approval') {
        const res = await API.get('/super-admin/approval-center?contentType=POSTS');
        if (res.data.success) setPendingApprovalsList(res.data.data);
      }
    } catch (error) {
      console.error(`Failed to fetch tab data for ${tab}:`, error);
    }
  };

  // Polling Real-time Synchronization Every 8 Seconds
  useEffect(() => {
    fetchDashboardData();
    fetchTabData(activeTab);

    const interval = setInterval(() => {
      fetchDashboardData();
      fetchTabData(activeTab);
    }, 8000);

    return () => clearInterval(interval);
  }, [activeTab]);

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setFilterCategory('All');
    setFilterStatus('All');
    fetchTabData(tab);
  };

  // --- ACTIONS ---
  const handleApprovePost = async (postId) => {
    try {
      const res = await API.put(`/posts/${postId}/status`, { status: 'APPROVED' });
      if (res.data.success) {
        showToast('Post approved and published live!', 'success');
        setPostsList((prev) => prev.map((p) => (p._id === postId ? { ...p, status: 'APPROVED' } : p)));
        setPendingApprovalsList((prev) => prev.filter((p) => p._id !== postId));
        fetchDashboardData();
      }
    } catch (error) {
      showToast('Approve post failed', 'error');
    }
  };

  const handleRejectPost = async (postId, reason) => {
    try {
      const res = await API.put(`/posts/${postId}/status`, { status: 'REJECTED', rejectionReason: reason });
      if (res.data.success) {
        showToast('Post rejected with user feedback', 'info');
        setPostsList((prev) => prev.map((p) => (p._id === postId ? { ...p, status: 'REJECTED', rejectionReason: reason } : p)));
        setPendingApprovalsList((prev) => prev.filter((p) => p._id !== postId));
        setRejectingItem(null);
        setRejectionReason('');
        fetchDashboardData();
      }
    } catch (error) {
      showToast('Reject post failed', 'error');
    }
  };

  const handleFeaturePost = async (postId, makeFeatured) => {
    try {
      const res = await API.put(`/posts/${postId}/feature`, { isFeatured: makeFeatured });
      if (res.data.success) {
        showToast(makeFeatured ? 'Post featured on homepage' : 'Post removed from featured', 'success');
        setPostsList((prev) => prev.map((p) => (p._id === postId ? { ...p, isFeatured: res.data.data.isFeatured } : p)));
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Feature action failed', 'error');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to permanently delete this post?')) return;
    try {
      const res = await API.delete(`/posts/${postId}`);
      if (res.data.success) {
        showToast('Post deleted permanently', 'success');
        setPostsList((prev) => prev.filter((p) => p._id !== postId));
        fetchDashboardData();
      }
    } catch (error) {
      showToast('Delete post failed', 'error');
    }
  };

  const handleApproveBlog = async (blogId) => {
    try {
      const res = await API.put(`/blogs/${blogId}/status`, { status: 'APPROVED' });
      if (res.data.success) {
        showToast('Blog story published live!', 'success');
        setBlogsList((prev) => prev.map((b) => (b._id === blogId ? { ...b, status: 'APPROVED' } : b)));
        fetchDashboardData();
      }
    } catch (error) {
      showToast('Approve blog failed', 'error');
    }
  };

  const handleRejectBlog = async (blogId, reason) => {
    try {
      const res = await API.put(`/blogs/${blogId}/status`, { status: 'REJECTED', rejectionReason: reason });
      if (res.data.success) {
        showToast('Blog rejected', 'info');
        setBlogsList((prev) => prev.map((b) => (b._id === blogId ? { ...b, status: 'REJECTED' } : b)));
        setRejectingItem(null);
        setRejectionReason('');
      }
    } catch (error) {
      showToast('Reject blog failed', 'error');
    }
  };

  const handleFeatureBlog = async (blog) => {
    const next = !blog.isFeatured;
    try {
      const res = await API.put(`/blogs/${blog._id}/feature`);
      if (res.data.success) {
        showToast(next ? 'Blog featured' : 'Blog removed from featured', 'success');
        setBlogsList((prev) => prev.map((b) => (b._id === blog._id ? { ...b, isFeatured: next } : b)));
      }
    } catch (error) {
      showToast('Feature blog failed', 'error');
    }
  };

  const handleDeleteBlog = async (blogId) => {
    if (!window.confirm('Delete this blog story permanently?')) return;
    try {
      const res = await API.delete(`/blogs/${blogId}`);
      if (res.data.success) {
        showToast('Blog deleted', 'success');
        setBlogsList((prev) => prev.filter((b) => b._id !== blogId));
      }
    } catch (error) {
      showToast('Delete blog failed', 'error');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/events', eventForm);
      if (res.data.success) {
        showToast('Official event created!', 'success');
        setShowEventModal(false);
        setEventForm({ title: '', description: '', location: 'Kathmandu, Nepal', date: '', startTime: '09:00 AM', endTime: '05:00 PM', maxParticipants: 50, category: 'Community Activity' });
        fetchTabData('events');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Event creation failed', 'error');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Cancel & delete this official event?')) return;
    try {
      const res = await API.delete(`/events/${eventId}`);
      if (res.data.success) {
        showToast('Event deleted', 'success');
        setEventsList((prev) => prev.filter((e) => e._id !== eventId));
      }
    } catch (error) {
      showToast('Delete event failed', 'error');
    }
  };

  const handleFeatureEvent = async (ev) => {
    const next = !ev.isFeatured;
    try {
      const res = await API.put(`/events/${ev._id}/feature`, { isFeatured: next });
      if (res.data.success) {
        showToast(next ? 'Event featured on homepage' : 'Event removed from featured', 'success');
        setEventsList((prev) => prev.map((e) => (e._id === ev._id ? { ...e, isFeatured: next } : e)));
      }
    } catch (error) {
      showToast('Feature event failed', 'error');
    }
  };

  const handleCancelEvent = async (eventId) => {
    if (!window.confirm('Cancel this event? Participants will be notified and it will show as CANCELLED.')) return;
    try {
      const res = await API.put(`/events/${eventId}`, { status: 'CANCELLED' });
      if (res.data.success) {
        showToast('Event cancelled — participants notified', 'info');
        setEventsList((prev) => prev.map((e) => (e._id === eventId ? { ...e, status: 'CANCELLED' } : e)));
      }
    } catch (error) {
      showToast('Cancel event failed', 'error');
    }
  };

  const handleResolveReport = async (reportId, action, reasonNote = '') => {
    try {
      const res = await API.put(`/reports/${reportId}/resolve`, { action, reasonNote });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        setReportsList((prev) => prev.filter((r) => r._id !== reportId));
        fetchDashboardData();
      }
    } catch (error) {
      showToast('Resolve report failed', 'error');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete comment permanently?')) return;
    try {
      const res = await API.delete(`/admin/comments/${commentId}`);
      if (res.data.success) {
        showToast('Comment deleted', 'success');
        setCommentsList((prev) => prev.filter((c) => c._id !== commentId));
      }
    } catch (error) {
      showToast('Delete comment failed', 'error');
    }
  };

  const handleVerifyUser = async (userId, memberLevel, isVerified) => {
    try {
      const res = await API.put(`/admin/users/${userId}/verify`, { memberLevel, isVerified });
      if (res.data.success) {
        showToast(`User level updated to ${memberLevel} (Verified: ${isVerified})`, 'success');
        setMembersList((prev) => prev.map((u) => (u._id === userId ? { ...u, memberLevel, isVerified } : u)));
      }
    } catch (error) {
      showToast('User verification failed', 'error');
    }
  };

  const handleSuspendUser = async (userId, isSuspended, reason) => {
    try {
      const res = await API.put(`/admin/users/${userId}/suspend`, { isSuspended, suspensionReason: reason });
      if (res.data.success) {
        showToast(res.data.message, 'info');
        setMembersList((prev) => prev.map((u) => (u._id === userId ? { ...u, isSuspended, suspensionReason: reason } : u)));
        setSuspendingUser(null);
        setSuspensionReasonInput('');
      }
    } catch (error) {
      showToast('User suspension status change failed', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete user account and all their contributions permanently?')) return;
    try {
      const res = await API.delete(`/admin/users/${userId}`);
      if (res.data.success) {
        showToast('User account deleted', 'success');
        setMembersList((prev) => prev.filter((u) => u._id !== userId));
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Delete user failed', 'error');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/categories', categoryForm);
      if (res.data.success) {
        showToast('Category created and available on public site!', 'success');
        setShowCategoryModal(false);
        setCategoryForm({ name: '', description: '', iconName: 'FolderKanban', color: '#94201B' });
        fetchTabData('categories');
      }
    } catch (error) {
      showToast('Category creation failed', 'error');
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Delete category?')) return;
    try {
      const res = await API.delete(`/categories/${catId}`);
      if (res.data.success) {
        showToast('Category deleted', 'success');
        setCategoriesList((prev) => prev.filter((c) => c._id !== catId));
      }
    } catch (error) {
      showToast('Delete category failed', 'error');
    }
  };

  const handleToggleCategoryActive = async (cat) => {
    const next = cat.isActive === false; // currently inactive -> activate
    try {
      const res = await API.put(`/categories/${cat._id}`, { isActive: next });
      if (res.data.success) {
        showToast(next ? 'Category activated' : 'Category deactivated (hidden from new posts)', 'success');
        setCategoriesList((prev) => prev.map((c) => (c._id === cat._id ? { ...c, isActive: next } : c)));
      }
    } catch (error) {
      showToast('Toggle category failed', 'error');
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/donations/campaigns', campaignForm);
      if (res.data.success) {
        showToast('Donation campaign launched live!', 'success');
        setShowCampaignModal(false);
        setCampaignForm({ title: '', description: '', goalAmount: 50000 });
        fetchTabData('campaigns');
      }
    } catch (error) {
      showToast('Campaign launch failed', 'error');
    }
  };

  const handleDeleteCampaign = async (campId) => {
    if (!window.confirm('Delete this donation campaign?')) return;
    try {
      const res = await API.delete(`/admin/campaigns/${campId}`);
      if (res.data.success) {
        showToast('Campaign deleted', 'success');
        setCampaignsList((prev) => prev.filter((c) => c._id !== campId));
      }
    } catch (error) {
      showToast('Delete campaign failed', 'error');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.campaignId || !expenseForm.title || !expenseForm.amount) return;
    try {
      const res = await API.post(`/donations/campaigns/${expenseForm.campaignId}/expenses`, expenseForm);
      if (res.data.success) {
        showToast('Expense record logged into transparency ledger!', 'success');
        setShowExpenseModal(false);
        setExpenseForm({ campaignId: '', title: '', amount: '', notes: '', spentDate: '' });
        fetchTabData('expenses');
      }
    } catch (error) {
      showToast('Expense log failed', 'error');
    }
  };

  const handleDeleteExpense = async (expId) => {
    if (!window.confirm('Delete expense record?')) return;
    try {
      const res = await API.delete(`/admin/expenses/${expId}`);
      if (res.data.success) {
        showToast('Expense record deleted', 'success');
        setExpensesList((prev) => prev.filter((e) => e._id !== expId));
      }
    } catch (error) {
      showToast('Delete expense failed', 'error');
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/super-admin/staff', staffForm);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        setShowStaffModal(false);
        setStaffForm({ name: '', email: '', password: '', role: 'ADMIN', permissions: ['canApprovePosts', 'canManageUsers'] });
        fetchTabData('admins');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Staff creation failed', 'error');
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm('Remove staff/admin access?')) return;
    try {
      const res = await API.delete(`/super-admin/staff/${staffId}`);
      if (res.data.success) {
        showToast('Staff user deleted', 'success');
        setMembersList((prev) => prev.filter((m) => m._id !== staffId));
      }
    } catch (error) {
      showToast('Delete staff failed', 'error');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put('/super-admin/settings', settingsData);
      if (res.data.success) {
        showToast('Platform settings saved to database & applied to frontend!', 'success');
      }
    } catch (error) {
      showToast('Settings update failed', 'error');
    }
  };

  const handleBroadcastAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;
    try {
      const res = await API.post('/announcements', { title: annTitle, content: annContent });
      if (res.data.success) {
        showToast('Announcement broadcast to all members!', 'success');
        setAnnTitle('');
        setAnnContent('');
        setShowAnnouncementModal(false);
      }
    } catch (error) {
      showToast('Broadcast failed', 'error');
    }
  };

  const exportCSV = (data, filename) => {
    if (!data || data.length === 0) {
      showToast('No data to export', 'info');
      return;
    }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((row) => Object.values(row).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] text-slate-800 flex overflow-hidden font-sans select-none">
      
      {/* 1. COMPACT RED SIDEBAR (CLEAN ORIGINAL BRAND DESIGN) */}
      <aside className={`bg-[#94201B] text-white w-60 shrink-0 flex flex-col justify-between h-full border-r border-red-950/20 ${sidebarOpen ? 'flex' : 'hidden lg:flex'}`}>
        <div className="p-3.5 space-y-3 overflow-hidden flex-1 flex flex-col">
          
          {/* Logo Header */}
          <div className="flex items-center gap-2.5 pb-2 border-b border-white/10 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-white text-[#94201B] flex items-center justify-center font-black shadow-xs">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight leading-none text-white">हातेमालो</h1>
              <p className="text-[9px] font-semibold text-rose-200 mt-0.5">Super Admin SaaS Panel</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-3 text-[11px] font-semibold overflow-y-auto pr-1 flex-1">
            
            {/* Dashboard */}
            <div>
              <button
                onClick={() => handleTabChange('dashboard')}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'dashboard' ? 'bg-white/20 text-white font-bold shadow-xs' : 'text-rose-100 hover:bg-white/10'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard Overview
              </button>
            </div>

            {/* CONTENT & MODERATION */}
            <div className="space-y-0.5">
              <p className="px-3 text-[9px] uppercase font-bold text-rose-200/60 tracking-wider">CONTENT & MODERATION</p>
              
              <button onClick={() => handleTabChange('approval')} className={`w-full flex items-center justify-between px-3 py-1 rounded-lg transition-all ${activeTab === 'approval' ? 'bg-white/20 text-white font-bold' : 'text-rose-100 hover:bg-white/10'}`}>
                <span className="flex items-center gap-2.5"><Clock className="w-3.5 h-3.5" /> Approval Center</span>
                {stats.pendingApprovals > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-white/20 text-white font-bold">{stats.pendingApprovals}</span>
                )}
              </button>

              <button onClick={() => handleTabChange('posts')} className={`w-full flex items-center gap-2.5 px-3 py-1 rounded-lg transition-all ${activeTab === 'posts' ? 'bg-white/20 text-white font-bold' : 'text-rose-100 hover:bg-white/10'}`}>
                <FileText className="w-3.5 h-3.5" /> Posts
              </button>

              <button onClick={() => handleTabChange('blogs')} className={`w-full flex items-center gap-2.5 px-3 py-1 rounded-lg transition-all ${activeTab === 'blogs' ? 'bg-white/20 text-white font-bold' : 'text-rose-100 hover:bg-white/10'}`}>
                <BookOpen className="w-3.5 h-3.5" /> Blogs & Stories
              </button>

              <button onClick={() => handleTabChange('events')} className={`w-full flex items-center gap-2.5 px-3 py-1 rounded-lg transition-all ${activeTab === 'events' ? 'bg-white/20 text-white font-bold' : 'text-rose-100 hover:bg-white/10'}`}>
                <Calendar className="w-3.5 h-3.5" /> Events
              </button>

              <button onClick={() => handleTabChange('reports')} className={`w-full flex items-center justify-between px-3 py-1 rounded-lg transition-all ${activeTab === 'reports' ? 'bg-white/20 text-white font-bold' : 'text-rose-100 hover:bg-white/10'}`}>
                <span className="flex items-center gap-2.5"><AlertTriangle className="w-3.5 h-3.5" /> Reports</span>
                {stats.pendingReports > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-400 text-white font-bold">{stats.pendingReports}</span>
                )}
              </button>

              <button onClick={() => handleTabChange('comments')} className={`w-full flex items-center gap-2.5 px-3 py-1 rounded-lg transition-all ${activeTab === 'comments' ? 'bg-white/20 text-white font-bold' : 'text-rose-100 hover:bg-white/10'}`}>
                <MessageSquare className="w-3.5 h-3.5" /> Comments
              </button>
            </div>

            {/* COMMUNITY */}
            <div className="space-y-0.5">
              <p className="px-3 text-[9px] uppercase font-bold text-rose-200/60 tracking-wider">COMMUNITY</p>
              <button onClick={() => handleTabChange('members')} className={`w-full flex items-center gap-2.5 px-3 py-1 rounded-lg transition-all ${activeTab === 'members' ? 'bg-white/20 text-white font-bold' : 'text-rose-100 hover:bg-white/10'}`}><Users className="w-3.5 h-3.5" /> Members</button>
              <button onClick={() => handleTabChange('orgs')} className={`w-full flex items-center gap-2.5 px-3 py-1 rounded-lg transition-all ${activeTab === 'orgs' ? 'bg-white/20 text-white font-bold' : 'text-rose-100 hover:bg-white/10'}`}><Building2 className="w-3.5 h-3.5" /> Organizations</button>
              <button onClick={() => handleTabChange('volunteers')} className={`w-full flex items-center gap-2.5 px-3 py-1 rounded-lg transition-all ${activeTab === 'volunteers' ? 'bg-white/20 text-white font-bold' : 'text-rose-100 hover:bg-white/10'}`}><UserPlus className="w-3.5 h-3.5" /> Volunteers</button>
              <button onClick={() => handleTabChange('categories')} className={`w-full flex items-center gap-2.5 px-3 py-1 rounded-lg transition-all ${activeTab === 'categories' ? 'bg-white/20 text-white font-bold' : 'text-rose-100 hover:bg-white/10'}`}><FolderKanban className="w-3.5 h-3.5" /> Categories</button>
            </div>

            {/* FINANCE & DONATIONS */}
            <div className="space-y-0.5">
              <p className="px-3 text-[9px] uppercase font-bold text-rose-200/60 tracking-wider">FINANCE & DONATIONS</p>
              <button onClick={() => handleTabChange('donations')} className={`w-full flex items-center gap-2.5 px-3 py-1 rounded-lg transition-all ${activeTab === 'donations' ? 'bg-white/20 text-white font-bold' : 'text-rose-100 hover:bg-white/10'}`}><DollarSign className="w-3.5 h-3.5" /> Donations</button>
              <button onClick={() => handleTabChange('campaigns')} className={`w-full flex items-center gap-2.5 px-3 py-1 rounded-lg transition-all ${activeTab === 'campaigns' ? 'bg-white/20 text-white font-bold' : 'text-rose-100 hover:bg-white/10'}`}><Megaphone className="w-3.5 h-3.5" /> Campaigns</button>
              <button onClick={() => handleTabChange('expenses')} className={`w-full flex items-center gap-2.5 px-3 py-1 rounded-lg transition-all ${activeTab === 'expenses' ? 'bg-white/20 text-white font-bold' : 'text-rose-100 hover:bg-white/10'}`}><Receipt className="w-3.5 h-3.5" /> Expenses</button>
            </div>

            {/* SYSTEM */}
            <div className="space-y-0.5">
              <p className="px-3 text-[9px] uppercase font-bold text-rose-200/60 tracking-wider">SYSTEM</p>
              <button onClick={() => handleTabChange('admins')} className={`w-full flex items-center gap-2.5 px-3 py-1 rounded-lg transition-all ${activeTab === 'admins' ? 'bg-white/20 text-white font-bold' : 'text-rose-100 hover:bg-white/10'}`}><ShieldAlert className="w-3.5 h-3.5" /> Admins & Roles</button>
              <button onClick={() => handleTabChange('settings')} className={`w-full flex items-center gap-2.5 px-3 py-1 rounded-lg transition-all ${activeTab === 'settings' ? 'bg-white/20 text-white font-bold' : 'text-rose-100 hover:bg-white/10'}`}><Settings className="w-3.5 h-3.5" /> Settings</button>
              <button onClick={() => handleTabChange('logs')} className={`w-full flex items-center gap-2.5 px-3 py-1 rounded-lg transition-all ${activeTab === 'logs' ? 'bg-white/20 text-white font-bold' : 'text-rose-100 hover:bg-white/10'}`}><Lock className="w-3.5 h-3.5" /> Activity Logs</button>
            </div>

          </nav>

        </div>

        {/* Admin Profile Footer */}
        <div className="p-3 border-t border-white/10 bg-black/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src={user?.profilePicture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
              alt={user?.name || 'Admin'}
              className="w-8 h-8 rounded-full object-cover border border-white/30"
            />
            <div>
              <p className="text-[11px] font-bold text-white leading-tight truncate">{user?.name || 'Super Admin'}</p>
              <p className="text-[9px] text-rose-200 font-medium">{user?.role || 'SUPER_ADMIN'}</p>
            </div>
          </div>
          <button onClick={logout} className="text-rose-200 hover:text-white p-1" title="Logout">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

      </aside>

      {/* 2. MAIN CONTENT AREA (CLEAN LIGHT BACKGROUND) */}
      <div className="flex-grow flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* TOP NAVIGATION BAR */}
        <header className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden">
              <Menu className="w-4 h-4" />
            </button>

            <div className="relative w-64 sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anything..."
                className="w-full bg-slate-100 border border-slate-200 rounded-lg pl-9 pr-8 py-1.5 text-[11px] text-slate-800 outline-none focus:border-[#94201B] transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => fetchTabData(activeTab)} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100" title="Refresh Live Data">
              <RefreshCw className="w-4 h-4" />
            </button>

            <Link to="/" className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-[11px] font-semibold flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" /> Main Site
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <img
                src={user?.profilePicture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                alt={user?.name || 'Admin'}
                className="w-7 h-7 rounded-full object-cover border border-slate-300"
              />
              <div className="hidden sm:block text-left">
                <p className="text-[11px] font-bold text-slate-800 leading-tight">{user?.name || 'Super Admin'}</p>
                <p className="text-[9px] text-slate-500 font-medium">{user?.role || 'SUPER_ADMIN'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN BODY SCROLLABLE FRAME */}
        <main className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
          
          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {/* ========================================================================= */}
          {activeTab === 'dashboard' && (
            <>
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">Namaste, {user?.name?.split(' ')[0] || 'Admin'}! 👋</h2>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Here's what's happening on हातेमालो today.</p>
                </div>

                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] text-slate-600 shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>

              {/* 5 KEY STATS CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 shrink-0">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-slate-500">Total Members</span>
                    <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center"><Users className="w-3.5 h-3.5" /></div>
                  </div>
                  <div className="mt-1">
                    <p className="text-lg font-black text-slate-900 leading-none">{stats.totalMembers.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">Authorized users</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-slate-500">Active Activities</span>
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><FolderKanban className="w-3.5 h-3.5" /></div>
                  </div>
                  <div className="mt-1">
                    <p className="text-lg font-black text-slate-900 leading-none">{stats.activeActivities}</p>
                    <p className="text-[9px] font-bold text-emerald-600 mt-0.5">Approved & Live</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-slate-500">Upcoming Events</span>
                    <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><Calendar className="w-3.5 h-3.5" /></div>
                  </div>
                  <div className="mt-1">
                    <p className="text-lg font-black text-slate-900 leading-none">{stats.upcomingEvents}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">Official Assembly</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-slate-500">Pending Approvals</span>
                    <div className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center"><FileText className="w-3.5 h-3.5" /></div>
                  </div>
                  <div className="mt-1">
                    <p className="text-lg font-black text-slate-900 leading-none">{stats.pendingApprovals}</p>
                    <p className="text-[9px] font-bold text-amber-600 mt-0.5">Review Queue</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-slate-500">Total Donations</span>
                    <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center"><DollarSign className="w-3.5 h-3.5" /></div>
                  </div>
                  <div className="mt-1">
                    <p className="text-lg font-black text-slate-900 leading-none">{stats.totalDonations}</p>
                    <p className="text-[9px] font-bold text-emerald-600 mt-0.5">Voluntary Funds</p>
                  </div>
                </div>
              </div>

              {/* CHARTS ROW */}
              <div className="grid grid-cols-12 gap-2.5 h-48 shrink-0">
                <div className="col-span-7 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between overflow-hidden">
                  <h3 className="text-xs font-bold text-slate-900">Activity Overview</h3>
                  <div className="flex-1 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={activityOverviewData}>
                        <defs>
                          <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#94201B" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#94201B" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="date" stroke="#94A3B8" fontSize={9} tickLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: '6px', fontSize: '10px' }} />
                        <Area type="monotone" dataKey="val" stroke="#94201B" strokeWidth={2} fillOpacity={1} fill="url(#actGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="col-span-5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between overflow-hidden">
                  <h3 className="text-xs font-bold text-slate-900">Activities by Category</h3>
                  {categoryDonutData.length > 0 ? (
                    <div className="flex items-center justify-between flex-1">
                      <div className="h-28 w-28 relative shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={categoryDonutData} innerRadius={28} outerRadius={44} paddingAngle={2} dataKey="value">
                              {categoryDonutData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-1 text-[10px] pl-2 flex-1 overflow-y-auto max-h-28">
                        {categoryDonutData.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="text-slate-600 truncate">{item.name}</span>
                            </div>
                            <span className="font-bold text-slate-800 text-[10px] ml-2">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
                      <FolderKanban className="w-6 h-6 text-slate-300 mb-1" />
                      <p className="text-[11px] font-bold text-slate-600">No Post Categories</p>
                    </div>
                  )}
                </div>
              </div>

              {/* BOTTOM ROW: RECENT ACTIVITIES & QUICK ACTIONS */}
              <div className="grid grid-cols-12 gap-2.5 flex-1 min-h-[200px]">
                <div className="col-span-6 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between shrink-0">
                    <h3 className="text-xs font-bold text-slate-900">Recent Activities</h3>
                    <button onClick={() => handleTabChange('posts')} className="text-[10px] font-bold text-rose-600 hover:underline">View All</button>
                  </div>
                  <div className="space-y-1.5 flex-1 overflow-y-auto mt-2 pr-1">
                    {recentActivitiesList.map((act) => (
                      <div key={act._id} className="flex items-center justify-between p-1.5 rounded-lg border border-slate-100 bg-slate-50/50 text-[10px]">
                        <div className="flex items-center gap-2 truncate">
                          <img src={act.images?.[0] || 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=80&q=80'} alt="" className="w-7 h-7 rounded-md object-cover shrink-0" />
                          <div className="truncate">
                            <p className="font-bold text-slate-800 truncate leading-tight">{act.title}</p>
                            <p className="text-[9px] text-slate-500">{act.category} • {act.location}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold shrink-0 ${act.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600'}`}>{act.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-span-6 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between shrink-0">
                    <h3 className="text-xs font-bold text-slate-900">Quick Actions</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2 flex-1 pt-2">
                    <button onClick={() => setShowAnnouncementModal(true)} className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-300 transition-all flex flex-col items-center justify-center text-center gap-1">
                      <Megaphone className="w-4 h-4 text-[#94201B]" />
                      <span className="text-[10px] font-bold text-slate-800 leading-tight">Create Announcement</span>
                    </button>
                    <button onClick={() => setShowEventModal(true)} className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 transition-all flex flex-col items-center justify-center text-center gap-1">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <span className="text-[10px] font-bold text-slate-800 leading-tight">Create Event</span>
                    </button>
                    <button onClick={() => setShowStaffModal(true)} className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 transition-all flex flex-col items-center justify-center text-center gap-1">
                      <UserPlus className="w-4 h-4 text-emerald-600" />
                      <span className="text-[10px] font-bold text-slate-800 leading-tight">Add New Admin</span>
                    </button>
                    <button onClick={() => setShowCategoryModal(true)} className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 transition-all flex flex-col items-center justify-center text-center gap-1">
                      <FolderKanban className="w-4 h-4 text-purple-600" />
                      <span className="text-[10px] font-bold text-slate-800 leading-tight">Manage Categories</span>
                    </button>
                    <button onClick={() => setShowCampaignModal(true)} className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-300 transition-all flex flex-col items-center justify-center text-center gap-1">
                      <DollarSign className="w-4 h-4 text-sky-600" />
                      <span className="text-[10px] font-bold text-slate-800 leading-tight">Launch Campaign</span>
                    </button>
                    <button onClick={() => handleTabChange('settings')} className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all flex flex-col items-center justify-center text-center gap-1">
                      <Settings className="w-4 h-4 text-slate-600" />
                      <span className="text-[10px] font-bold text-slate-800 leading-tight">Platform Settings</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: APPROVAL CENTER */}
          {/* ========================================================================= */}
          {activeTab === 'approval' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex-1">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Approval Center Workflow</h3>
                  <p className="text-[11px] text-slate-500">Review pending user submissions before they are published publicly across Nepal.</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  {pendingApprovalsList.length} Pending Review
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b">
                    <tr>
                      <th className="p-3">Submission Title</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Creator / Author</th>
                      <th className="p-3">Date Submitted</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pendingApprovalsList.length > 0 ? (
                      pendingApprovalsList.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-800">
                            <p className="text-xs">{item.title}</p>
                            <p className="text-[10px] text-slate-500 font-normal line-clamp-1">{item.description}</p>
                          </td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">{item.category}</span></td>
                          <td className="p-3">{item.creator?.name || item.author?.name || 'Member'}</td>
                          <td className="p-3 text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                          <td className="p-3 text-right space-x-2">
                            <button onClick={() => handleApprovePost(item._id)} className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700">Approve</button>
                            <button onClick={() => setRejectingItem({ id: item._id, type: 'POST' })} className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700">Reject</button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="5" className="p-6 text-center text-slate-400 font-bold">Review queue is empty! All submissions reviewed.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: POSTS MODERATION */}
          {/* ========================================================================= */}
          {activeTab === 'posts' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex-1">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Community Help Posts Directory ({postsList.length})</h3>
                  <p className="text-[11px] text-slate-500">Manage all approved, pending, and rejected mutual aid posts.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-slate-100 border border-slate-300 rounded-lg text-xs p-1.5 outline-none font-bold">
                    <option value="All">All Statuses</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                  <button onClick={() => exportCSV(postsList, 'haatemalo_posts')} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b">
                    <tr>
                      <th className="p-3">Title & Details</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Creator</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {postsList.filter((p) => {
                      const matchSearch = !searchQuery || p.title?.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchStatus = filterStatus === 'All' || p.status === filterStatus;
                      return matchSearch && matchStatus;
                    }).map((post) => (
                      <tr key={post._id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800 max-w-xs truncate">{post.title}</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">{post.category}</span></td>
                        <td className="p-3 text-slate-600">{post.location}</td>
                        <td className="p-3 font-medium">{post.creator?.name || 'Member'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${post.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : post.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                            {post.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1">
                          {post.status !== 'APPROVED' && <button onClick={() => handleApprovePost(post._id)} className="px-2 py-1 rounded bg-emerald-600 text-white font-bold">Approve</button>}
                          {post.status === 'APPROVED' && (
                            <button onClick={() => handleFeaturePost(post._id, !post.isFeatured)} className={`px-2 py-1 rounded font-bold ${post.isFeatured ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}>
                              {post.isFeatured ? '★ Featured' : '☆ Feature'}
                            </button>
                          )}
                          <button onClick={() => handleDeletePost(post._id)} className="px-2 py-1 rounded bg-rose-100 text-rose-700 font-bold hover:bg-rose-200">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: BLOGS MODERATION */}
          {/* ========================================================================= */}
          {activeTab === 'blogs' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex-1">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Stories & Blog Submissions ({blogsList.length})</h3>
                  <p className="text-[11px] text-slate-500">Moderate community stories and editorial blogs.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b">
                    <tr>
                      <th className="p-3">Title</th>
                      <th className="p-3">Author</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {blogsList.map((blog) => (
                      <tr key={blog._id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800 max-w-xs truncate">{blog.title}</td>
                        <td className="p-3">{blog.author?.name || 'Author'}</td>
                        <td className="p-3">{blog.category}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${blog.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{blog.status}</span>
                        </td>
                        <td className="p-3 text-right space-x-1">
                          {blog.status !== 'APPROVED' && <button onClick={() => handleApproveBlog(blog._id)} className="px-2 py-1 rounded bg-emerald-600 text-white font-bold">Approve</button>}
                          {blog.status === 'APPROVED' && (
                            <button onClick={() => handleFeatureBlog(blog)} className={`px-2 py-1 rounded font-bold ${blog.isFeatured ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}>
                              {blog.isFeatured ? '★ Featured' : '☆ Feature'}
                            </button>
                          )}
                          <button onClick={() => handleDeleteBlog(blog._id)} className="px-2 py-1 rounded bg-rose-100 text-rose-700 font-bold">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: OFFICIAL EVENTS */}
          {/* ========================================================================= */}
          {activeTab === 'events' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex-1">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Official Assemblies & Events ({eventsList.length})</h3>
                  <p className="text-[11px] text-slate-500">Manage official platform events and participant rosters.</p>
                </div>
                <button onClick={() => setShowEventModal(true)} className="px-3.5 py-1.5 rounded-xl bg-[#94201B] text-white text-xs font-bold flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Create Official Event
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {eventsList.map((ev) => (
                  <div key={ev._id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 relative">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${ev.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{ev.status}</span>
                        {ev.isFeatured && <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-white">★ FEATURED</span>}
                      </div>
                      <button onClick={() => handleDeleteEvent(ev._id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{ev.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2">{ev.description}</p>
                    <div className="text-[10px] text-slate-500 space-y-0.5 pt-2 border-t">
                      <p>📅 {new Date(ev.date).toLocaleDateString()} • 🕒 {ev.startTime} - {ev.endTime}</p>
                      <p>📍 {ev.location}</p>
                      <p className="font-bold text-slate-700">👥 {ev.joinedUsers?.length || 0} / {ev.maxParticipants} Registered</p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={() => handleFeatureEvent(ev)} className={`text-[10px] font-bold px-2 py-1 rounded ${ev.isFeatured ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}>
                        {ev.isFeatured ? '★ Featured' : '☆ Feature'}
                      </button>
                      {ev.status !== 'CANCELLED' && (
                        <button onClick={() => handleCancelEvent(ev._id)} className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-white hover:bg-slate-900">
                          Cancel Event
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: REPORTS MODERATION */}
          {/* ========================================================================= */}
          {activeTab === 'reports' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex-1">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Community Safety & Moderation Reports ({reportsList.length})</h3>
                  <p className="text-[11px] text-slate-500">Review reported items and enforce community safety rules.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b">
                    <tr>
                      <th className="p-3">Report Target</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Reporter</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Moderation Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reportsList.length > 0 ? (
                      reportsList.map((rep) => (
                        <tr key={rep._id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-800">
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold mr-2">{rep.targetType}</span>
                            {rep.targetDoc?.title || rep.targetDoc?.content || rep.targetId}
                          </td>
                          <td className="p-3 text-rose-700 font-semibold">{rep.reason}</td>
                          <td className="p-3">{rep.reporter?.name || 'Member'}</td>
                          <td className="p-3 text-slate-500">{new Date(rep.createdAt).toLocaleDateString()}</td>
                          <td className="p-3 text-right space-x-1">
                            <button onClick={() => handleResolveReport(rep._id, 'DISMISS')} className="px-2.5 py-1 rounded bg-slate-200 text-slate-700 font-bold">Dismiss</button>
                            <button onClick={() => handleResolveReport(rep._id, 'WARN_USER', 'Please review community guidelines')} className="px-2.5 py-1 rounded bg-amber-500 text-white font-bold">Warn</button>
                            <button onClick={() => handleResolveReport(rep._id, 'REMOVE_CONTENT')} className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold">Remove Content</button>
                            <button onClick={() => handleResolveReport(rep._id, 'SUSPEND_USER', 'Repeated reported safety violations')} className="px-2.5 py-1 rounded bg-slate-900 text-white font-bold">Suspend</button>
                            <button onClick={() => { if (window.confirm('Permanently BAN this user? This blocks all access.')) handleResolveReport(rep._id, 'BAN_USER', 'Severe or repeated policy violations'); }} className="px-2.5 py-1 rounded bg-red-900 text-white font-bold">Ban</button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="5" className="p-6 text-center text-slate-400 font-bold">No active safety reports pending review!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: COMMENTS CONTROL */}
          {/* ========================================================================= */}
          {activeTab === 'comments' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex-1">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Comments Moderation ({commentsList.length})</h3>
                  <p className="text-[11px] text-slate-500">Monitor and delete abusive or spam comments.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b">
                    <tr>
                      <th className="p-3">Comment Content</th>
                      <th className="p-3">Author</th>
                      <th className="p-3">Post</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {commentsList.map((com) => (
                      <tr key={com._id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800 max-w-sm truncate">{com.content}</td>
                        <td className="p-3">{com.author?.name || 'Member'}</td>
                        <td className="p-3 text-slate-500">{com.post?.title || 'Post'}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => handleDeleteComment(com._id)} className="px-2.5 py-1 rounded bg-rose-100 text-rose-700 font-bold hover:bg-rose-200">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 8: MEMBERS DIRECTORY */}
          {/* ========================================================================= */}
          {activeTab === 'members' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex-1">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Members Directory ({membersList.length})</h3>
                  <p className="text-[11px] text-slate-500">View member accounts, roles, verification levels, and suspension status.</p>
                </div>
                <button onClick={() => exportCSV(membersList, 'haatemalo_members')} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b">
                    <tr>
                      <th className="p-3">User Name & Email</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Member Level</th>
                      <th className="p-3">Verification</th>
                      <th className="p-3">Suspension</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {membersList.filter((u) => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase())).map((m) => (
                      <tr key={m._id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">
                          <p>{m.name}</p>
                          <p className="text-[10px] text-slate-400 font-normal">{m.email}</p>
                        </td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-200 font-bold">{m.role}</span></td>
                        <td className="p-3 font-semibold">{m.memberLevel}</td>
                        <td className="p-3">
                          <button onClick={() => handleVerifyUser(m._id, m.memberLevel, !m.isVerified)} className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.isVerified ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-600'}`}>
                            {m.isVerified ? 'VERIFIED ✓' : 'UNVERIFIED'}
                          </button>
                        </td>
                        <td className="p-3">
                          {m.isSuspended ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 font-bold" title={m.suspensionReason}>SUSPENDED ⛔</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">ACTIVE</span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <button onClick={() => setSuspendingUser(m)} className="px-2 py-1 rounded bg-amber-100 text-amber-800 font-bold">
                            {m.isSuspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                          <button onClick={() => handleDeleteUser(m._id)} className="px-2 py-1 rounded bg-rose-100 text-rose-700 font-bold">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 9: ORGANIZATIONS */}
          {/* ========================================================================= */}
          {activeTab === 'orgs' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">NGOs & Partner Organizations Management</h3>
                  <p className="text-[11px] text-slate-500">Register new institutions, verify NGO credentials, and audit partner drives.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => exportCSV(membersList.filter((u) => u.memberLevel === 'ORGANIZATION'), 'haatemalo_organizations')} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-200">
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                  <button onClick={() => setShowOrgModal(true)} className="px-3.5 py-1.5 rounded-xl bg-[#94201B] text-white text-xs font-bold flex items-center gap-1.5 shadow-md">
                    <Plus className="w-4 h-4" /> Add Organization
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-grow max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search org name, email, location..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* Organizations Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b">
                    <tr>
                      <th className="p-3">Organization Name & Contact</th>
                      <th className="p-3">Reg No / Type</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Verification</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {membersList
                      .filter((u) => u.memberLevel === 'ORGANIZATION')
                      .filter((org) => !searchQuery || org.name?.toLowerCase().includes(searchQuery.toLowerCase()) || org.email?.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((org) => (
                        <tr key={org._id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div>
                                <Link to={`/profile/${org._id}`} target="_blank" className="hover:underline hover:text-[#C8382C] flex items-center gap-1">
                                  {org.name} <ExternalLink className="w-3 h-3 text-slate-400" />
                                </Link>
                                <p className="text-[10px] text-slate-500 font-normal">{org.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-bold text-[10px]">
                              {org.orgDetails?.regNumber || 'REG-ACTIVE'}
                            </span>
                            <p className="text-[10px] text-slate-500 mt-0.5">{org.orgDetails?.orgType || 'NGO'}</p>
                          </td>
                          <td className="p-3 text-slate-700">{org.location || 'Nepal'}</td>
                          <td className="p-3">
                            <button onClick={() => handleVerifyUser(org._id, 'ORGANIZATION', !org.isVerified)} className={`px-2.5 py-1 rounded text-[10px] font-bold ${org.isVerified ? 'bg-sky-100 text-sky-800 border border-sky-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                              {org.isVerified ? 'VERIFIED NGO ✓' : 'VERIFY ORG'}
                            </button>
                          </td>
                          <td className="p-3 text-right space-x-1">
                            <Link to={`/profile/${org._id}`} target="_blank" className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold inline-block">
                              View
                            </Link>
                            <button onClick={() => handleDeleteUser(org._id)} className="px-2 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold">
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 10: VOLUNTEERS */}
          {/* ========================================================================= */}
          {activeTab === 'volunteers' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Volunteers Roster & Tier Management</h3>
                  <p className="text-[11px] text-slate-500">Manage volunteer levels, assign civic badges, verify credentials, and review activity logs.</p>
                </div>
                <button onClick={() => exportCSV(membersList.filter((u) => u.role === 'USER'), 'haatemalo_volunteers')} className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-200">
                  <Download className="w-3.5 h-3.5" /> Export Volunteers CSV
                </button>
              </div>

              {/* Search & Tier Filter */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-grow max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search volunteer name, email, skills..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none font-semibold cursor-pointer"
                >
                  <option value="All">All Volunteer Tiers</option>
                  <option value="VOLUNTEER">Volunteer</option>
                  <option value="SENIOR_VOLUNTEER">Senior Volunteer</option>
                  <option value="COMMUNITY_LEAD">Community Lead</option>
                  <option value="MEMBER">General Member</option>
                </select>
              </div>

              {/* Volunteers Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b">
                    <tr>
                      <th className="p-3">Volunteer Name & Email</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Volunteer Tier Level</th>
                      <th className="p-3">Verification</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {membersList
                      .filter((u) => u.role === 'USER')
                      .filter((vol) => filterCategory === 'All' || vol.memberLevel === filterCategory)
                      .filter((vol) => !searchQuery || vol.name?.toLowerCase().includes(searchQuery.toLowerCase()) || vol.email?.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((vol) => (
                        <tr key={vol._id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={vol.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                                alt={vol.name}
                                className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0"
                              />
                              <div>
                                <Link to={`/profile/${vol._id}`} target="_blank" className="hover:underline hover:text-[#C8382C] flex items-center gap-1">
                                  {vol.name} <ExternalLink className="w-3 h-3 text-slate-400" />
                                </Link>
                                <p className="text-[10px] text-slate-500 font-normal">{vol.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-slate-700">{vol.location || 'Nepal'}</td>
                          <td className="p-3">
                            <select
                              value={vol.memberLevel || 'MEMBER'}
                              onChange={(e) => handleVerifyUser(vol._id, e.target.value, vol.isVerified)}
                              className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800 outline-none cursor-pointer"
                            >
                              <option value="MEMBER">Member</option>
                              <option value="VOLUNTEER">Volunteer 🤝</option>
                              <option value="SENIOR_VOLUNTEER">Senior Volunteer ⭐</option>
                              <option value="COMMUNITY_LEAD">Community Lead 👑</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <button onClick={() => handleVerifyUser(vol._id, vol.memberLevel, !vol.isVerified)} className={`px-2.5 py-1 rounded text-[10px] font-bold ${vol.isVerified ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                              {vol.isVerified ? 'VERIFIED ✓' : 'VERIFY'}
                            </button>
                          </td>
                          <td className="p-3 text-right space-x-1">
                            <Link to={`/profile/${vol._id}`} target="_blank" className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold inline-block">
                              Profile
                            </Link>
                            <button onClick={() => handleDeleteUser(vol._id)} className="px-2 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold">
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 11: DYNAMIC CATEGORIES */}
          {/* ========================================================================= */}
          {activeTab === 'categories' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex-1">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Dynamic Activity Categories ({categoriesList.length})</h3>
                  <p className="text-[11px] text-slate-500">Categories added here dynamically appear on public post/blog forms.</p>
                </div>
                <button onClick={() => setShowCategoryModal(true)} className="px-3.5 py-1.5 rounded-xl bg-[#94201B] text-white text-xs font-bold flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Add Category
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {categoriesList.map((cat) => (
                  <div key={cat._id} className={`p-4 rounded-xl border flex items-center justify-between ${cat.isActive === false ? 'border-slate-200 bg-slate-100 opacity-70' : 'border-slate-200 bg-slate-50'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{cat.name}</h4>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${cat.isActive === false ? 'bg-slate-300 text-slate-700' : 'bg-emerald-100 text-emerald-800'}`}>
                          {cat.isActive === false ? 'INACTIVE' : 'ACTIVE'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{cat.description || 'Activity Category'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleCategoryActive(cat)}
                        className={`text-[10px] font-bold px-2 py-1 rounded ${cat.isActive === false ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                      >
                        {cat.isActive === false ? 'Activate' : 'Deactivate'}
                      </button>
                      <button onClick={() => handleDeleteCategory(cat._id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 12: DONATIONS LEDGER */}
          {/* ========================================================================= */}
          {activeTab === 'donations' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex-1">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Voluntary Donations Financial Ledger ({donationsList.length})</h3>
                  <p className="text-[11px] text-slate-500">Audit all incoming voluntary contributions across eSewa/Khalti.</p>
                </div>
                <button onClick={() => exportCSV(donationsList, 'haatemalo_donations')} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Export Ledger CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b">
                    <tr>
                      <th className="p-3">Transaction ID</th>
                      <th className="p-3">Donor Name</th>
                      <th className="p-3">Amount (NPR)</th>
                      <th className="p-3">Payment Method</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {donationsList.map((d) => (
                      <tr key={d._id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-800">{d.transactionId}</td>
                        <td className="p-3 font-semibold">{d.donor?.name || 'Anonymous Donor'}</td>
                        <td className="p-3 font-black text-emerald-700">Rs. {d.amount.toLocaleString()}</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">{d.paymentMethod}</span></td>
                        <td className="p-3 font-bold">{d.type}</td>
                        <td className="p-3 text-slate-500">{new Date(d.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 13: CAMPAIGNS */}
          {/* ========================================================================= */}
          {activeTab === 'campaigns' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex-1">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Fundraising Campaigns ({campaignsList.length})</h3>
                  <p className="text-[11px] text-slate-500">Manage campaign targets, collected funds, and status.</p>
                </div>
                <button onClick={() => setShowCampaignModal(true)} className="px-3.5 py-1.5 rounded-xl bg-[#94201B] text-white text-xs font-bold flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Launch Campaign
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {campaignsList.map((c) => (
                  <div key={c._id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[9px]">{c.status}</span>
                      <button onClick={() => handleDeleteCampaign(c._id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{c.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>
                    <div className="text-xs font-bold text-slate-800 pt-2 border-t">
                      Raised: <span className="text-emerald-700">Rs. {c.raisedAmount.toLocaleString()}</span> / Goal: Rs. {c.goalAmount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 14: EXPENSES & RECEIPTS */}
          {/* ========================================================================= */}
          {activeTab === 'expenses' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex-1">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Expenses Transparency Ledger ({expensesList.length})</h3>
                  <p className="text-[11px] text-slate-500">Track itemized expenditure records logged for fundraising campaigns.</p>
                </div>
                <button onClick={() => setShowExpenseModal(true)} className="px-3.5 py-1.5 rounded-xl bg-[#94201B] text-white text-xs font-bold flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Log Expense Record
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b">
                    <tr>
                      <th className="p-3">Expense Title</th>
                      <th className="p-3">Campaign</th>
                      <th className="p-3">Amount (NPR)</th>
                      <th className="p-3">Spent Date</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {expensesList.map((exp) => (
                      <tr key={exp._id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800">{exp.title}</td>
                        <td className="p-3">{exp.campaign?.title || 'General Campaign'}</td>
                        <td className="p-3 font-black text-rose-700">Rs. {exp.amount.toLocaleString()}</td>
                        <td className="p-3 text-slate-500">{new Date(exp.spentDate).toLocaleDateString()}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => handleDeleteExpense(exp._id)} className="px-2.5 py-1 rounded bg-rose-100 text-rose-700 font-bold">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 15: ADMINS & RBAC */}
          {/* ========================================================================= */}
          {activeTab === 'admins' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex-1">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Admin Staff & Role-Based Access Control (RBAC)</h3>
                  <p className="text-[11px] text-slate-500">Assign granular administrative permissions to staff moderators.</p>
                </div>
                <button onClick={() => setShowStaffModal(true)} className="px-3.5 py-1.5 rounded-xl bg-[#94201B] text-white text-xs font-bold flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" /> Add Admin Staff
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b">
                    <tr>
                      <th className="p-3">Staff Name & Email</th>
                      <th className="p-3">Assigned Role</th>
                      <th className="p-3">Granular Permissions</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {membersList.filter((u) => ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(u.role)).map((admin) => (
                      <tr key={admin._id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">
                          <p>{admin.name}</p>
                          <p className="text-[10px] text-slate-400 font-normal">{admin.email}</p>
                        </td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">{admin.role}</span></td>
                        <td className="p-3 max-w-xs truncate text-slate-600 font-mono text-[10px]">
                          {admin.permissions?.length > 0 ? admin.permissions.join(', ') : 'FULL_SUPER_ACCESS'}
                        </td>
                        <td className="p-3 text-right">
                          {admin.role !== 'SUPER_ADMIN' && (
                            <button onClick={() => handleDeleteStaff(admin._id)} className="px-2.5 py-1 rounded bg-rose-100 text-rose-700 font-bold">Remove Access</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 16: PLATFORM SETTINGS */}
          {/* ========================================================================= */}
          {activeTab === 'settings' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-6 flex-1 max-w-3xl">
              <div className="border-b pb-3">
                <h3 className="text-sm font-black text-slate-900">Platform Settings & CMS Controls</h3>
                <p className="text-[11px] text-slate-500">Configure public platform behavior, approval rules, and homepage headline.</p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Platform Name</label>
                  <input type="text" value={settingsData.platformName || 'हातेमालो (HAATEMALO)'} onChange={(e) => setSettingsData({ ...settingsData, platformName: e.target.value })} className="w-full border rounded-lg p-2.5 outline-none font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tagline</label>
                  <input type="text" value={settingsData.tagline || 'मद्दत मागौँ। सहयोग गरौँ। सँगै परिवर्तन ल्याऔँ।'} onChange={(e) => setSettingsData({ ...settingsData, tagline: e.target.value })} className="w-full border rounded-lg p-2.5 outline-none font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Email</label>
                  <input type="email" value={settingsData.contactEmail || 'admin@haatemalo.org'} onChange={(e) => setSettingsData({ ...settingsData, contactEmail: e.target.value })} className="w-full border rounded-lg p-2.5 outline-none font-bold" />
                </div>

                <div className="pt-3 border-t space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-[#C8382C]">💳 Donation Payment & Static QR Settings</h4>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Static Payment QR Image URL</label>
                    <input
                      type="url"
                      value={settingsData.paymentQrCode || ''}
                      onChange={(e) => setSettingsData({ ...settingsData, paymentQrCode: e.target.value })}
                      placeholder="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=HAATEMALO-DONATION-OFFICIAL-QR"
                      className="w-full border rounded-lg p-2.5 outline-none text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Paste any image URL or eSewa/Khalti/Fonepay QR image link here.</p>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Instructions</label>
                    <input
                      type="text"
                      value={settingsData.paymentInstructions || ''}
                      onChange={(e) => setSettingsData({ ...settingsData, paymentInstructions: e.target.value })}
                      placeholder="Scan with eSewa, Khalti, or Fonepay to make a direct voluntary contribution."
                      className="w-full border rounded-lg p-2.5 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Official Mobile / Wallet Number</label>
                    <input
                      type="text"
                      value={settingsData.paymentPhone || ''}
                      onChange={(e) => setSettingsData({ ...settingsData, paymentPhone: e.target.value })}
                      placeholder="+977 9800000000"
                      className="w-full border rounded-lg p-2.5 outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t space-y-2">
                  <h4 className="font-bold text-slate-800">Moderation Policies & Toggles</h4>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={settingsData.requirePostApproval ?? true} onChange={(e) => setSettingsData({ ...settingsData, requirePostApproval: e.target.checked })} />
                    <span>Require Admin Approval for Posts before making public</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={settingsData.requireBlogApproval ?? true} onChange={(e) => setSettingsData({ ...settingsData, requireBlogApproval: e.target.checked })} />
                    <span>Require Admin Approval for Blog Stories</span>
                  </label>
                </div>

                <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#94201B] text-white font-bold text-xs shadow-md">
                  Save Platform Settings & Update QR
                </button>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 17: SYSTEM AUDIT LOGS */}
          {/* ========================================================================= */}
          {activeTab === 'logs' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex-1">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Immutable System Audit Logs ({auditLogsList.length})</h3>
                  <p className="text-[11px] text-slate-500">Track all administrative changes, deletions, and policy enforcement actions.</p>
                </div>
                <button onClick={() => exportCSV(auditLogsList, 'haatemalo_audit_logs')} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Export Logs CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b">
                    <tr>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Admin Performer</th>
                      <th className="p-3">Action Description</th>
                      <th className="p-3">Target Type</th>
                      <th className="p-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {auditLogsList.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-500 font-mono text-[10px]">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="p-3 font-bold text-slate-800">{log.admin?.name || 'System Admin'}</td>
                        <td className="p-3 font-bold text-[#94201B]">{log.action}</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-200 font-mono font-bold text-[9px]">{log.targetType}</span></td>
                        <td className="p-3 text-slate-600 text-[10px] line-clamp-1">{log.details || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>

      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* ANNOUNCEMENT MODAL */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-2xl p-5 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-900 text-xs">Create Platform Announcement</h3>
              <button onClick={() => setShowAnnouncementModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleBroadcastAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Title</label>
                <input type="text" required value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Announcement title..." className="w-full border rounded-lg p-2 text-xs outline-none" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Message</label>
                <textarea rows={3} required value={annContent} onChange={(e) => setAnnContent(e.target.value)} placeholder="Message content..." className="w-full border rounded-lg p-2 text-xs outline-none" />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-lg font-bold bg-[#94201B] text-white text-xs shadow-md">
                Broadcast Announcement
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EVENT MODAL */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-2xl p-5 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-900 text-xs">Create Official Platform Event</h3>
              <button onClick={() => setShowEventModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Event Title</label>
                <input type="text" required value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} className="w-full border rounded-lg p-2 outline-none" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea rows={2} required value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} className="w-full border rounded-lg p-2 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location</label>
                  <input type="text" required value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} className="w-full border rounded-lg p-2 outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date</label>
                  <input type="date" required value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className="w-full border rounded-lg p-2 outline-none" />
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 rounded-lg font-bold bg-[#94201B] text-white text-xs shadow-md">
                Publish Official Event
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STAFF MODAL */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-2xl p-5 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-900 text-xs">Add New Staff / Admin Account</h3>
              <button onClick={() => setShowStaffModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input type="text" required value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} className="w-full border rounded-lg p-2 outline-none" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input type="email" required value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} className="w-full border rounded-lg p-2 outline-none" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Password</label>
                <input type="password" required value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} className="w-full border rounded-lg p-2 outline-none" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Role</label>
                <select value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })} className="w-full border rounded-lg p-2 outline-none">
                  <option value="ADMIN">ADMIN</option>
                  <option value="MODERATOR">MODERATOR</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2.5 rounded-lg font-bold bg-[#94201B] text-white text-xs shadow-md">
                Create Admin Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-sm w-full rounded-2xl p-5 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-900 text-xs">Add Activity Category</h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Name</label>
                <input type="text" required value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g. Disaster Relief" className="w-full border rounded-lg p-2 outline-none" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <input type="text" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Brief description..." className="w-full border rounded-lg p-2 outline-none" />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-lg font-bold bg-[#94201B] text-white text-xs shadow-md">
                Add Category
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CAMPAIGN MODAL */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-sm w-full rounded-2xl p-5 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-900 text-xs">Launch Fundraising Campaign</h3>
              <button onClick={() => setShowCampaignModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateCampaign} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Campaign Title</label>
                <input type="text" required value={campaignForm.title} onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })} className="w-full border rounded-lg p-2 outline-none" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea rows={2} required value={campaignForm.description} onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })} className="w-full border rounded-lg p-2 outline-none" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Goal Amount (NPR)</label>
                <input type="number" required value={campaignForm.goalAmount} onChange={(e) => setCampaignForm({ ...campaignForm, goalAmount: e.target.value })} className="w-full border rounded-lg p-2 outline-none" />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-lg font-bold bg-[#94201B] text-white text-xs shadow-md">
                Launch Campaign Live
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-sm w-full rounded-2xl p-5 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-900 text-xs">Log Expense Record</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Campaign</label>
                <select required value={expenseForm.campaignId} onChange={(e) => setExpenseForm({ ...expenseForm, campaignId: e.target.value })} className="w-full border rounded-lg p-2 outline-none">
                  <option value="">Select Target Campaign...</option>
                  {campaignsList.map((c) => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Expense Title / Item</label>
                <input type="text" required value={expenseForm.title} onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })} placeholder="e.g. 500 Saplings Purchase" className="w-full border rounded-lg p-2 outline-none" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount Spent (NPR)</label>
                <input type="number" required value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full border rounded-lg p-2 outline-none" />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-lg font-bold bg-[#94201B] text-white text-xs shadow-md">
                Log Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-sm w-full rounded-2xl p-5 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-xs">Specify Rejection Feedback Reason</h3>
            <textarea rows={3} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Explain why this content was rejected so the user can fix it..." className="w-full border rounded-lg p-2 text-xs outline-none" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectingItem(null)} className="px-3 py-1.5 rounded-lg bg-slate-200 text-xs font-bold">Cancel</button>
              <button onClick={() => rejectingItem.type === 'POST' ? handleRejectPost(rejectingItem.id, rejectionReason) : handleRejectBlog(rejectingItem.id, rejectionReason)} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold">
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUSPENSION MODAL */}
      {suspendingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-sm w-full rounded-2xl p-5 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-xs">
              {suspendingUser.isSuspended ? `Reactivate Account for ${suspendingUser.name}?` : `Suspend Account for ${suspendingUser.name}?`}
            </h3>
            {!suspendingUser.isSuspended && (
              <textarea rows={3} value={suspensionReasonInput} onChange={(e) => setSuspensionReasonInput(e.target.value)} placeholder="Reason for account suspension..." className="w-full border rounded-lg p-2 text-xs outline-none" />
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setSuspendingUser(null)} className="px-3 py-1.5 rounded-lg bg-slate-200 text-xs font-bold">Cancel</button>
              <button onClick={() => handleSuspendUser(suspendingUser._id, !suspendingUser.isSuspended, suspensionReasonInput)} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold">
                {suspendingUser.isSuspended ? 'Confirm Reactivation' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORGANIZATION MODAL */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-2xl p-5 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#94201B]" /> Add New NGO / Partner Organization
              </h3>
              <button onClick={() => setShowOrgModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateOrg} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Organization Name *</label>
                <input
                  type="text"
                  required
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  placeholder="e.g. Nepal Red Cross Society"
                  className="w-full border rounded-lg p-2 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={orgForm.email}
                    onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                    placeholder="contact@org.org.np"
                    className="w-full border rounded-lg p-2 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={orgForm.phone}
                    onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                    placeholder="+977 9800000000"
                    className="w-full border rounded-lg p-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reg / License No</label>
                  <input
                    type="text"
                    value={orgForm.regNumber}
                    onChange={(e) => setOrgForm({ ...orgForm, regNumber: e.target.value })}
                    placeholder="SWC-12345"
                    className="w-full border rounded-lg p-2 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Org Type</label>
                  <select
                    value={orgForm.orgType}
                    onChange={(e) => setOrgForm({ ...orgForm, orgType: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs outline-none"
                  >
                    <option value="NGO">NGO / Non-Profit</option>
                    <option value="INGO">INGO</option>
                    <option value="Civil Society">Civil Society Group</option>
                    <option value="Youth Club">Youth Volunteer Club</option>
                    <option value="Environmental">Environmental Group</option>
                    <option value="Disaster Response">Disaster Response</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  value={orgForm.location}
                  onChange={(e) => setOrgForm({ ...orgForm, location: e.target.value })}
                  placeholder="e.g. Kathmandu, Nepal"
                  className="w-full border rounded-lg p-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mission / Description</label>
                <textarea
                  rows={2}
                  value={orgForm.description}
                  onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                  placeholder="Brief mission statement..."
                  className="w-full border rounded-lg p-2 text-xs outline-none"
                />
              </div>

              <button type="submit" className="w-full py-2.5 rounded-lg font-bold bg-[#94201B] text-white text-xs shadow-md">
                Register & Verify Organization
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SuperAdminDashboard;
