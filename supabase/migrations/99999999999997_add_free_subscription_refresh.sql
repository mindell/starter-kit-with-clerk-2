-- Create the cron job role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cron_job_role') THEN
    CREATE ROLE cron_job_role WITH NOLOGIN;
  END IF;
END
$$;

-- Create function to handle free subscription refresh
CREATE OR REPLACE FUNCTION handle_free_subscription_refresh()
RETURNS void
SECURITY DEFINER  -- Run with owner privileges
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update end_date and reset credits for free subscriptions that have expired
  UPDATE subscription
  SET 
    -- Set new end_date to one month from current date
    end_date = (CURRENT_DATE + INTERVAL '1 month')::timestamp,
    -- Reset credits to monthly amount (10 for free tier)
    credits_remaining = 10,
    -- Increment the reset counter
    credits_reset_count = COALESCE(credits_reset_count, 0) + 1
  WHERE 
    plan_id = 'free'
    AND end_date < CURRENT_TIMESTAMP
    AND NOT cancelled;  -- Don't refresh cancelled subscriptions

  -- Log the refresh for auditing
  INSERT INTO subscription_audit_log (
    subscription_id,
    action,
    details,
    created_at
  )
  SELECT 
    id,
    'credits_refresh',
    json_build_object(
      'credits_reset_to', 10,
      'new_end_date', (CURRENT_DATE + INTERVAL '1 month')::timestamp
    ),
    CURRENT_TIMESTAMP
  FROM subscription
  WHERE 
    plan_id = 'free'
    AND end_date < CURRENT_TIMESTAMP
    AND NOT cancelled;
END;
$$;

-- Grant execute permission to cron job role
GRANT EXECUTE ON FUNCTION handle_free_subscription_refresh() TO cron_job_role;

-- Create policy to allow cron job role to update free subscriptions
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'subscription' 
    AND policyname = 'free_subscription_refresh_policy'
  ) THEN
    DROP POLICY IF EXISTS free_subscription_refresh_policy ON subscription;
  END IF;
END $$;

CREATE POLICY free_subscription_refresh_policy ON subscription
  FOR UPDATE
  TO cron_job_role
  USING (plan_id = 'free' AND end_date < CURRENT_TIMESTAMP AND NOT cancelled)
  WITH CHECK (plan_id = 'free');

-- Grant necessary table permissions to cron job role
GRANT SELECT, UPDATE ON subscription TO cron_job_role;

-- Enable cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run daily at midnight
SELECT cron.schedule(
  'refresh-free-subscriptions',   -- name of the cron job
  '0 0 * * *',                   -- run at midnight every day
  'SELECT handle_free_subscription_refresh();'
);
