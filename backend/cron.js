const cron = require('node-cron');
const db = require('./db');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Run every weekday (Mon-Fri) at 5:00 PM
// '0 17 * * 1-5'
cron.schedule('0 17 * * 1-5', async () => {
  console.log('Running daily update reminder check...');
  
  try {
    // 1. Get all employees (MEMBERs)
    const usersQuery = await db.query("SELECT id, name, email FROM users WHERE role = 'MEMBER'");
    const members = usersQuery.rows;

    if (members.length === 0) return;

    // 2. Get users who posted an update TODAY
    const updatesQuery = await db.query(`
      SELECT DISTINCT user_id 
      FROM updates 
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    
    const usersWithUpdates = new Set(updatesQuery.rows.map(row => row.user_id));

    // 3. Find who missed it
    const missedUsers = members.filter(user => !usersWithUpdates.has(user.id));

    if (missedUsers.length > 0 && process.env.SMTP_USER && process.env.SMTP_PASS) {
      console.log(`Sending reminders to ${missedUsers.length} employees...`);
      
      for (const user of missedUsers) {
        const mailOptions = {
          from: `"Renza Admin" <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: 'Action Required: Daily Work Update Missing',
          text: `Hi ${user.name || 'Team Member'},\n\nYou haven't posted your daily work update in Renza today. Please log in and submit your update before the end of the day.\n\nThanks,\nManagement`,
        };
        
        await transporter.sendMail(mailOptions);
      }
      console.log('Reminders sent successfully.');
    } else {
      console.log('All employees have updated their work today! (Or SMTP is not configured)');
    }
  } catch (error) {
    console.error('Error running daily update cron job:', error);
  }
});

// Run every day at 3:00 AM to automatically clean up completed tasks
cron.schedule('0 3 * * *', async () => {
  console.log('Running nightly cleanup of completed tasks...');
  try {
    const result = await db.query(`
      DELETE FROM assigned_tasks 
      WHERE status = 'completed'
    `);
    console.log(`Cleaned up ${result.rowCount} completed task(s).`);
  } catch (error) {
    console.error('Error cleaning up completed tasks:', error);
  }
});

console.log('Cron jobs loaded:');
console.log('- Daily update reminders (5:00 PM Mon-Fri)');
console.log('- Completed tasks cleanup (3:00 AM Daily)');
