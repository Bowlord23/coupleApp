import { test } from "node:test";
import assert from "node:assert/strict";
import { enqueueChannelOperation } from "../services/channelLifecycle";
test("new subscription waits for old channel removal across remounts", async () => {
  const order: string[] = [];
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const removal = enqueueChannelOperation(async () => {
    order.push("removing");
    await gate;
    order.push("removed");
  });
  const subscription = enqueueChannelOperation(async () => {
    order.push("subscribed");
  });
  await Promise.resolve();
  assert.deepEqual(order, ["removing"]);
  release?.();
  await Promise.all([removal, subscription]);
  assert.deepEqual(order, ["removing", "removed", "subscribed"]);
});
test("failed channel operation does not prevent future reconnect", async () => {
  await assert.rejects(
    enqueueChannelOperation(async () => {
      throw new Error("network");
    }),
  );
  let connected = false;
  await enqueueChannelOperation(async () => {
    connected = true;
  });
  assert.equal(connected, true);
});
