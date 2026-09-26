import { query } from '../config/db.js';

export async function commitPath(req, res) {
  const userId = req.headers['x-user-id'] || req.body?.userId;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const { roleKey, pacingKey, tasksSchedule } = req.body || {};
  if (!roleKey || !pacingKey) {
    return res.status(400).json({ error: 'roleKey and pacingKey are required' });
  }

  try {
    await query(
      `INSERT INTO committed_paths (user_id, role_key, pacing_key, tasks_schedule_json, completed_task_ids, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, '[]'::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE
       SET role_key = EXCLUDED.role_key,
           pacing_key = EXCLUDED.pacing_key,
           tasks_schedule_json = EXCLUDED.tasks_schedule_json,
           updated_at = CURRENT_TIMESTAMP`,
      [userId, roleKey, pacingKey, JSON.stringify(tasksSchedule || [])]
    );

    // Award +50 XP for committing to a path
    await query(
      'UPDATE user_profiles SET xp = xp + 50, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: `Committed to ${pacingKey.toUpperCase()} path for ${roleKey}. +50 XP awarded!`,
    });
  } catch (err) {
    console.error('Error in commitPath:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}

export async function toggleTask(req, res) {
  const userId = req.headers['x-user-id'] || req.body?.userId;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const { taskId, isCompleted, xpAwarded = 25 } = req.body || {};
  if (!taskId) {
    return res.status(400).json({ error: 'taskId is required' });
  }

  try {
    const pathRes = await query('SELECT completed_task_ids FROM committed_paths WHERE user_id = $1', [userId]);
    if (pathRes.rows.length === 0) {
      return res.status(404).json({ error: 'No active committed path found for user.' });
    }

    let completed = pathRes.rows[0].completed_task_ids || [];
    if (isCompleted) {
      if (!completed.includes(taskId)) completed.push(taskId);
      await query('UPDATE user_profiles SET xp = xp + $1 WHERE user_id = $2', [xpAwarded, userId]);
    } else {
      completed = completed.filter(id => id !== taskId);
      await query('UPDATE user_profiles SET xp = GREATEST(0, xp - $1) WHERE user_id = $2', [xpAwarded, userId]);
    }

    await query(
      'UPDATE committed_paths SET completed_task_ids = $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [JSON.stringify(completed), userId]
    );

    return res.status(200).json({
      success: true,
      completedTaskIds: completed,
      isCompleted,
    });
  } catch (err) {
    console.error('Error in toggleTask:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}
