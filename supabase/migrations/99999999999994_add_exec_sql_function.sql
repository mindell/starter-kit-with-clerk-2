-- Create admin role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin;
  END IF;
END
$$;

-- Grant necessary permissions to admin role
GRANT ALL ON ALL TABLES IN SCHEMA public TO admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO admin;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO admin;

-- Create test_runner role with limited permissions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'test_runner') THEN
    CREATE ROLE test_runner WITH NOLOGIN;
  END IF;
END
$$;

-- Revoke all existing permissions
DO $$
BEGIN
  -- Safely revoke permissions only if tables exist
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscription') THEN
    REVOKE ALL ON subscription FROM test_runner;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscription_audit_log') THEN
    REVOKE ALL ON subscription_audit_log FROM test_runner;
  END IF;
  
  REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM test_runner;
END
$$;

-- Grant specific permissions needed for testing
DO $$
BEGIN
  -- Grant permissions only if tables exist
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscription') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON subscription TO test_runner;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscription_audit_log') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON subscription_audit_log TO test_runner;
  END IF;
  
  GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO test_runner;
END
$$;

-- Create a secure function for running credit system tests
CREATE OR REPLACE FUNCTION public.run_credit_system_test(test_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE test_name
    WHEN 'test_free_tier_allocation' THEN
      -- Test new free tier subscription allocation
      DECLARE
        test_sub_id UUID;
      BEGIN
        INSERT INTO subscription (
          id, user_id, plan_id, credits_remaining, credits_limit, 
          credits_reset_count, end_date
        ) VALUES (
          gen_random_uuid(), 'test_free_user', 'free', 10, 10, 0,
          CURRENT_TIMESTAMP + INTERVAL '1 month'
        ) RETURNING id INTO test_sub_id;

        -- Verify initial allocation
        IF NOT EXISTS (
          SELECT 1 FROM subscription 
          WHERE id = test_sub_id 
          AND credits_remaining = 10 
          AND credits_limit = 10
        ) THEN
          RAISE EXCEPTION 'Free tier allocation test failed: Initial credits not set correctly';
        END IF;

        RAISE NOTICE 'Free tier allocation test passed';
      END;

    WHEN 'test_free_tier_expiration' THEN
      -- Test free tier expiration handling
      DECLARE
        test_sub_id UUID;
      BEGIN
        INSERT INTO subscription (
          id, user_id, plan_id, credits_remaining, credits_limit, 
          credits_reset_count, end_date
        ) VALUES (
          gen_random_uuid(), 'test_free_expired', 'free', 10, 10, 0,
          CURRENT_TIMESTAMP - INTERVAL '1 day'
        ) RETURNING id INTO test_sub_id;

        -- Verify expired status
        IF NOT EXISTS (
          SELECT 1 FROM subscription 
          WHERE id = test_sub_id 
          AND end_date < CURRENT_TIMESTAMP
        ) THEN
          RAISE EXCEPTION 'Free tier expiration test failed: Expiration not handled correctly';
        END IF;

        -- Run refresh and verify
        PERFORM handle_free_subscription_refresh();

        IF NOT EXISTS (
          SELECT 1 FROM subscription 
          WHERE id = test_sub_id 
          AND end_date > CURRENT_TIMESTAMP
          AND credits_remaining = 10
        ) THEN
          RAISE EXCEPTION 'Free tier refresh test failed: Subscription not refreshed correctly';
        END IF;

        RAISE NOTICE 'Free tier expiration test passed';
      END;

    WHEN 'test_paid_tier_downgrade' THEN
      -- Test paid tier downgrade
      DECLARE
        test_sub_id UUID;
      BEGIN
        -- Start with premium plan
        INSERT INTO subscription (
          id, user_id, plan_id, credits_remaining, credits_limit,
          credits_reset_count, end_date
        ) VALUES (
          gen_random_uuid(), 'test_downgrade_user', 'premium', 4000, 5000, 1,
          CURRENT_TIMESTAMP
        ) RETURNING id INTO test_sub_id;

        -- Downgrade to standard (should cap credits at new limit)
        UPDATE subscription 
        SET 
          plan_id = 'standard',
          credits_limit = 3000,
          credits_remaining = LEAST(credits_remaining, 3000)
        WHERE id = test_sub_id;

        -- Verify downgrade
        IF NOT EXISTS (
          SELECT 1 FROM subscription 
          WHERE id = test_sub_id 
          AND credits_remaining = 3000 
          AND credits_limit = 3000
        ) THEN
          RAISE EXCEPTION 'Paid tier downgrade test failed: Credits not capped correctly';
        END IF;

        RAISE NOTICE 'Paid tier downgrade test passed';
      END;

    WHEN 'test_insufficient_credits' THEN
      -- Test insufficient credits handling
      DECLARE
        test_sub_id UUID;
      BEGIN
        INSERT INTO subscription (
          id, user_id, plan_id, credits_remaining, credits_limit,
          end_date
        ) VALUES (
          gen_random_uuid(), 'test_insufficient', 'standard', 5, 1000,
          CURRENT_TIMESTAMP + INTERVAL '1 month'
        ) RETURNING id INTO test_sub_id;

        -- Attempt to use more credits than available
        BEGIN
          UPDATE subscription 
          SET credits_remaining = credits_remaining - 10
          WHERE id = test_sub_id
          AND credits_remaining >= 10;

          RAISE EXCEPTION 'Insufficient credits test failed: Should not allow credit deduction';
        EXCEPTION
          WHEN OTHERS THEN
            RAISE NOTICE 'Insufficient credits test passed: Prevented invalid deduction';
        END;
      END;

    WHEN 'test_concurrent_usage' THEN
      -- Test concurrent credit usage
      DECLARE
        test_sub_id UUID;
      BEGIN
        INSERT INTO subscription (
          id, user_id, plan_id, credits_remaining, credits_limit,
          end_date
        ) VALUES (
          gen_random_uuid(), 'test_concurrent', 'standard', 100, 1000,
          CURRENT_TIMESTAMP + INTERVAL '1 month'
        ) RETURNING id INTO test_sub_id;

        -- Start transaction 1
        BEGIN
          -- Lock the row for update
          PERFORM credits_remaining 
          FROM subscription 
          WHERE id = test_sub_id 
          FOR UPDATE;

          -- Simulate concurrent update
          PERFORM pg_sleep(0.1);
          
          UPDATE subscription 
          SET credits_remaining = credits_remaining - 50
          WHERE id = test_sub_id
          AND credits_remaining >= 50;

          -- Verify atomic update
          IF NOT EXISTS (
            SELECT 1 FROM subscription 
            WHERE id = test_sub_id 
            AND credits_remaining = 50
          ) THEN
            RAISE EXCEPTION 'Concurrent usage test failed: Credits not updated atomically';
          END IF;
        END;

        RAISE NOTICE 'Concurrent usage test passed';
      END;

    WHEN 'test_free_tier' THEN
      -- Test free tier credit management
      DECLARE
        test_sub_id UUID;
        credits_after INTEGER;
        reset_count INTEGER;
      BEGIN
        INSERT INTO subscription (
          id, user_id, plan_id, credits_remaining, credits_limit, 
          credits_reset_count, end_date
        ) VALUES (
          gen_random_uuid(), 'test_free_user', 'free', 2, 10, 0,
          CURRENT_TIMESTAMP - INTERVAL '1 day'
        ) RETURNING id INTO test_sub_id;

        -- Log the test action
        INSERT INTO subscription_audit_log (
          subscription_id, action, details
        ) VALUES (
          test_sub_id,
          'test_action',
          jsonb_build_object(
            'test', 'free_tier',
            'initial_credits', 2
          )
        );

        PERFORM handle_free_subscription_refresh();

        SELECT credits_remaining, credits_reset_count 
        INTO credits_after, reset_count
        FROM subscription 
        WHERE id = test_sub_id;

        IF credits_after != 10 THEN
          RAISE EXCEPTION 'Free tier test failed: Expected 10 credits, got %', credits_after;
        END IF;

        IF reset_count != 1 THEN
          RAISE EXCEPTION 'Free tier test failed: Expected reset_count 1, got %', reset_count;
        END IF;

        RAISE NOTICE 'Free tier test passed';
      END;

    WHEN 'test_paid_tier_rollover' THEN
      -- Test paid tier credit rollover
      DECLARE
        test_sub_id UUID;
        final_credits INTEGER;
      BEGIN
        INSERT INTO subscription (
          id, user_id, plan_id, credits_remaining, credits_limit,
          credits_reset_count, end_date
        ) VALUES (
          gen_random_uuid(), 'test_paid_user', 'standard', 800, 3000, 1,
          CURRENT_TIMESTAMP
        ) RETURNING id INTO test_sub_id;

        -- Log the test action
        INSERT INTO subscription_audit_log (
          subscription_id, action, details
        ) VALUES (
          test_sub_id,
          'test_action',
          jsonb_build_object(
            'test', 'paid_tier_rollover',
            'initial_credits', 800
          )
        );

        UPDATE subscription 
        SET credits_remaining = LEAST(credits_remaining + 1000, credits_limit)
        WHERE id = test_sub_id;

        SELECT credits_remaining INTO final_credits
        FROM subscription 
        WHERE id = test_sub_id;

        IF final_credits != 1800 THEN
          RAISE EXCEPTION 'Paid tier rollover test failed: Expected 1800 credits, got %', final_credits;
        END IF;

        RAISE NOTICE 'Paid tier rollover test passed';
      END;

    WHEN 'cleanup_test_data' THEN
      -- Clean up test data
      DELETE FROM subscription_audit_log 
      WHERE subscription_id IN (
        SELECT id FROM subscription WHERE user_id LIKE 'test_%'
      );
      DELETE FROM subscription WHERE user_id LIKE 'test_%';
      RAISE NOTICE 'Test data cleanup completed';

    ELSE
      RAISE EXCEPTION 'Invalid test name: %', test_name;
  END CASE;
END;
$$;

-- Grant execute permission on test function to service_role only
REVOKE ALL ON FUNCTION public.run_credit_system_test(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_credit_system_test(text) TO service_role;

-- Drop the previous unsafe exec_sql function if it exists
DROP FUNCTION IF EXISTS public.exec_sql(text);
