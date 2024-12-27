import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { SubscriptionStatus } from "@/components/subscription-status";

export default async function Dashboard() {
  const { userId } = await auth();
  
  // Redirect if not authenticated
  if (!userId) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-600">Manage your subscription and account settings</p>
          </div>

          <SubscriptionStatus />
        </div>
      </main>
    </div>
  );
}
