import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Dashboard({ user, currentView, onChangeView }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [category, setCategory] = useState('TECHNICAL');
  const [completed, setCompleted] = useState('');
  const [plannedTasks, setPlannedTasks] = useState([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [blockers, setBlockers] = useState('');
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  
  const isLeader = user.role === 'CEO' || user.role === 'COO';

  const employeeStats = React.useMemo(() => {
    return updates.reduce((acc, update) => {
      if (!acc[update.user_id]) {
        acc[update.user_id] = {
          id: update.user_id,
          name: update.user?.name || update.user?.email,
          category: update.user?.category || 'MEMBER',
          updateCount: 0,
          latestUpdate: update.created_at
        };
      }
      acc[update.user_id].updateCount += 1;
      if (new Date(update.created_at) > new Date(acc[update.user_id].latestUpdate)) {
        acc[update.user_id].latestUpdate = update.created_at;
      }
      return acc;
    }, {});
  }, [updates]);

  const fetchUpdates = async () => {
    try {
      let query = supabase
        .from('updates')
        .select(`
          *,
          user:users!updates_user_id_fkey(name, email, role, category),
          feedback(id, comment, created_at, author:users!feedback_author_id_fkey(name, email))
        `)
        .order('created_at', { ascending: false });
        
      const { data, error } = await query;
      if (error) throw error;
      
      let filteredData = data || [];
      if (!isLeader) {
        filteredData = filteredData.filter(update => update.user?.category === user.category);
      }
      setUpdates(filteredData);
    } catch (err) {
      console.error('Error fetching updates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, [user]);

  const handleSubmitUpdate = async (e) => {
    e.preventDefault();
    if (plannedTasks.length === 0) {
      alert("Please add at least one planned task.");
      return;
    }
    
    const planned = plannedTasks.map(t => `• ${t}`).join('\n');
    setIsLoading(true);
    try {
      let attachmentUrl = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filePath, file);
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);
          
        attachmentUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase
        .from('updates')
        .insert([{ 
          user_id: user.id, 
          category, 
          completed, 
          planned, 
          blockers, 
          attachment_url: attachmentUrl 
        }]);
        
      if (error) throw error;
      
      setCompleted('');
      setPlannedTasks([]);
      setIsAddingTask(false);
      setNewTaskText('');
      setBlockers('');
      setFile(null);
      fetchUpdates();
    } catch (err) {
      console.error('Error posting update:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addTask = () => {
    if (newTaskText.trim()) {
      setPlannedTasks([...plannedTasks, newTaskText.trim()]);
      setNewTaskText('');
      setIsAddingTask(false);
    }
  };
  
  const removeTask = (indexToRemove) => {
    setPlannedTasks(plannedTasks.filter((_, idx) => idx !== indexToRemove));
  };

  const handlePostFeedback = async (updateId, e) => {
    e.preventDefault();
    const comment = e.target.comment.value;
    if (!comment.trim()) return;
    
    try {
      const { error } = await supabase
        .from('feedback')
        .insert([{ 
          update_id: updateId, 
          author_id: user.id, 
          comment 
        }]);
        
      if (error) throw error;
      e.target.reset();
      fetchUpdates();
    } catch (err) {
      console.error('Error posting feedback:', err);
    }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    if (!window.confirm("Are you sure you want to delete this feedback?")) return;
    try {
      const { error } = await supabase
        .from('feedback')
        .delete()
        .eq('id', feedbackId);
      if (error) throw error;
      fetchUpdates();
    } catch (err) {
      console.error('Error deleting feedback:', err);
      alert('Failed to delete feedback: ' + err.message);
    }
  };

  const handleDeleteUpdate = async (updateId) => {
    if (!window.confirm("Are you sure you want to delete this update?")) return;
    try {
      const { error } = await supabase
        .from('updates')
        .delete()
        .eq('id', updateId);
      if (error) throw error;
      fetchUpdates();
    } catch (err) {
      console.error('Error deleting update:', err);
      alert('Failed to delete update: ' + err.message);
    }
  };

  const exportCSV = () => {
    const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
    const headers = ['ID', 'Name', 'Email', 'Category', 'Accomplished', 'Planned', 'Blockers', 'Date'];
    
    const csvRows = [headers.join(',')];
    for (const row of updates) {
      csvRows.push([
        row.id,
        escapeCsv(row.user?.name),
        escapeCsv(row.user?.email),
        escapeCsv(row.category),
        escapeCsv(row.completed),
        escapeCsv(row.planned),
        escapeCsv(row.blockers),
        escapeCsv(new Date(row.created_at).toLocaleString())
      ].join(','));
    }

    const csvData = csvRows.join('\n');
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'updates_export.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Recent updates for the right panel (last 3 user's own updates)
  const recentUpdates = updates.filter(u => u.user_id === user.id).slice(0, 3);

  // Compute streak: count consecutive days (from today backwards) with updates
  const computeStreak = () => {
    const userUpdates = updates.filter(u => u.user_id === user.id);
    if (!userUpdates.length) return 0;
    const dateSet = new Set(userUpdates.map(u => new Date(u.created_at).toDateString()));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (dateSet.has(d.toDateString())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  };

  // Day activity bars: last 7 days
  const getDayActivity = () => {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const today = new Date();
    const todayDay = today.getDay(); // 0=Sun
    const userUpdates = updates.filter(u => u.user_id === user.id);
    const dateSet = new Set(userUpdates.map(u => new Date(u.created_at).toDateString()));
    return days.map((label, i) => {
      // Map M=0..S=6 to actual date
      const diff = ((i === 0 ? 1 : i === 6 ? 0 : i) - todayDay + 7) % 7;
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return { label, active: dateSet.has(d.toDateString()) };
    });
  };

  const streak = computeStreak();
  const dayActivity = getDayActivity();

  // Productivity score (based on updates this week vs days of week passed)
  const getProductivityScore = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const userWeekUpdates = updates.filter(u => u.user_id === user.id && new Date(u.created_at) >= startOfWeek);
    const daysPassed = Math.max(now.getDay(), 1);
    const score = Math.min(Math.round((userWeekUpdates.length / daysPassed) * 100), 100);
    return score || 0;
  };

  const productivityScore = getProductivityScore();
  const circumference = 283;
  const strokeDashoffset = circumference - (circumference * productivityScore) / 100;

  const getRecentUpdateIcon = (update) => {
    if (update.category === 'TECHNICAL') return { cls: 'blue', symbol: '</>' };
    return { cls: 'purple', symbol: '📋' };
  };

  const getTimeAgo = (dateStr) => {
    const now = new Date();
    const then = new Date(dateStr);
    const diff = Math.floor((now - then) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    const days = Math.floor(diff / 86400);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
      Loading...
    </div>
  );

  return (
    <div className="dashboard-container">
      {/* ===== POST UPDATE VIEW ===== */}
      {currentView === 'post' && (
        <div className="post-update-layout">
          {/* LEFT: Form */}
          <div className="post-update-main">
            {/* Hero Card */}
            <div className="post-hero-card">
              <div className="post-hero-text">
                <h2>Post Daily Update</h2>
                <p>Share your progress, plan your day, and stay aligned with your team.</p>
              </div>
              {/* Decorative Illustration */}
              <div className="post-hero-illustration">
                <div className="hero-3d">
                  <div className="pencil-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                  </div>
                  <div className="doc-stack">
                    <div className="doc-line"></div>
                    <div className="doc-line"></div>
                    <div className="doc-line"></div>
                    <div className="doc-line"></div>
                  </div>
                  <div className="chart-bars">
                    <div className="bar"></div>
                    <div className="bar"></div>
                    <div className="bar"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Card */}
            <div className="post-form-card">
              {error && <div className="error-banner">{error}</div>}
              {success && <div className="success-banner">Update posted successfully!</div>}
              
              <form onSubmit={handleSubmitUpdate} className="modern-form">
                {/* Category Selection */}
                <div className="input-group">
                  <div className="select-category-label">Select Category</div>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        value="TECHNICAL"
                        checked={category === 'TECHNICAL'}
                        onChange={e => setCategory(e.target.value)}
                      />
                      <span className="radio-label-icon">{'</>'}</span>
                      Technical
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        value="NON-TECHNICAL"
                        checked={category === 'NON-TECHNICAL'}
                        onChange={e => setCategory(e.target.value)}
                      />
                      <span className="radio-label-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                      </span>
                      Non-Technical
                    </label>
                  </div>
                </div>
                
                {/* What did you accomplish */}
                <div className="input-group">
                  <div className="section-label">
                    <span className="label-icon teal">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </span>
                    What did you accomplish today?
                  </div>
                  <div className="textarea-wrapper">
                    <textarea
                      value={completed}
                      onChange={e => setCompleted(e.target.value)}
                      required
                      placeholder="List your completed tasks..."
                      maxLength={1000}
                    />
                    <span className="char-counter">{completed.length} / 1000</span>
                  </div>
                </div>
                
                {/* Plan for tomorrow */}
                <div className="input-group">
                  <div className="section-label">
                    <span className="label-icon blue">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </span>
                    What is your plan for tomorrow?
                  </div>
                  <div className="tasks-list">
                    {plannedTasks.map((task, idx) => (
                      <div key={idx} className="task-item">
                        <span className="task-bullet">•</span>
                        <span className="task-text">{task}</span>
                        <button type="button" className="remove-task-btn" onClick={() => removeTask(idx)}>×</button>
                      </div>
                    ))}
                    
                    {!isAddingTask ? (
                      <button type="button" className="add-task-trigger-btn" onClick={() => setIsAddingTask(true)}>
                        + Add Task
                      </button>
                    ) : (
                      <div className="add-task-input-group">
                        <input
                          type="text"
                          value={newTaskText}
                          onChange={e => setNewTaskText(e.target.value)}
                          placeholder="Describe the task..."
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addTask();
                            }
                          }}
                        />
                        <div className="task-actions">
                          <button type="button" className="btn-small" onClick={addTask}>Add</button>
                          <button type="button" className="btn-small secondary" onClick={() => { setIsAddingTask(false); setNewTaskText(''); }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Blockers */}
                <div className="input-group">
                  <div className="section-label">
                    <span className="label-icon amber">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    </span>
                    Any blockers? (Optional)
                  </div>
                  <div className="textarea-wrapper">
                    <textarea
                      value={blockers}
                      onChange={e => setBlockers(e.target.value)}
                      placeholder="Mention any issues stopping your progress..."
                      maxLength={1000}
                    />
                    <span className="char-counter">{blockers.length} / 1000</span>
                  </div>
                </div>
                
                {/* Attachment */}
                <div className="input-group">
                  <label>Attachment (Optional)</label>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    style={{ padding: '0.5rem', background: 'var(--input-bg)' }}
                  />
                </div>
                
                {/* Submit Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={isLoading} className="post-submit-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    {isLoading ? 'Posting...' : 'Post Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="right-panel">
            {/* Productivity Widget */}
            <div className="right-widget">
              <div className="right-widget-title">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00d2c4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
                Your Productivity
              </div>
              <div className="productivity-ring-wrapper">
                <div className="productivity-ring">
                  <svg viewBox="0 0 110 110">
                    <circle className="ring-bg" cx="55" cy="55" r="45" />
                    <circle
                      className="ring-fill"
                      cx="55" cy="55" r="45"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${2 * Math.PI * 45 * (1 - productivityScore / 100)}`}
                      style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
                    />
                  </svg>
                  <div className="ring-label">
                    <span className="ring-percent">{productivityScore}%</span>
                    <span className="ring-sublabel">This Week</span>
                  </div>
                </div>
                <div className="productivity-status">
                  {productivityScore >= 80 ? '🎉 Great job!' : productivityScore >= 50 ? '👍 Keep going!' : '💪 Stay consistent!'}
                </div>
              </div>
            </div>

            {/* Update Streak Widget */}
            <div className="right-widget">
              <div className="right-widget-title">
                🔥 Update Streak
              </div>
              <div className="streak-widget">
                <span className="streak-icon">🔥</span>
                <div>
                  <div className="streak-count">{streak}</div>
                  <div className="streak-unit">Days</div>
                </div>
              </div>
              <div className="streak-days-bar">
                {dayActivity.map((day, i) => (
                  <div key={i} className="streak-day">
                    <div className={`streak-day-bar ${day.active ? 'active' : ''}`}></div>
                    <span className="streak-day-label">{day.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Updates Widget */}
            <div className="right-widget">
              <div className="right-widget-title">
                Recent Updates
              </div>
              {recentUpdates.length > 0 ? (
                <>
                  <div className="recent-updates-list">
                    {recentUpdates.map((update, i) => {
                      const icon = getRecentUpdateIcon(update);
                      const colors = ['green', 'blue', 'purple'];
                      return (
                        <div key={update.id} className="recent-update-item">
                          <div className={`recent-update-icon ${colors[i % 3]}`}>
                            {update.category === 'TECHNICAL' ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                              </svg>
                            )}
                          </div>
                          <div className="recent-update-info">
                            <div className="recent-update-title">
                              {update.completed ? update.completed.split('\n')[0].slice(0, 28) + (update.completed.length > 28 ? '...' : '') : update.category}
                            </div>
                            <div className="recent-update-time">{getTimeAgo(update.created_at)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    className="view-all-link"
                    onClick={() => {
                      setSelectedEmployeeId(user.id);
                      if (onChangeView) onChangeView('view');
                    }}
                  >
                    View all updates →
                  </button>
                </>
              ) : (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No recent updates yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== VIEW DASHBOARD ===== */}
      {currentView === 'view' && (
        <div className="updates-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {selectedEmployeeId && (
                <button
                  onClick={() => setSelectedEmployeeId(null)}
                  className="btn-small secondary"
                  style={{ padding: '0.25rem 0.75rem', borderRadius: '6px' }}
                >
                  ← Back
                </button>
              )}
              <h2 className="dashboard-title" style={{ margin: 0 }}>
                {selectedEmployeeId
                  ? `${employeeStats[selectedEmployeeId]?.name}'s Updates`
                  : 'Recent Updates'}
              </h2>
            </div>
            {isLeader && (
              <button onClick={exportCSV} className="btn-small">
                📥 Export CSV
              </button>
            )}
          </div>

          {selectedEmployeeId === null ? (
            <div className="employee-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
              {Object.values(employeeStats).map(emp => (
                <div
                  key={emp.id}
                  className="card"
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease', padding: '1.5rem', border: '1px solid var(--border-color)' }}
                  onClick={() => setSelectedEmployeeId(emp.id)}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = '#00d2c4';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                >
                  <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-color)' }}>{emp.name}</h3>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {emp.category}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <span>{emp.updateCount} update{emp.updateCount !== 1 ? 's' : ''}</span>
                    <span>Last: {new Date(emp.latestUpdate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {Object.values(employeeStats).length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No updates found from any employees.</p>
              )}
            </div>
          ) : updates.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No updates found.</p>
          ) : (
            updates
              .filter(update => update.user_id === selectedEmployeeId)
              .map(update => (
                <div key={update.id} className="card update-card">
                  <div className="card-header">
                    <span><strong>{update.user?.name || update.user?.email}</strong> ({update.category || 'MEMBER'})</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span>{new Date(update.created_at).toLocaleString()}</span>
                      {update.user_id === user.id && (
                        <button
                          onClick={() => handleDeleteUpdate(update.id)}
                          className="remove-task-btn"
                          title="Delete Update"
                          style={{ fontSize: '1.1rem', padding: '0' }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="update-content">
                    <div style={{ marginBottom: '1rem' }}>
                      <strong>Accomplished:</strong>
                      <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{update.completed}</p>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <strong>Planned for tomorrow:</strong>
                      <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{update.planned}</p>
                    </div>
                    
                    {update.blockers && (
                      <div style={{ marginBottom: '1rem' }}>
                        <strong>Blockers:</strong>
                        <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap', color: '#ef4444', fontSize: '0.9rem' }}>{update.blockers}</p>
                      </div>
                    )}

                    {update.attachment_url && (
                      <div style={{ marginBottom: '1rem' }}>
                        <a href={update.attachment_url} target="_blank" rel="noreferrer" className="attachment-link">
                          📎 View Attachment
                        </a>
                      </div>
                    )}
                    
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                      <h3>Feedback & Suggestions</h3>
                      {update.feedback && update.feedback.length > 0 ? (
                        <div className="feedback-list">
                          {update.feedback.map(f => (
                            <div key={f.id} className="feedback-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <strong>{f.author?.name || f.author?.email}:</strong> {f.comment}
                              </div>
                              {(isLeader || user.id === f.author_id) && (
                                <button
                                  onClick={() => handleDeleteFeedback(f.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4d4f', fontSize: '1rem', padding: '0 0.5rem' }}
                                  title="Delete feedback"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-feedback">No feedback yet.</p>
                      )}

                      {isLeader && (
                        <form className="feedback-form" onSubmit={(e) => handlePostFeedback(update.id, e)}>
                          <input type="text" name="comment" placeholder="Add constructive feedback..." required />
                          <button type="submit" className="btn-small">Post</button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
