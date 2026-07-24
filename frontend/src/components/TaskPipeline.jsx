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
      
      // Fetch tasks (only those assigned by this leader)
      const { data: tasksData, error: tasksError } = await supabase
        .from('assigned_tasks')
        .select(`
          *,
          assigner:users!assigned_tasks_assigner_id_fkey(name, email),
          assignee:users!assigned_tasks_assignee_id_fkey(name, email)
        `)
        .eq('assigner_id', user.id);
        
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
      const matchAssignee = assigneeFilter === 'ALL' || task.assignee_id === assigneeFilter;
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
    <div className="task-pipeline-container animate-fade-in" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Metric Boxes */}
      <SankeyChart tasks={tasks} />

      {/* Deep-Dive Filters */}
      <div className="card pipeline-filters" style={{ marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap', padding: '1.5rem' }}>
        <div className="input-group" style={{ flex: 1, minWidth: '200px', margin: 0 }}>
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
        
        <div className="input-group" style={{ flex: 1, minWidth: '200px', margin: 0 }}>
          <label style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Filter by Priority</label>
          <select className="modern-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="ALL">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
        </div>
        
        <div style={{ paddingBottom: '0.5rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Showing {filteredTasks.length} task(s)
          </span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="kanban-board" style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
        {columns.map(col => (
          <div key={col.id} className="kanban-column" style={{ flex: 1, minWidth: '300px', backgroundColor: 'var(--card-bg)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, paddingBottom: '1rem', borderBottom: '2px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
              {col.title}
              <span style={{ fontSize: '0.9rem', backgroundColor: 'var(--input-bg)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                {filteredTasks.filter(t => t.status === col.id).length}
              </span>
            </h3>
            
            <div className="kanban-cards" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '100px' }}>
              {filteredTasks.filter(t => t.status === col.id).map(task => (
                <div key={task.id} className="kanban-card" style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span className={`priority-badge ${task.priority.toLowerCase()}`} style={{ fontSize: '0.75rem' }}>{task.priority}</span>
                    {task.due_date && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                  </div>
                  
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', lineHeight: '1.4' }}>{task.description}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Assignee: {task.assignee?.name || task.assignee?.email}
                    </span>
                    
                    <select 
                      value={task.status} 
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      className={`status-select ${task.status}`}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="completed">Completed</option>
                    </select>
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
