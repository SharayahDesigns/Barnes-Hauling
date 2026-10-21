import styles from "../../admin.module.scss";

export type PhotoChoice = { id: string; assetNumber: string; imageUrl: string };

/**
 * Lets an option show the photo of one of its size's dumpsters. "Automatic"
 * (empty value) uses the first dumpster of the size that has a photo, so a new
 * dumpster photo shows up without editing every option.
 */
export function PhotoPicker({
  idPrefix,
  sizeName,
  choices,
  defaultValue,
}: Readonly<{
  idPrefix: string;
  sizeName: string;
  choices: readonly PhotoChoice[];
  defaultValue: string | null;
}>) {
  const selected =
    defaultValue && choices.some((choice) => choice.id === defaultValue) ? defaultValue : "";

  return (
    <fieldset className={`${styles.photoPicker} ${styles.fieldFull}`}>
      <legend className={styles.label}>Photo customers see</legend>
      {choices.length === 0 ? (
        <p className={styles.photoPickerEmpty}>
          None of your {sizeName.toLowerCase()}s has a photo yet. Add one with
          <strong> Edit</strong> on a dumpster&apos;s row and it will show here.
        </p>
      ) : (
        <div className={styles.photoPickerGrid}>
          <label className={styles.photoPickerTile} htmlFor={`${idPrefix}-photo-auto`}>
            <input
              id={`${idPrefix}-photo-auto`}
              type="radio"
              name="photoDumpsterId"
              value=""
              defaultChecked={selected === ""}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={choices[0].imageUrl} alt="" className={styles.photoPickerImg} />
            <span className={styles.photoPickerLabel}>
              Automatic
              <span className={styles.photoPickerHint}>Now: {choices[0].assetNumber}</span>
            </span>
          </label>
          {choices.map((choice) => (
            <label
              key={choice.id}
              className={styles.photoPickerTile}
              htmlFor={`${idPrefix}-photo-${choice.id}`}
            >
              <input
                id={`${idPrefix}-photo-${choice.id}`}
                type="radio"
                name="photoDumpsterId"
                value={choice.id}
                defaultChecked={selected === choice.id}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={choice.imageUrl} alt="" className={styles.photoPickerImg} />
              <span className={styles.photoPickerLabel}>{choice.assetNumber}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
