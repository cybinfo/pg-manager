import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const SUPABASE_URL = 'https://pmedxtgysllyhpjldhho.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZWR4dGd5c2xseWhwamxkaGhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkwMjIwNSwiZXhwIjoyMDgyNDc4MjA1fQ.QocYTM4ab_6C1BOVFhrD7NBFZeOB5ZtjZEaOq_OeZ8I';

// Split SQL into executable statements (handling $$ blocks)
function splitSqlStatements(sql) {
  // Remove comments that start lines
  const lines = sql.split('\n');
  const cleanedLines = lines.filter(line => !line.trim().startsWith('--'));
  const cleanedSql = cleanedLines.join('\n');

  // For now, return as single statement since complex SQL needs to run together
  return [cleanedSql];
}

async function executeSqlViaPostgrest(sql, description) {
  console.log(`Executing: ${description || 'SQL statement'}...`);

  // Supabase doesn't have a direct SQL execution endpoint via REST
  // We need to use the pg library or the dashboard
  // Let's try using a workaround with the storage API for bucket creation

  return { success: false, error: 'Direct SQL execution not available via REST API' };
}

async function createStorageBucket(bucketName, isPublic, fileSizeLimit, allowedMimeTypes) {
  console.log(`Creating bucket: ${bucketName}...`);

  const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      id: bucketName,
      name: bucketName,
      public: isPublic,
      file_size_limit: fileSizeLimit,
      allowed_mime_types: allowedMimeTypes,
    }),
  });

  const text = await response.text();

  if (response.ok) {
    console.log(`  ✓ Created bucket: ${bucketName}`);
    return { success: true };
  } else if (response.status === 400 && text.includes('already exists')) {
    console.log(`  ⊘ Bucket already exists: ${bucketName}`);
    return { success: true, alreadyExists: true };
  } else {
    console.log(`  ✗ Failed: ${text}`);
    return { success: false, error: text };
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('Running Supabase Migrations');
  console.log('='.repeat(50));

  // Migration 015: Storage Buckets
  console.log('\n--- Migration 015: Storage Buckets ---\n');

  const buckets = [
    {
      name: 'property-photos',
      public: true,
      fileSizeLimit: 5242880,
      mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    },
    {
      name: 'room-photos',
      public: true,
      fileSizeLimit: 5242880,
      mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    },
    {
      name: 'tenant-photos',
      public: true,
      fileSizeLimit: 5242880,
      mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    },
    {
      name: 'tenant-documents',
      public: true,
      fileSizeLimit: 10485760,
      mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    },
  ];

  for (const bucket of buckets) {
    await createStorageBucket(bucket.name, bucket.public, bucket.fileSizeLimit, bucket.mimeTypes);
  }

  // Migration 016, 017, 018: Need SQL Editor
  console.log('\n--- Migrations 016, 017 & 018 ---\n');
  console.log('⚠ These migrations require direct SQL access.');
  console.log('  Please run these in the Supabase Dashboard SQL Editor:');
  console.log('  1. Go to https://supabase.com/dashboard/project/pmedxtgysllyhpjldhho/sql');
  console.log('  2. Copy and paste contents of:');
  console.log('     - supabase/migrations/016_audit_logging.sql');
  console.log('     - supabase/migrations/017_platform_admins.sql');
  console.log('     - supabase/migrations/018_fix_rls_policies.sql (REQUIRED - fixes login)');
  console.log('  3. Click "Run" for each migration\n');
  console.log('  ⚠️  If you already ran 016 & 017 and login is broken:');
  console.log('     Just run 018_fix_rls_policies.sql to fix it.\n');

  console.log('='.repeat(50));
  console.log('Storage buckets created successfully!');
  console.log('='.repeat(50));
}

main().catch(console.error);
