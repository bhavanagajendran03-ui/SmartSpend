/**
 * goals.js — savings goals + per-category budget limits.
 */
const Goals = (() => {
  function all(userId) {
    return Store.getCollection(userId, "goals");
  }
  function add(userId, goal) {
    return Store.addDoc(userId, "goals", goal);
  }
  function update(userId, id, patch) {
    return Store.updateDoc(userId, "goals", id, patch);
  }
  function remove(userId, id) {
    Store.deleteDoc(userId, "goals", id);
  }
  function progressPct(goal) {
    if (!goal.target) return 0;
    return Math.min(100, Math.round((Number(goal.saved) / Number(goal.target)) * 100));
  }

  return { all, add, update, remove, progressPct };
})();

const Budgets = (() => {
  function all(userId) {
    return Store.getCollection(userId, "budgets");
  }
  function upsert(userId, category, limit) {
    const existing = all(userId).find((b) => b.category === category);
    if (existing) {
      return Store.updateDoc(userId, "budgets", existing.id, { limit });
    }
    return Store.addDoc(userId, "budgets", { category, limit });
  }
  function remove(userId, id) {
    Store.deleteDoc(userId, "budgets", id);
  }

  /**
   * status: 'ok' | 'warn' (>=80%) | 'over' (>100%)
   */
  function statusFor(spent, limit) {
    if (!limit) return { pct: 0, status: "ok" };
    const pct = Math.round((spent / limit) * 100);
    let status = "ok";
    if (pct > 100) status = "over";
    else if (pct >= 80) status = "warn";
    return { pct, status };
  }

  return { all, upsert, remove, statusFor };
})();
