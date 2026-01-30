const scoreEl = document.getElementById("risk-score");
const statusEl = document.getElementById("risk-status");
const updatedEl = document.getElementById("last-updated");
const warningEl = document.getElementById("data-warning");
const needleEl = document.getElementById("needle");
const cardsEl = document.getElementById("indicator-cards");
const contributorsEl = document.getElementById("top-contributors");
const weightsEl = document.getElementById("weights-table");
const tabs = document.querySelectorAll(".tab");

const categoryMap = {
  vix: "volatility",
  credit_spread: "credit",
  yield_curve: "rates",
  real_rate: "rates",
  financial_conditions: "liquidity"
};

function statusLabel(score) {
  if (score >= 80) {
    return { label: "Extreme Risk", color: "var(--extreme)" };
  }
  if (score >= 60) {
    return { label: "Elevated Risk", color: "var(--high)" };
  }
  if (score >= 40) {
    return { label: "Moderate Risk", color: "var(--elevated)" };
  }
  if (score >= 20) {
    return { label: "Low Risk", color: "var(--moderate)" };
  }
  return { label: "Very Healthy", color: "var(--low)" };
}

function formatDate(isoString, timezone) {
  if (!isoString) {
    return "--";
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  const formatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone || "UTC"
  });
  return `${formatter.format(date)} ${timezone || "UTC"}`;
}

function updateGauge(score) {
  const clamped = Math.max(0, Math.min(100, score));
  const angle = -90 + (clamped / 100) * 180;
  needleEl.style.transform = `rotate(${angle}deg)`;
}

function renderCards(indicators, activeCategory) {
  cardsEl.innerHTML = "";
  const filtered = indicators.filter((indicator) => {
    if (activeCategory === "all") {
      return true;
    }
    return categoryMap[indicator.id] === activeCategory;
  });

  if (filtered.length === 0) {
    cardsEl.innerHTML = "<p class=\"muted\">No indicators available.</p>";
    return;
  }

  filtered.forEach((indicator) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <h3>${indicator.name}</h3>
      <div class="value">${indicator.latestValue}</div>
      <div class="subscore">Sub-score: ${indicator.subScore} · Weight: ${indicator.weight}</div>
      <details>
        <summary>Details</summary>
        <p class="muted">
          Latest observation: ${indicator.latestDate}. Percentile: ${indicator.percentile}.
          Contribution: ${indicator.contribution}. Source: ${indicator.source ?? "Manual"}.
        </p>
      </details>
    `;
    cardsEl.appendChild(card);
  });
}

function renderContributors(indicators) {
  const sorted = indicators
    .slice()
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3);

  contributorsEl.innerHTML = sorted
    .map(
      (indicator) =>
        `<li><strong>${indicator.name}</strong>: ${indicator.contribution} points</li>`
    )
    .join("");
}

function renderWeights(indicators) {
  weightsEl.innerHTML = indicators
    .map(
      (indicator) =>
        `<div class="weights-row"><span>${indicator.name}</span><span>${indicator.weight}</span></div>`
    )
    .join("");
}

function loadEmbeddedData() {
  const node = document.getElementById("risk-data");
  if (!node) {
    return null;
  }
  try {
    return JSON.parse(node.textContent);
  } catch (error) {
    return null;
  }
}

async function loadRiskData() {
  try {
    const response = await fetch("data/latest-risk-score.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load data");
    }
    return await response.json();
  } catch (error) {
    warningEl.hidden = false;
    return loadEmbeddedData();
  }
}

function hydratePage(data) {
  if (!data) {
    return;
  }

  const score = data.smoothedScore ?? data.rawScore ?? 0;
  scoreEl.textContent = score;
  const status = statusLabel(score);
  statusEl.textContent = status.label;
  statusEl.style.color = status.color;
  updatedEl.textContent = `Last updated: ${formatDate(data.updatedAt, data.timezone)}`;
  updateGauge(score);

  const indicators = data.indicators ?? [];
  renderCards(indicators, "all");
  renderContributors(indicators);
  renderWeights(indicators);

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      renderCards(indicators, tab.dataset.category);
    });
  });
}

loadRiskData().then(hydratePage);
