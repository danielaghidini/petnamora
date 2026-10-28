import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../../src/features/dogs/swipe.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { swipeCandidates, swipeDirection } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`);

const dog = (id, overrides = {}) => ({
  id, ownerId: `owner-${id}`, name: id, breed: "Beagle", sex: "FEMALE",
  ageMonths: 36, size: "Médio", city: "Campinas", state: "SP", bio: "Adora passear.",
  photoUrl: "/photo.jpg", pedigree: false, vaccinated: true, healthTests: false,
  neutered: false, active: true, ...overrides,
});

test("the next crush excludes passed, liked and unavailable profiles without changing order", () => {
  const dogs = [dog("passed"), dog("liked"), dog("first"), dog("inactive", { active: false }), dog("neutered", { neutered: true }), dog("second")];
  assert.deepEqual(swipeCandidates(dogs, new Set(["passed"]), [dogs[1]]).map((item) => item.id), ["first", "second"]);
});

test("a selected dog only sees opposite-sex profiles from other families", () => {
  const active = dog("mine", { ownerId: "my-family", sex: "MALE" });
  const dogs = [dog("same-family", { ownerId: "my-family" }), dog("same-sex", { sex: "MALE" }), dog("eligible")];
  assert.deepEqual(swipeCandidates(dogs, new Set(), [], active).map((item) => item.id), ["eligible"]);
});

test("guests can browse both sexes before signing in to send a heart", () => {
  const dogs = [dog("female"), dog("male", { sex: "MALE" })];
  assert.equal(swipeCandidates(dogs, new Set(), []).length, 2);
});

test("restarting a round restores passed profiles while preserving existing hearts", () => {
  const dogs = [dog("passed"), dog("liked")];
  assert.deepEqual(swipeCandidates(dogs, new Set(), [dogs[1]]).map((item) => item.id), ["passed"]);
});

test("horizontal swipes pass left and like right at desktop and mobile widths", () => {
  assert.equal(swipeDirection(-120, 10, 360), "left");
  assert.equal(swipeDirection(120, -10, 360), "right");
  assert.equal(swipeDirection(70, 5, 270), "right");
});

test("small movements and vertical page scrolling never send a heart", () => {
  assert.equal(swipeDirection(50, 0, 360), null);
  assert.equal(swipeDirection(120, 180, 360), null);
  assert.equal(swipeDirection(0, 220, 270), null);
  assert.equal(swipeDirection(100, 100, 360), null);
});
