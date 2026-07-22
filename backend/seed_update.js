const db = require('./db');

async function seed() {
  try {
    // 1. Get member ID
    const memberRes = await db.query(`SELECT id FROM users WHERE email = 'member@renza.com' LIMIT 1`);
    if (memberRes.rows.length === 0) {
      console.log('Member user not found');
      process.exit(1);
    }
    const memberId = memberRes.rows[0].id;

    // 2. Insert update
    const updateRes = await db.query(`
      INSERT INTO updates (user_id, completed, planned, blockers, category) 
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [
      memberId, 
      'Finished implementing the modern sidebar layout UI and toggle functionality.', 
      'Will start working on the analytics dashboard for the CEO.', 
      'Waiting for final mockups for the analytics page.', 
      'TECHNICAL'
    ]);
    
    console.log('Seed successful:', updateRes.rows[0]);
  } catch (err) {
    console.error('Error seeding:', err);
  } finally {
    process.exit(0);
  }
}

seed();
