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
  const [expandedTasks, setExpandedTasks] = useState({});

  const toggleTask = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

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
                  onClick={() => toggleTask(task.id)}
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
                  title={!expandedTasks[task.id] ? "Click to view details" : ""}
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

                  {expandedTasks[task.id] && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-color)', whiteSpace: 'pre-wrap' }}>
                        {task.description}
                      </div>
                      
                      {task.attachment_url && (
                        <div>
                          <a 
                            href={task.attachment_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: 'var(--accent-color)', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            📎 View Attachment
                          </a>
                        </div>
                      )}
                      
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        Assigned by: {task.assigner?.name || task.assigner?.email}
                      </div>
                    </div>
                  )}
                  
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
    </div>
  );
}
