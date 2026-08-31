/**
 * insights.js
 * Monthly summaries, month-to-month comparison, rule-based "smart"
 * insights, and a 0–100 financial health score. No external AI call —
 * everything here is a plain, explainable rule, by design (see report).
 */
const Insights = (() => {
  function monthKey(d = new Date()) {
    return d.toISOString().slice(0, 7);
  }
  function prevMonthKey(key) {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return monthKey(d);
  }
  function monthLabel(key) {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }

  function summaryForMonth(userId, key) {
    const list = Transactions.filter(userId, { month: key });
    const { income, expenses, balance } = Transactions.totals(list);
    const byCat = Transactions.byCategory(list, "expense");
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const savingsRate = income > 0 ? (balance / income) * 100 : 0;
    return {
      key, income, expenses, savings: balance, savingsRate,
      highest: cats[0] || null,
      lowest: cats[cats.length - 1] || null,
      byCategory: byCat,
      count: list.length,
    };
  }

  function compare(userId, key) {
    const current = summaryForMonth(userId, key);
    const previous = summaryForMonth(userId, prevMonthKey(key));
    const delta = (a, b) => (b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / b) * 100);
    return {
      current, previous,
      incomeDelta: delta(current.income, previous.income),
      expenseDelta: delta(current.expenses, previous.expenses),
      savingsDelta: delta(current.savings, previous.savings),
    };
  }

  function generateInsights(userId) {
    const key = monthKey();
    const cur = summaryForMonth(userId, key);
    const prev = summaryForMonth(userId, prevMonthKey(key));
    const notes = [];

    if (cur.count === 0) {
      return ["Add a few transactions to start seeing insights about your spending."];
    }

    if (cur.highest) {
      notes.push(`Your highest expense category this month is ${cur.highest[0]} at ₹${Math.round(cur.highest[1]).toLocaleString("en-IN")}.`);
    }

    // category-level month over month change (only for categories present in both)
    Object.keys(cur.byCategory).forEach((cat) => {
      const prevAmt = prev.byCategory[cat] || 0;
      const curAmt = cur.byCategory[cat];
      if (prevAmt > 500 && curAmt > 500) {
        const pctChange = Math.round(((curAmt - prevAmt) / prevAmt) * 100);
        if (pctChange >= 20) {
          notes.push(`You spent ${pctChange}% more on ${cat} this month compared to last month.`);
        } else if (pctChange <= -20) {
          notes.push(`Nice — you spent ${Math.abs(pctChange)}% less on ${cat} this month compared to last month.`);
        }
      }
    });

    if (cur.income > 0) {
      if (cur.savingsRate < 10) {
        notes.push(`Your savings rate is ${cur.savingsRate.toFixed(0)}% this month — most planners suggest aiming for at least 20%.`);
      } else if (cur.savingsRate >= 30) {
        notes.push(`Strong savings rate this month: ${cur.savingsRate.toFixed(0)}% of income saved.`);
      }
    }

    // "you could save ~X by reducing your top discretionary category"
    const discretionary = ["Shopping", "Entertainment"];
    const topDiscretionary = Object.entries(cur.byCategory)
      .filter(([cat]) => discretionary.includes(cat))
      .sort((a, b) => b[1] - a[1])[0];
    if (topDiscretionary && topDiscretionary[1] > 1000) {
      const potential = Math.round(topDiscretionary[1] * 0.3);
      notes.push(`You could save approximately ₹${potential.toLocaleString("en-IN")} by trimming ${topDiscretionary[0]} spending by 30%.`);
    }

    if (notes.length === 1) {
      notes.push("Keep logging transactions — insights get sharper with more history.");
    }
    return notes.slice(0, 5);
  }

  /**
   * A simple, transparent 0–100 score. This is a custom rule-based
   * score for demo purposes, not a professional financial rating.
   */
  function healthScore(userId) {
    const key = monthKey();
    const cur = summaryForMonth(userId, key);
    const budgets = Budgets.all(userId);
    const goals = Goals.all(userId);

    let score = 0;
    const notes = [];

    // 1. Savings rate — up to 40 points
    const savingsRate = Math.max(0, cur.savingsRate);
    const savingsPoints = Math.min(40, Math.round(savingsRate * 1.3));
    score += savingsPoints;
    notes.push(savingsRate >= 20
      ? { ok: true, text: "Good savings rate" }
      : { ok: false, text: "Savings rate is below the recommended 20%" });

    // 2. Budget adherence — up to 30 points
    if (budgets.length > 0) {
      const withinLimit = budgets.filter((b) => {
        const spent = cur.byCategory[b.category] || 0;
        return spent <= Number(b.limit);
      }).length;
      const ratio = withinLimit / budgets.length;
      score += Math.round(ratio * 30);
      notes.push(ratio >= 0.7
        ? { ok: true, text: "Most budgets under control" }
        : { ok: false, text: "Several budget categories are over their limit" });
    } else {
      score += 15; // neutral if no budgets set
      notes.push({ ok: false, text: "No budget limits set yet — add some for a fuller picture" });
    }

    // 3. Goal progress — up to 15 points
    if (goals.length > 0) {
      const avgProgress = goals.reduce((s, g) => s + Goals.progressPct(g), 0) / goals.length;
      score += Math.round((avgProgress / 100) * 15);
      notes.push(avgProgress >= 40
        ? { ok: true, text: "Savings goals are progressing well" }
        : { ok: false, text: "Savings goals could use more contributions" });
    } else {
      score += 7;
    }

    // 4. Expense/income ratio — up to 15 points
    if (cur.income > 0) {
      const ratio = cur.expenses / cur.income;
      const points = ratio <= 0.5 ? 15 : ratio <= 0.7 ? 10 : ratio <= 0.9 ? 5 : 0;
      score += points;
      notes.push(ratio <= 0.7
        ? { ok: true, text: "Expenses are a healthy share of income" }
        : { ok: false, text: "Expenses are taking up most of your income" });
    }

    score = Math.max(0, Math.min(100, score));
    const tag = score >= 75 ? "GOOD" : score >= 50 ? "FAIR" : "NEEDS ATTENTION";
    return { score, tag, notes };
  }

  return { monthKey, prevMonthKey, monthLabel, summaryForMonth, compare, generateInsights, healthScore };
})();
