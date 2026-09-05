// Supabase reuses a channel by topic until removeChannel finishes. Serialize
// lifecycle work across screen remounts so a new subscription cannot reuse it.
let pending: Promise<void> = Promise.resolve();
export function enqueueChannelOperation(
  operation: () => Promise<void>,
): Promise<void> {
  const next = pending.then(operation);
  pending = next.catch(() => undefined);
  return next;
}
