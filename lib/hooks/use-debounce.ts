"use client";

import { useState, useEffect } from "react";

/**
 * Custom hook that debounces a value with a configurable delay (default 300ms).
 * Returns the debounced value that only updates after the specified delay
 * of inactivity from the input value changing.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
