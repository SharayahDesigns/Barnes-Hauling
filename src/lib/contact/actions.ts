"use server";

import { z } from "zod";

import { sendContactEmails } from "@/lib/resend/send";

import type { ContactFormState } from "./form-state";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Full name is required.").max(160),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((value) => value || ""),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  service: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || ""),
  message: z.string().trim().min(1, "Tell us how we can help.").max(4000),
  company: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || ""),
});

export async function submitContactForm(
  _previousState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    service: formData.get("service"),
    message: formData.get("message"),
    company: formData.get("company"),
  });

  if (!parsed.success) {
    const fieldErrors: ContactFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (
        key === "name" ||
        key === "phone" ||
        key === "email" ||
        key === "service" ||
        key === "message"
      ) {
        fieldErrors[key] ??= issue.message;
      }
    }

    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const input = parsed.data;

  if (input.company) {
    return {
      status: "success",
      message: "Thanks. We received your message and will follow up soon.",
    };
  }

  try {
    await sendContactEmails({
      name: input.name,
      email: input.email,
      phone: input.phone || undefined,
      service: input.service || undefined,
      message: input.message,
    });

    return {
      status: "success",
      message: "Thanks. We received your message and will follow up soon.",
    };
  } catch (error) {
    console.error("Contact email send failed", error);
    return {
      status: "error",
      message:
        "We could not send your message right now. Please call, text, or email Barnes directly.",
    };
  }
}
