/**
 * transactions.js — categories, CRUD, filtering, search, CSV export.
 */
const Transactions = (() => {
  const INCOME_CATEGORIES = ["Salary", "Freelance", "Scholarship", "Business", "Other"];
  const EXPENSE_CATEGORIES = ["Food", "Travel", "Education", "Shopping", "Bills", "Entertainment", "Healthcare", "Other"];

  const CATEGORY_COLORS = {
    Salary: "#0E6E5D", Freelance: "#3F8F6C", Scholarship: "#6BA37A", Business: "#2E7D6B",
    Food: "#9C3F22", Travel: "#B0632F", Education: "#7A4B9C", Shopping: "#A9781F",
    Bills: "#5B5F73", Entertainment: "#C2622F", Healthcare: "#B8302B", Other: "#8A8F9E",
  };

  function categoriesFor(type) {
    return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  }

  function all(userId) {
    return Store.getCollection(userId, "transactions").sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  function add(userId, tx) {
    return Store.addDoc(userId, "transactions", tx);
  }
  function update(userId, id, patch) {
    return Store.updateDoc(userId, "transactions", id, patch);
  }
  function remove(userId, id) {
    Store.deleteDoc(userId, "transactions", id);
  }

  function filter(userId, { type, category, month, search } = {}) {
    let list = all(userId);
    if (type) list = list.filter((t) => t.type === type);
    if (category) list = list.filter((t) => t.category === category);
    if (month) list = list.filter((t) => t.date.slice(0, 7) === month);
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.category.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.paymentMethod || "").toLowerCase().includes(q)
      );
    }
    return list;
  }

  function totals(list) {
    const income = list.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expenses = list.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return { income, expenses, balance: income - expenses };
  }

  function byCategory(list, type) {
    const map = {};
    list.filter((t) => t.type === type).forEach((t) => {
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
    });
    return map;
  }

  function toCSV(list) {
    const header = "Date,Category,Type,Amount,Payment Method,Description";
    const rows = list.map((t) =>
      [
        t.date,
        t.category,
        t.type === "income" ? "Income" : "Expense",
        t.amount,
        t.paymentMethod || "",
        `"${(t.description || "").replace(/"/g, '""')}"`,
      ].join(",")
    );
    return [header, ...rows].join("\n");
  }

  function downloadCSV(list, filename = "smartspend-transactions.csv") {
    const csv = toCSV(list);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    INCOME_CATEGORIES, EXPENSE_CATEGORIES, CATEGORY_COLORS,
    categoriesFor, all, add, update, remove, filter, totals, byCategory,
    toCSV, downloadCSV,
  };
})();
