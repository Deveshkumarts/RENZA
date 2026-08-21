import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import SankeyChart from './SankeyChart';

export default function TaskPipeline({ user }) {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch users for the assignee dropdown
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');
      if (!usersError) setUsers(usersData || []);
      
      // Fetch tasks (assigned by any leader)
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

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const { error } = await supabase
        .from('assigned_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
        
      if (!error) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      }
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchAssignee = assigneeFilter === 'ALL' || String(task.assignee_id) === String(assigneeFilter);
      const matchPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;
      return matchAssignee && matchPriority;
    });
  }, [tasks, assigneeFilter, priorityFilter]);

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
      
      {/* Metric Boxes */}
      <SankeyChart tasks={tasks} />

      {/* Deep-Dive Filters */}
      <div className="card pipeline-filters">
        <div className="input-group">
          <label style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Filter by Assignee</label>
          <select className="modern-select" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="ALL">All Assignees</option>
            {users
              .filter(u => u.role !== 'CEO' && u.role !== 'COO')
              .map(u => (
              <option key={u.id} value={u.id}>
                {u.name || u.email} {u.category ? `- ${u.category}` : ''}
              </option>
            ))}
          </select>
        </div>
        
        <div className="input-group">
          <label style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Filter by Priority</label>
          <select className="modern-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="ALL">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
        </div>
        
        <div className="pipeline-filters-count">
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Showing {filteredTasks.length} task(s)
          </span>
        </div>
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
                  title={task.description}
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
    </div>
  );
}
