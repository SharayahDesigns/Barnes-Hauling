"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { submitContactForm } from "@/lib/contact/actions";
import { INITIAL_CONTACT_FORM_STATE } from "@/lib/contact/form-state";

import styles from "./marketing.module.scss";

export function ContactForm({
  serviceOptions,
}: Readonly<{
  serviceOptions: readonly string[];
}>) {
  const [state, formAction] = useActionState(
    submitContactForm,
    INITIAL_CONTACT_FORM_STATE,
  );

  return (
    <form className={styles.contactForm} action={formAction}>
      <div className={styles.contactFormHeader}>
        <p className={styles.eyebrow}>Send us a message</p>
        <p>We&apos;ll get back to you as soon as we can.</p>
      </div>

      <input
        className={styles.contactHoneypot}
        name="company"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <div className={styles.contactFieldRow}>
        <label className={styles.contactField}>
          <span className={styles.contactFieldLabel}>Full name</span>
          <input
            name="name"
            type="text"
            placeholder="Full Name"
            autoComplete="name"
            required
            aria-invalid={state.fieldErrors?.name ? "true" : "false"}
            aria-describedby={
              state.fieldErrors?.name ? "contact-name-error" : undefined
            }
          />
          {state.fieldErrors?.name ? (
            <p className={styles.contactFieldError} id="contact-name-error">
              {state.fieldErrors.name}
            </p>
          ) : null}
        </label>
        <label className={styles.contactField}>
          <span className={styles.contactFieldLabel}>Phone</span>
          <input
            name="phone"
            type="tel"
            placeholder="Phone"
            autoComplete="tel"
            aria-invalid={state.fieldErrors?.phone ? "true" : "false"}
            aria-describedby={
              state.fieldErrors?.phone ? "contact-phone-error" : undefined
            }
          />
          {state.fieldErrors?.phone ? (
            <p className={styles.contactFieldError} id="contact-phone-error">
              {state.fieldErrors.phone}
            </p>
          ) : null}
        </label>
      </div>

      <label className={styles.contactField}>
        <span className={styles.contactFieldLabel}>Email</span>
        <input
          name="email"
          type="email"
          placeholder="Email"
          autoComplete="email"
          required
          aria-invalid={state.fieldErrors?.email ? "true" : "false"}
          aria-describedby={
            state.fieldErrors?.email ? "contact-email-error" : undefined
          }
        />
        {state.fieldErrors?.email ? (
          <p className={styles.contactFieldError} id="contact-email-error">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </label>

      <label className={styles.contactField}>
        <span className={styles.contactFieldLabel}>Service needed</span>
        <select
          name="service"
          defaultValue=""
          aria-invalid={state.fieldErrors?.service ? "true" : "false"}
          aria-describedby={
            state.fieldErrors?.service ? "contact-service-error" : undefined
          }
        >
          <option value="" disabled>
            Service Needed
          </option>
          {serviceOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {state.fieldErrors?.service ? (
          <p className={styles.contactFieldError} id="contact-service-error">
            {state.fieldErrors.service}
          </p>
        ) : null}
      </label>

      <label className={styles.contactField}>
        <span className={styles.contactFieldLabel}>How can we help?</span>
        <textarea
          name="message"
          rows={4}
          placeholder="How can we help?"
          required
          aria-invalid={state.fieldErrors?.message ? "true" : "false"}
          aria-describedby={
            state.fieldErrors?.message ? "contact-message-error" : undefined
          }
        />
        {state.fieldErrors?.message ? (
          <p className={styles.contactFieldError} id="contact-message-error">
            {state.fieldErrors.message}
          </p>
        ) : null}
      </label>

      {state.message ? (
        <p
          className={
            state.status === "success"
              ? styles.contactFormSuccess
              : styles.contactFormError
          }
          role={state.status === "success" ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className={styles.contactSubmit} type="submit" disabled={pending}>
      {pending ? "Sending…" : "Send Message"}
    </button>
  );
}
