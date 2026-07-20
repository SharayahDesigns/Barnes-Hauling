"use client";

import { type ReactNode, useMemo, useState } from "react";

import {
  BagIcon,
  BuildingIcon,
  CalendarIcon,
  ChevronDownIcon,
  DocumentIcon,
  DollarIcon,
  DumpsterIcon,
  GridIcon,
  HelpIcon,
  PhoneIcon,
  SearchIcon,
  TruckIcon,
  UserIcon,
} from "./icons";
import styles from "./marketing.module.scss";

type Faq = Readonly<{
  question: string;
  answer: string;
  category: string;
}>;

const ALL = "All Questions";

const CATEGORY_ORDER = [
  "General",
  "Dumpster Rentals",
  "Accepted & Prohibited Materials",
  "Junk Removal & Hauling",
  "Scheduling",
  "Payment",
  "Waivers & Agreements",
  "Customer Portal",
  "Commercial",
  "Support",
] as const;

const CATEGORY_ICONS: Record<string, ReactNode> = {
  [ALL]: <GridIcon />,
  General: <HelpIcon />,
  "Dumpster Rentals": <DumpsterIcon />,
  "Accepted & Prohibited Materials": <BagIcon />,
  "Junk Removal & Hauling": <TruckIcon />,
  Scheduling: <CalendarIcon />,
  Payment: <DollarIcon />,
  "Waivers & Agreements": <DocumentIcon />,
  "Customer Portal": <UserIcon />,
  Commercial: <BuildingIcon />,
  Support: <PhoneIcon />,
};

export function FaqExplorer({ faqs }: Readonly<{ faqs: readonly Faq[] }>) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [openQuestion, setOpenQuestion] = useState<string | null>(
    faqs[0]?.question ?? null,
  );

  const categories = useMemo(() => {
    const present = new Set(faqs.map((faq) => faq.category));
    return [ALL, ...CATEGORY_ORDER.filter((name) => present.has(name))];
  }, [faqs]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return faqs.filter((faq) => {
      const matchesCategory = category === ALL || faq.category === category;
      const matchesTerm =
        term.length === 0 ||
        faq.question.toLowerCase().includes(term) ||
        faq.answer.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [faqs, query, category]);

  return (
    <div className={styles.faqExplorer}>
      <div className={styles.faqSearch}>
        <span className={styles.faqSearchIcon} aria-hidden="true">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search FAQ..."
          aria-label="Search frequently asked questions"
        />
      </div>

      <div className={styles.faqMobileCategoryFilter}>
        <label className={styles.faqMobileCategoryLabel} htmlFor="faq-category-select">
          Category
        </label>
        <select
          id="faq-category-select"
          className={styles.faqMobileCategorySelect}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter frequently asked questions by category"
        >
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.faqBody}>
        <nav className={styles.faqSidebar} aria-label="FAQ categories">
          <ul>
            {categories.map((name) => {
              const isActive = name === category;
              return (
                <li key={name}>
                  <button
                    type="button"
                    className={`${styles.faqCategory} ${
                      isActive ? styles.faqCategoryActive : ""
                    }`}
                    aria-pressed={isActive}
                    onClick={() => setCategory(name)}
                  >
                    <span className={styles.faqCategoryIcon} aria-hidden="true">
                      {CATEGORY_ICONS[name]}
                    </span>
                    {name}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles.faqQuestions}>
          {filtered.length === 0 ? (
            <p className={styles.faqEmpty}>
              No questions match your search. Try a different term or category.
            </p>
          ) : (
            filtered.map((faq) => {
              const isOpen = faq.question === openQuestion;
              return (
                <div
                  className={styles.faqItem}
                  data-open={isOpen}
                  key={faq.question}
                >
                  <button
                    type="button"
                    className={styles.faqQuestion}
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenQuestion(isOpen ? null : faq.question)
                    }
                  >
                    <span>{faq.question}</span>
                    <span className={styles.faqChevron} aria-hidden="true">
                      <ChevronDownIcon />
                    </span>
                  </button>
                  {isOpen ? (
                    <div className={styles.faqAnswer}>
                      <p>{faq.answer}</p>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
