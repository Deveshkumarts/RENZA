const db = require('./db');

async function run() {
  try {
    console.log('Creating assigned_tasks table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS assigned_tasks (
        id SERIAL PRIMARY KEY,
        assigner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        assignee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table assigned_tasks created successfully.');
  } catch(e) {
    console.error('Error creating table:', e);
  } finally {
    process.exit();
  }
}

run();
