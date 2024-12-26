'use client'
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold hover:text-emerald-300 transition-colors">
            Starter Kit
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <SignedIn>
              <Link href="/dashboard" className="hover:text-emerald-300 transition-colors">
                Dashboard
              </Link>
            </SignedIn>
            
            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              <SignedIn>
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8"
                    }
                  }}
                />
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-2 rounded-lg transition-colors font-medium">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
            </div>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-emerald-300 focus:outline-none"
            >
              {isMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1">
          <SignedIn>
            <Link
              href="/dashboard"
              className="block px-3 py-2 rounded-md text-white hover:text-emerald-300 transition-colors"
            >
              Dashboard
            </Link>
          </SignedIn>
          
          <div className="px-3 py-2">
            <SignedIn>
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8"
                  }
                }}
              />
            </SignedIn>
            <SignedOut>
              <SignInButton 
              mode="modal">
                <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-2 rounded-lg transition-colors font-medium">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </div>
    </header>
  );
}
