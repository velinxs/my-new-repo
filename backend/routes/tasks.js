import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import crypto from 'crypto';

const router = express.Router();

// POST /task - Submit a new task
router.post('/', async (req, res) => {
  try {
    const { description, requester_wallet } = req.body;

    if (!description || !requester_wallet) {
      return res.status(400).json({
        error: 'Missing required fields: description and requester_wallet'
      });
    }

    const taskId = uuidv4();

    await db.run(
      `INSERT INTO tasks (id, description, requester_wallet, status)
       VALUES (?, ?, ?, 'pending')`,
      [taskId, description, requester_wallet]
    );

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);

    res.status(201).json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// GET /task/:id - Get task status and details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// GET /tasks - List all tasks (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { status, requester_wallet, limit = 50 } = req.query;

    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (requester_wallet) {
      query += ' AND requester_wallet = ?';
      params.push(requester_wallet);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const tasks = await db.all(query, params);

    res.json({
      tasks,
      count: tasks.length
    });
  } catch (error) {
    console.error('Error listing tasks:', error);
    res.status(500).json({ error: 'Failed to list tasks' });
  }
});

// POST /task/:id/complete - Agent marks task as complete with proof
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      agent_wallet,
      output_text,
      input_tokens,
      output_tokens
    } = req.body;

    if (!agent_wallet || !output_text) {
      return res.status(400).json({
        error: 'Missing required fields: agent_wallet, output_text'
      });
    }

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status === 'completed' || task.status === 'verified') {
      return res.status(400).json({ error: 'Task already completed' });
    }

    // Calculate compute tokens and hash
    const compute_tokens_used = (input_tokens || 0) + (output_tokens || 0);
    const output_hash = crypto
      .createHash('sha256')
      .update(output_text)
      .digest('hex');

    // Update task
    await db.run(
      `UPDATE tasks
       SET status = 'completed',
           agent_wallet = ?,
           output_text = ?,
           output_hash = ?,
           compute_tokens_used = ?,
           input_tokens = ?,
           output_tokens = ?,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        agent_wallet,
        output_text,
        output_hash,
        compute_tokens_used,
        input_tokens,
        output_tokens,
        id
      ]
    );

    // Update agent stats
    await db.run(
      `INSERT INTO agent_stats (agent_wallet, total_tasks_completed, total_compute_tokens, last_active)
       VALUES (?, 1, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(agent_wallet) DO UPDATE SET
         total_tasks_completed = total_tasks_completed + 1,
         total_compute_tokens = total_compute_tokens + ?,
         last_active = CURRENT_TIMESTAMP`,
      [agent_wallet, compute_tokens_used, compute_tokens_used]
    );

    const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);

    res.json({
      success: true,
      task: updatedTask,
      proof: {
        task_id: id,
        compute_tokens: compute_tokens_used,
        output_hash,
        agent_wallet
      }
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// GET /stats/agent/:wallet - Get agent statistics
router.get('/stats/agent/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;

    const stats = await db.get(
      'SELECT * FROM agent_stats WHERE agent_wallet = ?',
      [wallet]
    );

    if (!stats) {
      return res.json({
        agent_wallet: wallet,
        total_tasks_completed: 0,
        total_compute_tokens: 0,
        total_tokens_earned: 0
      });
    }

    res.json(stats);
  } catch (error) {
    console.error('Error fetching agent stats:', error);
    res.status(500).json({ error: 'Failed to fetch agent stats' });
  }
});

export default router;
