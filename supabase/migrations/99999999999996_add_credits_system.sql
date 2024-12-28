-- Add credits columns to subscription table
ALTER TABLE subscription
ADD COLUMN credits_limit INTEGER NOT NULL DEFAULT 0,
ADD COLUMN credits_remaining INTEGER NOT NULL DEFAULT 0,
ADD COLUMN credits_reset_count INTEGER NOT NULL DEFAULT 0;

-- Create credits history table
CREATE TABLE credit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscription(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('USE', 'RESET', 'BONUS')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_amount CHECK (amount >= 0)
);

-- Create index for faster lookups
CREATE INDEX idx_credit_history_subscription ON credit_history(subscription_id);

-- Add RLS policies
ALTER TABLE credit_history ENABLE ROW LEVEL SECURITY;

-- Policy for inserting credit history (service role only)
CREATE POLICY credit_history_insert_policy ON credit_history
    FOR INSERT TO service_role
    WITH CHECK (true);

-- Policy for viewing credit history (user can only see their own)
CREATE POLICY credit_history_select_policy ON credit_history
    FOR SELECT USING (
        subscription_id IN (
            SELECT id FROM subscription 
            WHERE user_id = auth.uid()
        )
    );
