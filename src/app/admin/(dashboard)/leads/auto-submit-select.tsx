"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/**
 * A select that saves as soon as a different option is chosen, so inline table
 * edits do not each need their own Save button.
 *
 * The form is only submitted when the value actually changes: a native select
 * fires `change` while arrow-keying through options, and resubmitting on every
 * keystroke would fire a server action per option passed over.
 *
 * A plain submit button stays in the markup inside <noscript> so the control
 * still works without client JavaScript.
 */
export function AutoSubmitSelect({
  name,
  defaultValue,
  className,
  ariaLabel,
  saveLabel = "Save",
  children,
}: Readonly<{
  name: string;
  defaultValue: string;
  className?: string;
  ariaLabel: string;
  saveLabel?: string;
  children: ReactNode;
}>) {
  const { pending } = useFormStatus();

  return (
    <>
      <select
        name={name}
        defaultValue={defaultValue}
        className={className}
        aria-label={ariaLabel}
        disabled={pending}
        onChange={(event) => {
          if (event.currentTarget.value === defaultValue) return;
          event.currentTarget.form?.requestSubmit();
        }}
      >
        {children}
      </select>
      <noscript>
        <button type="submit">{saveLabel}</button>
      </noscript>
    </>
  );
}

/**
 * Submit button that reports in-flight state, so an action that takes a round
 * trip to Stripe does not look like it did nothing.
 */
export function PendingSubmitButton({
  className,
  pendingLabel,
  children,
}: Readonly<{
  className?: string;
  pendingLabel: string;
  children: ReactNode;
}>) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
