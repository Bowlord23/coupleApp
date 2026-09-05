import { useRef, useState } from "react";
import { friendlyError } from "../lib/errors";
export function useTask() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  async function run(task: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return { busy, error, run, setError };
}
