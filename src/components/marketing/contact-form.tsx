"use client";

import { type FormEvent } from "react";

import styles from "./marketing.module.scss";

export function ContactForm({
  recipientEmail,
  serviceOptions,
}: Readonly<{
  recipientEmail: string;
  serviceOptions: readonly string[];
}>) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const service = String(data.get("service") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    const subject = name
      ? `Website message from ${name}`
      : "Website message";
    const body = [
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Email: ${email}`,
      `Service needed: ${service}`,
      "",
      message,
    ].join("\n");

    window.location.href = `mailto:${recipientEmail}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form className={styles.contactForm} onSubmit={handleSubmit}>
      <div className={styles.contactFormHeader}>
        <p className={styles.eyebrow}>Send us a message</p>
        <p>We&apos;ll get back to you as soon as we can.</p>
      </div>

      <div className={styles.contactFieldRow}>
        <label className={styles.contactField}>
          <span className={styles.contactFieldLabel}>Full name</span>
          <input
            name="name"
            type="text"
            placeholder="Full Name"
            autoComplete="name"
            required
          />
        </label>
        <label className={styles.contactField}>
          <span className={styles.contactFieldLabel}>Phone</span>
          <input
            name="phone"
            type="tel"
            placeholder="Phone"
            autoComplete="tel"
          />
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
        />
      </label>

      <label className={styles.contactField}>
        <span className={styles.contactFieldLabel}>Service needed</span>
        <select name="service" defaultValue="">
          <option value="" disabled>
            Service Needed
          </option>
          {serviceOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.contactField}>
        <span className={styles.contactFieldLabel}>How can we help?</span>
        <textarea
          name="message"
          rows={4}
          placeholder="How can we help?"
          required
        />
      </label>

      <button className={styles.contactSubmit} type="submit">
        Send Message
      </button>
    </form>
  );
}
