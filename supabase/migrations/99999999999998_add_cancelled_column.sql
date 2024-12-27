-- Add cancelled column to subscription table
ALTER TABLE subscription 
ADD COLUMN IF NOT EXISTS cancelled BOOLEAN DEFAULT FALSE;

-- Update existing rows to have cancelled = false
UPDATE subscription 
SET cancelled = FALSE 
WHERE cancelled IS NULL;
