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
CREATE POLICY free_subscription_refresh_policy ON subscription
  FOR UPDATE
  TO cron_job_role
  USING (plan_id = 'free' AND end_date < CURRENT_TIMESTAMP AND NOT cancelled)
  WITH CHECK (plan_id = 'free');

-- Schedule the function to run daily at midnight
SELECT cron.schedule(
  'refresh-free-subscriptions',   -- name of the cron job
  '0 0 * * *',                   -- run at midnight every day
  'SELECT handle_free_subscription_refresh();'
);
