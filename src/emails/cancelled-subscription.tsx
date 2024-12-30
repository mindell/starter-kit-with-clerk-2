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

interface CancelledSubscriptionEmailProps {
  username: string;
  planName: string;
  endDate: string;
}

export const CancelledSubscriptionEmail = ({
  username = 'User',
  planName = 'Premium',
  endDate = 'December 28, 2024',
}: CancelledSubscriptionEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your subscription has been cancelled</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto p-8 max-w-xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Subscription Cancelled
            </Heading>
            <Container className="bg-white p-6 rounded-lg shadow-lg">
              <Text className="text-gray-700 mb-4">
                Hi {username},
              </Text>
              <Text className="text-gray-700 mb-4">
                We're sorry to see you go. Your {planName} subscription has been cancelled as requested.
              </Text>
              <Text className="text-gray-700 mb-4">
                Important Information:
              </Text>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>You'll continue to have access to {planName} features until {endDate}</li>
                <li>After this date, your account will be converted to a free plan</li>
                <li>You can reactivate your subscription at any time</li>
              </ul>
              <Text className="text-gray-700 mb-4">
                We'd love to hear your feedback on why you decided to cancel. Your input helps us improve our service.
              </Text>
              <Button
                className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium w-full text-center"
                href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}
              >
                Reactivate Subscription
              </Button>
              <Text className="text-gray-500 text-sm mt-6">
                If you change your mind or have any questions, we're here to help.
              </Text>
            </Container>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default CancelledSubscriptionEmail;
