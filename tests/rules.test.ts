import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cooldownRemaining,
  growthFor,
  isSharedTouch,
  isValidInvite,
  normalizeInvite,
  stageFor,
} from "../features/plant/rules";
test("growth never regresses and stages meet exact thresholds", () => {
  assert.deepEqual(
    [-1, 0, 9, 10, 39, 40, 100, 200, 349, 350, 9999].map(stageFor),
    [0, 0, 0, 1, 1, 2, 3, 4, 4, 5, 5],
  );
  assert.equal(growthFor("water"), 5);
  assert.equal(growthFor("touch"), 1);
  assert.equal(growthFor("shared"), 8);
});
test("cooldown permits exact boundary, handles absent and invalid dates", () => {
  assert.equal(cooldownRemaining(new Date(0).toISOString(), 999, 1000), 1);
  assert.equal(cooldownRemaining(new Date(0).toISOString(), 1000, 1000), 0);
  assert.equal(cooldownRemaining(null, 0, 1000), 0);
  assert.equal(cooldownRemaining("invalid", 0, 1000), 0);
});
test("shared window requires two different people and chronological touches", () => {
  assert.equal(isSharedTouch(0, 10_000, true), true);
  assert.equal(isSharedTouch(0, 10_001, true), false);
  assert.equal(isSharedTouch(0, 1, false), false);
  assert.equal(isSharedTouch(1, 0, true), false);
});
test("invite accepts only the server alphabet and length", () => {
  assert.equal(normalizeInvite(" ab12cd34 "), "AB12CD34");
  assert.equal(isValidInvite(" ab12cd34 "), true);
  for (const input of ["ABC123", "ABCDEFGH", "' OR 1=1", "", "AB12CD345"])
    assert.equal(isValidInvite(input), false);
});
