const DATA_URL = "./data/transformers.json";

// Inventory statuses that should appear on this page
const INVENTORY_STATUSES = [
  "IN STOCK",
  "NEW T.B.T.",
  "RECOVERED T.B.T.",
  "NEEDS TESTED",
  "ON HOLD",
  "NEEDS PAINTED"
];

// State
let allRows = [];
let filteredRows = [];
let selectedRow = null;
let filtersApplied = false;

// Elements
const elType = document.getElementById("filter-type");
const elKva = document.getElementById("filter-kva");
const elPri = document.getElementById("filter-pri");
const elSec = document.getElementById("filter-sec");

const btnApply = document.getElementById("btn-apply");
const btnViewEdit = document.getElementById("btn-viewedit");
const btnPreview = document.getElementById("btn-preview");
const btnPrint = document.getElementById("btn-print");
const btnQuit = document.getElementById("btn-quit");
const btnHelp = document.getElementById("btn-help");

const elSearch = document.getElementById("search");
const elStatus = document.getElementById("status");
const tbody = document.getElementById("grid-body");

const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const modalBody = document.getElementById("modal-body");
const modalSubtitle = document.getElementById("modal-subtitle");

// ---------- Helpers ----------
function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function normalizeStatus(s) {
  return safeStr(s).toUpperCase();
}

/** Always format impedance to 2 decimal places */
function formatImp(v) {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (Number.isNaN(n)) return safeStr(v);
  return n.toFixed(2);
}

function uniqSorted(values) {
  return Array.from(new Set(values.filter(v => safeStr(v) !== "")))
    .sort((a, b) => safeStr(a).localeCompare(safeStr(b), undefined, { numeric: true }));
}

function setButtonsState() {
  btnPreview.disabled = !filtersApplied;
  btnPrint.disabled = !filtersApplied;
  btnViewEdit.disabled = !(filtersApplied && selectedRow);
}

function isInventoryStatus(row) {
  return INVENTORY_STATUSES.includes(normalizeStatus(row.STATUS));
}

function populateSelect(selectEl, values, allLabel) {
  const opts = uniqSorted(values);
  selectEl.innerHTML =
    `<option value="">${allLabel}</option>` +
    opts.map(v => `<option value="${v}">${v}</option>`).join("");
}

// ---------- Filtering ----------
function applyFilters() {
  const typeVal = elType.value;
  const kvaVal = elKva.value;
  const priVal = elPri.value;
  const secVal = elSec.value;

  const inventoryRows = allRows.filter(isInventoryStatus);

  filteredRows = inventoryRows.filter(r => {
    if (typeVal && safeStr(r.TYPE) !== typeVal) return false;
    if (kvaVal && safeStr(r.KVA) !== kvaVal) return false;
    if (priVal && safeStr(r.PRI_VOLT) !== priVal) return false;
    if (secVal && safeStr(r.SEC_VOLT) !== secVal) return false;
    return true;
  });

  filtersApplied = true;
  selectedRow = null;
  setButtonsState();
  applySearchAndRender();
}

function applySearchAndRender() {
  const q = safeStr(elSearch.value).toLowerCase();

  const rows = (!q)
    ? filteredRows
    : filteredRows.filter(r =>
        Object.values(r).map(safeStr).join(" ").toLowerCase().includes(q)
      );

  renderGrid(rows);
  elStatus.textContent = `Inventory records ${rows.length} (of ${allRows.length} total transformers)`;
}

