import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Dashboard({ user, currentView }) {
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
  
  const isLeader = user.role === 'CEO' || user.role === 'COO';

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
        
      if (!isLeader) {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setUpdates(data || []);
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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="dashboard-container">
      {currentView === 'post' && (
        <div className="card">
          <h2 className="dashboard-title">Post Daily Update</h2>
          {error && <div className="error-banner">{error}</div>}
          {success && <div className="success-banner">Update posted successfully!</div>}
          
          <form onSubmit={handleSubmitUpdate} className="modern-form">
            <div className="input-group">
              <label>Select Category</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input 
                    type="radio" 
                    value="TECHNICAL" 
                    checked={category === 'TECHNICAL'} 
                    onChange={e => setCategory(e.target.value)} 
                  />
                  Technical
                </label>
                <label className="radio-label">
                  <input 
                    type="radio" 
                    value="NON-TECHNICAL" 
                    checked={category === 'NON-TECHNICAL'} 
                    onChange={e => setCategory(e.target.value)} 
                  />
                  Non-Technical
                </label>
              </div>
            </div>
            
            <div className="input-group">
              <label>What did you accomplish today?</label>
              <textarea 
                value={completed} 
                onChange={e => setCompleted(e.target.value)} 
                required
                placeholder="List your completed tasks..."
              />
            </div>
            
            <div className="input-group">
              <label>What is your plan for tomorrow?</label>
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

            <div className="input-group">
              <label>Any blockers? (Optional)</label>
              <textarea 
                value={blockers} 
                onChange={e => setBlockers(e.target.value)} 
                placeholder="Mention any issues stopping your progress..."
              />
            </div>
            
            <div className="input-group">
              <label>Attachment (Optional)</label>
              <input 
                type="file" 
                onChange={(e) => setFile(e.target.files[0])}
                style={{ padding: '0.5rem', background: 'var(--input-bg)' }}
              />
            </div>
            
            <button type="submit" disabled={isLoading} style={{ marginTop: '1rem' }}>
              {isLoading ? 'Posting...' : 'Submit Update'}
            </button>
          </form>
        </div>
      )}

      {currentView === 'view' && (
        <div className="updates-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="dashboard-title" style={{ margin: 0 }}>Recent Updates</h2>
            {isLeader && (
              <button onClick={exportCSV} className="btn-small">
                📥 Export Monthly Data
              </button>
            )}
          </div>
          {updates.length === 0 ? (
            <p>No updates found.</p>
          ) : (
            updates.map(update => (
              <div key={update.id} className="card update-card">
                <div className="card-header">
                  <span><strong>{update.user?.name || update.user?.email}</strong> ({update.category || 'MEMBER'})</span>
                  <span>{new Date(update.created_at).toLocaleString()}</span>
                </div>
                
                <div className="update-content">
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Accomplished:</strong>
                    <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{update.completed}</p>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Planned for tomorrow:</strong>
                    <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{update.planned}</p>
                  </div>
                  
                  {update.blockers && (
                    <div style={{ marginBottom: '1rem' }}>
                      <strong>Blockers:</strong>
                      <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap', color: '#d32f2f' }}>{update.blockers}</p>
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
                          <div key={f.id} className="feedback-item">
                            <strong>{f.author?.name || f.author?.email}:</strong> {f.comment}
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
