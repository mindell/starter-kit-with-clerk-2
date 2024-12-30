-- Create subscription audit log table
CREATE TABLE IF NOT EXISTS subscription_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscription(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscription_audit_log_subscription_id 
    ON subscription_audit_log(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_log_created_at 
    ON subscription_audit_log(created_at);

-- Add RLS policies
ALTER TABLE subscription_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy for viewing audit logs
CREATE POLICY view_own_audit_logs ON subscription_audit_log
    FOR SELECT
    USING (
        subscription_id IN (
            SELECT id FROM subscription 
            WHERE user_id::uuid = auth.uid()
        )
    );

-- Policy for inserting audit logs (service role only)
CREATE POLICY insert_audit_logs ON subscription_audit_log
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE subscription_audit_log IS 'Audit log for subscription-related operations';
COMMENT ON COLUMN subscription_audit_log.action IS 'Type of action performed (e.g., credits_refresh, plan_change)';
COMMENT ON COLUMN subscription_audit_log.details IS 'JSON details of the changes made';
COMMENT ON COLUMN subscription_audit_log.created_by IS 'User ID who performed the action (null for system actions)';
