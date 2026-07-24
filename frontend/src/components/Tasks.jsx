import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Tasks({ user }) {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [assigneeId, setAssigneeId] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentTexts, setCommentTexts] = useState({});
  
  const isLeader = user.role === 'CEO' || user.role === 'COO';

  const fetchData = async () => {
    try {
      if (isLeader) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*');
        if (!usersError) setUsers(usersData || []);
      }
      
      let query = supabase
        .from('assigned_tasks')
        .select(`
          *,
          assigner:users!assigned_tasks_assigner_id_fkey(name, email),
          assignee:users!assigned_tasks_assignee_id_fkey(name, email),
          task_comments(
            id,
            comment,
            created_at,
            author:users!task_comments_author_id_fkey(name, email, role, category)
          )
        `);
        
      if (isLeader) {
        query = query.eq('assigner_id', user.id);
      } else {
        query = query.eq('assignee_id', user.id);
      }
      
      const { data: tasksData, error: tasksError } = await query;
      
      if (!tasksError && tasksData) {
        // Sort tasks: pending High -> pending Medium -> pending Low -> completed
        const priorityWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
        tasksData.sort((a, b) => {
          if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
          return priorityWeight[b.priority] - priorityWeight[a.priority];
        });
        setTasks(tasksData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!assigneeId || !description.trim()) return;
    
    setIsSubmitting(true);
    try {
      let attachmentUrl = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filePath, file);
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);
          
        attachmentUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase
        .from('assigned_tasks')
        .insert([{
          assigner_id: user.id, 
          assignee_id: parseInt(assigneeId), 
          description,
          due_date: dueDate || null,
          priority,
          attachment_url: attachmentUrl
        }]);
        
      if (error) throw error;
      
      setAssigneeId('');
      setDescription('');
      setDueDate('');
      setPriority('Medium');
      setFile(null);
      
      fetchData();
    } catch (err) {
      console.error('Error assigning task:', err);
      alert('Failed to assign task: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      const { error } = await supabase
        .from('assigned_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
        
      if (!error) fetchData();
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  };

  const handlePostComment = async (taskId) => {
    const text = commentTexts[taskId];
    if (!text || !text.trim()) return;
    
    try {
      const { error } = await supabase
        .from('task_comments')
        .insert([{
          task_id: taskId,
          author_id: user.id,
          comment: text.trim()
        }]);
        
      if (!error) {
        setCommentTexts(prev => ({ ...prev, [taskId]: '' }));
        fetchData(); // Refresh tasks to show new comment
      } else {
        alert('Failed to post comment: ' + error.message);
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="tasks-container">
      {isLeader && (
        <div className="card">
          <h2 className="dashboard-title">Assign a Task</h2>
          <form onSubmit={handleAssignTask} className="modern-form seamless-form">
            <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label>Assign To</label>
                <select 
                  value={assigneeId} 
                  onChange={(e) => setAssigneeId(e.target.value)}
                  required
                  className="task-select"
                >
                  <option value="">Select a member...</option>
                  {users.filter(u => u.role !== 'CEO' && u.role !== 'COO').map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email} ({u.category || 'MEMBER'})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="input-group" style={{ flex: 1 }}>
                <label>Priority</label>
                <select 
                  value={priority} 
                  onChange={(e) => setPriority(e.target.value)}
                  className="task-select"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              
              <div className="input-group" style={{ flex: 1 }}>
                <label>Due Date (Optional)</label>
                <input 
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="input-group">
              <label>Task Description</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Describe the task..."
                style={{ minHeight: '80px' }}
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
            
            <button type="submit" disabled={isSubmitting} style={{ marginTop: '1rem' }}>
              {isSubmitting ? 'Assigning...' : 'Assign Task'}
            </button>
          </form>
        </div>
      )}
      
      <div className="card" style={{ marginTop: '2rem' }}>
        <h2 className="dashboard-title">{isLeader ? 'All Assigned Tasks' : 'My Tasks'}</h2>
        
        {tasks.length === 0 ? (
          <p>No tasks found.</p>
        ) : (
          <div className="assigned-task-list">
            {tasks.map(task => (
              <div key={task.id} className={`assigned-task-item ${task.status === 'completed' ? 'completed' : ''} priority-${task.priority.toLowerCase()}`}>
                <div className="task-header">
                  {isLeader ? (
                    <span className="task-assignee">Assigned to: <strong>{task.assignee?.name || task.assignee?.email}</strong></span>
                  ) : (
                    <span className="task-assigner">Assigned by: <strong>{task.assigner?.name || task.assigner?.email}</strong></span>
                  )}
                  
                  <div className="task-meta">
                    <span className={`priority-badge ${task.priority.toLowerCase()}`}>{task.priority} Priority</span>
                    {task.due_date && <span className="due-date-badge">Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                    <span className="task-date">{new Date(task.created_at).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="task-body">
                  <div className="task-content-wrapper">
                    <div className="task-desc">{task.description}</div>
                    
                    {task.attachment_url && (
                      <div className="task-attachment">
                        <a href={task.attachment_url} target="_blank" rel="noreferrer" className="attachment-link">
                          📎 View Attachment
                        </a>
                      </div>
                    )}
                  </div>
                  
                  {(!isLeader || user.id === task.assignee_id) ? (
                    <label className="task-checkbox-wrapper">
                      <input 
                        type="checkbox" 
                        checked={task.status === 'completed'}
                        onChange={() => handleToggleStatus(task.id, task.status)}
                      />
                      <span className="task-checkbox-label">Mark completed</span>
                    </label>
                  ) : (
                    <span className={`task-status-badge ${task.status}`}>
                      {task.status.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Task Clarification Threads */}
                <div className="task-comments-section">
                  {task.task_comments && task.task_comments.length > 0 && (
                    <div className="task-comments-list">
                      {task.task_comments.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).map(comment => (
                        <div key={comment.id} className="task-comment">
                          <div className="comment-header">
                            <strong>{comment.author?.name || comment.author?.email}</strong>
                            <span className="comment-role">{comment.author?.role}</span>
                            <span className="comment-time">{new Date(comment.created_at).toLocaleString([], {hour: '2-digit', minute:'2-digit', month:'short', day:'numeric'})}</span>
                          </div>
                          <div className="comment-body">{comment.comment}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="task-comment-input-wrapper">
                    <input 
                      type="text" 
                      placeholder="Ask a question or add a comment..." 
                      value={commentTexts[task.id] || ''}
                      onChange={(e) => setCommentTexts(prev => ({...prev, [task.id]: e.target.value}))}
                      onKeyDown={(e) => e.key === 'Enter' && handlePostComment(task.id)}
                    />
                    <button onClick={() => handlePostComment(task.id)}>Post</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Tasks;
