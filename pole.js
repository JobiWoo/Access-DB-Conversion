const DATA_URL = "./data/transformers.json";

/* =========================
   CENTRALIZED FIELD RULES
   (same idea as index page)
   ========================= */

function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function toNumberOrNaN(v) {
  if (v === null || v === undefined || v === "") return NaN;
  const n = Number(v);
  return Number.isNaN(n) ? NaN : n;
}

function fmtFixed(v, decimals) {
  const n = toNumberOrNaN(v);
  if (Number.isNaN(n)) return safeStr(v);
  return n.toFixed(decimals);
}

const FIELD_RULES = {
  // Used in this page grid/report
  ADDRESS:  { label: "Address", format: (v) => safeStr(v) },
  KVA:      { label: "KVA", format: (v) => safeStr(v) },
  SERIAL:   { label: "Serial", format: (v) => safeStr(v) },
  PRI_VOLT: { label: "Pri", format: (v) => safeStr(v) },
  SEC_VOLT: { label: "Sec", format: (v) => safeStr(v) },
  FEEDER:   { label: "Feeder", format: (v) => safeStr(v) },

  // Used in modal/report meta
  TRANS_ID: { label: "Trans_ID", format: (v) => safeStr(v) },
  POLE_NO:  { label: "Pole No", format: (v) => safeStr(v) },
  MFG:      { label: "Manufacturer", format: (v) => safeStr(v) },
  STATUS:   { label: "Status", format: (v) => safeStr(v) },
  LOCATION: { label: "Location", format: (v) => safeStr(v) },
  REMARKS:  { label: "Remarks", format: (v) => safeStr(v) },
  IMP:      { label: "Imp", format: (v) => fmtFixed(v, 2) },
};

function formatField(key, value) {
  const rule = FIELD_RULES[key];
  return rule ? rule.format(value) : safeStr(value);
}

/* =========================
   PAGE STATE + ELEMENTS
   ========================= */

let allRows = [];
let poleRows = [];        // results after pole search
let displayRows = [];     // poleRows further filtered by search-within-results
let selectedRow = null;

const poleInput = document.getElementById("pole-input");
const btnPoleSearch = document.getElementById("btn-pole-search");

const btnViewEdit = document.getElementById("btn-viewedit");
const btnPreview = document.getElementById("btn-preview");
const btnQuit = document.getElementById("btn-quit");
const btnHelp = document.getElementById("btn-help");

const elSearch = document.getElementById("search");
const elStatus = document.getElementById("status");
const tbody = document.getElementById("grid-body");

const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const modalBody = document.getElementById("modal-body");
const modalSubtitle = document.getElementById("modal-subtitle");

/* =========================
   VBA-LIKE BEHAVIOR
   ========================= */

function normalizePole(v) {
  // Access uses an index seek; we emulate by normalizing input and stored values
  return safeStr(v).toUpperCase().replace(/\s+/g, "");
}

function setButtonsInitial() {
  // Like Field3_GotFocus / Form_Open: disable actions until successful search
  btnViewEdit.disabled = true;
  btnPreview.disabled = true;
}

function beep() {
  // best-effort beep
  try { window.navigator.vibrate?.(80); } catch {}
  try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(); o.connect(ctx.destination); o.start(); setTimeout(()=>{o.stop(); ctx.close();}, 90); } catch {}
}

function clearSelection() {
  selectedRow = null;
  btnViewEdit.disabled = true;
  document.querySelectorAll("tr.selected").forEach(x => x.classList.remove("selected"));
}

function computeAddress(row) {
  // "Address" in screenshot: likely House # + Street. Your JSON has HSE_NUM + STREET.
  const hse = safeStr(row.HSE_NUM);
  const street = safeStr(row.STREET);
  const both = [hse, street].filter(Boolean).join(" ");
  return both || "—";
}

function computeFeeder(row) {
  // Your JSON sometimes has FEEDER null and Feeder populated, or FEEDER numeric. Prefer FEEDER then Feeder.
  const f1 = safeStr(row.FEEDER);
  const f2 = safeStr(row.Feeder);
  return f1 || f2 || "—";
}

/* =========================
   GRID RENDERING
   ========================= */

