import { useCallback, useEffect, useRef, useState } from "react";

// Tracks one async request; a newer call wins over a slower older one.
export function useRequest(fetcher, { immediate = false } = {}) {
  const [state, setState] = useState({ status: immediate ? "loading" : "idle", data: null, error: null });
  const latest = useRef(0);

  const settle = useCallback(
    (args) => {
      const id = ++latest.current;
      return fetcher(...args).then(
        (data) => id === latest.current && setState({ status: "success", data, error: null }),
        (error) => id === latest.current && setState({ status: "error", data: null, error }),
      );
    },
    [fetcher],
  );

  const run = useCallback(
    (...args) => {
      setState((prev) => ({ ...prev, status: "loading", error: null }));
      return settle(args);
    },
    [settle],
  );

  useEffect(() => {
    if (immediate) settle([]);
  }, [immediate, settle]);

  return { ...state, run };
}
