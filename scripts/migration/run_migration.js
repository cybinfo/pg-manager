/**
 * Migration Runner - Executes SQL files via Supabase
 * Usage: node run_migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
});

const OUTPUT_DIR = 'scripts/migration/output';

async function runSqlFile(filename) {
    const filepath = path.join(OUTPUT_DIR, filename);
    console.log(`\n📄 Running ${filename}...`);

    const sql = fs.readFileSync(filepath, 'utf-8');

    // Split by semicolon for multiple statements
    const statements = sql.split(/;\s*\n/).filter(s => s.trim() && !s.trim().startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (!trimmed || trimmed.startsWith('--')) continue;

        try {
            const { error } = await supabase.rpc('exec_sql', { sql: trimmed + ';' });
            if (error) {
                // Try direct insert if RPC not available
                if (error.message.includes('Could not find the function')) {
                    // Fall back to parsing and using REST API
                    throw new Error('exec_sql not available');
                }
                console.error(`  ❌ Error: ${error.message.substring(0, 100)}`);
                errorCount++;
            } else {
                successCount++;
            }
        } catch (e) {
            // For simple INSERTs, try REST API
            if (trimmed.toLowerCase().startsWith('insert into')) {
                // Parse table name
                const match = trimmed.match(/insert into\s+(\w+)/i);
                if (match) {
                    // This is complex, skip for now
                }
            }
            console.error(`  ⚠️ Statement skipped: ${trimmed.substring(0, 50)}...`);
            errorCount++;
        }
    }

    console.log(`  ✓ ${successCount} statements executed, ${errorCount} errors`);
    return { success: successCount, errors: errorCount };
}

async function main() {
    console.log('🚀 Starting Migration...\n');
    console.log(`Supabase URL: ${supabaseUrl}`);

    // Check if exec_sql RPC exists
    const { error: rpcError } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });

    if (rpcError && rpcError.message.includes('Could not find the function')) {
        console.log('\n⚠️  The exec_sql RPC function is not available.');
        console.log('Please run the SQL files manually in Supabase SQL Editor.');
        console.log('\nFiles to run in order:');
        const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.sql')).sort();
        files.forEach(f => console.log(`  - ${f}`));
        console.log('\nOr create the exec_sql function first:\n');
        console.log(`CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`);
        return;
    }

    // Run files in order
    const files = [
        '01_bill_categories.sql',
        '02_product_categories.sql',
        '03_service_categories.sql',
        '04_misc_categories.sql',
        '05_products.sql',
        '06_vendors.sql',
        '07_service_providers.sql',
        '08_daily_spend.sql',
        '09_bill_payments.sql',
        '10_service_payments.sql',
        '11_misc_transactions.sql'
    ];

    let totalSuccess = 0;
    let totalErrors = 0;

    for (const file of files) {
        const filepath = path.join(OUTPUT_DIR, file);
        if (fs.existsSync(filepath)) {
            const result = await runSqlFile(file);
            totalSuccess += result.success;
            totalErrors += result.errors;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`MIGRATION COMPLETE`);
    console.log(`Total: ${totalSuccess} statements, ${totalErrors} errors`);
    console.log('='.repeat(50));
}

main().catch(console.error);
