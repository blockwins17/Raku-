"use client";

import styles from "./RakuLight.module.css";

type Size = "tiny" | "small" | "default" | "large";

export default function RakuLight({
  size = "default",
  testId,
}: {
  size?: Size;
  testId?: string;
}) {
  const cls = [styles.light, styles[size]].filter(Boolean).join(" ");
  return (
    <div className={cls} data-testid={testId || "raku-light"} aria-hidden>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={styles.block} />
      ))}
    </div>
  );
}
