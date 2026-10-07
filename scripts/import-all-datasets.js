/**
 * import-all-datasets.js
 * ──────────────────────
 * Production Batch Importer for the Hackathon Datasets into Supabase PostgreSQL:
 * 1. Analytics Jobs (15,841 jobs) -> job_descriptions
 * 2. DataScience Jobs (1,602 company & salary records) -> datascience_jobs
 * 3. JDS Skill Traits (139 Junior Data Scientist skill evaluations) -> jds_skill_traits
 * 4. SDS Personality Traits (161 Senior Data Scientist Big 5 traits) -> sds_personality_traits
 *
 * Replaces and cleans out old backend datasets completely.
 */

import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { Client } = pg;

// ─────────────────────────────────────────────
// 1. Skill Aliases and Categories
// ─────────────────────────────────────────────
const SKILL_ALIASES = {
  'js': 'JavaScript',
  'javascript': 'JavaScript',
  'python': 'Python',
  'py': 'Python',
  'r': 'R',
  'sql': 'SQL',
  'plsql': 'PL/SQL',
  'pl/sql': 'PL/SQL',
  'oracle sql': 'Oracle SQL',
  'mysql': 'MySQL',
  'postgresql': 'PostgreSQL',
  'postgres': 'PostgreSQL',
  'nosql': 'NoSQL',
  'mongodb': 'MongoDB',
  'ml': 'Machine Learning',
  'machine learning': 'Machine Learning',
  'dl': 'Deep Learning',
  'deep learning': 'Deep Learning',
  'ai': 'Artificial Intelligence',
  'nlp': 'NLP',
  'natural language processing': 'NLP',
  'computer vision': 'Computer Vision',
  'cv': 'Computer Vision',
  'tensorflow': 'TensorFlow',
  'tf': 'TensorFlow',
  'pytorch': 'PyTorch',
  'scikit-learn': 'Scikit-learn',
  'sklearn': 'Scikit-learn',
  'pandas': 'Pandas',
  'numpy': 'NumPy',
  'spark': 'Apache Spark',
  'apache spark': 'Apache Spark',
  'hadoop': 'Hadoop',
  'hive': 'Apache Hive',
  'kafka': 'Apache Kafka',
  'power bi': 'Power BI',
  'powerbi': 'Power BI',
  'tableau': 'Tableau',
  'excel': 'Excel',
  'advanced excel': 'Excel',
  'ms excel': 'Excel',
  'aws': 'AWS',
  'azure': 'Azure',
  'gcp': 'GCP',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'git': 'Git',
  'data analysis': 'Data Analysis',
  'data analytics': 'Data Analytics',
  'data mining': 'Data Mining',
  'data modeling': 'Data Modeling',
  'data warehousing': 'Data Warehousing',
  'business analysis': 'Business Analysis',
  'business intelligence': 'Business Intelligence',
  'bi': 'Business Intelligence',
  'statistics': 'Statistics',
  'statistical analysis': 'Statistical Analysis',
  'predictive modeling': 'Predictive Modeling',
  'sas': 'SAS',
  'spss': 'SPSS',
  'etl': 'ETL',
  'storytelling': 'Data Storytelling',
  'communication': 'Communication',
  'problem solving': 'Problem Solving',
};

function normaliseSkill(raw) {
  if (!raw) return null;
  const clean = raw.trim().replace(/^[-•*>\s]+/, '').replace(/[-•*>\s]+$/, '');
  if (!clean || clean.length < 2) return null;
  const lower = clean.toLowerCase();
  return SKILL_ALIASES[lower] || clean;
}

function getSkillCategory(skill) {
  const lower = skill.toLowerCase();
  if (['machine learning', 'deep learning', 'nlp', 'computer vision', 'tensorflow', 'pytorch', 'scikit-learn', 'ai', 'artificial intelligence', 'predictive modeling'].some(k => lower.includes(k))) {
    return 'ml';
  }
  if (['spark', 'hadoop', 'hive', 'kafka', 'etl', 'data warehousing', 'data modeling', 'data mining', 'big data', 'snowflake', 'databricks'].some(k => lower.includes(k))) {
    return 'data';
  }
  if (['aws', 'azure', 'gcp', 'cloud', 'docker', 'kubernetes'].some(k => lower.includes(k))) {
    return 'cloud';
  }
  if (['tableau', 'power bi', 'excel', 'git', 'sas', 'spss', 'alteryx', 'jira'].some(k => lower.includes(k))) {
    return 'tool';
  }
  if (['communication', 'leadership', 'problem solving', 'team', 'storytelling', 'presentation', 'management'].some(k => lower.includes(k))) {
    return 'soft';
  }
  return 'tech';
}

