/**
 * charts.js — thin wrappers around Chart.js for the three dashboard charts.
 */
const Charts = (() => {
  let pieChart, barChart, lineChart;

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function renderPie(canvasId, byCategory) {
    const ctx = document.getElementById(canvasId);
    const labels = Object.keys(byCategory);
    const data = Object.values(byCategory);
    const colors = labels.map((l) => Transactions.CATEGORY_COLORS[l] || "#8A8F9E");

    if (pieChart) pieChart.destroy();
    if (labels.length === 0) {
      ctx.getContext("2d").clearRect(0, 0, ctx.width, ctx.height);
      return;
    }
    pieChart = new Chart(ctx, {
      type: "doughnut",
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: cssVar("--paper-raised") }] },
      options: {
        plugins: {
          legend: { position: "bottom", labels: { color: cssVar("--ink-soft"), boxWidth: 10, font: { size: 11 } } },
        },
        cutout: "62%",
      },
    });
  }

  function renderBar(canvasId, months, incomeSeries, expenseSeries) {
    const ctx = document.getElementById(canvasId);
    if (barChart) barChart.destroy();
    barChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: months,
        datasets: [
          { label: "Income", data: incomeSeries, backgroundColor: cssVar("--teal"), borderRadius: 3, maxBarThickness: 26 },
          { label: "Expenses", data: expenseSeries, backgroundColor: cssVar("--rust"), borderRadius: 3, maxBarThickness: 26 },
        ],
      },
      options: {
        plugins: { legend: { position: "bottom", labels: { color: cssVar("--ink-soft"), boxWidth: 10, font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: cssVar("--ink-faint") }, grid: { display: false } },
          y: { ticks: { color: cssVar("--ink-faint") }, grid: { color: cssVar("--line") } },
        },
      },
    });
  }

  function renderLine(canvasId, days, balances) {
    const ctx = document.getElementById(canvasId);
    if (lineChart) lineChart.destroy();
    lineChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: days,
        datasets: [
          {
            label: "Net spending",
            data: balances,
            borderColor: cssVar("--gold"),
            backgroundColor: "transparent",
            tension: 0.35,
            pointRadius: 2,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: cssVar("--ink-faint"), maxTicksLimit: 8 }, grid: { display: false } },
          y: { ticks: { color: cssVar("--ink-faint") }, grid: { color: cssVar("--line") } },
        },
      },
    });
  }

  return { renderPie, renderBar, renderLine };
})();
