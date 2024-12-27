-- Migration: Create Subscription and Invoice tables
-- Description: Sets up the initial schema for subscription management and billing
-- Tables affected: subscription, invoice
-- Special considerations: RLS enabled for both tables with proper policies

-- Create enum type for billing interval
create type billing_interval as enum ('MONTHLY', 'YEARLY', 'QUARTERLY');

-- Create subscription table
create table if not exists subscription (
    id uuid primary key default uuid_generate_v4(),
    user_id text not null unique,
    plan_id text not null,
    subscription_id text,
    start_date timestamp with time zone not null,
    end_date timestamp with time zone,
    billing_interval billing_interval not null,
    amount decimal(10,2) not null,
    currency text not null default 'USD',
    last_billing_date timestamp with time zone,
    next_billing_date timestamp with time zone,
    cancelled_at timestamp with time zone,
    trial_ends_at timestamp with time zone,
    payment_method text,
    payment_method_id text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Create invoice table
create table if not exists invoice (
    id uuid primary key default uuid_generate_v4(),
    subscription_id uuid not null references subscription(id),
    amount decimal(10,2) not null,
    currency text not null default 'USD',
    status text not null,
    paid_at timestamp with time zone,
    due_date timestamp with time zone not null,
    invoice_number text unique not null,
    billing_period_start timestamp with time zone not null,
    billing_period_end timestamp with time zone not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Create indexes
create index if not exists subscription_user_id_idx on subscription(user_id);
create index if not exists subscription_plan_id_idx on subscription(plan_id);
create index if not exists invoice_subscription_id_idx on invoice(subscription_id);
create index if not exists invoice_status_idx on invoice(status);

-- Enable Row Level Security
alter table subscription enable row level security;
alter table invoice enable row level security;

-- Create RLS Policies for subscription table
-- Service role can access all records
create policy "Service role full access"
    on subscription
    to service_role
    using (true)
    with check (true);

-- Authenticated users can only view their own subscriptions
create policy "Users can view own subscriptions"
    on subscription for select
    to authenticated
    using (auth.uid() = user_id::uuid);

-- Authenticated users can create their own subscriptions
create policy "Users can create own subscriptions"
    on subscription for insert
    to authenticated
    with check (auth.uid() = user_id::uuid);

-- Authenticated users can update their own subscriptions
create policy "Users can update own subscriptions"
    on subscription for update
    to authenticated
    using (auth.uid() = user_id::uuid)
    with check (auth.uid() = user_id::uuid);

-- Authenticated users can delete their own subscriptions
create policy "Users can delete own subscriptions"
    on subscription for delete
    to authenticated
    using (auth.uid() = user_id::uuid);

-- Create RLS Policies for invoice table
-- Authenticated users can view invoices for their subscriptions
create policy "Users can view own invoices"
    on invoice for select
    to authenticated
    using (
        exists (
            select 1
            from subscription
            where subscription.id = invoice.subscription_id
            and subscription.user_id::uuid = auth.uid()
        )
    );

-- Only system can create invoices
create policy "System can create invoices"
    on invoice for insert
    to authenticated
    with check (
        exists (
            select 1
            from subscription
            where subscription.id = invoice.subscription_id
            and subscription.user_id::uuid = auth.uid()
        )
    );

-- Only system can update invoices
create policy "System can update invoices"
    on invoice for update
    to authenticated
    using (
        exists (
            select 1
            from subscription
            where subscription.id = invoice.subscription_id
            and subscription.user_id::uuid = auth.uid()
        )
    )
    with check (
        exists (
            select 1
            from subscription
            where subscription.id = invoice.subscription_id
            and subscription.user_id::uuid = auth.uid()
        )
    );

-- Create triggers for updated_at timestamps
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger subscription_updated_at
    before update on subscription
    for each row
    execute function update_updated_at_column();

create trigger invoice_updated_at
    before update on invoice
    for each row
    execute function update_updated_at_column();
