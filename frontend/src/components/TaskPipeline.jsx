import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import SankeyChart from './SankeyChart';

export default function TaskPipeline({ user }) {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');
      if (!usersError) setUsers(usersData || []);
      
      const { data: tasksData, error: tasksError } = await supabase
        .from('assigned_tasks')
        .select(`
          *,
          assigner:users!assigned_tasks_assigner_id_fkey(name, email),
          assignee:users!assigned_tasks_assignee_id_fkey(name, email)
        `);
        
      if (!tasksError && tasksData) {
        setTasks(tasksData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const employeeStats = useMemo(() => {
    const stats = {};
    users.filter(u => u.role !== 'CEO' && u.role !== 'COO').forEach(u => {
      stats[u.id] = {
        id: u.id,
        name: u.name || u.email,
        category: u.category || 'MEMBER',
        pending: 0,
        in_progress: 0,
        blocked: 0,
        completed: 0,
        total: 0
      };
    });

    tasks.forEach(task => {
      const empId = task.assignee_id;
      if (stats[empId]) {
        stats[empId][task.status]++;
        stats[empId].total++;
      }
    });

    return Object.values(stats);
  }, [users, tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchAssignee = selectedAssigneeId === null || String(task.assignee_id) === String(selectedAssigneeId);
      const matchPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;
      return matchAssignee && matchPriority;
    });
  }, [tasks, selectedAssigneeId, priorityFilter]);

  const columns = [
    { id: 'pending', title: 'Pending' },
    { id: 'in_progress', title: 'In Progress' },
    { id: 'blocked', title: 'Blocked' },
    { id: 'completed', title: 'Completed' }
  ];

  if (loading) {
    return <div className="loading">Loading Task Pipeline...</div>;
  }

  return (
    <div className="task-pipeline-container animate-fade-in">
      
      <SankeyChart tasks={tasks} />

      {selectedAssigneeId === null ? (
        <div className="employee-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
          {employeeStats.map(emp => (
            <div 
              key={emp.id} 
              className="card" 
              style={{ cursor: 'pointer', transition: 'all 0.2s ease', padding: '1.5rem', border: '1px solid var(--border-color)' }}
              onClick={() => setSelectedAssigneeId(emp.id)}
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
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                {emp.category}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pending:</span> <strong>{emp.pending}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>In Progress:</span> <strong>{emp.in_progress}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Blocked:</span> <strong>{emp.blocked}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Completed:</span> <strong>{emp.completed}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ margin: '2rem 0 1rem 0', display: 'flex', alignItems: 'center' }}>
            <button 
              onClick={() => setSelectedAssigneeId(null)}
              className="btn secondary"
              style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              ← Back to All Employees
            </button>
            <h2 style={{ marginLeft: '1rem', marginBottom: '0' }}>
              {users.find(u => u.id === selectedAssigneeId)?.name || 'Employee'}'s Tasks
            </h2>
          </div>



      {/* Kanban Board */}
      <div className="kanban-board">
        {columns.map(col => (
          <div key={col.id} className="kanban-column">
            <h3 style={{ margin: 0, paddingBottom: '1rem', borderBottom: '2px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
              {col.title}
              <span style={{ fontSize: '0.9rem', backgroundColor: 'var(--input-bg)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                {filteredTasks.filter(t => t.status === col.id).length}
              </span>
            </h3>
            
            <div className="kanban-cards" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '100px' }}>
              {filteredTasks.filter(t => t.status === col.id).map(task => (
                <div 
                  key={task.id} 
                  className="kanban-card" 
                  style={{ 
                    backgroundColor: 'var(--bg-color)', 
                    padding: '1.2rem', 
                    borderRadius: '10px', 
                    border: '1px solid var(--border-color)', 
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedTask(task)}
                  onMouseOver={(e) => { 
                    e.currentTarget.style.transform = 'translateY(-3px)'; 
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
                    e.currentTarget.style.borderColor = 'var(--accent-color)';
                  }}
                  onMouseOut={(e) => { 
                    e.currentTarget.style.transform = 'translateY(0)'; 
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                  title="Click to view details"
                >
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <strong style={{ color: 'var(--text-color)', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {task.assignee?.name || task.assignee?.email}
                    </strong>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`priority-badge ${task.priority.toLowerCase()}`} style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', letterSpacing: '0.5px' }}>
                        {task.priority.toUpperCase()}
                      </span>
                      {task.due_date ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          Due: {new Date(task.due_date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'transparent' }}>-</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredTasks.filter(t => t.status === col.id).length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                  No tasks
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      </>
      )}

      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--card-bg)', padding: '2.5rem', borderRadius: '12px', width: '90%', maxWidth: '600px', border: '1px solid var(--border-color)', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setSelectedTask(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#ff4d4f'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>&times;</button>
            <h2 style={{ marginTop: 0, color: 'var(--text-color)', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>Task Details</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem' }}>Assignee</strong> 
                <span style={{ color: 'var(--text-color)', fontSize: '1.05rem' }}>{selectedTask.assignee?.name || selectedTask.assignee?.email}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem' }}>Status</strong> 
                <span style={{ color: 'var(--text-color)', fontSize: '1.05rem', textTransform: 'capitalize' }}>{selectedTask.status.replace('_', ' ')}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem' }}>Priority</strong> 
                <span className={`priority-badge ${selectedTask.priority.toLowerCase()}`}>{selectedTask.priority.toUpperCase()}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem', fontSize: '0.9rem' }}>Due Date</strong> 
                <span style={{ color: 'var(--text-color)', fontSize: '1.05rem' }}>{selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}) : 'Not set'}</span>
              </div>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Description</strong>
              <div style={{ backgroundColor: 'var(--input-bg)', padding: '1.5rem', borderRadius: '8px', whiteSpace: 'pre-wrap', color: 'var(--text-color)', lineHeight: '1.6', fontSize: '1rem', border: '1px solid var(--border-color)' }}>
                {selectedTask.description}
              </div>
            </div>
            
            {selectedTask.attachment_url && (
              <div style={{ marginBottom: '2rem' }}>
                <a href={selectedTask.attachment_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.2rem', backgroundColor: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent-color)'} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  View Attachment
                </a>
              </div>
            )}
            
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              Assigned by {selectedTask.assigner?.name || selectedTask.assigner?.email}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
