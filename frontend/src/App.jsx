import React, { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Tasks from './components/Tasks';
import Wiki from './components/Wiki';
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

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
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
          <div 
            className={`nav-item ${currentView === 'wiki' ? 'active' : ''}`}
            onClick={() => changeView('wiki')}
          >
            <span className="nav-icon">📚</span>
            Company Wiki
          </div>
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {(user.name ? user.name.charAt(0) : user.email.charAt(0)).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">{user.name || user.email.split('@')[0]}</span>
              <span className="user-email">{user.email}</span>
              <span className="user-role">{user.category || 'Technical'}</span>
            </div>
          </div>
          <button className="logout-text-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        {currentView === 'tasks' ? (
          <Tasks user={user} />
        ) : currentView === 'wiki' ? (
          <Wiki user={user} />
        ) : (
          <Dashboard user={user} currentView={currentView} />
        )}
      </main>
    </div>
  );
}

export default App;
