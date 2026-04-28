import { useState, useCallback } from "react";

export function useAlert() {
  const [state, setState] = useState(null); // { message }

  const alert = useCallback((message) => {
    return new Promise((resolve) => {
      setState({ message, resolve });
    });
  }, []);

  const handleClose = useCallback(() => {
    state?.resolve();
    setState(null);
  }, [state]);

  return { alert, state, handleClose };
}
