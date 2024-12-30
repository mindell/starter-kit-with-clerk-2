import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
  Tailwind,
} from '@react-email/components';
import * as React from 'react';

interface FreeSubscriptionEmailProps {
  username: string;
  endDate: string;
}

export const FreeSubscriptionEmail = ({
  username = 'User',
  endDate = 'December 28, 2025',
}: FreeSubscriptionEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Your Free Subscription!</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto p-8 max-w-xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Welcome to Your Free Subscription!
            </Heading>
            <Container className="bg-white p-6 rounded-lg shadow-lg">
              <Text className="text-gray-700 mb-4">
                Hi {username},
              </Text>
              <Text className="text-gray-700 mb-4">
                Thank you for signing up! Your free subscription has been successfully activated.
              </Text>
              <Text className="text-gray-700 mb-4">
                With your free subscription, you'll have access to:
              </Text>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Basic features and functionality</li>
                <li>Access until {endDate}</li>
                <li>Community support</li>
              </ul>
              <Text className="text-gray-700 mb-4">
                Want to unlock more features? Consider upgrading to our premium plan!
              </Text>
              <Button
                className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium w-full text-center"
                href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}
              >
                View Subscription Details
              </Button>
              <Text className="text-gray-500 text-sm mt-6">
                If you have any questions, feel free to reply to this email.
              </Text>
            </Container>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default FreeSubscriptionEmail;
