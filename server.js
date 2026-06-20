const express = require('express');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'mood.db');

app.use(express.json());
app.use(express.static('public'));

let db;

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS moods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  saveDatabase();
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

app.post('/api/mood', (req, res) => {
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: '心情内容不能为空' });
  }

  const stmt = db.prepare('INSERT INTO moods (content) VALUES (?)');
  stmt.run([content.trim()]);
  stmt.free();

  saveDatabase();

  res.json({ success: true });
});

app.get('/api/moods', (req, res) => {
  const result = db.exec('SELECT id, content, created_at FROM moods ORDER BY created_at DESC');

  const moods = result.length > 0 ? result[0].values.map(row => ({
    id: row[0],
    content: row[1],
    created_at: row[2]
  })) : [];

  res.json(moods);
});

app.put('/api/mood/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { content } = req.body;

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: '无效的记录ID' });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ error: '心情内容不能为空' });
  }

  const checkStmt = db.prepare('SELECT id FROM moods WHERE id = ?');
  const checkResult = checkStmt.getAsObject([id]);
  checkStmt.free();

  if (!checkResult.id) {
    return res.status(404).json({ error: '记录不存在' });
  }

  const stmt = db.prepare('UPDATE moods SET content = ? WHERE id = ?');
  stmt.run([content.trim(), id]);
  stmt.free();

  saveDatabase();

  res.json({ success: true });
});

app.delete('/api/mood/:id', (req, res) => {
  const id = parseInt(req.params.id);

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: '无效的记录ID' });
  }

  const checkStmt = db.prepare('SELECT id FROM moods WHERE id = ?');
  const checkResult = checkStmt.getAsObject([id]);
  checkStmt.free();

  if (!checkResult.id) {
    return res.status(404).json({ error: '记录不存在' });
  }

  const stmt = db.prepare('DELETE FROM moods WHERE id = ?');
  stmt.run([id]);
  stmt.free();

  saveDatabase();

  res.json({ success: true });
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`心情记录应用运行在 http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
});
