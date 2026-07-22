const db = require('./db');

async function run() {
  try {
    await db.query('ALTER TABLE users ADD COLUMN name VARCHAR(255)');
    await db.query("UPDATE users SET name = 'Devesh Kumar' WHERE email = 'member@renza.com'");
    await db.query("UPDATE users SET name = 'CEO User' WHERE email = 'ceo@renza.com'");
    await db.query("UPDATE users SET name = 'COO User' WHERE email = 'coo@renza.com'");
    console.log('done');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
