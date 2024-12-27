'use client';

import { SignedIn, UserButton } from "@clerk/nextjs";

export function Navigation() {
  return (
    <nav className="border-b bg-white">
      <div className="flex h-16 items-center px-4 max-w-7xl mx-auto justify-between">
        <div className="text-xl font-bold">Dashboard</div>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </nav>
  );
}
