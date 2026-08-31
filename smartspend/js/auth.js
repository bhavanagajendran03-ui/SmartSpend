/**
 * auth.js
 * ---------------------------------------------------------------
 * Lightweight local authentication so the app is fully self-contained
 * for the internship demo (no server, no API keys needed to run it).
 *
 * NOTE FOR THE REPORT / INTERVIEW:
 * This mimics Firebase Authentication's surface (register, login,
 * logout, forgot-password, "current user") but stores everything in
 * localStorage. To go to production you would swap the functions in
 * this file for `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`,
 * `signOut`, and `sendPasswordResetEmail` from the Firebase SDK, and
 * swap store.js's collection functions for Firestore reads/writes.
 * Every other file only calls Store.* / Auth.*, so that swap is isolated.
 * ---------------------------------------------------------------
 */
const Auth = (() => {
  // simple non-cryptographic hash — fine for a local demo, NOT for production
  function hashPassword(pw) {
    let h = 5381;
    for (let i = 0; i < pw.length; i++) {
      h = (h * 33) ^ pw.charCodeAt(i);
    }
    return (h >>> 0).toString(16);
  }

  function findUserByEmail(email) {
    return Store.getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  function register({ name, email, password }) {
    if (findUserByEmail(email)) {
      throw new Error("An account with this email already exists.");
    }
    const users = Store.getUsers();
    const user = {
      id: Store.uid("user"),
      name,
      email,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    Store.saveUsers(users);
    Store.setSession(user.id);
    return user;
  }

  function login({ email, password }) {
    const user = findUserByEmail(email);
    if (!user || user.passwordHash !== hashPassword(password)) {
      throw new Error("Incorrect email or password.");
    }
    Store.setSession(user.id);
    return user;
  }

  function logout() {
    Store.clearSession();
  }

  function currentUser() {
    const id = Store.getSession();
    if (!id) return null;
    return Store.getUsers().find((u) => u.id === id) || null;
  }

  function requestPasswordReset(email) {
    const user = findUserByEmail(email);
    if (!user) throw new Error("No account found with that email.");
    // In production: Firebase's sendPasswordResetEmail(auth, email)
    return true;
  }

  // ---- seed a demo account with sample data on first run ----
  function ensureDemoAccount() {
    if (findUserByEmail("demo@smartspend.app")) return;
    const user = {
      id: Store.uid("user"),
      name: "Demo User",
      email: "demo@smartspend.app",
      passwordHash: hashPassword("demo1234"),
      createdAt: new Date().toISOString(),
    };
    const users = Store.getUsers();
    users.push(user);
    Store.saveUsers(users);
    seedSampleData(user.id);
  }

  function seedSampleData(userId) {
    const today = new Date();
    const monthsAgo = (n, day) => {
      const d = new Date(today.getFullYear(), today.getMonth() - n, day);
      return d.toISOString().slice(0, 10);
    };

    const tx = [
      { type: "income", category: "Salary", amount: 40000, date: monthsAgo(0, 1), description: "Monthly stipend", paymentMethod: "Bank Transfer" },
      { type: "income", category: "Freelance", amount: 5000, date: monthsAgo(0, 6), description: "Logo design gig", paymentMethod: "UPI" },
      { type: "expense", category: "Food", amount: 6200, date: monthsAgo(0, 3), description: "Groceries & eating out", paymentMethod: "UPI" },
      { type: "expense", category: "Travel", amount: 3400, date: monthsAgo(0, 5), description: "Auto & metro", paymentMethod: "Cash" },
      { type: "expense", category: "Shopping", amount: 4100, date: monthsAgo(0, 8), description: "New headphones", paymentMethod: "Credit Card" },
      { type: "expense", category: "Bills", amount: 2200, date: monthsAgo(0, 2), description: "Mobile & internet", paymentMethod: "UPI" },
      { type: "expense", category: "Entertainment", amount: 1200, date: monthsAgo(0, 10), description: "Movies", paymentMethod: "UPI" },
      { type: "expense", category: "Education", amount: 1000, date: monthsAgo(0, 12), description: "Online course", paymentMethod: "Debit Card" },
      { type: "income", category: "Salary", amount: 35000, date: monthsAgo(1, 1), description: "Monthly stipend", paymentMethod: "Bank Transfer" },
      { type: "expense", category: "Food", amount: 4950, date: monthsAgo(1, 4), description: "Groceries & eating out", paymentMethod: "UPI" },
      { type: "expense", category: "Travel", amount: 3000, date: monthsAgo(1, 6), description: "Auto & metro", paymentMethod: "Cash" },
      { type: "expense", category: "Shopping", amount: 1800, date: monthsAgo(1, 9), description: "Clothes", paymentMethod: "Credit Card" },
      { type: "expense", category: "Bills", amount: 2100, date: monthsAgo(1, 2), description: "Mobile & internet", paymentMethod: "UPI" },
      { type: "income", category: "Salary", amount: 32000, date: monthsAgo(2, 1), description: "Monthly stipend", paymentMethod: "Bank Transfer" },
      { type: "expense", category: "Food", amount: 4600, date: monthsAgo(2, 5), description: "Groceries & eating out", paymentMethod: "UPI" },
      { type: "expense", category: "Healthcare", amount: 900, date: monthsAgo(2, 14), description: "Pharmacy", paymentMethod: "Cash" },
      { type: "expense", category: "Bills", amount: 2000, date: monthsAgo(2, 2), description: "Mobile & internet", paymentMethod: "UPI" },
    ];
    tx.forEach((t) => Store.addDoc(userId, "transactions", t));

    Store.addDoc(userId, "goals", { name: "New Laptop", target: 60000, saved: 35000, deadline: monthsAgo(-4, 31) });
    Store.addDoc(userId, "goals", { name: "Emergency Fund", target: 20000, saved: 8000, deadline: monthsAgo(-8, 31) });

    Store.addDoc(userId, "budgets", { category: "Food", limit: 5000 });
    Store.addDoc(userId, "budgets", { category: "Travel", limit: 3000 });
    Store.addDoc(userId, "budgets", { category: "Shopping", limit: 4000 });
  }

  return { register, login, logout, currentUser, requestPasswordReset, ensureDemoAccount };
})();
