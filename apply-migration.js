import { readFileSync } from 'fs';

const PROJECT_REF = 'gphmcbniijsoplnfifgx';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('Error: SUPABASE_ACCESS_TOKEN environment variable is required');
  console.error('Get your access token from: https://supabase.com/dashboard/account/tokens');
  console.error('Run: setx SUPABASE_ACCESS_TOKEN "your_token_here"');
  process.exit(1);
}

async function applyMigration() {
  console.log('Reading migration file...');
  const sql = readFileSync('./supabase/migrations/20251204000000_add_feedback_and_resources.sql', 'utf8');
  
  console.log('Applying migration to remote database via Management API...');
  console.log(`Project: ${PROJECT_REF}`);
  
  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('API Error:', error);
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    const result = await response.json();
    console.log('\n✓ Migration executed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (err) {
    console.error('Failed to apply migration:', err.message);
    console.error('\nAlternative: Run this SQL manually in Supabase Dashboard:');
    console.error(`https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
    process.exit(1);
  }
  
  console.log('\n✓ Migration complete! Tables created successfully.');
}

applyMigration().catch(console.error);
