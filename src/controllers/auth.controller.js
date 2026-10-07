import bcrypt from 'bcrypt';
import { query } from '../config/db.js';

const SALT_ROUNDS = 12;

/**
 * Log in an existing user with username/email and password.
 * Checks password against bcrypt hash in Supabase PostgreSQL users table.
 */
export async function login(req, res) {
  const { email, username, identifier, password } = req.body || {};
  const userIdentifier = (identifier || username || email || '').trim().toLowerCase();

  if (!userIdentifier || !password) {
    return res.status(400).json({ error: 'Username/email and password are required.' });
  }

  try {
    const userRes = await query(
      `SELECT u.id, u.username, u.email, u.name, u.role, u.password_hash,
              p.xp, p.streak, p.target_role, p.skills_json, p.last_active_date,
              cp.role_key, cp.pacing_key, cp.completed_task_ids
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       LEFT JOIN committed_paths cp ON u.id = cp.user_id
       WHERE (u.username IS NOT NULL AND LOWER(u.username) = $1)
          OR (u.email IS NOT NULL AND LOWER(u.email) = $1)`,
      [userIdentifier]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials. User not found in database.' });
    }

    const user = userRes.rows[0];

    // Securely compare provided password against the stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    }

    // Dynamic streak calculation based on last active date
    let newStreak = user.streak || 1;
    const today = new Date().toISOString().slice(0, 10);
    const lastActive = user.last_active_date
      ? new Date(user.last_active_date).toISOString().slice(0, 10)
      : null;

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
      user: {
        id: user.id,
        username: user.username || (user.email ? user.email.split('@')[0] : 'user'),
        email: user.email,
        name: user.name,
        role: user.role,
      },
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

/**
 * Register a new user into Supabase PostgreSQL users table.
 * Stores username, name, email, and password hashed with bcrypt.
 */
export async function register(req, res) {
  const { username, name, email, password } = req.body || {};

  const cleanName = (name || '').trim();
  const rawIdentifier = (username || email || '').trim();

  if (!cleanName) {
    return res.status(400).json({ error: 'Full name is required.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password is required and must be at least 6 characters.' });
  }
  if (!rawIdentifier) {
    return res.status(400).json({ error: 'Username or email is required.' });
  }

  // Derive normalized username and email
  const cleanUsername = username
    ? username.trim().toLowerCase().replace(/\s+/g, '_')
    : (email ? email.trim().toLowerCase().split('@')[0] : null);

  const cleanEmail = email && email.includes('@')
    ? email.trim().toLowerCase()
    : (cleanUsername && cleanUsername.includes('@')
        ? cleanUsername
        : (cleanUsername ? `${cleanUsername}@skillbridge.io` : null));

  try {
    // Check if an existing account exists by username or email
    const existing = await query(
      `SELECT id, username, email FROM users
       WHERE (username IS NOT NULL AND LOWER(username) = $1)
          OR (email IS NOT NULL AND LOWER(email) = $2)`,
      [cleanUsername, cleanEmail]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this username or email already exists in Supabase.' });
    }

    // Hash the password with bcrypt (12 salt rounds) — never store plain text passwords
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user into Supabase PostgreSQL users table
    const userResult = await query(
      `INSERT INTO users (username, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'User')
       RETURNING id, username, email, name, role, created_at`,
      [cleanUsername, cleanName, cleanEmail, hashedPassword]
    );
    const newUser = userResult.rows[0];

    // Create initial user profile
    await query(
      `INSERT INTO user_profiles (user_id, target_role, xp, streak)
       VALUES ($1, 'ml-engineer', 0, 1)
       ON CONFLICT (user_id) DO NOTHING`,
      [newUser.id]
    );

    return res.status(201).json({
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        createdAt: newUser.created_at,
      },
      profile: { xp: 0, streak: 1, targetRole: 'ml-engineer', skills: { all: [] } },
      committedPath: null,
      message: 'Account created successfully in Supabase users table with bcrypt hashed password',
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
      `SELECT u.id, u.username, u.email, u.name, u.role, p.xp, p.streak, p.target_role, p.skills_json,
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
      user: {
        id: row.id,
        username: row.username || 'alexmercer',
        email: row.email,
        name: row.name,
        role: row.role,
      },
      profile: {
        xp:         row.xp || 50,
        streak:     row.streak || 3,
        targetRole: row.target_role || 'ml-engineer',
        skills:     row.skills_json || { all: [] },
      },
      committedPath: row.role_key ? {
        role:             row.role_key,
        pacing:           row.pacing_key || 'balanced',
        completedTaskIds: row.completed_task_ids || [],
      } : null,
      message: 'Signed in as Demo User via Supabase',
    });
  } catch (err) {
    console.error('Error in demoLogin:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}

