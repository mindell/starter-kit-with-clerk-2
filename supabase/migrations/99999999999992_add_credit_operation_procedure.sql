-- Create stored procedure for atomic credit operations
CREATE OR REPLACE FUNCTION handle_credit_operation(
  p_subscription_id UUID,
  p_new_remaining INTEGER,
  p_operation VARCHAR,
  p_amount INTEGER,
  p_description TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Lock the subscription row
  PERFORM id 
  FROM subscription 
  WHERE id = p_subscription_id 
  FOR UPDATE;

  -- Update subscription
  UPDATE subscription
  SET 
    credits_remaining = p_new_remaining,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_subscription_id;

  -- Record in credit history
  INSERT INTO credit_history (
    subscription_id,
    amount,
    operation,
    description
  ) VALUES (
    p_subscription_id,
    p_amount,
    p_operation,
    p_description
  );

  -- Ensure the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
REVOKE ALL ON FUNCTION handle_credit_operation(UUID, INTEGER, VARCHAR, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION handle_credit_operation(UUID, INTEGER, VARCHAR, INTEGER, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION handle_credit_operation IS 'Handles credit operations atomically, updating both subscription and credit history';
