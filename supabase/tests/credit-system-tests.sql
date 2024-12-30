-- Credit System Test Suite

-- Clean up previous test data
DELETE FROM subscription_audit_log WHERE subscription_id IN (
    SELECT id FROM subscription WHERE user_id LIKE 'test_%'
);
DELETE FROM subscription WHERE user_id LIKE 'test_%';

-- Test 1: Free Tier Credit Management
DO $$ 
DECLARE
    test_sub_id UUID;
    credits_after INTEGER;
    reset_count INTEGER;
BEGIN
    RAISE NOTICE 'Test 1: Free Tier Credit Management';
    
    -- Setup: Create expired free subscription
    INSERT INTO subscription (
        id,
        user_id,
        plan_id,
        credits_remaining,
        credits_limit,
        credits_reset_count,
        end_date
    ) VALUES (
        gen_random_uuid(),
        'test_free_user',
        'free',
        2, -- Almost depleted
        10,
        0,
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    ) RETURNING id INTO test_sub_id;

    -- Act: Run refresh
    PERFORM handle_free_subscription_refresh();

    -- Assert
    SELECT credits_remaining, credits_reset_count 
    INTO credits_after, reset_count
    FROM subscription 
    WHERE id = test_sub_id;

    IF credits_after = 10 THEN
        RAISE NOTICE 'PASS: Free tier credits reset to 10';
    ELSE
        RAISE EXCEPTION 'FAIL: Free tier credits not reset correctly. Expected 10, got %', credits_after;
    END IF;

    IF reset_count = 1 THEN
        RAISE NOTICE 'PASS: Reset count incremented';
    ELSE
        RAISE EXCEPTION 'FAIL: Reset count not incremented. Expected 1, got %', reset_count;
    END IF;
END $$;

-- Test 2: Paid Tier Credit Rollover
DO $$
DECLARE
    test_sub_id UUID;
    final_credits INTEGER;
BEGIN
    RAISE NOTICE 'Test 2: Paid Tier Credit Rollover';
    
    -- Setup: Create paid subscription with existing credits
    INSERT INTO subscription (
        id,
        user_id,
        plan_id,
        credits_remaining,
        credits_limit,
        credits_reset_count,
        end_date
    ) VALUES (
        gen_random_uuid(),
        'test_paid_user',
        'standard',
        800,  -- Existing credits
        3000, -- Maximum limit
        1,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO test_sub_id;

    -- Act: Simulate credit rollover (1000 new credits)
    UPDATE subscription 
    SET credits_remaining = LEAST(credits_remaining + 1000, credits_limit)
    WHERE id = test_sub_id;

    -- Assert
    SELECT credits_remaining INTO final_credits
    FROM subscription 
    WHERE id = test_sub_id;

    IF final_credits = 1800 THEN
        RAISE NOTICE 'PASS: Credits rolled over correctly to 1800';
    ELSE
        RAISE EXCEPTION 'FAIL: Credit rollover incorrect. Expected 1800, got %', final_credits;
    END IF;
END $$;

-- Test 3: Credit Usage
DO $$
DECLARE
    test_sub_id UUID;
    remaining_credits INTEGER;
BEGIN
    RAISE NOTICE 'Test 3: Credit Usage';
    
    -- Setup
    INSERT INTO subscription (
        id,
        user_id,
        plan_id,
        credits_remaining,
        credits_limit,
        end_date
    ) VALUES (
        gen_random_uuid(),
        'test_usage_user',
        'standard',
        100,
        1000,
        CURRENT_TIMESTAMP + INTERVAL '1 month'
    ) RETURNING id INTO test_sub_id;

    -- Act: Use 25 credits
    UPDATE subscription 
    SET credits_remaining = credits_remaining - 25
    WHERE id = test_sub_id
    AND credits_remaining >= 25;

    -- Assert
    SELECT credits_remaining INTO remaining_credits
    FROM subscription 
    WHERE id = test_sub_id;

    IF remaining_credits = 75 THEN
        RAISE NOTICE 'PASS: Credits deducted correctly';
    ELSE
        RAISE EXCEPTION 'FAIL: Credit usage incorrect. Expected 75, got %', remaining_credits;
    END IF;
END $$;

-- Test 4: Plan Upgrade
DO $$
DECLARE
    test_sub_id UUID;
    new_credits INTEGER;
    new_limit INTEGER;
BEGIN
    RAISE NOTICE 'Test 4: Plan Upgrade';
    
    -- Setup: Start with standard plan
    INSERT INTO subscription (
        id,
        user_id,
        plan_id,
        credits_remaining,
        credits_limit,
        end_date
    ) VALUES (
        gen_random_uuid(),
        'test_upgrade_user',
        'standard',
        900,
        3000,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO test_sub_id;

    -- Act: Upgrade to premium
    UPDATE subscription 
    SET 
        plan_id = 'premium',
        credits_limit = 5000,
        credits_remaining = LEAST(credits_remaining + 2000, 5000)
    WHERE id = test_sub_id;

    -- Assert
    SELECT credits_remaining, credits_limit 
    INTO new_credits, new_limit
    FROM subscription 
    WHERE id = test_sub_id;

    IF new_credits = 2900 THEN
        RAISE NOTICE 'PASS: Credits updated correctly after upgrade';
    ELSE
        RAISE EXCEPTION 'FAIL: Upgrade credits incorrect. Expected 2900, got %', new_credits;
    END IF;

    IF new_limit = 5000 THEN
        RAISE NOTICE 'PASS: Credit limit updated correctly';
    ELSE
        RAISE EXCEPTION 'FAIL: Credit limit incorrect. Expected 5000, got %', new_limit;
    END IF;
END $$;

-- Cleanup test data
DELETE FROM subscription_audit_log WHERE subscription_id IN (
    SELECT id FROM subscription WHERE user_id LIKE 'test_%'
);
DELETE FROM subscription WHERE user_id LIKE 'test_%';
RAISE NOTICE 'Test cleanup completed';
