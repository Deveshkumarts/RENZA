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
  const [selectedFilterAssigneeId, setSelectedFilterAssigneeId] = useState(null);
  
  const isLeader = user.role === 'CEO' || user.role === 'COO';

  const assigneeStats = React.useMemo(() => {
    if (!isLeader) return {};
    return tasks.reduce((acc, task) => {
      const uId = task.assignee_id;
      if (!acc[uId]) {
        acc[uId] = {
          id: uId,
          name: task.assignee?.name || task.assignee?.email,
          taskCount: 0,
          pendingCount: 0,
          completedCount: 0,
          inProgressCount: 0,
          blockedCount: 0,
          latestTask: task.created_at
        };
      }
      acc[uId].taskCount += 1;
      if (task.status === 'pending') acc[uId].pendingCount += 1;
      else if (task.status === 'in_progress') acc[uId].inProgressCount += 1;
      else if (task.status === 'blocked') acc[uId].blockedCount += 1;
      else if (task.status === 'completed') acc[uId].completedCount += 1;

      if (new Date(task.created_at) > new Date(acc[uId].latestTask)) {
        acc[uId].latestTask = task.created_at;
      }
      return acc;
    }, {});
  }, [tasks, isLeader]);

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
        
      if (!isLeader) {
        query = query.eq('assignee_id', user.id);
      }
      
      const { data: tasksData, error: tasksError } = await query;
      
      if (!tasksError && tasksData) {
        // Sort tasks: pending -> in_progress -> blocked -> completed
        const priorityWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
        const statusWeight = { 'pending': 4, 'in_progress': 3, 'blocked': 2, 'completed': 1 };
        tasksData.sort((a, b) => {
          if (a.status !== b.status) return (statusWeight[b.status] || 0) - (statusWeight[a.status] || 0);
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

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this assigned task?")) return;
    try {
      const { error } = await supabase
        .from('assigned_tasks')
        .delete()
        .eq('id', taskId);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Failed to delete task: ' + err.message);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isLeader && selectedFilterAssigneeId && (
              <button 
                onClick={() => setSelectedFilterAssigneeId(null)}
                className="btn-small secondary"
                style={{ padding: '0.25rem 0.75rem', borderRadius: '4px' }}
              >
                ← Back
              </button>
            )}
            <h2 className="dashboard-title" style={{ margin: 0 }}>
              {isLeader 
                ? (selectedFilterAssigneeId ? `${assigneeStats[selectedFilterAssigneeId]?.name}'s Tasks` : 'All Assigned Tasks')
                : 'My Tasks'}
            </h2>
          </div>
        </div>
        
        {isLeader && selectedFilterAssigneeId === null ? (
          <div className="employee-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {Object.values(assigneeStats).map(emp => (
              <div 
                key={emp.id} 
                className="card" 
                style={{ cursor: 'pointer', transition: 'all 0.2s ease', padding: '1.5rem', border: '1px solid var(--border-color)' }}
                onClick={() => setSelectedFilterAssigneeId(emp.id)}
                onMouseOver={(e) => { 
                  e.currentTarget.style.transform = 'translateY(-2px)'; 
                  e.currentTarget.style.borderColor = 'var(--accent-color)';
                }}
                onMouseOut={(e) => { 
                  e.currentTarget.style.transform = 'translateY(0)'; 
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-color)' }}>{emp.name}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {emp.pendingCount > 0 && <span className="task-status-badge pending" style={{ fontSize: '0.7rem' }}>{emp.pendingCount} Pending</span>}
                  {emp.inProgressCount > 0 && <span className="task-status-badge in_progress" style={{ fontSize: '0.7rem' }}>{emp.inProgressCount} In Progress</span>}
                  {emp.blockedCount > 0 && <span className="task-status-badge blocked" style={{ fontSize: '0.7rem' }}>{emp.blockedCount} Blocked</span>}
                  {emp.completedCount > 0 && <span className="task-status-badge completed" style={{ fontSize: '0.7rem' }}>{emp.completedCount} Completed</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Total: {emp.taskCount}</span>
                  <span>Latest: {new Date(emp.latestTask).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {Object.values(assigneeStats).length === 0 && (
              <p>No tasks have been assigned yet.</p>
            )}
          </div>
        ) : tasks.length === 0 ? (
          <p>No tasks found.</p>
        ) : (
          <div className="assigned-task-list">
            {tasks
              .filter(task => !isLeader || task.assignee_id === selectedFilterAssigneeId)
              .map(task => (
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
                    {isLeader && (
                      <button 
                        onClick={() => handleDeleteTask(task.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4d4f', fontSize: '1.2rem', padding: '0 0.5rem', marginLeft: '0.5rem' }}
                        title="Delete task"
                      >
                        🗑️
                      </button>
                    )}
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
                    <div className="task-status-selector">
                      <select 
                        value={task.status} 
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        className={`status-select ${task.status}`}
                        style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-color)', fontWeight: 'bold' }}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="blocked">Blocked</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  ) : (
                    <span className={`task-status-badge ${task.status}`}>
                      {task.status.replace('_', ' ').toUpperCase()}
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
