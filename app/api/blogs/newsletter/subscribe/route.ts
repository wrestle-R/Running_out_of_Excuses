import { jsonResponse, optionsResponse } from "@/lib/server/http";
import {
  isValidNewsletterEmail,
  subscribeToNewsletter,
} from "@/services/blogs/newsletter/newsletterService";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

type SubscribeBody = {
  email?: unknown;
  subscribedAt?: unknown;
  source?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubscribeBody;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return jsonResponse(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    if (!isValidNewsletterEmail(email)) {
      return jsonResponse(
        { success: false, message: "Invalid email address" },
        { status: 400 }
      );
    }

    const subscribedAt = typeof body.subscribedAt === "string" ? body.subscribedAt : undefined;
    const source = typeof body.source === "string" ? body.source : undefined;

    const subscriber = await subscribeToNewsletter({
      email,
      subscribedAt,
      source,
    });

    return jsonResponse({
      success: true,
      message: "Successfully subscribed",
      email: subscriber.email,
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return jsonResponse(
      { success: false, message: "Server error. Please try again later." },
      { status: 500 }
    );
  }
}
