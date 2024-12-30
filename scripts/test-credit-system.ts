import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function runCreditSystemTests() {
  console.log('Starting Credit System Tests...\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const testCases = [
    'cleanup_test_data',
    'test_free_tier_allocation',
    'test_free_tier',
    'test_free_tier_expiration',
    'test_paid_tier_rollover',
    'test_paid_tier_downgrade',
    'test_insufficient_credits',
    'test_concurrent_usage',
    'cleanup_test_data'
  ];

  try {
    for (const testCase of testCases) {
      console.log(`Running ${testCase}...`);
      await supabase.rpc('run_credit_system_test', {
        test_name: testCase
      });
      console.log(`${testCase} completed\n`);
    }

    console.log('\nAll Credit System Tests completed successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

runCreditSystemTests();
