import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

interface UseSearchAndFilterOptions {
  paramName?: string;
  debounceMs?: number;
}

export function useSearchAndFilter(options: UseSearchAndFilterOptions = {}) {
  const { paramName = "q", debounceMs = 400 } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get(paramName) ?? "";
  const [localQuery, setLocalQuery] = useState(query);
  const [debounced, setDebounced] = useState(query);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(localQuery);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [localQuery, debounceMs]);

  // Update URL param when debounced query changes
  useEffect(() => {
    setSearchParams(
      (prev) => {
        if (debounced) {
          prev.set(paramName, debounced);
        } else {
          prev.delete(paramName);
        }
        return prev;
      },
      { replace: true },
    );
  }, [debounced, paramName, setSearchParams]);

  const clearSearch = useCallback(() => {
    setLocalQuery("");
  }, []);

  return {
    query: localQuery,
    debouncedQuery: debounced,
    setQuery: setLocalQuery,
    clearSearch,
  };
}
