const legacyDefaultCategorySets = {
  income: [
    ["Salary", "Freelance", "Gift", "Other"],
    ["Salary", "Freelancing", "Investment", "Business"],
  ],
  expense: [
    ["Food", "Travel", "Rent", "Shopping", "Bills", "Other"],
    ["Food", "Travel", "Shopping", "Health", "Education", "Entertainment", "Bills"],
  ],
};

export const emptyCategories = () => ({ income: [], expense: [] });

export function normalizeCategories(categories = {}) {
  return Object.fromEntries(["income", "expense"].map((type) => {
    const values = Array.isArray(categories[type]) ? categories[type] : [];
    const seen = new Set();
    const normalized = values
      .filter((category) => typeof category === "string")
      .map((category) => category.trim())
      .filter((category) => {
        const key = category.toLowerCase();
        if (!category || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    return [type, normalized];
  }));
}

export function migrateLegacyCategories(categories = {}) {
  const migrated = { income: [], expense: [] };
  for (const type of ["income", "expense"]) {
    const values = Array.isArray(categories[type]) ? categories[type] : [];
    const legacyDefault = legacyDefaultCategorySets[type].find((preset) => (
      preset.every((category, index) => typeof values[index] === "string"
        && values[index].trim().toLowerCase() === category.toLowerCase())
    ));
    migrated[type] = legacyDefault ? values.slice(legacyDefault.length) : values;
  }
  return normalizeCategories(migrated);
}
