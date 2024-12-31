# Credit System Documentation

## Overview
The credit system manages user credits across different subscription tiers, handling credit allocation, usage, rollover, and expiration. This document outlines the implementation details, key components, and common scenarios.

## Key Components

### 1. Subscription Tiers
- **Free Tier**
  - 10 credits monthly
  - No rollover support
  - Credits reset monthly via cron job
  - Expires after 30 days (renewable)

- **Paid Tiers**
  - Customizable credit limits
  - Optional rollover support
  - Credits refresh on billing cycle
  - Supports credit accumulation up to maximum limit

### 2. Credit Management

#### Credit Operations
- **Allocation**: Credits are assigned based on subscription tier
- **Usage**: Credits are deducted for specific actions
- **Rollover**: Unused credits can carry over (paid tiers only)
- **Reset**: Credits refresh on billing cycle or monthly (free tier)

#### Database Schema
```sql
-- subscription table credit fields
credits_remaining  INTEGER     -- Current available credits
credits_limit     INTEGER     -- Maximum allowed credits
credits_reset_count INTEGER   -- Number of times credits have been reset
```

### 3. Automated Processes

#### Cron Jobs
- **Free Tier Refresh**: Daily check for expired free subscriptions
  - Updates end_date
  - Resets credits to monthly allocation
  - Updates reset counter
  - Logs refresh action

#### Webhook Handlers
- **checkout.session.completed**: Initial credit allocation
- **customer.subscription.updated**: Handles plan changes and credit adjustments
- **invoice.paid**: Manages credit renewal and rollover

## Common Scenarios

### 1. New Subscription
```typescript
// Free Tier Initial State
{
  credits_remaining: 10,
  credits_limit: 10,
  credits_reset_count: 0
}

// Paid Tier Initial State
{
  credits_remaining: plan.credits.monthly,
  credits_limit: plan.credits.maximum,
  credits_reset_count: 0
}
```

### 2. Credit Rollover (Paid Tiers)
```typescript
// Example: Standard Plan (1000 monthly, 3000 maximum)
// Current: 800 remaining
// After renewal: Math.min(800 + 1000, 3000) = 1800 credits
```

### 3. Free Tier Renewal
```sql
-- Monthly refresh via cron job
UPDATE subscription SET
  credits_remaining = 10,
  end_date = CURRENT_DATE + INTERVAL '1 month',
  credits_reset_count = credits_reset_count + 1
WHERE plan_id = 'free' AND NOT cancelled;
```

## Implementation Guide

### 1. Credit Check Implementation
```typescript
// Example credit check
async function checkCredits(userId: string, requiredCredits: number) {
  const { data: subscription } = await supabase
    .from('subscription')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!subscription || subscription.credits_remaining < requiredCredits) {
    throw new Error('Insufficient credits');
  }
}
```

### 2. Credit Usage
```typescript
// Example credit deduction
async function useCredits(userId: string, credits: number) {
  const { error } = await supabase
    .from('subscription')
    .update({
      credits_remaining: sql`credits_remaining - ${credits}`
    })
    .eq('user_id', userId)
    .gt('credits_remaining', credits - 1);

  if (error) throw new Error('Failed to use credits');
}
```

## Security Considerations

1. **Row Level Security (RLS)**
   - Users can only access their own subscription data
   - Credit operations are protected by RLS policies

2. **Atomic Operations**
   - Credit deductions use SQL operations to prevent race conditions
   - Transactions used for critical credit operations

3. **Audit Trail**
   - Credit operations are logged in subscription_audit_log
   - Tracks credit refreshes, usage, and adjustments

## Authentication and Database Access

### Architecture Overview
The system uses Clerk as the primary authentication provider, while Supabase serves as our database with Row Level Security (RLS). This architecture requires specific considerations for database access.

### Database Access Pattern
1. **Service Role Access**
   - All database operations are performed using the Supabase service role
   - This ensures consistent access regardless of authentication state
   - Maintains compatibility between Clerk's auth tokens and Supabase's RLS

### Why Service Role?
Our application uses Clerk for authentication, which means:
- User IDs are in Clerk's format (e.g., `user_2qL1Z3kmB...`)
- Database operations are authenticated via Clerk's session
- RLS policies are designed around service role access

This approach:
- Ensures reliable database access
- Maintains security through application-level auth
- Simplifies database operations
- Prevents auth-related edge cases

### Best Practices
1. **Always use service role for database operations**
   ```typescript
   // Correct approach
   const supabase = createClient(cookieStore);
   ```

2. **Validate user session at the application level**
   ```typescript
   // Example: Protected API route
   const { userId } = auth();
   if (!userId) throw new Error('Unauthorized');
   ```

3. **Maintain audit trail for all operations**
   ```typescript
   // Log important operations
   await supabase.from('subscription_audit_log').insert({
     subscription_id,
     action,
     details
   });
   ```

## Customization

### Modifying Credit Allocation
1. Update `subscription-prices.ts` with new credit values
2. Adjust cron job refresh amount if changing free tier
3. Update maximum limits in database constraints

### Disabling Free Tier Renewal
1. Remove cron job: `SELECT cron.unschedule('refresh-free-subscriptions');`
2. Update free tier messaging to indicate one-time usage
3. Implement expiration checks in credit usage logic

## Troubleshooting

### Common Issues
1. **Credits Not Refreshing**
   - Check cron job status
   - Verify webhook endpoints
   - Check subscription dates

2. **Rollover Not Working**
   - Confirm plan supports rollover
   - Check maximum credit limits
   - Verify webhook processing

3. **Credit Deduction Failures**
   - Check RLS policies
   - Verify sufficient credit balance
   - Check transaction logs

## Testing

### Test Scenarios
1. **Free Tier**
   - New subscription allocation
   - Monthly refresh
   - Expiration handling

2. **Paid Tier**
   - Credit rollover
   - Plan upgrade/downgrade
   - Maximum limit enforcement

3. **Error Cases**
   - Insufficient credits
   - Invalid operations
   - Concurrent usage

Use the provided test scenarios to verify system behavior.
