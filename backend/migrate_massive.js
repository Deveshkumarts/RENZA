const db = require('./db');

async function run() {
  try {
    console.log('Running massive migration...');
    
    // Alter assigned_tasks
    await db.query(`ALTER TABLE assigned_tasks ADD COLUMN IF NOT EXISTS due_date DATE;`);
    await db.query(`ALTER TABLE assigned_tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Medium';`);
    await db.query(`ALTER TABLE assigned_tasks ADD COLUMN IF NOT EXISTS attachment_url TEXT;`);
    console.log('Altered assigned_tasks.');

    // Alter updates
    await db.query(`ALTER TABLE updates ADD COLUMN IF NOT EXISTS attachment_url TEXT;`);
    console.log('Altered updates.');

    // Create SOPs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS sops (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created sops table.');

    console.log('Migration completed successfully.');
  } catch(e) {
    console.error('Migration error:', e);
  } finally {
    process.exit();
  }
}

run();
