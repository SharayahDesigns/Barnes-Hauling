import { NextRequest, NextResponse } from "next/server";

import { getResendClient } from "@/lib/resend/client";
import { getResendConfig } from "@/lib/resend/config";

export async function POST(request: NextRequest) {
  const config = getResendConfig();

  if (!config.webhookSecret) {
    return NextResponse.json(
      { error: "Missing RESEND_WEBHOOK_SECRET" },
      { status: 500 },
    );
  }

  const payload = await request.text();

  try {
    const event = getResendClient().webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret: config.webhookSecret,
    });

    console.info("Received Resend webhook", {
      type: event.type,
      createdAt: event.created_at,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Invalid Resend webhook", error);
    return new NextResponse("Invalid webhook", { status: 400 });
  }
}
