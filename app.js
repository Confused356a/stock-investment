const els = {
  search: document.querySelector("#stockSearch"),
  grid: document.querySelector("#stockGrid"),
  empty: document.querySelector("#emptyState"),
  error: document.querySelector("#errorState"),
  total: document.querySelector("#totalCount"),
  green: document.querySelector("#greenCount"),
  orange: document.querySelector("#orangeCount"),
  visible: document.querySelector("#visibleCount"),
  updated: document.querySelector("#updatedDate"),
  status: document.querySelector("#resultStatus"),
};

let stocks = [];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const headers = rows.shift().map((header) => header.replace(/^\uFEFF/, ""));
  return rows
    .filter((values) => values.some(Boolean))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function signalType(signal) {
  if (signal.includes("🟢")) return "green";
  if (signal.includes("🟠")) return "orange";
  return "neutral";
}

function cardTemplate(stock) {
  const type = signalType(stock["价格信号"]);
  const signalText = stock["价格信号"] === "—" ? "暂未触发" : stock["价格信号"];
  return `
    <article class="stock-card signal-${type}">
      <div class="card-head">
        <div>
          <h3 class="stock-name">${escapeHtml(stock["股票"])}</h3>
          <p class="stock-code">${escapeHtml(stock["市场/代码"])}</p>
        </div>
        <span class="tier">${escapeHtml(stock["分档"])}</span>
      </div>

      <div class="price-row">
        <div>
          <div class="price">${escapeHtml(stock["最新收盘价"])}</div>
          <span class="date">收盘日 ${escapeHtml(stock["收盘日"])}</span>
        </div>
        <span class="signal ${type}">${escapeHtml(signalText)}</span>
      </div>

      <p class="judgment">${escapeHtml(stock["当前判断"])}</p>

      <div class="metrics" aria-label="估值指标">
        <div class="metric"><span>PE</span><strong title="${escapeHtml(stock["PE"])}">${escapeHtml(stock["PE"])}</strong></div>
        <div class="metric"><span>PB</span><strong title="${escapeHtml(stock["PB"])}">${escapeHtml(stock["PB"])}</strong></div>
        <div class="metric"><span>ROE</span><strong title="${escapeHtml(stock["ROE"])}">${escapeHtml(stock["ROE"])}</strong></div>
        <div class="metric"><span>股息率</span><strong title="${escapeHtml(stock["股息率"])}">${escapeHtml(stock["股息率"])}</strong></div>
      </div>

      <div class="reference-row">
        <span>参考买入区间</span>
        <strong>${escapeHtml(stock["历史回测参考买入区间（非保证）"])}</strong>
      </div>
    </article>`;
}

function normalize(value) {
  return String(value).toLocaleLowerCase("zh-CN").replace(/\s+/g, "");
}

function render(query = "") {
  const needle = normalize(query);
  const filtered = needle
    ? stocks.filter((stock) => normalize(Object.values(stock).join(" ")).includes(needle))
    : stocks;

  els.grid.innerHTML = filtered.map(cardTemplate).join("");
  els.visible.textContent = filtered.length;
  els.empty.hidden = filtered.length !== 0;
  els.grid.hidden = filtered.length === 0;
  els.status.textContent = query
    ? `“${query}”找到 ${filtered.length} 只股票`
    : `显示全部 ${filtered.length} 只股票`;
}

async function loadStocks() {
  try {
    const response = await fetch(`stocks.csv?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    stocks = parseCsv(await response.text());
    const updateDates = stocks.map((stock) => stock["更新日期"]).filter(Boolean).sort();

    els.total.textContent = stocks.length;
    els.green.textContent = stocks.filter((stock) => signalType(stock["价格信号"]) === "green").length;
    els.orange.textContent = stocks.filter((stock) => signalType(stock["价格信号"]) === "orange").length;
    els.updated.textContent = updateDates.at(-1) ?? "—";
    render();
  } catch (error) {
    els.grid.hidden = true;
    els.error.hidden = false;
    els.status.textContent = "数据读取失败";
    console.error(error);
  }
}

els.search.addEventListener("input", (event) => render(event.target.value.trim()));

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    els.search.focus();
  }
});

loadStocks();
