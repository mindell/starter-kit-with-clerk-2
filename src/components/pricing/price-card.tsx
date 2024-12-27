'use client'

import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs"
import { Check } from "lucide-react"
import Link from "next/link"
import { Button } from "../ui/button"
import React from 'react'

interface PriceCardProps {
  name: string
  price: number
  currency: string
  description: React.ComponentType
  isCurrentPlan?: boolean
  onSubscribe?: () => void
  loading?: boolean
}

export function PriceCard({
  name,
  price,
  currency,
  description,
  isCurrentPlan,
  onSubscribe,
  loading
}: PriceCardProps) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm h-full flex flex-col">
      <div className="flex flex-col p-6 gap-4 flex-1">
        <div>
          <h3 className="font-semibold text-xl">{name}</h3>
          <div className="mt-2">
            <span className="text-3xl font-bold">{`${currency} ${price}`}</span>
            {price > 0 && <span className="text-muted-foreground">/month</span>}
          </div>
        </div>
        
        <div className="flex-1 space-y-2">
          {/* Render the description component */}
          {React.createElement(description)}
        </div>

        <div className="pt-4">
          <SignedIn>
            {isCurrentPlan ? (
              <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                <Link href="/dashboard">
                  Subscribed
                </Link>
              </Button>
            ) : loading ? (
              <Button disabled className="w-full">
                Loading...
              </Button>
            ) : price === 0 ? (
              <Button asChild className="w-full">
                <Link href="/dashboard">
                  Go to Dashboard
                </Link>
              </Button>
            ) : onSubscribe && (
              <Button onClick={onSubscribe} className="w-full">
                Subscribe
              </Button>
            )}
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button className="w-full">
                Sign in
              </Button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </div>
  )
}