// ---------- Grid ----------
function renderGrid(rows) {
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML =
      `<tr><td colspan="5" style="padding:14px;color:#5b677a;">No inventory records found.</td></tr>`;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${safeStr(r.MFG)}</td>
      <td>${safeStr(r.SERIAL)}</td>
      <td>${formatImp(r.IMP)}</td>
      <td>${safeStr(r.STATUS)}</td>
      <td>${safeStr(r.LOCATION)}</td>
    `;

    tr.addEventListener("click", () => {
      document.querySelectorAll("tr.selected").forEach(x => x.classList.remove("selected"));
      tr.classList.add("selected");
      selectedRow = r;
      setButtonsState();
    });

    tbody.appendChild(tr);
  });
}

// ---------- Modal ----------
function openModalForRow(row) {
  modalSubtitle.textContent = `Trans_ID: ${safeStr(row.TRANS_ID) || "—"} • Status: ${safeStr(row.STATUS) || "—"}`;

  modalBody.innerHTML = `
    <div class="kv">
      ${Object.keys(row).map(k => {
        const val = (k === "IMP") ? formatImp(row[k]) : safeStr(row[k]);
        return `
          <div class="field">
            <div class="label">${k}</div>
            <div class="value">${val || "—"}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}

// ---------- Report ----------
const REPORT_COLUMNS = [
  { key: "MFG",     label: "Manufacturer" },
  { key: "SERIAL",  label: "Serial Number" },
  { key: "IMP",     label: "Imp", formatter: formatImp },
  { key: "LOCATION",label: "Location" },
  { key: "STATUS",  label: "Status" },
  { key: "REMARKS", label: "Remarks" }
];

function buildReportHtml(rows, title) {
  const now = new Date().toLocaleString();

  const head = REPORT_COLUMNS.map(c => `<th>${c.label}</th>`).join("");
  const body = rows.map(r => {
    const tds = REPORT_COLUMNS.map(c => {
      const raw = r[c.key];
      const val = c.formatter ? c.formatter(raw) : safeStr(raw);
      return `<td>${val}</td>`;
    }).join("");
    return `<tr>${tds}</tr>`;
  }).join("");

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body{ font-family: Cabin, Segoe UI, Arial, sans-serif; margin:18px; color:#111827; }
    h1{ font-size:20px; margin:0 0 6px 0; font-weight:900; }
    .meta{ font-size:12px; color:#6b7280; margin-bottom:12px; }
    table{ width:100%; border-collapse:collapse; }
    th{
      background:#0b3a78; color:#fff;
      text-align:left; font-size:12px; padding:8px;
    }
    td{
      padding:7px 8px;
      border-bottom:1px solid #e5e7eb;
      font-size:12px;
      vertical-align:top;
    }
    td:last-child{
      white-space:normal;
      max-width:520px;
      word-wrap:break-word;
    }
    @media print{
      body{ margin:10mm; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">Generated: ${now} • Inventory Records: ${rows.length}</div>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;
}

function openReportWindow(doPrint) {
  if (!filtersApplied) return;

  const q = safeStr(elSearch.value).toLowerCase();
  const rows = (!q)
    ? filteredRows
    : filteredRows.filter(r =>
        Object.values(r).map(safeStr).join(" ").toLowerCase().includes(q)
      );

  const html = buildReportHtml(rows, "Transformer Inventory Listing");

  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked. Please allow popups for Preview/Print.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();

  if (doPrint) setTimeout(() => w.print(), 250);
}

// ---------- Help ----------
function showHelp() {
  alert(
`Transformer Inventory Listing

This page shows ONLY inventory statuses:
${INVENTORY_STATUSES.join(", ")}

Impedance (Imp) is always displayed with two decimal places.

Use filters as needed, then click Search.
Preview / Print reflect the current filtered inventory.`
  );
}

// ---------- Init ----------
async function init() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allRows = await res.json();

    const inv = allRows.filter(isInventoryStatus);

    populateSelect(elType, inv.map(r => safeStr(r.TYPE)), "All Types");
    populateSelect(elKva,  inv.map(r => safeStr(r.KVA)),  "All KVA");
    populateSelect(elPri,  inv.map(r => safeStr(r.PRI_VOLT)), "All Primary");
    populateSelect(elSec,  inv.map(r => safeStr(r.SEC_VOLT)), "All Secondary");

    filtersApplied = false;
    selectedRow = null;
    setButtonsState();

    elType.focus();
    applyFilters();

  } catch (err) {
    elStatus.textContent = `Failed to load data: ${err.message}`;
  }
}

// ---------- Events ----------
btnApply.addEventListener("click", applyFilters);

function markFiltersDirty() {
  filtersApplied = false;
  selectedRow = null;
  setButtonsState();
  document.querySelectorAll("tr.selected").forEach(x => x.classList.remove("selected"));
}

elType.addEventListener("change", markFiltersDirty);
elKva.addEventListener("change", markFiltersDirty);
elPri.addEventListener("change", markFiltersDirty);
elSec.addEventListener("change", markFiltersDirty);

elSearch.addEventListener("input", applySearchAndRender);

btnViewEdit.addEventListener("click", () => {
  if (selectedRow) openModalForRow(selectedRow);
});

btnPreview.addEventListener("click", () => openReportWindow(false));
btnPrint.addEventListener("click", () => openReportWindow(true));

btnQuit.addEventListener("click", () => location.reload());

if (btnHelp) btnHelp.addEventListener("click", showHelp);
modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

init();
