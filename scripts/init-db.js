import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';

// Load .env.local or .env from backend directory
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Client } = pg;

export async function initDatabase() {
  console.log('🚀 Initializing SkillBridge database schema on Supabase PostgreSQL...');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL is not defined in .env.local or .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL pooler successfully.');

    // 1. Users table
    console.log('📦 Verifying users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE,
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'User',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;
      ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
    `);

    // 2. User profiles table
    console.log('📦 Verifying user_profiles table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        target_role VARCHAR(100) DEFAULT 'data-scientist',
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

    // 5. Clean drop of old tables
    console.log('🗑️  Dropping old dataset tables for fresh schema rebuild...');
    await client.query(`DROP TABLE IF EXISTS jobs CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS job_descriptions CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS datascience_jobs CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS jds_skill_traits CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS sds_personality_traits CASCADE;`);

    // 6. Dataset 1: Job Descriptions / Analytics Jobs (15,841 jobs)
    console.log('📦 Creating job_descriptions table (Analytics Jobs dataset)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_descriptions (
        id                SERIAL PRIMARY KEY,
        s_no              INTEGER UNIQUE,
        job_id            VARCHAR(50) UNIQUE,
        title             VARCHAR(255) NOT NULL,
        company           VARCHAR(255) DEFAULT 'Enterprise Analytics',
        location          VARCHAR(255),
        experience        VARCHAR(100),
        min_exp_years     INTEGER DEFAULT 0,
        max_exp_years     INTEGER DEFAULT 0,
        salary            VARCHAR(100),
        salary_min_lakhs  NUMERIC DEFAULT 0,
        salary_max_lakhs  NUMERIC DEFAULT 0,
        job_type          VARCHAR(100),
        department        VARCHAR(100) DEFAULT 'Analytics',
        description       TEXT DEFAULT '',
        key_skills_raw    TEXT DEFAULT '',
        required_skills   JSONB NOT NULL DEFAULT '[]'::jsonb,
        apply_link        TEXT,
        job_status        VARCHAR(50) DEFAULT 'Open',
        role_family       VARCHAR(100) DEFAULT 'analytics',
        skills_source     VARCHAR(20) DEFAULT 'given',
        scraped_date      DATE DEFAULT CURRENT_DATE,
        created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Dataset 2: DataScience Jobs (1,602 company salary & hiring volume records)
    console.log('📦 Creating datascience_jobs table (Data Science Company & Salary Benchmarks dataset)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS datascience_jobs (
        id                SERIAL PRIMARY KEY,
        reference_no      INTEGER NOT NULL,
        company_name      VARCHAR(255) NOT NULL,
        job_title         VARCHAR(255) NOT NULL,
        min_experience    NUMERIC DEFAULT 0,
        avg_salary        VARCHAR(50),
        min_salary        VARCHAR(50),
        max_salary        VARCHAR(50),
        avg_salary_lakhs  NUMERIC DEFAULT 0,
        min_salary_lakhs  NUMERIC DEFAULT 0,
        max_salary_lakhs  NUMERIC DEFAULT 0,
        num_of_jobs       INTEGER DEFAULT 1,
        created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Dataset 3: JDS Skill Traits (139 Junior Data Scientists skills & salary hike records)
    console.log('📦 Creating jds_skill_traits table (Junior Data Scientist Traits dataset)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS jds_skill_traits (
        id                                SERIAL PRIMARY KEY,
        candidate_id                      INTEGER NOT NULL,
        big_data_skills                   NUMERIC NOT NULL,
        maths_stats_skills                NUMERIC NOT NULL,
        coding_skills                     NUMERIC NOT NULL,
        ai_and_ml_skills                  NUMERIC NOT NULL,
        dashboard_and_storytelling_skills NUMERIC NOT NULL,
        salary_hike_high_or_low           INTEGER NOT NULL,
        created_at                        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Dataset 4: SDS Personality Traits (161 Senior Data Scientists Big Five & success classification)
    console.log('📦 Creating sds_personality_traits table (Senior Data Scientist Personality dataset)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sds_personality_traits (
        id                                SERIAL PRIMARY KEY,
        candidate_id                      INTEGER NOT NULL,
        neuroticism                       NUMERIC NOT NULL,
        extraversion                      NUMERIC NOT NULL,
        openness_to_experience            NUMERIC NOT NULL,
        agreeableness                     NUMERIC NOT NULL,
        conscientiousness                 NUMERIC NOT NULL,
        success_classification_high_low   INTEGER NOT NULL,
        created_at                        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. Performance indices
    console.log('📦 Creating performance indices...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username       ON users(username);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_job_desc_title       ON job_descriptions(title);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_job_desc_status      ON job_descriptions(job_status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_job_desc_role_family ON job_descriptions(role_family);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_job_desc_location    ON job_descriptions(location);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_job_desc_salary      ON job_descriptions(salary);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_job_desc_min_exp     ON job_descriptions(min_exp_years);`);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_ds_jobs_company      ON datascience_jobs(company_name);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ds_jobs_title        ON datascience_jobs(job_title);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ds_jobs_avg_sal      ON datascience_jobs(avg_salary_lakhs);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ds_jobs_min_exp      ON datascience_jobs(min_experience);`);

    // 11. Seed default demo account if not exists
    console.log('🌱 Checking / Seeding default demo account (user@skillbridge.io)...');
    const demoEmail = 'user@skillbridge.io';
    const checkDemo = await client.query('SELECT id, username FROM users WHERE LOWER(email) = $1', [demoEmail]);

    let demoUserId;
    if (checkDemo.rows.length === 0) {
      const bcrypt = (await import('bcrypt')).default;
      const hashedDemoPassword = await bcrypt.hash('User@2024', 12);

      const insertDemo = await client.query(`
        INSERT INTO users (username, email, password_hash, name, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id;
      `, ['alexmercer', demoEmail, hashedDemoPassword, 'Alex Mercer', 'User']);
      demoUserId = insertDemo.rows[0].id;

      await client.query(`
        INSERT INTO user_profiles (user_id, target_role, xp, streak, skills_json)
        VALUES ($1, $2, $3, $4, $5);
      `, [
        demoUserId,
        'data-scientist',
        75,
        5,
        JSON.stringify({
          tech: ['Python', 'SQL', 'Git', 'Pandas', 'NumPy'],
          ml: ['Scikit-learn', 'Machine Learning', 'Deep Learning'],
          tool: ['Docker', 'Tableau'],
          cloud: ['AWS'],
          soft: ['Problem Solving', 'Communication', 'Storytelling'],
          all: ['Python', 'SQL', 'Git', 'Pandas', 'NumPy', 'Scikit-learn', 'Machine Learning', 'Deep Learning', 'Docker', 'Tableau', 'AWS', 'Problem Solving', 'Communication', 'Storytelling']
        })
      ]);

      await client.query(`
        INSERT INTO committed_paths (user_id, role_key, pacing_key, completed_task_ids)
        VALUES ($1, $2, $3, $4);
      `, [demoUserId, 'data-scientist', 'balanced', JSON.stringify(['task-1', 'task-2'])]);

      console.log('✅ Demo user seeded with ID:', demoUserId);
    } else {
      console.log('ℹ️  Demo user already exists with ID:', checkDemo.rows[0].id);
    }

    console.log('🎉 Database initialization complete!');
    await client.end();
    return true;
  } catch (err) {
    console.error('❌ Error initializing database:', err);
    await client.end();
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('init-db.js')) {
  initDatabase();
}
