/**
 * store.js
 * ---------------------------------------------------------------
 * A tiny persistence layer with a Firestore-shaped API
 * (getCollection / setCollection / addDoc / updateDoc / deleteDoc),
 * backed by localStorage so the whole app runs with zero setup.
 *
 * Swapping this for real Firebase later only means rewriting the
 * functions in this file — nothing in transactions.js, goals.js,
 * insights.js or main.js needs to change, because they only ever
 * talk to the Store.* API below.
 * ---------------------------------------------------------------
 */
const Store = (() => {
  const NS = "smartspend";

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(`${NS}:${key}`);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error("Store read error", e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(`${NS}:${key}`, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("Store write error", e);
      return false;
    }
  }

  function uid(prefix = "id") {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // ---- users (the "auth" table) ----
  function getUsers() {
    return read("users", []);
  }
  function saveUsers(users) {
    write("users", users);
  }

  // ---- generic per-user collections: transactions / goals / budgets ----
  function collectionKey(userId, name) {
    return `user:${userId}:${name}`;
  }
  function getCollection(userId, name) {
    return read(collectionKey(userId, name), []);
  }
  function setCollection(userId, name, arr) {
    write(collectionKey(userId, name), arr);
  }
  function addDoc(userId, name, doc) {
    const col = getCollection(userId, name);
    const withId = { id: uid(name), ...doc };
    col.unshift(withId);
    setCollection(userId, name, col);
    return withId;
  }
  function updateDoc(userId, name, id, patch) {
    const col = getCollection(userId, name);
    const idx = col.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    col[idx] = { ...col[idx], ...patch };
    setCollection(userId, name, col);
    return col[idx];
  }
  function deleteDoc(userId, name, id) {
    const col = getCollection(userId, name).filter((d) => d.id !== id);
    setCollection(userId, name, col);
  }

  // ---- session ----
  function getSession() {
    return read("session", null);
  }
  function setSession(userId) {
    write("session", userId);
  }
  function clearSession() {
    localStorage.removeItem(`${NS}:session`);
  }

  return {
    uid,
    getUsers, saveUsers,
    getCollection, setCollection, addDoc, updateDoc, deleteDoc,
    getSession, setSession, clearSession,
  };
})();
