'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { subscriptionPrices } from '@/lib/subscription-prices'
import { toast } from 'sonner'
import Link from 'next/link'

interface SubscriptionManagementProps {
  subscription: {
    plan_id: string
    end_date: string
    cancelled: boolean
  }
}

export function SubscriptionManagement({ subscription }: SubscriptionManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const currentPlan = subscriptionPrices.find(plan => plan.id === subscription.plan_id)
  const endDate = new Date(subscription.end_date).toLocaleDateString()

  const handleCancel = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel subscription')
      }

      const result = await response.json()
      toast.success('Subscription cancelled successfully', {
        description: `Your subscription will remain active until ${new Date(result.end_date).toLocaleDateString()}`
      })
      
      // Close dialog and refresh page to update UI
      setIsDialogOpen(false)
      window.location.reload()
    } catch (error) {
      toast.error('Failed to cancel subscription', {
        description: error instanceof Error ? error.message : 'Please try again later'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (subscription.plan_id === 'free') {
    return (
      <div className="mt-6">
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">Current Plan: {currentPlan?.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upgrade your plan to access premium features
              </p>
            </div>
            <Button asChild>
              <Link href="/pricing">
                Upgrade Plan
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium">Current Plan: {currentPlan?.name}</h3>
            {subscription.cancelled && (
              <p className="text-sm text-yellow-600">
                Your subscription is cancelled but active until {endDate}
              </p>
            )}
          </div>
          <div>
            {subscription.cancelled ? (
              <p className="text-sm text-muted-foreground">
                Subscription cancelled
              </p>
            ) : (
              <Button
                variant="destructive"
                onClick={() => setIsDialogOpen(true)}
                disabled={isLoading}
              >
                Cancel Subscription
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription? You will still have access to your current plan until {endDate}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
              Keep Subscription
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isLoading}>
              {isLoading ? 'Cancelling...' : 'Yes, Cancel Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
