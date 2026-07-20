"use client";

import { useState } from "react";

import styles from "../../admin.module.scss";

type MaterialsInputProps = {
  defaultMaterials?: string[];
  inputId: string;
  inputName?: string;
  label: string;
};

export function MaterialsInput({
  defaultMaterials = [],
  inputId,
  inputName = "materialsAllowed",
  label,
}: Readonly<MaterialsInputProps>) {
  const [materials, setMaterials] = useState(defaultMaterials);
  const [draft, setDraft] = useState("");

  function addMaterial(raw: string) {
    const value = raw.trim();
    if (!value) return;
    if (materials.some((material) => material.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    setMaterials((current) => [...current, value]);
    setDraft("");
  }

  function removeMaterial(value: string) {
    setMaterials((current) => current.filter((material) => material !== value));
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <input type="hidden" name={inputName} value={materials.join("\n")} />
      <div className={styles.inlineForm}>
        <input
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addMaterial(draft);
            }
          }}
          className={styles.input}
          placeholder="Add one material"
        />
        <button
          type="button"
          className={styles.smallButton}
          onClick={() => addMaterial(draft)}
        >
          Add
        </button>
      </div>
      {materials.length > 0 ? (
        <div className={styles.chips}>
          {materials.map((material) => (
            <span key={material} className={styles.chip}>
              {material}
              <button
                type="button"
                className={styles.chipRemove}
                aria-label={`Remove ${material}`}
                onClick={() => removeMaterial(material)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
