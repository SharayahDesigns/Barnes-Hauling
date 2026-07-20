import Image from "next/image";

import styles from "./image-strip.module.scss";

export type StripImage = { src: string; alt: string };

export function ImageStrip({
  images,
}: Readonly<{ images: readonly StripImage[] }>) {
  if (images.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.row}>
          {images.map((image) => (
            <div key={image.src} className={styles.tile}>
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 48rem) 50vw, 25vw"
                className={styles.image}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
