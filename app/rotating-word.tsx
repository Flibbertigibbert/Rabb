'use client';

import { useEffect, useState } from 'react';
import styles from './public.module.css';

const WORDS = ['fashion', 'shoes', 'gadgets', 'beauty'];

export default function RotatingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % WORDS.length);
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className={styles.heroRotateSlot} aria-live="polite">
      <span key={index} className={styles.heroRotateWord}>
        {WORDS[index]}
      </span>
    </span>
  );
}
