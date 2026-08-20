import React, { useState } from 'react';
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
  
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('renza_theme') || 'light';
  });

  React.useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <img src="/logo.png" alt="Renza Logo" className="mobile-header-logo" />
          <h2>Renza</h2>
        </div>
        <button 
          className="mobile-theme-toggle"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', padding: '0 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      {!isSidebarOpen && window.innerWidth > 768 && (
        <button className="toggle-sidebar-btn fixed-open-btn" onClick={() => setIsSidebarOpen(true)} title="Open sidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
        </button>
      )}
      <aside className={`sidebar ${isSidebarOpen ? 'mobile-open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/logo.png" alt="Renza Logo" className="sidebar-logo" />
            <h2>Renza</h2>
          </div>
          <button className="toggle-sidebar-btn" onClick={() => setIsSidebarOpen(false)} title="Close sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {!isLeader && (
            <div 
              className={`nav-item ${currentView === 'post' ? 'active' : ''}`}
              onClick={() => changeView('post')}
            >
              <span className="nav-icon">✧</span>
              Post Update
            </div>
          )}
          <div 
            className={`nav-item ${currentView === 'view' ? 'active' : ''}`}
            onClick={() => changeView('view')}
          >
            <span className="nav-icon">⊞</span>
            View Dashboard
          </div>
          <div 
            className={`nav-item ${currentView === 'tasks' ? 'active' : ''}`}
            onClick={() => changeView('tasks')}
          >
            <span className="nav-icon">✓</span>
            {isLeader ? 'Assign Tasks' : 'My Tasks'}
          </div>
          {isLeader && (
            <div 
              className={`nav-item ${currentView === 'pipeline' ? 'active' : ''}`}
              onClick={() => changeView('pipeline')}
            >
              <span className="nav-icon">📊</span>
              Task Pipeline
            </div>
          )}
          <div 
            className={`nav-item ${currentView === 'wiki' ? 'active' : ''}`}
            onClick={() => changeView('wiki')}
          >
            <span className="nav-icon">📚</span>
            Company Wiki
          </div>
          <div 
            className={`nav-item ${currentView === 'updates' ? 'active' : ''}`}
            onClick={() => changeView('updates')}
          >
            <span className="nav-icon">📢</span>
            Company Updates
          </div>
          <div 
            className={`nav-item ${currentView === 'chat' ? 'active' : ''}`}
            onClick={() => changeView('chat')}
          >
            <span className="nav-icon">💬</span>
            Chat
          </div>
        </nav>
        
        <div className="sidebar-footer" style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div className="user-profile-widget" onClick={() => changeView('profile')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.5rem' }}>
            <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden', flex: 1 }}>
              <div className="user-avatar" style={{ backgroundColor: '#ffc107', color: '#000', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 'bold', flexShrink: 0, fontSize: '1.2rem' }}>
                {(user.name ? user.name.charAt(0) : user.email.charAt(0)).toUpperCase()}
              </div>
              <div className="user-details" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                <span className="user-name" style={{ fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.95rem' }}>{user.name || user.email.split('@')[0]}</span>
                <span className="user-email" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</span>
                <span className="user-role" style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '0.1rem' }}>{user.category || 'TECHNICAL'}</span>
              </div>
            </div>
            <button className="logout-outline-btn" onClick={(e) => { e.stopPropagation(); handleLogout(); }} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', flexShrink: 0, fontSize: '0.85rem' }}>
              Logout
            </button>
          </div>
        </div>
      </aside>
      
      <main className="main-content" style={{ position: 'relative' }}>
        <button 
          className="desktop-theme-toggle"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          style={{ position: 'absolute', top: '1.5rem', right: '2rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-color)', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', zIndex: 100, boxShadow: 'var(--card-shadow)', transition: 'transform 0.2s ease' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        {currentView === 'tasks' ? (
          <Tasks user={user} />
        ) : currentView === 'wiki' ? (
          <Wiki user={user} />
        ) : currentView === 'pipeline' && isLeader ? (
          <TaskPipeline user={user} />
        ) : currentView === 'updates' ? (
          <CompanyUpdates user={user} />
        ) : currentView === 'profile' ? (
          <Profile user={user} />
        ) : currentView === 'chat' ? (
          <Chat user={user} />
        ) : (
          <Dashboard user={user} currentView={currentView} />
        )}
      </main>
    </div>
  );
}

export default App;
