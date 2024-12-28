import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { trackCreditUsage } from "@/lib/credits";
import { checkCredits } from "@/utils/credits";

export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { amount, operation = 'AI_OPERATION', description } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid credit amount' },
        { status: 400 }
      );
    }

    // Check if user has enough credits
    const creditCheck = await checkCredits(operation, amount);
    if (!creditCheck.hasCredits) {
      return NextResponse.json({
        error: creditCheck.error,
        requiresUpgrade: creditCheck.requiresUpgrade,
        redirectTo: creditCheck.requiresUpgrade ? '/pricing' : undefined
      }, { status: 403 });
    }

    // Track credit usage
    const result = await trackCreditUsage({
      subscriptionId: creditCheck.subscription_id!,
      amount,
      operation: 'USE',
      description: description || `Credit usage for ${operation}`
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error using credits:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
