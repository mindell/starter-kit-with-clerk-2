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
  -- Update end_date for free subscriptions that have expired
  UPDATE subscription
  SET 
    -- Set new end_date to one month from current date
    end_date = (CURRENT_DATE + INTERVAL '1 month')::timestamp
  WHERE 
    plan_id = 'free'
    AND end_date < CURRENT_TIMESTAMP
    AND NOT cancelled;  -- Don't refresh cancelled subscriptions
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
