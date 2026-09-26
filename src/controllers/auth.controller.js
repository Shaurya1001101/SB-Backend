import { query } from '../config/db.js';

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const userRes = await query(
      `SELECT u.id, u.email, u.name, u.role, u.password_hash,
              p.xp, p.streak, p.target_role, p.skills_json, p.last_active_date,
              cp.role_key, cp.pacing_key, cp.completed_task_ids
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       LEFT JOIN committed_paths cp ON u.id = cp.user_id
       WHERE LOWER(u.email) = $1`,
      [normalizedEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    const user = userRes.rows[0];
    if (user.password_hash !== password) {
      return res.status(401).json({ error: 'Invalid password. Try again or use 1-Click Demo Login.' });
    }

    // Dynamic streak calculation based on last active date
    let newStreak = user.streak || 1;
    const today = new Date().toISOString().slice(0, 10);
    const lastActive = user.last_active_date ? new Date(user.last_active_date).toISOString().slice(0, 10) : null;

    if (lastActive && lastActive !== today) {
      const diffDays = Math.round((new Date(today) - new Date(lastActive)) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
      await query(
        'UPDATE user_profiles SET streak = $1, last_active_date = CURRENT_DATE WHERE user_id = $2',
        [newStreak, user.id]
      );
    }

    return res.status(200).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      profile: {
        xp: user.xp || 0,
        streak: newStreak,
        targetRole: user.target_role || 'ml-engineer',
        skills: user.skills_json || { all: [] },
      },
      committedPath: user.role_key ? {
        role: user.role_key,
        pacing: user.pacing_key || 'balanced',
        completedTaskIds: user.completed_task_ids || [],
      } : null,
      message: 'Login successful via Supabase',
    });
  } catch (err) {
    console.error('Error in login:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}

export async function register(req, res) {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const userResult = await query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'User')
       RETURNING id, email, name, role`,
      [normalizedEmail, password, name.trim()]
    );
    const newUser = userResult.rows[0];

    await query(
      `INSERT INTO user_profiles (user_id, target_role, xp, streak)
       VALUES ($1, 'ml-engineer', 0, 1)`,
      [newUser.id]
    );

    return res.status(201).json({
      user: newUser,
      profile: { xp: 0, streak: 1, targetRole: 'ml-engineer', skills: { all: [] } },
      committedPath: null,
      message: 'Account created successfully in Supabase',
    });
  } catch (err) {
    console.error('Error in register:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}

export async function demoLogin(req, res) {
  const demoEmail = 'user@skillbridge.io';
  try {
    const userRes = await query(
      `SELECT u.id, u.email, u.name, u.role, p.xp, p.streak, p.target_role, p.skills_json,
              cp.role_key, cp.pacing_key, cp.completed_task_ids
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       LEFT JOIN committed_paths cp ON u.id = cp.user_id
       WHERE LOWER(u.email) = $1`,
      [demoEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Demo user not found. Please run npm run init-db' });
    }

    const row = userRes.rows[0];
    return res.status(200).json({
      user: { id: row.id, email: row.email, name: row.name, role: row.role },
      profile: {
        xp: row.xp || 50,
        streak: row.streak || 3,
        targetRole: row.target_role || 'ml-engineer',
        skills: row.skills_json || { all: [] },
      },
      committedPath: row.role_key ? {
        role: row.role_key,
        pacing: row.pacing_key || 'balanced',
        completedTaskIds: row.completed_task_ids || [],
      } : null,
      message: 'Signed in as Demo User via Supabase',
    });
  } catch (err) {
    console.error('Error in demoLogin:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}
