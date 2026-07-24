import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

const resend = new Resend(process.env.RESEND_API_KEY || '');

export default async function handler(req, res) {
  // Optional: Add basic security so only Vercel Cron can call this
  if (
    process.env.CRON_SECRET &&
    req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Get all active users
    const { data: users, error: usersError } = await supabase.from('users').select('*');
    if (usersError) throw usersError;

    // 2. Get today's updates
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0); // Start of UTC day, adjust if timezone needed
    
    const { data: updates, error: updatesError } = await supabase
      .from('updates')
      .select('user_id')
      .gte('created_at', startOfDay.toISOString());
      
    if (updatesError) throw updatesError;

    // 3. Find users who haven't updated
    const updatedUserIds = new Set(updates.map(u => u.user_id));
    const missingUsers = users.filter(user => !updatedUserIds.has(user.id) && user.role !== 'CEO' && user.role !== 'COO');

    // 4. Send emails
    const emailPromises = missingUsers.map(user => {
      return resend.emails.send({
        from: 'Renza Reminders <onboarding@resend.dev>', // Free tier Resend sender
        to: user.email,
        subject: "Action Required: Your Daily Update is Missing",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
            <h2 style="color: #000;">Hi ${user.name.split(' ')[0]},</h2>
            <p style="color: #333; font-size: 16px;">We noticed you haven't posted your end-of-day update yet.</p>
            <p style="color: #333; font-size: 16px;">Please log in to the <strong>Renza dashboard</strong> and submit your update as soon as possible to keep the team informed!</p>
            <br/>
            <p style="color: #666; font-size: 14px;">Thanks,<br/>The Renza Team</p>
          </div>
        `
      });
    });

    const results = await Promise.allSettled(emailPromises);
    
    res.status(200).json({ 
      success: true, 
      messagedUsers: missingUsers.length,
      users: missingUsers.map(u => u.email),
      results
    });

  } catch (error) {
    console.error('Error in cron job:', error);
    res.status(500).json({ error: error.message });
  }
}
