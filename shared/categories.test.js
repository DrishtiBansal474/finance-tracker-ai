import assert from "node:assert/strict";
import test from "node:test";
import { emptyCategories, migrateLegacyCategories, normalizeCategories } from "./categories.js";

test("starts with no preset categories", () => {
  assert.deepEqual(emptyCategories(), { income: [], expense: [] });
});

test("keeps every user-defined category, including names used by legacy presets", () => {
  assert.deepEqual(normalizeCategories({
    income: ["Salary", "Freelance", "Gift", "Other"],
    expense: ["Food", "Travel"],
  }), {
    income: ["Salary", "Freelance", "Gift", "Other"],
    expense: ["Food", "Travel"],
  });
});

test("migrates legacy preset categories while retaining user-created categories", () => {
  assert.deepEqual(migrateLegacyCategories({
    income: ["Salary", "Freelance", "Gift", "Other", "Side project", " side project "],
    expense: ["Food", "Travel", "Rent", "Shopping", "Bills", "Other", "Pet care"],
  }), {
    income: ["Side project"],
    expense: ["Pet care"],
  });
  assert.deepEqual(migrateLegacyCategories({ income: ["Salary"], expense: ["Food", "Coffee"] }), {
    income: ["Salary"],
    expense: ["Food", "Coffee"],
  });
});
