import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Button,
  Tailwind,
} from '@react-email/components';
import * as React from 'react';

interface PaidSubscriptionEmailProps {
  username: string;
  planName: string;
  amount: number;
  currency: string;
  billingInterval: string;
  nextBillingDate: string;
  credits: number;
}

export const PaidSubscriptionEmail = ({
  username = 'User',
  planName = 'Premium',
  amount = 10,
  currency = 'USD',
  billingInterval = 'MONTHLY',
  nextBillingDate = 'January 28, 2024',
  credits = 100,
}: PaidSubscriptionEmailProps) => {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);

  return (
    <Html>
      <Head />
      <Preview>Thank you for subscribing to {planName}!</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto p-8 max-w-xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Welcome to {planName}!
            </Heading>
            <Container className="bg-white p-6 rounded-lg shadow-lg">
              <Text className="text-gray-700 mb-4">
                Hi {username},
              </Text>
              <Text className="text-gray-700 mb-4">
                Thank you for subscribing to our {planName} plan! Your subscription has been successfully activated.
              </Text>
              <Text className="text-gray-700 font-semibold mb-2">Subscription Details:</Text>
              <ul className="list-none pl-0 mb-4 text-gray-700">
                <li className="mb-2">• Plan: {planName}</li>
                <li className="mb-2">• Amount: {formattedAmount}</li>
                <li className="mb-2">• Credits: {credits}</li>
                <li className="mb-2">• Billing Interval: {billingInterval.toLowerCase()}</li>
                <li className="mb-2">• Next Billing Date: {nextBillingDate}</li>
              </ul>
              <Text className="text-gray-700 mb-4">
                You now have access to all premium features and benefits!
              </Text>
              <Button
                className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium w-full text-center"
                href="/dashboard/billing"
              >
                Manage Subscription
              </Button>
              <Text className="text-gray-500 text-sm mt-6">
                If you have any questions about your subscription, please don't hesitate to contact our support team.
              </Text>
            </Container>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default PaidSubscriptionEmail;
