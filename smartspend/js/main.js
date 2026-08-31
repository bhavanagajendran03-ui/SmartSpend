/**
 * main.js — app bootstrap, navigation, rendering, and event wiring.
 */
(() => {
  let user = null;
  let editingTxId = null;
  let editingGoalId = null;
  let currentTxType = "expense";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const fmt = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add("hidden"), 2400);
  }

  // ================= THEME =================
  function initTheme() {
    const saved = localStorage.getItem("smartspend:theme");
    if (saved === "dark") document.documentElement.classList.add("dark");
    updateDarkLabel();
  }
  function toggleTheme() {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("smartspend:theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
    updateDarkLabel();
    if (user) renderDashboard(); // re-render charts with new colors
  }
  function updateDarkLabel() {
    const isDark = document.documentElement.classList.contains("dark");
    $("#dark-toggle").textContent = isDark ? "☀️ Light mode" : "🌙 Dark mode";
  }

  // ================= AUTH SCREEN =================
  function initAuthScreen() {
    $$(".auth-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        $$(".auth-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const which = tab.dataset.tab;
        $("#login-form").classList.toggle("hidden", which !== "login");
        $("#register-form").classList.toggle("hidden", which !== "register");
        hideAuthError();
      });
    });

    $("#login-form").addEventListener("submit", (e) => {
      e.preventDefault();
      try {
        const u = Auth.login({ email: $("#login-email").value.trim(), password: $("#login-password").value });
        enterApp(u);
      } catch (err) {
        showAuthError(err.message);
      }
    });

    $("#register-form").addEventListener("submit", (e) => {
      e.preventDefault();
      try {
        const u = Auth.register({
          name: $("#register-name").value.trim(),
          email: $("#register-email").value.trim(),
          password: $("#register-password").value,
        });
        enterApp(u);
      } catch (err) {
        showAuthError(err.message);
      }
    });

    $("#forgot-password").addEventListener("click", () => {
      const email = $("#login-email").value.trim();
      if (!email) return showAuthError("Enter your email above first, then tap 'Forgot password?'.");
      try {
        Auth.requestPasswordReset(email);
        showAuthError("Password reset link sent (demo only — no email is actually sent).", false);
      } catch (err) {
        showAuthError(err.message);
      }
    });
  }
  function showAuthError(msg, isError = true) {
    const el = $("#auth-error");
    el.textContent = msg;
    el.classList.remove("hidden");
    el.style.color = isError ? "" : "var(--teal)";
    el.style.background = isError ? "" : "var(--teal-soft)";
  }
  function hideAuthError() {
    $("#auth-error").classList.add("hidden");
  }

  function enterApp(u) {
    user = u;
    $("#auth-screen").classList.add("hidden");
    $("#app").classList.remove("hidden");
    $("#user-name").textContent = user.name;
    $("#user-initial").textContent = user.name.charAt(0).toUpperCase();
    populateCategoryDropdowns();
    navigateTo("dashboard");
  }

  function logout() {
    Auth.logout();
    user = null;
    $("#app").classList.add("hidden");
    $("#auth-screen").classList.remove("hidden");
    $("#login-form").reset();
  }

  // ================= NAVIGATION =================
  function initNav() {
    $$(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => navigateTo(btn.dataset.view));
    });
    $$("[data-goto-view]").forEach((btn) => {
      btn.addEventListener("click", () => navigateTo(btn.dataset.gotoView));
    });
    $("#logout-btn").addEventListener("click", logout);
    $("#mobile-menu-btn").addEventListener("click", () => $("#app").classList.toggle("sidebar-open"));
    $("#dark-toggle").addEventListener("click", toggleTheme);
    $("#mobile-dark-toggle").addEventListener("click", toggleTheme);
  }

  function navigateTo(view) {
    $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
    $("#app").classList.remove("sidebar-open");
    if (view === "dashboard") renderDashboard();
    if (view === "transactions") renderTransactionsView();
    if (view === "goals") renderGoalsView();
    if (view === "budgets") renderBudgetsView();
    if (view === "reports") renderReportsView();
  }

  // ================= CATEGORY DROPDOWNS =================
  function populateCategoryDropdowns() {
    const filterCat = $("#filter-category");
    filterCat.innerHTML = '<option value="">All categories</option>' +
      [...Transactions.INCOME_CATEGORIES, ...Transactions.EXPENSE_CATEGORIES]
        .filter((v, i, a) => a.indexOf(v) === i)
        .map((c) => `<option value="${c}">${c}</option>`).join("");

    const budgetCat = $("#budget-category");
    budgetCat.innerHTML = Transactions.EXPENSE_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("");

    setTxCategoryOptions(currentTxType);
  }

  function setTxCategoryOptions(type) {
    const sel = $("#tx-category");
    sel.innerHTML = Transactions.categoriesFor(type).map((c) => `<option value="${c}">${c}</option>`).join("");
  }

  // ================= TX ROW RENDERING =================
  function txRowHTML(t) {
    const color = Transactions.CATEGORY_COLORS[t.category] || "#8A8F9E";
    const sign = t.type === "income" ? "+" : "−";
    return `
      <div class="tx-row" data-id="${t.id}">
        <span class="tx-date">${t.date}</span>
        <span class="tx-cat-badge"><span class="tx-dot" style="background:${color}"></span>${t.category}</span>
        <span class="tx-desc">${escapeHTML(t.description || "—")}</span>
        <span class="tx-method">${t.paymentMethod || ""}</span>
        <span class="tx-amount ${t.type}">${sign} ${fmt(t.amount)}</span>
      </div>`;
  }
  function escapeHTML(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function wireTxRowClicks(containerSelector, listRef) {
    $$(`${containerSelector} .tx-row`).forEach((row) => {
      row.addEventListener("click", () => openTxModal(listRef.find((t) => t.id === row.dataset.id)));
    });
  }

  // ================= DASHBOARD =================
  function renderDashboard() {
    const key = Insights.monthKey();
    const monthTx = Transactions.filter(user.id, { month: key });
    const totals = Transactions.totals(monthTx);
    const allTx = Transactions.all(user.id);
    const allTotals = Transactions.totals(allTx);

    $("#dashboard-date-range").textContent = Insights.monthLabel(key);
    $("#stat-income").textContent = fmt(totals.income);
    $("#stat-expenses").textContent = fmt(totals.expenses);
    $("#stat-balance").textContent = fmt(allTotals.balance);
    const goals = Goals.all(user.id);
    const totalSaved = goals.reduce((s, g) => s + Number(g.saved), 0);
    $("#stat-savings").textContent = fmt(totalSaved);

    // charts
    Charts.renderPie("chart-pie", Transactions.byCategory(monthTx, "expense"));

    const months = lastNMonthKeys(6);
    const incomeSeries = months.map((m) => Transactions.totals(Transactions.filter(user.id, { month: m })).income);
    const expenseSeries = months.map((m) => Transactions.totals(Transactions.filter(user.id, { month: m })).expenses);
    Charts.renderBar("chart-bar", months.map(shortMonthLabel), incomeSeries, expenseSeries);

    const { days, values } = dailyExpenseTrend(30);
    Charts.renderLine("chart-line", days, values);

    // health score
    const health = Insights.healthScore(user.id);
    $("#health-score-num").textContent = health.score;
    $("#health-tag").textContent = health.tag;
    $("#health-tag").style.color = health.score >= 75 ? "var(--teal)" : health.score >= 50 ? "var(--gold)" : "var(--rust)";
    $("#health-ring").style.borderColor = health.score >= 75 ? "var(--teal)" : health.score >= 50 ? "var(--gold)" : "var(--rust)";
    $("#health-notes").innerHTML = health.notes.map((n) => `<li>${n.ok ? "✓" : "⚠"} ${n.text}</li>`).join("");

    // insights
    $("#insight-list").innerHTML = Insights.generateInsights(user.id).map((i) => `<li>${i}</li>`).join("");

    // dashboard goals (compact)
    if (goals.length) {
      $("#dashboard-goals").innerHTML = goals.slice(0, 3).map(goalCompactHTML).join("");
    } else {
      $("#dashboard-goals").innerHTML = `<p class="muted">No goals yet. <button class="btn-link" id="dashboard-add-goal-btn">Create one</button></p>`;
      $("#dashboard-add-goal-btn").addEventListener("click", () => openGoalModal(null));
    }

    // recent transactions
    const recent = allTx.slice(0, 6);
    $("#recent-transactions").innerHTML = recent.length
      ? recent.map(txRowHTML).join("")
      : `<p class="tx-empty">No transactions yet — add your first one above.</p>`;
    wireTxRowClicks("#recent-transactions", allTx);
  }

  function goalCompactHTML(g) {
    const pct = Goals.progressPct(g);
    return `
      <div>
        <div class="goal-card-head"><h4 style="font-size:14px">${escapeHTML(g.name)}</h4><span class="goal-pct">${pct}%</span></div>
        <div class="goal-bar-track"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
        <div class="goal-amounts">${fmt(g.saved)} / ${fmt(g.target)}</div>
      </div>`;
  }

  function lastNMonthKeys(n) {
    const out = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push(d.toISOString().slice(0, 7));
    }
    return out;
  }
  function shortMonthLabel(key) {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short" });
  }
  function dailyExpenseTrend(n) {
    const days = [];
    const values = [];
    const now = new Date();
    const all = Transactions.all(user.id);
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayTotal = all.filter((t) => t.date === key && t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      days.push(d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }));
      values.push(dayTotal);
    }
    return { days, values };
  }

  // ================= TRANSACTIONS VIEW =================
  function renderTransactionsView() {
    applyTxFilters();
  }
  function applyTxFilters() {
    const filters = {
      type: $("#filter-type").value,
      category: $("#filter-category").value,
      month: $("#filter-month").value,
      search: $("#search-input").value,
    };
    const list = Transactions.filter(user.id, filters);
    const t = Transactions.totals(list);
    $("#filter-summary").textContent = `Showing ${list.length} transaction${list.length === 1 ? "" : "s"} · Net: ${fmt(t.balance)}`;
    $("#tx-full-table").innerHTML = list.length
      ? list.map(txRowHTML).join("")
      : `<p class="tx-empty">No transactions match these filters.</p>`;
    wireTxRowClicks("#tx-full-table", list);
  }

  function initTxFilters() {
    ["#filter-type", "#filter-category", "#filter-month", "#search-input"].forEach((sel) => {
      $(sel).addEventListener("input", applyTxFilters);
    });
    $("#filter-clear").addEventListener("click", () => {
      $("#filter-type").value = "";
      $("#filter-category").value = "";
      $("#filter-month").value = "";
      $("#search-input").value = "";
      applyTxFilters();
    });
    $("#export-csv").addEventListener("click", () => {
      const filters = {
        type: $("#filter-type").value,
        category: $("#filter-category").value,
        month: $("#filter-month").value,
        search: $("#search-input").value,
      };
      const list = Transactions.filter(user.id, filters);
      if (!list.length) return toast("Nothing to export with current filters.");
      Transactions.downloadCSV(list);
      toast("CSV downloaded.");
    });
  }

  // ================= GOALS VIEW =================
  function renderGoalsView() {
    const goals = Goals.all(user.id);
    $("#goals-full-list").innerHTML = goals.length
      ? goals.map(goalCardHTML).join("")
      : `<p class="tx-empty">No savings goals yet. Create one to start tracking progress.</p>`;
    $$("#goals-full-list .goal-card").forEach((card) => {
      card.addEventListener("click", () => openGoalModal(goals.find((g) => g.id === card.dataset.id)));
    });
  }
  function goalCardHTML(g) {
    const pct = Goals.progressPct(g);
    const remaining = Math.max(0, Number(g.target) - Number(g.saved));
    return `
      <div class="goal-card" data-id="${g.id}">
        <div class="goal-card-head"><h4>${escapeHTML(g.name)}</h4><span class="goal-pct">${pct}%</span></div>
        <div class="goal-amounts">${fmt(g.saved)} / ${fmt(g.target)}</div>
        <div class="goal-bar-track"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
        <div class="goal-remaining">₹${remaining.toLocaleString("en-IN")} remaining</div>
        ${g.deadline ? `<div class="goal-deadline">Deadline: ${new Date(g.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>` : ""}
      </div>`;
  }

  // ================= BUDGETS VIEW =================
  let editingBudgetId = null;
  function renderBudgetsView() {
    const budgets = Budgets.all(user.id);
    const key = Insights.monthKey();
    const monthTx = Transactions.filter(user.id, { month: key });
    const byCat = Transactions.byCategory(monthTx, "expense");

    $("#budgets-full-list").innerHTML = budgets.length
      ? budgets.map((b) => budgetRowHTML(b, byCat[b.category] || 0)).join("")
      : `<p class="tx-empty">No budget limits set. Add one to get spending alerts.</p>`;

    $$("#budgets-full-list .budget-row").forEach((row) => {
      row.addEventListener("click", () => {
        const b = budgets.find((x) => x.id === row.dataset.id);
        editingBudgetId = b.id;
        $("#budget-category").value = b.category;
        $("#budget-limit").value = b.limit;
        $("#budget-delete-btn").classList.remove("hidden");
        openModal("add-budget");
      });
    });
  }
  function budgetRowHTML(b, spent) {
    const { pct, status } = Budgets.statusFor(spent, b.limit);
    const barClass = status === "over" ? "over" : status === "warn" ? "warn" : "";
    let alertText = `${fmt(spent)} of ${fmt(b.limit)} used`;
    let alertClass = "ok";
    if (status === "warn") { alertText = `⚠️ You've used ${pct}% of your ${b.category} budget.`; alertClass = "warn"; }
    if (status === "over") { alertText = `🔴 ${b.category} budget exceeded by ${fmt(spent - b.limit)}.`; alertClass = "over"; }
    return `
      <div class="budget-row" data-id="${b.id}">
        <div class="budget-row-head"><span>${b.category}</span><span class="amounts">${fmt(spent)} / ${fmt(b.limit)}</span></div>
        <div class="budget-bar-track"><div class="budget-bar-fill ${barClass}" style="width:${Math.min(100, pct)}%"></div></div>
        <div class="budget-alert ${alertClass}">${alertText}</div>
      </div>`;
  }

  // ================= REPORTS VIEW =================
  function initReportMonthPicker() {
    const sel = $("#report-month");
    const months = lastNMonthKeys(12).reverse();
    sel.innerHTML = months.map((m) => `<option value="${m}">${Insights.monthLabel(m)}</option>`).join("");
    sel.addEventListener("change", renderReportsView);
  }
  function renderReportsView() {
    const key = $("#report-month").value || Insights.monthKey();
    if (!$("#report-month").value) $("#report-month").value = key;
    const cmp = Insights.compare(user.id, key);
    const c = cmp.current;

    $("#report-title").textContent = Insights.monthLabel(key);
    $("#report-rows").innerHTML = `
      <div class="report-row strong"><span class="label">Total Income</span><span class="value">${fmt(c.income)}</span></div>
      <div class="report-row strong"><span class="label">Total Expenses</span><span class="value">${fmt(c.expenses)}</span></div>
      <div class="report-row strong"><span class="label">Savings</span><span class="value">${fmt(c.savings)}</span></div>
      <div class="report-row"><span class="label">Savings Rate</span><span class="value">${c.savingsRate.toFixed(1)}%</span></div>
      <div class="report-row"><span class="label">Highest Expense</span><span class="value">${c.highest ? `${c.highest[0]} — ${fmt(c.highest[1])}` : "—"}</span></div>
      <div class="report-row"><span class="label">Lowest Expense</span><span class="value">${c.lowest ? `${c.lowest[0]} — ${fmt(c.lowest[1])}` : "—"}</span></div>
    `;

    const arrow = (d) => (d > 0.5 ? `<span class="value up">↑ ${d.toFixed(0)}%</span>` : d < -0.5 ? `<span class="value down">↓ ${Math.abs(d).toFixed(0)}%</span>` : `<span class="value">— 0%</span>`);
    $("#report-compare").innerHTML = `
      <div class="report-row"><span class="label">Income</span>${arrow(cmp.incomeDelta)}</div>
      <div class="report-row"><span class="label">Expenses</span>${arrow(cmp.expenseDelta)}</div>
      <div class="report-row"><span class="label">Savings</span>${arrow(cmp.savingsDelta)}</div>
      <div class="report-row"><span class="label muted">vs.</span><span class="value" style="color:var(--ink-faint)">${Insights.monthLabel(Insights.prevMonthKey(key))}</span></div>
    `;
  }

  // ================= MODALS =================
  function openModal(name) {
    $("#modal-overlay").classList.remove("hidden");
    $$(".modal").forEach((m) => m.classList.toggle("open", m.dataset.modal === name));
  }
  function closeModals() {
    $("#modal-overlay").classList.add("hidden");
    $$(".modal").forEach((m) => m.classList.remove("open"));
    resetTxForm();
    resetGoalForm();
  }
  function initModals() {
    $$("[data-open-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const name = btn.dataset.openModal;
        if (name === "add-transaction") openTxModal(null);
        if (name === "add-goal") openGoalModal(null);
        if (name === "add-budget") { $("#modal-add-budget").reset(); editingBudgetId = null; $("#budget-delete-btn").classList.add("hidden"); openModal("add-budget"); }
      });
    });
    $$("[data-close-modal]").forEach((btn) => btn.addEventListener("click", closeModals));
    $("#modal-overlay").addEventListener("click", (e) => {
      if (e.target.id === "modal-overlay") closeModals();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModals();
    });
  }

  // ---- transaction modal ----
  function resetTxForm() {
    editingTxId = null;
    currentTxType = "expense";
    $("#modal-add-transaction").reset();
    $("#tx-id").value = "";
    $$(".type-btn").forEach((b) => b.classList.toggle("active", b.dataset.type === "expense"));
    setTxCategoryOptions("expense");
    $("#tx-delete-btn").classList.add("hidden");
    $("#tx-modal-title").textContent = "Add Transaction";
  }
  function openTxModal(tx) {
    resetTxForm();
    $("#tx-date").value = new Date().toISOString().slice(0, 10);
    if (tx) {
      editingTxId = tx.id;
      currentTxType = tx.type;
      $("#tx-modal-title").textContent = "Edit Transaction";
      $("#tx-id").value = tx.id;
      $$(".type-btn").forEach((b) => b.classList.toggle("active", b.dataset.type === tx.type));
      setTxCategoryOptions(tx.type);
      $("#tx-amount").value = tx.amount;
      $("#tx-category").value = tx.category;
      $("#tx-date").value = tx.date;
      $("#tx-payment").value = tx.paymentMethod || "UPI";
      $("#tx-desc").value = tx.description || "";
      $("#tx-delete-btn").classList.remove("hidden");
    }
    openModal("add-transaction");
  }
  function initTxModal() {
    $$(".type-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentTxType = btn.dataset.type;
        $$(".type-btn").forEach((b) => b.classList.toggle("active", b === btn));
        setTxCategoryOptions(currentTxType);
      });
    });
    $("#modal-add-transaction").addEventListener("submit", (e) => {
      e.preventDefault();
      const payload = {
        type: currentTxType,
        amount: Number($("#tx-amount").value),
        category: $("#tx-category").value,
        date: $("#tx-date").value,
        paymentMethod: $("#tx-payment").value,
        description: $("#tx-desc").value.trim(),
      };
      if (editingTxId) {
        Transactions.update(user.id, editingTxId, payload);
        toast("Transaction updated.");
      } else {
        Transactions.add(user.id, payload);
        toast("Transaction added.");
      }
      closeModals();
      refreshCurrentView();
    });
    $("#tx-delete-btn").addEventListener("click", () => {
      if (editingTxId && confirm("Delete this transaction?")) {
        Transactions.remove(user.id, editingTxId);
        toast("Transaction deleted.");
        closeModals();
        refreshCurrentView();
      }
    });
  }

  // ---- goal modal ----
  function resetGoalForm() {
    editingGoalId = null;
    $("#modal-add-goal").reset();
    $("#goal-id").value = "";
    $("#goal-delete-btn").classList.add("hidden");
    $("#goal-modal-title").textContent = "New Savings Goal";
  }
  function openGoalModal(goal) {
    resetGoalForm();
    if (goal) {
      editingGoalId = goal.id;
      $("#goal-modal-title").textContent = "Edit Goal";
      $("#goal-id").value = goal.id;
      $("#goal-name").value = goal.name;
      $("#goal-target").value = goal.target;
      $("#goal-saved").value = goal.saved;
      $("#goal-deadline").value = goal.deadline || "";
      $("#goal-delete-btn").classList.remove("hidden");
    }
    openModal("add-goal");
  }
  function initGoalModal() {
    $("#modal-add-goal").addEventListener("submit", (e) => {
      e.preventDefault();
      const payload = {
        name: $("#goal-name").value.trim(),
        target: Number($("#goal-target").value),
        saved: Number($("#goal-saved").value || 0),
        deadline: $("#goal-deadline").value || null,
      };
      if (editingGoalId) {
        Goals.update(user.id, editingGoalId, payload);
        toast("Goal updated.");
      } else {
        Goals.add(user.id, payload);
        toast("Goal created.");
      }
      closeModals();
      refreshCurrentView();
    });
    $("#goal-delete-btn").addEventListener("click", () => {
      if (editingGoalId && confirm("Delete this goal?")) {
        Goals.remove(user.id, editingGoalId);
        toast("Goal deleted.");
        closeModals();
        refreshCurrentView();
      }
    });
  }

  // ---- budget modal ----
  function initBudgetModal() {
    $("#modal-add-budget").addEventListener("submit", (e) => {
      e.preventDefault();
      Budgets.upsert(user.id, $("#budget-category").value, Number($("#budget-limit").value));
      toast("Budget limit saved.");
      closeModals();
      refreshCurrentView();
    });
    $("#budget-delete-btn").addEventListener("click", () => {
      if (editingBudgetId && confirm("Remove this budget limit?")) {
        Budgets.remove(user.id, editingBudgetId);
        toast("Budget limit removed.");
        editingBudgetId = null;
        closeModals();
        refreshCurrentView();
      }
    });
  }

  function refreshCurrentView() {
    const active = $(".view.active").id.replace("view-", "");
    navigateTo(active);
  }

  // ================= INIT =================
  function init() {
    initTheme();
    Auth.ensureDemoAccount();
    initAuthScreen();
    initNav();
    initModals();
    initTxModal();
    initGoalModal();
    initBudgetModal();
    initTxFilters();
    initReportMonthPicker();
    populateCategoryDropdowns();

    const existing = Auth.currentUser();
    if (existing) enterApp(existing);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
