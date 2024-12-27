'use client'

import { SignedIn, SignedOut, useUser } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import { PriceCard } from "@/components/pricing/price-card"
import { SubscriptionLoader } from "@/components/pricing/subscription-loader"
import { subscriptionPrices } from "@/lib/subscription-prices"
import Header from "@/components/header"

interface Subscription {
  plan_id: string
  end_date: string
}

export default function PricingPage() {
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null)
  const { user } = useUser()

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch('/api/subscription/current')
        if (response.ok) {
          const data = await response.json()
          setCurrentSubscription(data)
        }
      } catch (error) {
        console.error('Error fetching subscription:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [])

  const handleSubscribe = async (priceId: string, planId: string) => {
    if (!user) return
    
    try {
      setSubscribing(true)
      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          planId,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Error creating checkout session:', error)
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight">Simple, transparent pricing</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Choose the plan that best suits your needs
          </p>
        </div>

        <SignedIn>
          {loading ? (
            <SubscriptionLoader />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {subscriptionPrices.map((tier) => (
                <PriceCard
                  key={tier.id}
                  name={tier.name}
                  price={tier.price}
                  currency={tier.currency}
                  description={tier.description}
                  isCurrentPlan={currentSubscription?.plan_id === tier.id}
                  onSubscribe={
                    currentSubscription && 
                    currentSubscription.plan_id !== 'free' && 
                    currentSubscription.plan_id !== tier.id
                      ? undefined 
                      : tier.stripePriceId 
                        ? () => handleSubscribe(tier.stripePriceId, tier.id)
                        : undefined
                  }
                  loading={subscribing}
                />
              ))}
            </div>
          )}
        </SignedIn>

        <SignedOut>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {subscriptionPrices.map((tier) => (
              <PriceCard
                key={tier.id}
                name={tier.name}
                price={tier.price}
                currency={tier.currency}
                description={tier.description}
              />
            ))}
          </div>
        </SignedOut>
      </main>
    </div>
  )
}
