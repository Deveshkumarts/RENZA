import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Tasks from './components/Tasks';
import Wiki from './components/Wiki';
import TaskPipeline from './components/TaskPipeline';
import CompanyUpdates from './components/CompanyUpdates';
import Profile from './components/Profile';
import Chat from './components/Chat';
import './App.css';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('renza_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const isLeader = user?.role === 'CEO' || user?.role === 'COO';
  
  const [currentView, setCurrentView] = useState(() => {
    const savedView = localStorage.getItem('renza_view');
    if (savedView) return savedView;
    return isLeader ? 'view' : 'post';
  });
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dismissedIds, setDismissedIds] = useState(() => {
    const saved = localStorage.getItem(`renza_notif_dismissed_${JSON.parse(localStorage.getItem('renza_user') || '{}')?.id || ''}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('renza_theme') || 'dark';
  });

  React.useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : 'dark-theme';
    localStorage.setItem('renza_theme', theme);
  }, [theme]);

  React.useEffect(() => {
    let lastWidth = window.innerWidth;
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      if (lastWidth > 768 && currentWidth <= 768) {
        setIsSidebarOpen(false);
      } else if (lastWidth <= 768 && currentWidth > 768) {
        setIsSidebarOpen(true);
      }
      lastWidth = currentWidth;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ===== Notifications =====
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setNotifLoading(true);
    try {
      const notifs = [];

      // 1. Recent messages from channels the user belongs to (sent by others)
      // First get the channels the user is a member of
      const { data: memberChannels } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id);

      // Also include COMPANY type channels
      const { data: companyChannels } = await supabase
        .from('channels')
        .select('id')
        .eq('type', 'COMPANY');

      const channelIds = [
        ...new Set([
          ...(memberChannels || []).map(c => c.channel_id),
          ...(companyChannels || []).map(c => c.id),
        ])
      ];

      if (channelIds.length > 0) {
        const { data: messages } = await supabase
          .from('messages')
          .select(`
            id, content, created_at, channel_id,
            sender:users!messages_sender_id_fkey(id, name, email),
            channel:channels!messages_channel_id_fkey(name, type)
          `)
          .in('channel_id', channelIds)
          .neq('sender_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (messages) {
          messages.forEach(msg => {
            notifs.push({
              id: `msg_${msg.id}`,
              type: 'message',
              title: msg.sender?.name || msg.sender?.email || 'Someone',
              subtitle: msg.channel?.name ? `#${msg.channel.name}` : 'Chat',
              body: msg.content || '📎 Attachment',
              time: msg.created_at,
              icon: 'chat',
            });
          });
        }
      }

      // 2. Recent updates posted by others (not the current user)
      const { data: updates } = await supabase
        .from('updates')
        .select(`
          id, completed, category, created_at,
          user:users!updates_user_id_fkey(name, email, category)
        `)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(15);

      if (updates) {
        // For non-leaders, only show updates from same category
        const filtered = user.role === 'CEO' || user.role === 'COO'
          ? updates
          : updates.filter(u => u.user?.category === user.category);

        filtered.forEach(upd => {
          const preview = upd.completed
            ? upd.completed.split('\n')[0].slice(0, 50) + (upd.completed.length > 50 ? '...' : '')
            : 'Posted a daily update';
          notifs.push({
            id: `upd_${upd.id}`,
            type: 'update',
            title: upd.user?.name || upd.user?.email || 'Team member',
            subtitle: upd.category || 'Update',
            body: preview,
            time: upd.created_at,
            icon: 'update',
          });
        });
      }

      // Sort all notifications by time descending
      notifs.sort((a, b) => new Date(b.time) - new Date(a.time));

      // Track unseen — use localStorage key per user
      const seenKey = `renza_notif_seen_${user.id}`;
      const lastSeen = localStorage.getItem(seenKey);
      const unseenCount = lastSeen
        ? notifs.filter(n => new Date(n.time) > new Date(lastSeen)).length
        : notifs.length;

      setNotifications(notifs);
      setUnreadCount(unseenCount);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setNotifLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    // Real-time subscription for new messages
    const msgSub = supabase
      .channel('notif_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchNotifications();
      })
      .subscribe();

    // Real-time subscription for new updates
    const updSub = supabase
      .channel('notif_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'updates' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgSub);
      supabase.removeChannel(updSub);
    };
  }, [user, fetchNotifications]);

  const handleOpenNotif = () => {
    setNotifOpen(prev => !prev);
    setProfileMenuOpen(false);
    // Mark all as seen
    if (user) {
      localStorage.setItem(`renza_notif_seen_${user.id}`, new Date().toISOString());
      setUnreadCount(0);
    }
  };

  const dismissNotif = (e, notifId) => {
    e.stopPropagation(); // don't navigate on dismiss
    const updated = new Set(dismissedIds);
    updated.add(notifId);
    setDismissedIds(updated);
    localStorage.setItem(`renza_notif_dismissed_${user.id}`, JSON.stringify([...updated]));
  };

  const clearAllNotifs = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setDismissedIds(allIds);
    localStorage.setItem(`renza_notif_dismissed_${user.id}`, JSON.stringify([...allIds]));
  };

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    localStorage.setItem('renza_user', JSON.stringify(loggedInUser));
    
    const leader = loggedInUser.role === 'CEO' || loggedInUser.role === 'COO';
    const initialView = leader ? 'view' : 'post';
    setCurrentView(initialView);
    localStorage.setItem('renza_view', initialView);
  };
  
  const changeView = (view) => {
    setCurrentView(view);
    localStorage.setItem('renza_view', view);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('renza_user');
    localStorage.removeItem('renza_view');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user.name ? user.name.split(' ')[0] : user.email.split('@')[0];
  const avatarLetter = (user.name ? user.name.charAt(0) : user.email.charAt(0)).toUpperCase();

  return (
    <div className={`app-layout ${isSidebarOpen ? '' : 'sidebar-closed'}`}>
      {/* Mobile Overlay */}
      {isSidebarOpen && window.innerWidth <= 768 && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Mobile Header (Only visible on mobile) */}
      <div className="mobile-header">
        <div className="mobile-header-brand">
          <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <img src="/logo.png" alt="Renza Logo" className="mobile-header-logo" onError={(e) => e.target.style.display = 'none'} />
          <h2>Renza</h2>
        </div>
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '1.1rem', cursor: 'pointer', padding: '0 0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>


      {/* ===== SIDEBAR ===== */}
      <aside className={`sidebar ${isSidebarOpen ? 'mobile-open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            {/* Logo icon */}
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.1rem',
              color: '#000',
              flexShrink: 0,
            }}>R</div>
            <h2>Renza</h2>
          </div>
          <button className="toggle-sidebar-btn" onClick={() => setIsSidebarOpen(false)} title="Close sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {/* Post Update – special teal button */}
          {!isLeader && (
            <button
              className="nav-item-post-btn"
              onClick={() => changeView('post')}
              style={currentView === 'post' ? { background: '#00d2c4' } : { background: 'rgba(0,210,196,0.12)', color: '#00d2c4' }}
            >
              <span className="nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </span>
              Post Update
            </button>
          )}

          {/* View Dashboard */}
          <div
            className={`nav-item ${currentView === 'view' ? 'active' : ''}`}
            onClick={() => changeView('view')}
          >
            <span className="nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </span>
            View Dashboard
          </div>

          {/* Tasks */}
          <div
            className={`nav-item ${currentView === 'tasks' ? 'active' : ''}`}
            onClick={() => changeView('tasks')}
          >
            <span className="nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
            </span>
            {isLeader ? 'Assign Tasks' : 'My Tasks'}
          </div>

          {/* Task Pipeline (leaders only) */}
          {isLeader && (
            <div
              className={`nav-item ${currentView === 'pipeline' ? 'active' : ''}`}
              onClick={() => changeView('pipeline')}
            >
              <span className="nav-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </span>
              Task Pipeline
            </div>
          )}

          {/* Company Wiki */}
          <div
            className={`nav-item ${currentView === 'wiki' ? 'active' : ''}`}
            onClick={() => changeView('wiki')}
          >
            <span className="nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </span>
            Company Wiki
          </div>

          {/* Company Updates */}
          <div
            className={`nav-item ${currentView === 'updates' ? 'active' : ''}`}
            onClick={() => changeView('updates')}
          >
            <span className="nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </span>
            Company Updates
          </div>

          {/* Chat */}
          <div
            className={`nav-item ${currentView === 'chat' ? 'active' : ''}`}
            onClick={() => changeView('chat')}
          >
            <span className="nav-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </span>
            Chat
          </div>
        </nav>
        
      </aside>

      {/* ===== RIGHT SHELL (header + main) ===== */}
      <div className="app-right-shell">
        {/* Top Header Bar */}
        <header className="top-header">
          <div className="top-header-greeting" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {!isSidebarOpen && window.innerWidth > 768 && (
              <button 
                className="toggle-sidebar-btn" 
                onClick={() => setIsSidebarOpen(true)} 
                title="Open sidebar"
                style={{ 
                  background: 'var(--card-bg)', 
                  border: '1px solid var(--border-color)', 
                  color: 'var(--text-muted)', 
                  borderRadius: '8px',
                  padding: '0.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                </svg>
              </button>
            )}
            <div>
              {getGreeting()}, <span>{firstName}</span> 👋
            </div>
          </div>
          <div className="top-header-actions">
            {/* Bell icon with Notification Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className="header-icon-btn"
                title="Notifications"
                onClick={handleOpenNotif}
              >
                {unreadCount > 0 && (
                  <div className="header-notif-dot"></div>
                )}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              </button>

              {notifOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                    onClick={() => setNotifOpen(false)}
                  />
                  {/* Dropdown Panel */}
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    zIndex: 999,
                    background: '#111',
                    border: '1px solid #1e1e1e',
                    borderRadius: 14,
                    width: 340,
                    maxHeight: 480,
                    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}>
                    {/* Header + Body — filtered by dismissedIds */}
                    {(() => {
                      const visible = notifications.filter(n => !dismissedIds.has(n.id));
                      return (
                        <>
                          {/* Dropdown Header */}
                          <div style={{
                            padding: '1rem 1.1rem 0.75rem',
                            borderBottom: '1px solid #1a1a1a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                              Notifications
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              {visible.length > 0 && (
                                <span style={{
                                  fontSize: '0.7rem',
                                  background: 'rgba(0,210,196,0.12)',
                                  color: '#00d2c4',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: 20,
                                  fontWeight: 600,
                                }}>
                                  {visible.length}
                                </span>
                              )}
                              {visible.length > 0 && (
                                <button
                                  onClick={clearAllNotifs}
                                  style={{
                                    background: 'transparent', border: 'none', color: '#555',
                                    fontSize: '0.72rem', cursor: 'pointer', padding: '0.2rem 0.5rem',
                                    borderRadius: 6, fontWeight: 500, transition: 'color 0.15s',
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                  onMouseLeave={e => e.currentTarget.style.color = '#555'}
                                >
                                  Clear all
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Dropdown Body */}
                          <div style={{ overflowY: 'auto', flex: 1 }}>
                            {notifLoading ? (
                              <div style={{ padding: '2rem', textAlign: 'center', color: '#555', fontSize: '0.85rem' }}>
                                Loading...
                              </div>
                            ) : visible.length === 0 ? (
                              <div style={{
                                padding: '2.5rem 1rem', textAlign: 'center',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                              }}>
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                </svg>
                                <span style={{ color: '#444', fontSize: '0.85rem' }}>No notifications</span>
                              </div>
                            ) : (
                              visible.map((notif, i) => {
                                const isMsg = notif.type === 'message';
                                const timeAgo = (() => {
                                  const diff = Math.floor((Date.now() - new Date(notif.time)) / 1000);
                                  if (diff < 60) return `${diff}s ago`;
                                  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                                  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                                  const d = Math.floor(diff / 86400);
                                  return d === 1 ? 'Yesterday' : `${d} days ago`;
                                })();

                                return (
                                  <div
                                    key={notif.id}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: '0.65rem',
                                      padding: '0.8rem 0.9rem 0.8rem 1.1rem',
                                      borderBottom: i < visible.length - 1 ? '1px solid #161616' : 'none',
                                      cursor: 'pointer', transition: 'background 0.15s', position: 'relative',
                                    }}
                                    onMouseEnter={e => {
                                      e.currentTarget.style.background = '#161616';
                                      const btn = e.currentTarget.querySelector('.notif-x');
                                      if (btn) btn.style.opacity = '1';
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.background = 'transparent';
                                      const btn = e.currentTarget.querySelector('.notif-x');
                                      if (btn) btn.style.opacity = '0';
                                    }}
                                    onClick={() => {
                                      setNotifOpen(false);
                                      changeView(isMsg ? 'chat' : 'view');
                                    }}
                                  >
                                    {/* Type icon */}
                                    <div style={{
                                      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      background: isMsg ? 'rgba(99,102,241,0.15)' : 'rgba(0,210,196,0.12)',
                                    }}>
                                      {isMsg ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                        </svg>
                                      ) : (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00d2c4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                      )}
                                    </div>

                                    {/* Text */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#eee', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {notif.title}
                                        </span>
                                        <span style={{ fontSize: '0.67rem', color: '#3a3a3a', flexShrink: 0 }}>{timeAgo}</span>
                                      </div>
                                      <div style={{ fontSize: '0.7rem', color: '#00d2c4', marginBottom: '0.15rem', fontWeight: 500 }}>
                                        {isMsg ? `💬 ${notif.subtitle}` : `📋 ${notif.subtitle}`}
                                      </div>
                                      <div style={{ fontSize: '0.77rem', color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {notif.body}
                                      </div>
                                    </div>

                                    {/* × Dismiss — appears on hover */}
                                    <button
                                      className="notif-x"
                                      onClick={(e) => dismissNotif(e, notif.id)}
                                      title="Dismiss"
                                      style={{
                                        background: 'transparent', border: 'none', padding: '0.25rem',
                                        color: '#444', cursor: 'pointer', flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: 4, opacity: 0,
                                        transition: 'opacity 0.15s, color 0.15s',
                                      }}
                                      onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.color = '#ef4444'; }}
                                      onMouseLeave={e => { e.stopPropagation(); e.currentTarget.style.color = '#444'; }}
                                    >
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                      </svg>
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
            {/* Theme toggle (sun/moon) */}
            <button
              className="header-icon-btn desktop-theme-toggle"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>
            {/* User avatar with dropdown */}
            <div style={{ position: 'relative' }}>
              <div
                className="header-avatar"
                onClick={() => setProfileMenuOpen(prev => !prev)}
                title="Profile"
              >
                {avatarLetter}
              </div>
              {profileMenuOpen && (
                <>
                  {/* Backdrop to close dropdown on outside click */}
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  {/* Dropdown */}
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    zIndex: 999,
                    background: '#111',
                    border: '1px solid #1e1e1e',
                    borderRadius: 12,
                    minWidth: 200,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                  }}>
                    {/* User info header in dropdown */}
                    <div style={{ padding: '1rem 1rem 0.75rem', borderBottom: '1px solid #1a1a1a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #00d2c4, #009e93)',
                          color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '1rem', flexShrink: 0
                        }}>
                          {avatarLetter}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user.name || user.email.split('@')[0]}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Profile option */}
                    <button
                      onClick={() => { changeView('profile'); setProfileMenuOpen(false); }}
                      style={{
                        width: '100%', background: 'transparent', border: 'none', color: '#ccc',
                        padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem',
                        cursor: 'pointer', fontSize: '0.88rem', fontWeight: 500, textAlign: 'left',
                        borderBottom: '1px solid #1a1a1a', borderRadius: 0, transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#1a1a1a'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      Profile
                    </button>
                    {/* Logout option */}
                    <button
                      onClick={() => { handleLogout(); setProfileMenuOpen(false); }}
                      style={{
                        width: '100%', background: 'transparent', border: 'none', color: '#ef4444',
                        padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem',
                        cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, textAlign: 'left',
                        borderRadius: 0, transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Log Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main
          className="main-content"
          style={{
            position: 'relative',
            ...(currentView === 'chat' ? { padding: '1.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' } : {}),
          }}
        >
          {currentView === 'tasks' ? (
            <Tasks user={user} />
          ) : currentView === 'wiki' ? (
            <Wiki user={user} />
          ) : currentView === 'pipeline' && isLeader ? (
            <TaskPipeline user={user} />
          ) : currentView === 'updates' ? (
            <CompanyUpdates user={user} />
          ) : currentView === 'profile' ? (
            <Profile user={user} onBack={() => changeView(isLeader ? 'view' : 'post')} />
          ) : currentView === 'chat' ? (
            <Chat user={user} />
          ) : (
            <Dashboard user={user} currentView={currentView} onChangeView={changeView} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
