import { query } from '../config/db.js';

export async function getProfile(req, res) {
  const userId = req.headers['x-user-id'] || req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const profileRes = await query(
      `SELECT u.id, u.username, u.email, u.name, u.role,
              p.xp, p.streak, p.target_role, p.skills_json,
              cp.role_key, cp.pacing_key, cp.completed_task_ids, cp.tasks_schedule_json
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       LEFT JOIN committed_paths cp ON u.id = cp.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (profileRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const row = profileRes.rows[0];
    return res.status(200).json({
      profile: {
        id: row.id,
        username: row.username,
        email: row.email,
        name: row.name,
        role: row.role,
        xp: row.xp || 0,
        streak: row.streak || 1,
        targetRole: row.target_role || 'ml-engineer',
        skills: row.skills_json || { all: [] },
      },
      committedPath: row.role_key ? {
        role: row.role_key,
        pacing: row.pacing_key || 'balanced',
        completedTaskIds: row.completed_task_ids || [],
        tasks: row.tasks_schedule_json || [],
      } : null,
    });
  } catch (err) {
    console.error('Error in getProfile:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}

export async function updateProfile(req, res) {
  const userId = req.headers['x-user-id'] || req.body?.userId;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const { xp, streak, targetRole, skills, completedTaskIds } = req.body || {};

  try {
    if (xp !== undefined || streak !== undefined || targetRole || skills) {
      await query(
        `UPDATE user_profiles
         SET xp = COALESCE($1, xp),
             streak = COALESCE($2, streak),
             target_role = COALESCE($3, target_role),
             skills_json = COALESCE($4::jsonb, skills_json),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $5`,
        [
          xp !== undefined ? xp : null,
          streak !== undefined ? streak : null,
          targetRole || null,
          skills ? JSON.stringify(skills) : null,
          userId,
        ]
      );
    }

    if (completedTaskIds) {
      await query(
        `UPDATE committed_paths
         SET completed_task_ids = $1::jsonb,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [JSON.stringify(completedTaskIds), userId]
      );
    }

    return res.status(200).json({ success: true, message: 'Profile synced with Supabase' });
  } catch (err) {
    console.error('Error in updateProfile:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}
