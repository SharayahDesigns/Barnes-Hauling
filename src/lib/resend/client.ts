import "server-only";

import { Resend } from "resend";

import { getResendConfig } from "./config";

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(getResendConfig().apiKey);
  }

  return resendClient;
}
