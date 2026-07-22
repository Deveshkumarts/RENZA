const db = require('./db');

async function initDB() {
  try {
    console.log('Dropping old tables...');
    await db.query('DROP TABLE IF EXISTS feedback, updates, users CASCADE;');
    
    console.log('Creating tables...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'MEMBER',
        category VARCHAR(50) DEFAULT 'TECHNICAL',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS updates (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(50) DEFAULT 'TECHNICAL',
        completed TEXT NOT NULL,
        planned TEXT NOT NULL,
        blockers TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        update_id INTEGER REFERENCES updates(id) ON DELETE CASCADE,
        author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Tables created successfully.');
    
    // Seed test users
    console.log('Seeding test users...');
    await db.query(`
      INSERT INTO users (email, password, role, category) 
      VALUES ('member@renza.com', 'password123', 'MEMBER', 'TECHNICAL');
    `);
    
    await db.query(`
      INSERT INTO users (email, password, role, category) 
      VALUES ('ceo@renza.com', 'password123', 'CEO', 'NON-TECHNICAL');
    `);

    await db.query(`
      INSERT INTO users (email, password, role, category) 
      VALUES ('coo@renza.com', 'password123', 'COO', 'NON-TECHNICAL');
    `);

    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    process.exit();
  }
}

initDB();
