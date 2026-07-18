import { ContactForm } from "@/components/marketing/contact-form";
import {
  MailIcon,
  MapPinIcon,
  PhoneIcon,
} from "@/components/marketing/icons";
import { marketingStyles as styles } from "@/components/marketing/marketing";
import { businessConfig, isConfirmedBusinessFact } from "@/config/business";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata(
  "Contact",
  "Get in touch with Barnes Hauling and Disposal. Send a message or email us and we'll get back to you as soon as we can.",
  siteRoutes.contact,
);

export default function ContactPage() {
  const phone = businessConfig.contact.phone;
  const email = businessConfig.contact.email;
  const hours = businessConfig.operations.businessHours;
  const serviceAreas = businessConfig.operations.serviceAreas;
  const emailValue = isConfirmedBusinessFact(email) ? email.value : null;
  const serviceAreaLabel = isConfirmedBusinessFact(serviceAreas)
    ? serviceAreas.value.join(" · ")
    : "Serving our local community";

  const serviceOptions = [
    ...businessConfig.services.map((service) => service.name),
    "Something else",
  ];

  return (
    <section className={styles.contactHero}>
      <div className={styles.contactLayout}>
        <div className={styles.contactInfo}>
          <h1>
            Contact Us{" "}
            <span className={styles.contactAccent}>We&apos;re here to help</span>
          </h1>
          <span className={styles.contactRule} aria-hidden="true" />
          <p className={styles.contactIntro}>
            Have a question about our dumpsters or need help choosing the right
            size? We&apos;re just a call or message away.
          </p>

          <ul className={styles.contactMethods}>
            {isConfirmedBusinessFact(phone) ? (
              <li className={styles.contactMethod}>
                <span className={styles.contactMethodIcon} aria-hidden="true">
                  <PhoneIcon />
                </span>
                <div>
                  <p className={styles.contactMethodLabel}>Call or text</p>
                  <a
                    className={styles.contactMethodValue}
                    href={`tel:${phone.value}`}
                  >
                    {phone.value}
                  </a>
                  {isConfirmedBusinessFact(hours) ? (
                    <p className={styles.contactMethodNote}>{hours.value}</p>
                  ) : null}
                </div>
              </li>
            ) : null}

            {emailValue ? (
              <li className={styles.contactMethod}>
                <span className={styles.contactMethodIcon} aria-hidden="true">
                  <MailIcon />
                </span>
                <div>
                  <p className={styles.contactMethodLabel}>Email us</p>
                  <a
                    className={styles.contactMethodValue}
                    href={`mailto:${emailValue}`}
                  >
                    {emailValue}
                  </a>
                </div>
              </li>
            ) : null}

            <li className={styles.contactMethod}>
              <span className={styles.contactMethodIcon} aria-hidden="true">
                <MapPinIcon />
              </span>
              <div>
                <p className={styles.contactMethodLabel}>Service area</p>
                <p className={styles.contactMethodValue}>{serviceAreaLabel}</p>
                <p className={styles.contactMethodNote}>
                  Local. Reliable. Straightforward.
                </p>
              </div>
            </li>
          </ul>
        </div>

        {emailValue ? (
          <div className={styles.contactFormCard}>
            <ContactForm
              recipientEmail={emailValue}
              serviceOptions={serviceOptions}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