function renderGrid(rows) {
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="padding:14px;color:#5b677a;">No results.</td></tr>`;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");

    const address = computeAddress(r);
    const kva = formatField("KVA", r.KVA);
    const serial = formatField("SERIAL", r.SERIAL);
    const pri = formatField("PRI_VOLT", r.PRI_VOLT);
    const sec = formatField("SEC_VOLT", r.SEC_VOLT);
    const feeder = computeFeeder(r);

    tr.innerHTML = `
      <td title="${address}">${address}</td>
      <td title="${kva}">${kva}</td>
      <td title="${serial}">${serial}</td>
      <td title="${pri}">${pri}</td>
      <td title="${sec}">${sec}</td>
      <td title="${feeder}">${feeder}</td>
    `;

    tr.addEventListener("click", () => {
      document.querySelectorAll("tr.selected").forEach(x => x.classList.remove("selected"));
      tr.classList.add("selected");
      selectedRow = r;
      btnViewEdit.disabled = false; // enabled after successful search + selection
    });

    tbody.appendChild(tr);
  });
}

/* =========================
   SEARCH ACTION (POLE)
   ========================= */

function runPoleSearch() {
  const raw = poleInput.value;
  const pole = normalizePole(raw);

  clearSelection();
  btnPreview.disabled = true; // re-disable until we get results

  if (!pole) {
    beep();
    alert("Enter a Pole Number to search.");
    poleInput.focus();
    return;
  }

  poleRows = allRows.filter(r => normalizePole(r.POLE_NO) === pole);
  displayRows = poleRows.slice();

  if (!poleRows.length) {
    beep();
    alert("There is no such pole number in the database.");
    poleInput.focus();
    tbody.innerHTML = "";
    elStatus.textContent = "No matches.";
    return;
  }

  // success: enable preview like Access
  btnPreview.disabled = false;

  renderGrid(displayRows);
  elStatus.textContent = `Pole ${poleInput.value} • Matches: ${poleRows.length}`;
}

/* =========================
   SEARCH WITHIN RESULTS
   ========================= */

function runWithinSearch() {
  const q = safeStr(elSearch.value).toLowerCase();

  if (!poleRows.length) {
    tbody.innerHTML = "";
    return;
  }

  displayRows = (!q)
    ? poleRows.slice()
    : poleRows.filter(r => Object.values(r).map(safeStr).join(" ").toLowerCase().includes(q));

  clearSelection();
  renderGrid(displayRows);
  elStatus.textContent = `Matches: ${displayRows.length}`;
}

/* =========================
   VIEW/EDIT MODAL
   ========================= */

function openModalForRow(row) {
  if (!row) return;

  modalSubtitle.textContent =
    `Trans_ID: ${formatField("TRANS_ID", row.TRANS_ID) || "—"} • Pole: ${formatField("POLE_NO", row.POLE_NO) || "—"}`;

  modalBody.innerHTML = `
    <div class="kv">
      ${Object.keys(row).map(k => `
        <div class="field">
          <div class="label">${FIELD_RULES[k]?.label || k}</div>
          <div class="value">${formatField(k, row[k]) || "—"}</div>
        </div>
      `).join("")}
    </div>
  `;

  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}

/* =========================
   PREVIEW REPORT
   ========================= */

const REPORT_KEYS = ["ADDRESS", "KVA", "SERIAL", "PRI_VOLT", "SEC_VOLT", "FEEDER"];

function buildReportHtml(rows, poleLabel) {
  const now = new Date().toLocaleString();

  const head = [
    `<th>Address</th>`,
    `<th>KVA</th>`,
    `<th>Serial</th>`,
    `<th>Pri</th>`,
    `<th>Sec</th>`,
    `<th>Feeder</th>`
  ].join("");

  const body = rows.map(r => {
    const address = computeAddress(r);
    const kva = formatField("KVA", r.KVA);
    const serial = formatField("SERIAL", r.SERIAL);
    const pri = formatField("PRI_VOLT", r.PRI_VOLT);
    const sec = formatField("SEC_VOLT", r.SEC_VOLT);
    const feeder = computeFeeder(r);

    return `<tr>
      <td>${address}</td>
      <td>${kva}</td>
      <td>${serial}</td>
      <td>${pri}</td>
      <td>${sec}</td>
      <td>${feeder}</td>
    </tr>`;
  }).join("");

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Transformers By Pole Number</title>
  <style>
    body{ font-family: Cabin, Segoe UI, Arial, sans-serif; margin:18px; color:#111827; }
    h1{ font-size:20px; margin:0 0 6px 0; font-weight:900; }
    .meta{ font-size:12px; color:#6b7280; margin-bottom:12px; }
    table{ width:100%; border-collapse:collapse; }
    th{ background:#0b3a78; color:#fff; text-align:left; font-size:12px; padding:8px; }
    td{ padding:7px 8px; border-bottom:1px solid #e5e7eb; font-size:12px; white-space:nowrap; }
    @media print{ body{ margin:10mm; } }
  </style>
</head>
<body>
  <h1>Transformers By Pole Number</h1>
  <div class="meta">Pole: ${poleLabel} • Generated: ${now} • Records: ${rows.length}</div>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;
}

function openPreview() {
  if (btnPreview.disabled) return;

  const poleLabel = safeStr(poleInput.value) || "—";
  const rows = displayRows.length ? displayRows : poleRows;

  const html = buildReportHtml(rows, poleLabel);
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked. Please allow popups.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* =========================
   HELP / INIT / EVENTS
   ========================= */

function showHelp() {
  alert(
`Transformers By Pole Number

1) Enter a Pole Number (ex: M13929, CF1586)
2) Click Search
3) If matches exist, Preview is enabled
4) Click a row to enable View/Edit

This page is read-only for now.`
  );
}

async function init() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allRows = await res.json();

    setButtonsInitial();
    poleInput.focus();
    elStatus.textContent = "Enter a pole number and click Search.";
  } catch (err) {
    elStatus.textContent = `Failed to load data: ${err.message}`;
  }
}

btnPoleSearch.addEventListener("click", runPoleSearch);
poleInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runPoleSearch();
});

btnViewEdit.addEventListener("click", () => {
  if (selectedRow) openModalForRow(selectedRow);
});

btnPreview.addEventListener("click", openPreview);

btnQuit.addEventListener("click", () => {
  // mimic close form: go back to inventory page
  window.location.href = "./index.html";
});

elSearch.addEventListener("input", runWithinSearch);

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

if (btnHelp) btnHelp.addEventListener("click", showHelp);

init();
