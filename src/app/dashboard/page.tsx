import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";


export default async function Dashboard() {
  const { userId } = await auth();
  
  // Redirect if not authenticated
  if (!userId) {
    redirect("/");
  }

  
  return (
    <div className="min-h-screen p-8">
      {/* Top Navigation */}
      <nav className="absolute top-0 right-0 p-4">
        <UserButton afterSignOutUrl="/" />
      </nav>

      {/* Hero Section */}
      <div className="pt-16 pb-8">
        <h1 className="text-4xl font-bold text-center">
          Welcome to Starter Kit
        </h1>
      </div>

     
    </div>
  );
}
