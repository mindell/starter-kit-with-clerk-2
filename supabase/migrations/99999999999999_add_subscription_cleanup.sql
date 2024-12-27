-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a dedicated role for the cron job
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cron_job_role') THEN
    CREATE ROLE cron_job_role WITH NOLOGIN;
  END IF;
END
$$;

-- Grant necessary permissions to the cron job role
GRANT USAGE ON SCHEMA public TO cron_job_role;
GRANT SELECT, UPDATE ON public.subscription TO cron_job_role;

-- Create function to handle expired subscriptions
CREATE OR REPLACE FUNCTION handle_expired_subscriptions()
RETURNS void
SECURITY DEFINER  -- This makes the function run with the privileges of the owner
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update subscriptions that are cancelled and past their end date to free plan
  UPDATE subscription
  SET 
    plan_id = 'free',
    cancelled = false
  WHERE 
    cancelled = true 
    AND end_date < CURRENT_TIMESTAMP
    AND plan_id != 'free';
END;
$$;

-- Allow the cron job role to execute the function
GRANT EXECUTE ON FUNCTION handle_expired_subscriptions() TO cron_job_role;

-- Create policy to allow cron job role to update subscriptions
CREATE POLICY cron_job_update_policy ON subscription
  FOR UPDATE
  TO cron_job_role
  USING (true)
  WITH CHECK (cancelled = true AND end_date < CURRENT_TIMESTAMP);

-- Schedule the function to run daily at midnight
SELECT cron.schedule(
  'cleanup-expired-subscriptions',  -- name of the cron job
  '0 0 * * *',                     -- run at midnight every day
  'SELECT handle_expired_subscriptions();'
);
