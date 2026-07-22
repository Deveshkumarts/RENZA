require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
});
const upload = multer({ storage: storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});

// Auth Endpoint (Login only, as requested)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (rows.length === 0 || rows[0].password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // In a real app, use JWT. For simplicity, we just return the user object.
    const user = { ...rows[0] };
    delete user.password;
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Updates Endpoints
app.get('/api/updates', async (req, res) => {
  try {
    const { userId, role } = req.query;
    let updatesQuery;
    
    if (role === 'CEO' || role === 'COO') {
      // Leaders see all updates
      updatesQuery = await db.query(`
        SELECT u.*, us.email, us.role, us.name 
        FROM updates u 
        JOIN users us ON u.user_id = us.id 
        ORDER BY u.created_at DESC
      `);
    } else {
      // Members see their own updates
      updatesQuery = await db.query(`
        SELECT u.*, us.email, us.role, us.name 
        FROM updates u 
        JOIN users us ON u.user_id = us.id 
        WHERE u.user_id = $1 
        ORDER BY u.created_at DESC
      `, [userId]);
    }

    const updates = updatesQuery.rows;

    // Fetch feedback for these updates
    const updateIds = updates.map(u => u.id);
    if (updateIds.length > 0) {
      const placeholders = updateIds.map((_, i) => '$' + (i + 1)).join(',');
      const feedbackQuery = await db.query(`
        SELECT f.*, us.email, us.role, us.name 
        FROM feedback f 
        JOIN users us ON f.author_id = us.id 
        WHERE f.update_id IN (${placeholders})
        ORDER BY f.created_at ASC
      `, updateIds);
      
      const feedbacks = feedbackQuery.rows;
      
      // Attach feedback to updates
      updates.forEach(update => {
        update.feedback = feedbacks.filter(f => f.update_id === update.id);
      });
    } else {
      updates.forEach(update => { update.feedback = []; });
    }
    
    res.json(updates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/updates', async (req, res) => {
  try {
    const { userId, category, completed, planned, blockers, attachmentUrl } = req.body;
    const { rows } = await db.query(`
      INSERT INTO updates (user_id, category, completed, planned, blockers, attachment_url) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [userId, category, completed, planned, blockers, attachmentUrl]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Feedback Endpoint (For leaders)
app.post('/api/updates/:id/feedback', async (req, res) => {
  try {
    const { id } = req.params;
    const { authorId, comment } = req.body;
    
    const { rows } = await db.query(`
      INSERT INTO feedback (update_id, author_id, comment) 
      VALUES ($1, $2, $3) RETURNING *
    `, [id, authorId, comment]);
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Users Endpoint (For dropdowns)
app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, email, name, role, category 
      FROM users 
      ORDER BY name ASC, email ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assigned Tasks Endpoints
app.get('/api/tasks', async (req, res) => {
  try {
    const { userId, role } = req.query;
    let query, params;
    
    // Both leaders and members can see all tasks, but you can limit members to their own
    if (role === 'CEO' || role === 'COO') {
      query = `
        SELECT t.*, 
               a.name as assignee_name, a.email as assignee_email, 
               s.name as assigner_name, s.email as assigner_email
        FROM assigned_tasks t
        JOIN users a ON t.assignee_id = a.id
        JOIN users s ON t.assigner_id = s.id
        ORDER BY t.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT t.*, 
               a.name as assignee_name, a.email as assignee_email, 
               s.name as assigner_name, s.email as assigner_email
        FROM assigned_tasks t
        JOIN users a ON t.assignee_id = a.id
        JOIN users s ON t.assigner_id = s.id
        WHERE t.assignee_id = $1
        ORDER BY t.created_at DESC
      `;
      params = [userId];
    }
    
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { assignerId, assigneeId, description, dueDate, priority, attachmentUrl } = req.body;
    const { rows } = await db.query(`
      INSERT INTO assigned_tasks (assigner_id, assignee_id, description, due_date, priority, attachment_url)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [assignerId, assigneeId, description, dueDate, priority || 'Medium', attachmentUrl]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { rows } = await db.query(`
      UPDATE assigned_tasks SET status = $1 WHERE id = $2 RETURNING *
    `, [status, id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SOPs Endpoints (Wiki)
app.get('/api/sops', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT s.*, u.name as author_name, u.email as author_email
      FROM sops s
      LEFT JOIN users u ON s.author_id = u.id
      ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/sops', async (req, res) => {
  try {
    const { title, content, authorId } = req.body;
    const { rows } = await db.query(`
      INSERT INTO sops (title, content, author_id)
      VALUES ($1, $2, $3) RETURNING *
    `, [title, content, authorId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/sops/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM sops WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// CSV Export Endpoint
app.get('/api/export/updates', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, us.name, us.email, us.category, u.completed, u.planned, u.blockers, u.created_at
      FROM updates u
      JOIN users us ON u.user_id = us.id
      ORDER BY u.created_at DESC
    `);

    // Simple CSV generator
    const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
    const headers = ['ID', 'Name', 'Email', 'Category', 'Accomplished', 'Planned', 'Blockers', 'Date'];
    
    const csvRows = [headers.join(',')];
    for (const row of rows) {
      csvRows.push([
        row.id,
        escapeCsv(row.name),
        escapeCsv(row.email),
        escapeCsv(row.category),
        escapeCsv(row.completed),
        escapeCsv(row.planned),
        escapeCsv(row.blockers),
        escapeCsv(new Date(row.created_at).toLocaleString())
      ].join(','));
    }

    const csvData = csvRows.join('\\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="updates_export.csv"');
    res.send(csvData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
