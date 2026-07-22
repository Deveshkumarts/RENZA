require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const db = require('./db');

// The keys provided by the user in the chat
const SUPABASE_URL = 'https://donoeezambswdjcrjuft.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbm9lZXphbWJzd2RqY3JqdWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MTE4NDMsImV4cCI6MjEwMDI4Nzg0M30.37qSJvXQaRc04h1q5prFi8D9Y2DAIKjU4a_A50SDRlo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrate() {
  try {
    console.log('Starting migration to Supabase...');

    // 1. Migrate Users
    const { rows: users } = await db.query('SELECT * FROM users');
    if (users.length > 0) {
      const { error } = await supabase.from('users').insert(users);
      if (error) throw new Error(`Users insert error: ${error.message}`);
      console.log(`Successfully migrated ${users.length} users.`);
    }

    // 2. Migrate Updates
    const { rows: updates } = await db.query('SELECT * FROM updates');
    if (updates.length > 0) {
      const { error } = await supabase.from('updates').insert(updates);
      if (error) throw new Error(`Updates insert error: ${error.message}`);
      console.log(`Successfully migrated ${updates.length} updates.`);
    }

    // 3. Migrate Feedback
    const { rows: feedback } = await db.query('SELECT * FROM feedback');
    if (feedback.length > 0) {
      const { error } = await supabase.from('feedback').insert(feedback);
      if (error) throw new Error(`Feedback insert error: ${error.message}`);
      console.log(`Successfully migrated ${feedback.length} feedback entries.`);
    }

    // 4. Migrate Assigned Tasks
    const { rows: tasks } = await db.query('SELECT * FROM assigned_tasks');
    if (tasks.length > 0) {
      const { error } = await supabase.from('assigned_tasks').insert(tasks);
      if (error) throw new Error(`Assigned_tasks insert error: ${error.message}`);
      console.log(`Successfully migrated ${tasks.length} assigned tasks.`);
    }

    // 5. Migrate SOPs
    const { rows: sops } = await db.query('SELECT * FROM sops');
    if (sops.length > 0) {
      const { error } = await supabase.from('sops').insert(sops);
      if (error) throw new Error(`SOPs insert error: ${error.message}`);
      console.log(`Successfully migrated ${sops.length} SOPs.`);
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
