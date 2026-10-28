import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../../src/features/dogs/breeds.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { DOG_BREEDS, matchingBreed, searchBreeds } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`);

test("existing breed spellings identify the matching option", () => {
  assert.equal(matchingBreed("Vira-lata"), "Sem raça definida (SRD)");
  assert.equal(matchingBreed("Shih Tzu"), "Shih-tzu");
  assert.equal(matchingBreed("labrador retriever"), "Labrador");
});

test("breed search accepts accents, punctuation and alternate names", () => {
  assert.ok(searchBreeds("alemao").includes("Spitz Alemão"));
  assert.ok(searchBreeds("shih tzu").includes("Shih-tzu"));
  assert.deepEqual(searchBreeds("lulu da pomerania"), ["Spitz Alemão"]);
  assert.equal(searchBreeds("").length, DOG_BREEDS.length);
});

test("unknown breeds and partial names remain outside the fixed choices", () => {
  assert.equal(matchingBreed("Cão de Crista Chinês"), undefined);
  assert.equal(matchingBreed("Golden"), undefined);
  assert.deepEqual(searchBreeds("Raça que não existe na lista"), []);
});
