import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';

// Load .env.local or .env from backend directory
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Client } = pg;

async function initDatabase() {
  console.log('🚀 Initializing SkillBridge database schema on Supabase PostgreSQL...');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL is not defined in .env.local or .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL pooler successfully.');

    // 1. Users table
    console.log('📦 Verifying users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'User',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. User profiles table
    console.log('📦 Verifying user_profiles table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        target_role VARCHAR(100) DEFAULT 'ml-engineer',
        skills_json JSONB DEFAULT '{"tech":[], "ml":[], "tool":[], "cloud":[], "soft":[], "all":[]}'::jsonb,
        xp INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 1,
        last_active_date DATE DEFAULT CURRENT_DATE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Committed paths table
    console.log('📦 Verifying committed_paths table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS committed_paths (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        role_key VARCHAR(100) NOT NULL,
        pacing_key VARCHAR(50) NOT NULL,
        start_date DATE DEFAULT CURRENT_DATE,
        completed_task_ids JSONB DEFAULT '[]'::jsonb,
        tasks_schedule_json JSONB DEFAULT '[]'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Daily submissions table
    console.log('📦 Verifying daily_submissions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        problem_id VARCHAR(100) NOT NULL,
        solved_date DATE DEFAULT CURRENT_DATE,
        xp_awarded INTEGER DEFAULT 10
      );
    `);

    // 5. Create indices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    // 6. Seed demo user if not exists
    console.log('🌱 Checking / Seeding default demo account (user@skillbridge.io)...');
    const demoEmail = 'user@skillbridge.io';
    const checkDemo = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [demoEmail]);
    
    let demoUserId;
    if (checkDemo.rows.length === 0) {
      const insertDemo = await client.query(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id;
      `, [demoEmail, 'User@2024', 'Alex Mercer', 'User']);
      demoUserId = insertDemo.rows[0].id;

      await client.query(`
        INSERT INTO user_profiles (user_id, target_role, xp, streak, skills_json)
        VALUES ($1, $2, $3, $4, $5);
      `, [
        demoUserId,
        'ml-engineer',
        50,
        3,
        JSON.stringify({
          tech: ['Python', 'SQL', 'Git', 'Pandas'],
          ml: ['Scikit-learn', 'PyTorch'],
          tool: ['Docker'],
          cloud: ['AWS'],
          soft: ['Problem Solving', 'Communication'],
          all: ['Python', 'SQL', 'Git', 'Pandas', 'Scikit-learn', 'PyTorch', 'Docker', 'AWS', 'Problem Solving', 'Communication']
        })
      ]);

      await client.query(`
        INSERT INTO committed_paths (user_id, role_key, pacing_key, completed_task_ids)
        VALUES ($1, $2, $3, $4);
      `, [demoUserId, 'ml-engineer', 'balanced', JSON.stringify(['task-1', 'task-2'])]);

      console.log('✅ Demo user seeded with ID:', demoUserId);
    } else {
      console.log('ℹ️ Demo user already exists with ID:', checkDemo.rows[0].id);
    }

    console.log('🎉 Database initialization complete!');
    await client.end();
  } catch (err) {
    console.error('❌ Error initializing database:', err);
    process.exit(1);
  }
}

initDatabase();
