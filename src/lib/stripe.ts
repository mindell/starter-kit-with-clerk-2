import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
  typescript: true,
});

export const getStripeCustomerId = async (userId: string) => {
  // This function would typically query your database to get the Stripe customer ID
  // For now, we'll create a new customer if one doesn't exist
  const customer = await stripe.customers.create({
    metadata: {
      userId,
    },
  });
  return customer.id;
};

export const createCheckoutSession = async ({
  priceId,
  customerId,
  successUrl,
  cancelUrl,
}: {
  priceId: string;
  customerId: string;
  successUrl: string;
  cancelUrl: string;
}) => {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
};