function getSkillWeight(category, skill) {
  const s = skill.toLowerCase();
  if (s.includes('python') || s.includes('sql') || s.includes('machine learning') || s.includes('statistics')) return 10;
  if (category === 'ml') return 9;
  if (category === 'data') return 8;
  if (category === 'tech') return 8;
  if (category === 'cloud') return 7;
  if (category === 'tool') return 6;
  return 5;
}

function parseSkillsField(skillsStr) {
  if (!skillsStr || !skillsStr.trim()) return [];
  const rawParts = skillsStr.split(/[,|;]+/);
  const seen = new Set();
  const list = [];
  for (const part of rawParts) {
    const norm = normaliseSkill(part);
    if (norm && !seen.has(norm.toLowerCase())) {
      seen.add(norm.toLowerCase());
      const category = getSkillCategory(norm);
      list.push({
        skill: norm,
        weight: getSkillWeight(category, norm),
        category,
      });
    }
  }
  return list;
}

// ─────────────────────────────────────────────
// 2. Role Classifier
// ─────────────────────────────────────────────
function classifyRole(title, desc) {
  const text = `${title} ${desc || ''}`.toLowerCase();
  if (text.includes('data scientist') || text.includes('machine learning') || text.includes('deep learning') || text.includes('ai engineer') || text.includes('nlp')) {
    return { family: 'data-science', department: 'Data Science & AI' };
  }
  if (text.includes('data engineer') || text.includes('etl') || text.includes('big data') || text.includes('hadoop') || text.includes('spark') || text.includes('database administrator') || text.includes('dba') || text.includes('oracle')) {
    return { family: 'data-engineering', department: 'Data Engineering' };
  }
  if (text.includes('business analyst') || text.includes('data analyst') || text.includes('portfolio analytics') || text.includes('bi analyst') || text.includes('reporting analyst') || text.includes('analytics')) {
    return { family: 'analytics', department: 'Analytics & BI' };
  }
  if (text.includes('software engineer') || text.includes('developer') || text.includes('full stack') || text.includes('frontend') || text.includes('backend') || text.includes('java') || text.includes('web development')) {
    return { family: 'software-dev', department: 'Engineering' };
  }
  if (text.includes('devops') || text.includes('cloud') || text.includes('sre') || text.includes('infrastructure')) {
    return { family: 'cloud-devops', department: 'Cloud & Infrastructure' };
  }
  if (text.includes('product manager') || text.includes('project manager') || text.includes('scrum master')) {
    return { family: 'product-mgmt', department: 'Product & Delivery' };
  }
  if (text.includes('seo') || text.includes('marketing') || text.includes('digital marketing')) {
    return { family: 'marketing-seo', department: 'Growth & Marketing' };
  }
  if (text.includes('finance') || text.includes('accounts') || text.includes('payroll') || text.includes('operations')) {
    return { family: 'finance-ops', department: 'Operations & Finance' };
  }
  return { family: 'analytics', department: 'Analytics' };
}

// ─────────────────────────────────────────────
// 3. Numeric Parsers for Experience & Salary
// ─────────────────────────────────────────────
function parseExperienceRange(expStr) {
  if (!expStr) return { min: 0, max: 0 };
  const matchRange = expStr.match(/(\d+)\s*[-to]+\s*(\d+)/i);
  if (matchRange) {
    return { min: parseInt(matchRange[1], 10), max: parseInt(matchRange[2], 10) };
  }
  const matchPlus = expStr.match(/(\d+)\s*\+/);
  if (matchPlus) {
    const val = parseInt(matchPlus[1], 10);
    return { min: val, max: val + 5 };
  }
  const matchSingle = expStr.match(/(\d+)/);
  if (matchSingle) {
    const val = parseInt(matchSingle[1], 10);
    return { min: val, max: val };
  }
  return { min: 0, max: 0 };
}

function parseSalaryBrackets(salStr) {
  if (!salStr) return { min: 0, max: 0 };
  const match = salStr.match(/(\d+)\s*(?:to|-)\s*(\d+)/i);
  if (match) {
    return { min: parseFloat(match[1]), max: parseFloat(match[2]) };
  }
  return { min: 0, max: 0 };
}

