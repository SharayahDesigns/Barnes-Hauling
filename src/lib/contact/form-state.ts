export type ContactFormState = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors?: Partial<
    Record<"name" | "phone" | "email" | "service" | "message", string>
  >;
};

export const INITIAL_CONTACT_FORM_STATE: ContactFormState = {
  status: "idle",
  message: null,
};
