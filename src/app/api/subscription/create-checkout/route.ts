import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createCheckoutSession, getStripeCustomerId } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { priceId, planId, successUrl, cancelUrl } = body;

    if (!priceId || !planId || !successUrl || !cancelUrl) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const customerId = await getStripeCustomerId(userId);
    
    const session = await createCheckoutSession({
      priceId,
      customerId,
      successUrl,
      cancelUrl,
      planId,
      userId,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[STRIPE_CREATE_CHECKOUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
