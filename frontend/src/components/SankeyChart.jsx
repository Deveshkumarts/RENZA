import React from 'react';
import { Sankey, Tooltip, ResponsiveContainer } from 'recharts';

const MyCustomNode = ({ x, y, width, height, index, payload, containerWidth }) => {
  const COLORS = ['#ffffff', '#ffc658', '#82ca9d', '#ff4d4f', '#52c41a'];
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={COLORS[index % COLORS.length]} rx="2" />
      <text
        x={x < containerWidth / 2 ? x + width + 10 : x - 10}
        y={y + height / 2}
        dy="0.35em"
        textAnchor={x < containerWidth / 2 ? 'start' : 'end'}
        fill="var(--text-color)"
        fontSize="14"
        fontWeight="bold"
      >
        {payload.name} ({payload.value})
      </text>
    </g>
  );
};

export default function SankeyChart({ tasks }) {
  if (!tasks || tasks.length === 0) return null;

  const counts = {
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

  const nodes = [
    { name: 'Total Assigned' }, // 0
    { name: 'Pending' },        // 1
    { name: 'In Progress' },    // 2
    { name: 'Blocked' },        // 3
    { name: 'Completed' }       // 4
  ];

  const links = [];
  if (counts.pending > 0) links.push({ source: 0, target: 1, value: counts.pending });
  if (counts.in_progress > 0) links.push({ source: 0, target: 2, value: counts.in_progress });
  if (counts.blocked > 0) links.push({ source: 0, target: 3, value: counts.blocked });
  if (counts.completed > 0) links.push({ source: 0, target: 4, value: counts.completed });

  if (links.length === 0) return null;

  const data = { nodes, links };

  return (
    <div className="card" style={{ marginBottom: '2rem', height: '400px' }}>
      <h3 className="dashboard-title">Task Bottleneck Flow</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Visualize where tasks are accumulating to identify bottlenecks.
      </p>
      <div style={{ width: '100%', height: '80%' }}>
        <ResponsiveContainer>
          <Sankey
            data={data}
            nodePadding={50}
            margin={{ top: 20, right: 100, bottom: 20, left: 100 }}
            link={{ stroke: '#555', strokeOpacity: 0.5 }}
            node={<MyCustomNode />}
          >
            <Tooltip 
              contentStyle={{ backgroundColor: '#222', border: '1px solid #444', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
            />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
