import Stripe from 'stripe';

export type StripeCustomer = Stripe.Response<Stripe.Customer | Stripe.DeletedCustomer>;
export type ExpandedCustomer = Stripe.Customer;
