import { prisma } from "@/lib/db";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NewsletterSubscribeInput = {
  email: string;
  subscribedAt?: string;
  source?: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidNewsletterEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export async function subscribeToNewsletter(input: NewsletterSubscribeInput) {
  const normalizedEmail = normalizeEmail(input.email);
  const subscribedAtDate = input.subscribedAt ? new Date(input.subscribedAt) : new Date();

  if (Number.isNaN(subscribedAtDate.getTime())) {
    throw new Error("Invalid subscribedAt value");
  }

  const subscriber = await prisma.newsletterSubscriber.upsert({
    where: { email: normalizedEmail },
    create: {
      email: normalizedEmail,
      subscribedAt: subscribedAtDate,
      source: input.source?.trim() || null,
    },
    update: {
      subscribedAt: subscribedAtDate,
      source: input.source?.trim() || null,
    },
    select: {
      email: true,
    },
  });

  return subscriber;
}
