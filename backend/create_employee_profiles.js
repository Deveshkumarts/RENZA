const db = require('./db');

async function run() {
  try {
    console.log('Creating employee_profiles table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS employee_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        phone VARCHAR(50),
        gender VARCHAR(50),
        college_work VARCHAR(255),
        year_experience VARCHAR(100),
        age INTEGER,
        dob DATE,
        current_city VARCHAR(255),
        domain VARCHAR(255),
        UNIQUE(user_id)
      );
    `);
    console.log('Table employee_profiles created successfully.');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    process.exit();
  }
}

run();
