import React from 'react';

export default function SankeyChart({ tasks }) {
  if (!tasks) return null;

  const counts = {
    total: tasks.length,
    pending: 0,
    in_progress: 0,
    blocked: 0,
    completed: 0
  };

  tasks.forEach(task => {
    if (counts[task.status] !== undefined) {
      counts[task.status]++;
    }
  });

  const flowSteps = [
    { id: 'total', label: 'Total Assigned', value: counts.total, color: 'var(--text-color)', bg: 'var(--input-bg)' },
    { id: 'pending', label: 'Pending', value: counts.pending, color: 'var(--text-secondary)', bg: 'rgba(156, 163, 175, 0.1)' },
    { id: 'in_progress', label: 'In Progress', value: counts.in_progress, color: '#ffc658', bg: 'rgba(255, 198, 88, 0.1)' },
    { id: 'blocked', label: 'Blocked', value: counts.blocked, color: '#ff4d4f', bg: 'rgba(255, 77, 79, 0.1)' },
    { id: 'completed', label: 'Completed', value: counts.completed, color: 'var(--success-text)', bg: 'rgba(82, 196, 26, 0.1)' }
  ];

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <h3 className="dashboard-title">Task Pipeline</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Live overview of all tasks and their current stage in the pipeline.
      </p>
      
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        alignItems: 'center', 
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        {flowSteps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div style={{
              flex: '1 1 auto',
              minWidth: '120px',
              padding: '1.5rem 1rem',
              borderRadius: '12px',
              background: step.bg,
              border: `1px solid ${step.color}33`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
              transition: 'transform 0.2s ease',
              cursor: 'default'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span style={{ fontSize: '2.5rem', fontWeight: '800', color: step.color, lineHeight: '1' }}>
                {step.value}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {step.label}
              </span>
            </div>
            
            {/* Arrow separator (don't show after the last item) */}
            {index < flowSteps.length - 1 && (
              <div style={{ color: 'var(--text-secondary)', opacity: 0.5, display: 'flex', alignItems: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
