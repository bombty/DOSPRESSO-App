import { Router } from "express";
import { pool } from "../db";
import { isAuthenticated } from "../localAuth";

const router = Router();

// GET /api/cowork/channels
router.get("/api/cowork/channels", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { rows } = await pool.query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM cowork_channel_members WHERE channel_id = c.id) as member_count,
        (SELECT COUNT(*) FROM cowork_messages WHERE channel_id = c.id) as message_count
      FROM cowork_channels c
      WHERE c.is_active = true
        AND (
          EXISTS (SELECT 1 FROM cowork_channel_members WHERE channel_id = c.id AND user_id = $1)
          OR c.is_private = false
        )
      ORDER BY c.updated_at DESC
    `, [userId]);
    res.json(rows);
  } catch (e) { res.status(500).json({ message: "Kanallar yüklenemedi" }); }
});

// POST /api/cowork/channels
router.post("/api/cowork/channels", isAuthenticated, async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    const userId = req.user!.id;
    const { rows } = await pool.query(`
      INSERT INTO cowork_channels (name, description, created_by_id, is_private)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [name, description, userId, isPrivate || false]);
    const channel = rows[0];
    // Creator otomatik member
    await pool.query(`INSERT INTO cowork_channel_members (channel_id, user_id, role) VALUES ($1, $2, 'owner')`, [channel.id, userId]);
    res.json(channel);
  } catch (e) { res.status(500).json({ message: "Kanal oluşturulamadı" }); }
});

// GET /api/cowork/channels/:id/messages
router.get("/api/cowork/channels/:id/messages", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const { rows } = await pool.query(`
      SELECT m.*, 
        u.first_name || ' ' || u.last_name as sender_name,
        u.role as sender_role
      FROM cowork_messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.channel_id = $1
      ORDER BY m.created_at ASC
      LIMIT $2
    `, [id, limit]);
    res.json(rows.map(r => ({
      id: r.id, channelId: r.channel_id, senderId: r.sender_id,
      senderName: r.sender_name, senderRole: r.sender_role,
      content: r.content, messageType: r.message_type,
      createdAt: r.created_at,
    })));
  } catch (e) { res.status(500).json({ message: "Mesajlar yüklenemedi" }); }
});

// POST /api/cowork/channels/:id/messages
router.post("/api/cowork/channels/:id/messages", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, messageType } = req.body;
    const userId = req.user!.id;
    const { rows } = await pool.query(`
      INSERT INTO cowork_messages (channel_id, sender_id, content, message_type)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [id, userId, content, messageType || 'text']);
    await pool.query(`UPDATE cowork_channels SET updated_at = NOW() WHERE id = $1`, [id]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ message: "Mesaj gönderilemedi" }); }
});

// GET /api/cowork/channels/:id/tasks
router.get("/api/cowork/channels/:id/tasks", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT t.*,
        u.first_name || ' ' || u.last_name as assigned_to_name
      FROM cowork_tasks t
      LEFT JOIN users u ON u.id = t.assigned_to_id
      WHERE t.channel_id = $1
      ORDER BY t.created_at DESC
    `, [id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ message: "Tasks yüklenemedi" }); }
});

// POST /api/cowork/channels/:id/tasks
router.post("/api/cowork/channels/:id/tasks", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, assignedToId, dueDate } = req.body;
    const userId = req.user!.id;
    const { rows } = await pool.query(`
      INSERT INTO cowork_tasks (channel_id, title, assigned_to_id, created_by_id, due_date)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [id, title, assignedToId || null, userId, dueDate || null]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ message: "Task eklenemedi" }); }
});

// PATCH /api/cowork/tasks/:taskId
router.patch("/api/cowork/tasks/:taskId", isAuthenticated, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, title } = req.body;
    const completed = status === 'done' ? 'NOW()' : 'NULL';
    const { rows } = await pool.query(`
      UPDATE cowork_tasks SET
        status = COALESCE($1, status),
        title = COALESCE($2, title),
        completed_at = ${completed}
      WHERE id = $3 RETURNING *
    `, [status, title, taskId]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ message: "Task güncellenemedi" }); }
});

// GET /api/cowork/channels/:id/members
router.get("/api/cowork/channels/:id/members", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT m.*, 
        u.first_name || ' ' || u.last_name as user_name,
        u.role as user_role,
        b.name as branch_name
      FROM cowork_channel_members m
      LEFT JOIN users u ON u.id = m.user_id
      LEFT JOIN branches b ON b.id = u.branch_id
      WHERE m.channel_id = $1
      ORDER BY m.joined_at ASC
    `, [id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ message: "Üyeler yüklenemedi" }); }
});

// POST /api/cowork/channels/:id/members
router.post("/api/cowork/channels/:id/members", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    await pool.query(`
      INSERT INTO cowork_channel_members (channel_id, user_id) VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [id, userId]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: "Üye eklenemedi" }); }
});

export default router;