function parseSalaryLakhs(salStr) {
  if (!salStr) return 0;
  const match = salStr.toString().replace(/,/g, '').match(/([0-9.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

// ─────────────────────────────────────────────
// 4. Fast RFC-4180 CSV Parser
// ─────────────────────────────────────────────
function parseCSVFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  const rows = [];
  let row = [];
  let inQuotes = false;
  let cell = '';

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"' && content[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\n' || (ch === '\r' && content[i + 1] === '\n')) {
        if (ch === '\r') i++;
        row.push(cell);
        cell = '';
        if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
          rows.push(row);
        }
        row = [];
      } else {
        cell += ch;
      }
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

// ─────────────────────────────────────────────
// 5. Main Import Function
// ─────────────────────────────────────────────
export async function importAllDatasets() {
  console.log('🚀 Starting Full Hackathon Dataset Import to Supabase PostgreSQL...\n');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set!');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('✅ Connected to PostgreSQL database.\n');

  const dataDir = path.resolve(__dirname, '..', 'data');
  const hackDir = path.resolve(__dirname, '..', '..', 'SAS Data Problem Statement and Instructions Hackathon');

  function resolveCsv(filename, altFilename) {
    const p1 = path.join(dataDir, filename);
    if (fs.existsSync(p1)) return p1;
    const p2 = path.join(hackDir, altFilename || filename);
    if (fs.existsSync(p2)) return p2;
    throw new Error(`CSV not found: ${filename} (checked ${p1} and ${p2})`);
  }

  const BATCH_SIZE = 500;

  // ─────────────────────────────────────────
  // PART 1: Analytics Jobs (15,841 records)
  // ─────────────────────────────────────────
  console.log('═════════════════════════════════════════════════════════════');
  console.log('1. Importing Analytics Jobs into job_descriptions table...');
  const analyticsCsv = resolveCsv('Analytics_Jobs.csv', 'Analytics Jobs.csv');
  const analyticsRows = parseCSVFile(analyticsCsv);
  console.log(`   Read ${analyticsRows.length - 1} rows from ${analyticsCsv}`);

  const ajHeader = analyticsRows[0].map(h => h.trim().toLowerCase());
  const sNoIdx = ajHeader.indexOf('s_no');
  const expIdx = ajHeader.indexOf('experience');
  const descIdx = ajHeader.indexOf('job_description');
  const desigIdx = ajHeader.indexOf('job_desig');
  const typeIdx = ajHeader.indexOf('job_type');
  const skillsIdx = ajHeader.indexOf('key_skills');
  const locIdx = ajHeader.indexOf('location');
  const salIdx = ajHeader.indexOf('salary');

  await client.query('TRUNCATE TABLE job_descriptions RESTART IDENTITY CASCADE;');

  let ajInserted = 0;

  for (let i = 1; i < analyticsRows.length; i += BATCH_SIZE) {
    const chunk = analyticsRows.slice(i, i + BATCH_SIZE);
    const valuePlaceholders = [];
    const values = [];

    chunk.forEach((row, rowIdx) => {
      const sNo = parseInt(row[sNoIdx], 10) || (i + rowIdx);
      const title = (row[desigIdx] || 'Analytics Professional').trim();
      const experience = (row[expIdx] || '').trim();
      const { min: minExp, max: maxExp } = parseExperienceRange(experience);
      const salary = (row[salIdx] || '').trim();
      const { min: minSal, max: maxSal } = parseSalaryBrackets(salary);
      const jobType = (row[typeIdx] || 'Full Time').trim() || 'Full Time';
      const location = (row[locIdx] || 'India').trim();
      const description = (row[descIdx] || '').trim();
      const rawSkills = (row[skillsIdx] || '').trim();
      const requiredSkills = parseSkillsField(rawSkills);
      const { family: roleFamily, department } = classifyRole(title, description);
      const jobId = `AJ-${sNo}`;
      const company = 'Analytics Enterprise';

      const paramOffset = values.length;
      valuePlaceholders.push(
        `($${paramOffset + 1}, $${paramOffset + 2}, $${paramOffset + 3}, $${paramOffset + 4}, $${paramOffset + 5}, $${paramOffset + 6}, $${paramOffset + 7}, $${paramOffset + 8}, $${paramOffset + 9}, $${paramOffset + 10}, $${paramOffset + 11}, $${paramOffset + 12}, $${paramOffset + 13}, $${paramOffset + 14}, $${paramOffset + 15}, $${paramOffset + 16}::jsonb, $${paramOffset + 17}, $${paramOffset + 18}, $${paramOffset + 19})`
      );

      values.push(
        sNo,
        jobId,
        title,
        company,
        location,
        experience,
        minExp,
        maxExp,
        salary,
        minSal,
        maxSal,
        jobType,
        department,
        description,
        rawSkills,
        JSON.stringify(requiredSkills),
        'Open',
        roleFamily,
        'given'
      );
    });

    const queryText = `
      INSERT INTO job_descriptions (
        s_no, job_id, title, company, location, experience, min_exp_years, max_exp_years,
        salary, salary_min_lakhs, salary_max_lakhs, job_type, department, description,
        key_skills_raw, required_skills, job_status, role_family, skills_source
      ) VALUES ${valuePlaceholders.join(', ')}
      ON CONFLICT (job_id) DO UPDATE SET
        title = EXCLUDED.title,
        required_skills = EXCLUDED.required_skills,
        salary = EXCLUDED.salary,
        role_family = EXCLUDED.role_family;
    `;

    await client.query(queryText, values);
    ajInserted += chunk.length;
    process.stdout.write(`\r   Progress: ${ajInserted} / ${analyticsRows.length - 1} records inserted`);
  }
  console.log(`\n✅ Analytics Jobs imported: ${ajInserted} records.\n`);

  // ─────────────────────────────────────────
  // PART 2: DataScience Jobs (1,602 records)
  // ─────────────────────────────────────────
  console.log('═════════════════════════════════════════════════════════════');
  console.log('2. Importing DataScience Jobs into datascience_jobs table...');
  const dsCsv = resolveCsv('DataScience_Jobs.csv', 'DataScience Jobs.csv');
  const dsRows = parseCSVFile(dsCsv);
  console.log(`   Read ${dsRows.length - 1} rows from ${dsCsv}`);

  const dsHeader = dsRows[0].map(h => h.trim().toLowerCase());
  const refIdx = dsHeader.indexOf('reference_no');
  const compIdx = dsHeader.indexOf('company_name');
  const jtitleIdx = dsHeader.indexOf('job_title');
  const minexpIdx = dsHeader.indexOf('min_experience');
  const avgsalIdx = dsHeader.indexOf('avg_salary');
  const minsalIdx = dsHeader.indexOf('min_salary');
  const maxsalIdx = dsHeader.indexOf('max_salary');
  const numjobsIdx = dsHeader.indexOf('num_of_jobs');

  await client.query('TRUNCATE TABLE datascience_jobs RESTART IDENTITY CASCADE;');

  let dsInserted = 0;
  for (let i = 1; i < dsRows.length; i += BATCH_SIZE) {
    const chunk = dsRows.slice(i, i + BATCH_SIZE);
    const valuePlaceholders = [];
    const values = [];

    chunk.forEach((row, rowIdx) => {
      const refNo = parseInt(row[refIdx], 10) || (i + rowIdx);
      const company = (row[compIdx] || '').trim();
      const title = (row[jtitleIdx] || '').trim();
      const minExp = parseFloat(row[minexpIdx]) || 0;
      const avgSal = (row[avgsalIdx] || '').trim();
      const minSal = (row[minsalIdx] || '').trim();
      const maxSal = (row[maxsalIdx] || '').trim();
      const avgSalLakhs = parseSalaryLakhs(avgSal);
      const minSalLakhs = parseSalaryLakhs(minSal);
      const maxSalLakhs = parseSalaryLakhs(maxSal);
      const numJobs = parseInt(row[numjobsIdx], 10) || 1;

      const offset = values.length;
      valuePlaceholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`
      );

      values.push(
        refNo,
        company,
        title,
        minExp,
        avgSal,
        minSal,
        maxSal,
        avgSalLakhs,
        minSalLakhs,
        maxSalLakhs,
        numJobs
      );
    });

    const queryText = `
      INSERT INTO datascience_jobs (
        reference_no, company_name, job_title, min_experience,
        avg_salary, min_salary, max_salary, avg_salary_lakhs, min_salary_lakhs, max_salary_lakhs, num_of_jobs
      ) VALUES ${valuePlaceholders.join(', ')};
    `;

    await client.query(queryText, values);
    dsInserted += chunk.length;
    process.stdout.write(`\r   Progress: ${dsInserted} / ${dsRows.length - 1} records inserted`);
  }
  console.log(`\n✅ DataScience Jobs imported: ${dsInserted} records.\n`);

  // ─────────────────────────────────────────
  // PART 3: JDS Skill Traits (139 records)
  // ─────────────────────────────────────────
  console.log('═════════════════════════════════════════════════════════════');
  console.log('3. Importing JDS Skill Traits into jds_skill_traits table...');
  const jdsCsv = resolveCsv('JDS_Skill_Traits.csv', 'JDS Skill Traits.csv');
  const jdsRows = parseCSVFile(jdsCsv);
  console.log(`   Read ${jdsRows.length - 1} rows from ${jdsCsv}`);

  await client.query('TRUNCATE TABLE jds_skill_traits RESTART IDENTITY CASCADE;');

  let jdsInserted = 0;
  for (let i = 1; i < jdsRows.length; i += BATCH_SIZE) {
    const chunk = jdsRows.slice(i, i + BATCH_SIZE);
    const valuePlaceholders = [];
    const values = [];

    chunk.forEach((row, rowIdx) => {
      const candidateId = parseInt(row[0], 10) || (i + rowIdx);
      const bigData = parseFloat(row[1]) || 0;
      const mathsStats = parseFloat(row[2]) || 0;
      const coding = parseFloat(row[3]) || 0;
      const aiMl = parseFloat(row[4]) || 0;
      const dashboard = parseFloat(row[5]) || 0;
      const hike = parseInt(row[6], 10) || 0;

      const offset = values.length;
      valuePlaceholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
      );

      values.push(candidateId, bigData, mathsStats, coding, aiMl, dashboard, hike);
    });

    const queryText = `
      INSERT INTO jds_skill_traits (
        candidate_id, big_data_skills, maths_stats_skills, coding_skills,
        ai_and_ml_skills, dashboard_and_storytelling_skills, salary_hike_high_or_low
      ) VALUES ${valuePlaceholders.join(', ')};
    `;

    await client.query(queryText, values);
    jdsInserted += chunk.length;
  }
  console.log(`✅ JDS Skill Traits imported: ${jdsInserted} records.\n`);

  // ─────────────────────────────────────────
  // PART 4: SDS Personality Traits (161 records)
  // ─────────────────────────────────────────
  console.log('═════════════════════════════════════════════════════════════');
  console.log('4. Importing SDS Personality Traits into sds_personality_traits table...');
  const sdsCsv = resolveCsv('SDS_Personality_Traits.csv', 'SDS Personality Traits.csv');
  const sdsRows = parseCSVFile(sdsCsv);
  console.log(`   Read ${sdsRows.length - 1} rows from ${sdsCsv}`);

  await client.query('TRUNCATE TABLE sds_personality_traits RESTART IDENTITY CASCADE;');

  let sdsInserted = 0;
  for (let i = 1; i < sdsRows.length; i += BATCH_SIZE) {
    const chunk = sdsRows.slice(i, i + BATCH_SIZE);
    const valuePlaceholders = [];
    const values = [];

    chunk.forEach((row, rowIdx) => {
      const candidateId = parseInt(row[0], 10) || (i + rowIdx);
      const neuroticism = parseFloat(row[1]) || 0;
      const extraversion = parseFloat(row[2]) || 0;
      const openness = parseFloat(row[3]) || 0;
      const agreeableness = parseFloat(row[4]) || 0;
      const conscientiousness = parseFloat(row[5]) || 0;
      const success = parseInt(row[6], 10) || 0;

      const offset = values.length;
      valuePlaceholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
      );

      values.push(candidateId, neuroticism, extraversion, openness, agreeableness, conscientiousness, success);
    });

    const queryText = `
      INSERT INTO sds_personality_traits (
        candidate_id, neuroticism, extraversion, openness_to_experience,
        agreeableness, conscientiousness, success_classification_high_low
      ) VALUES ${valuePlaceholders.join(', ')};
    `;

    await client.query(queryText, values);
    sdsInserted += chunk.length;
  }
  console.log(`✅ SDS Personality Traits imported: ${sdsInserted} records.\n`);

  // Final summary check
  const [c1, c2, c3, c4] = await Promise.all([
    client.query('SELECT count(*) FROM job_descriptions'),
    client.query('SELECT count(*) FROM datascience_jobs'),
    client.query('SELECT count(*) FROM jds_skill_traits'),
    client.query('SELECT count(*) FROM sds_personality_traits'),
  ]);

  console.log('═════════════════════════════════════════════════════════════');
  console.log('🎉 FULL DATASET IMPORT SUMMARY:');
  console.log(`   job_descriptions       : ${c1.rows[0].count} records`);
  console.log(`   datascience_jobs       : ${c2.rows[0].count} records`);
  console.log(`   jds_skill_traits       : ${c3.rows[0].count} records`);
  console.log(`   sds_personality_traits : ${c4.rows[0].count} records`);
  console.log('═════════════════════════════════════════════════════════════\n');

  await client.end();
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('import-all-datasets.js')) {
  importAllDatasets().catch(err => {
    console.error('❌ Import failed:', err);
    process.exit(1);
  });
}
