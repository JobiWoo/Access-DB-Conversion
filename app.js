// Access DB Conversion – Prototype behavior (locks/unlocks like Access)
// Keeps the SAME IDs you were already using.

const $ = (id) => document.getElementById(id);

const FIELD_IDS = [
  "Proposal_Prefix",
  "cmbInitiator",
  "Combo37",
  "Proposal_Number",
  "Temp_ID",
  "Date_Entered",
  "CFES_Date",
  "Utility_Date",
  "Ameritech_File_Number",
  "Combo9",
  "Date_Completed",
  "Description",
];

function setLocked(id, locked) {
  const el = $(id);
  if (!el) return;
  // In HTML: disabled is the closest stand-in for Access Enabled=False / Locked=True behavior
  el.disabled = !!locked;
}

function focusSave() {
  const btn = $("Save");
  if (btn) btn.focus();
}

function lockAllInputs() {
  [
    "cmbInitiator",
    "Combo37",
    "Proposal_Number",
    "Temp_ID",
    "CFES_Date",
    "Date_Entered",
    "Utility_Date",
    "Ameritech_File_Number",
    "Combo9",
    "Date_Completed",
    "Description",
  ].forEach((id) => setLocked(id, true));

  // Conditional enable of BCF_Number button (like your VBA)
  const isBCF = $("Proposal_Prefix")?.value === "BCF";
  const bcfBtn = $("BCF_Number");
  if (bcfBtn) bcfBtn.disabled = !isBCF;
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("is-visible");

  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 3200);
}

function readState() {
  const state = {};
  for (const id of FIELD_IDS) {
    const el = $(id);
    if (!el) continue;
    state[id] = el.value;
  }
  return state;
}

function applyState(state) {
  for (const id of FIELD_IDS) {
    const el = $(id);
    if (!el) continue;
    if (state[id] !== undefined) el.value = state[id];
  }
}

let savedState = {};

function setDirtyUI(isDirty) {
  const dirtyEl = $("dirtyIndicator");
  if (dirtyEl) dirtyEl.textContent = isDirty ? "Yes" : "No";
}

function updateDirty() {
  const current = readState();
  const isDirty = JSON.stringify(current) !== JSON.stringify(savedState);
  setDirtyUI(isDirty);
  return isDirty;
}

function setLastSavedNow() {
  const el = $("lastSaved");
  if (!el) return;
  el.textContent = new Date().toLocaleString();
}

function initializeSavedState() {
  savedState = readState();
  setDirtyUI(false);
}

function wireDirtyTracking() {
  const controls = document.querySelectorAll("input, select, textarea");
  controls.forEach((el) => {
    if (el.id === "txtFormName") return;
    if (el.id === "dialog_notes") return;

    const handler = () => updateDirty();
    el.addEventListener("input", handler);
    el.addEventListener("change", handler);
  });
}

function formOpen() {
  // Mimic Form_Open: lock everything
  lockAllInputs();

  // UI bits
  const formName = $("txtFormName")?.value || "Prototype";
  const pill = $("formPill");
  if (pill) pill.textContent = formName;

  initializeSavedState();
}

document.addEventListener("DOMContentLoaded", () => {
  formOpen();
  wireDirtyTracking();

  // If user changes prefix, re-evaluate BCF_Number enablement
  $("Proposal_Prefix")?.addEventListener("change", () => {
    lockAllInputs();
    updateDirty();
  });

  // --- VBA: Ameritech_File_Number_AfterUpdate -> Save.SetFocus
  $("Ameritech_File_Number")?.addEventListener("change", focusSave);

  // --- VBA: Answered_Click -> enable CFES_Date and focus it
  $("Answered")?.addEventListener("click", () => {
    setLocked("CFES_Date", false);
    $("CFES_Date")?.focus();
    showToast("CFES Date unlocked.");
  });

  // --- VBA: CFES_Date_AfterUpdate -> Save focus, CFES_Date disabled, Utility_Date locked
  $("CFES_Date")?.addEventListener("change", () => {
    focusSave();
    setLocked("CFES_Date", true);
    setLocked("Utility_Date", true);
    showToast("CFES Date set.");
  });

  // --- VBA: Command39_Click -> enable Utility_Date + Ameritech_File_Number and focus Utility_Date
  $("Command39")?.addEventListener("click", () => {
    setLocked("Utility_Date", false);
    setLocked("Ameritech_File_Number", false);
    $("Utility_Date")?.focus();
    showToast("Utility fields unlocked.");
  });

  // --- VBA: BCF_Number_Click -> enable Proposal_Number + Temp_ID and focus Proposal_Number
  $("BCF_Number")?.addEventListener("click", () => {
    setLocked("Proposal_Number", false);
    setLocked("Temp_ID", false);
    $("Proposal_Number")?.focus();
    showToast("Proposal fields unlocked.");
  });

  // --- VBA: Proposal_Number_AfterUpdate if prefix=BCF then Temp_ID="N/A" and focus Save
  $("Proposal_Number")?.addEventListener("change", () => {
    if ($("Proposal_Prefix")?.value === "BCF") {
      const temp = $("Temp_ID");
      if (temp) temp.value = "N/A";
      focusSave();
    }
  });

  // --- VBA: Completion_Click -> enable Combo9 + Date_Completed, then open "Date Completed" form
  $("Completion")?.addEventListener("click", () => {
    setLocked("Combo9", false);
    setLocked("Date_Completed", false);

    const dlg = $("dateCompletedDialog");
    if (dlg && typeof dlg.showModal === "function") dlg.showModal();

    showToast("Completion fields unlocked.");
  });

  // Dialog buttons
  const dlg = $("dateCompletedDialog");
  $("dialog_ok")?.addEventListener("click", () => dlg?.close("ok"));
  $("dialog_cancel")?.addEventListener("click", () => dlg?.close("cancel"));
  $("dialog_close")?.addEventListener("click", () => dlg?.close("cancel"));

  // --- VBA: Date_Completed_AfterUpdate -> Save focus; lock Combo9 & Date_Completed
  $("Date_Completed")?.addEventListener("change", () => {
    focusSave();
    setLocked("Combo9", true);
    setLocked("Date_Completed", true);
    showToast("Completion date set.");
  });

  // --- VBA: Description_AfterUpdate -> Save focus; lock Description
  $("Description")?.addEventListener("change", () => {
    focusSave();
    setLocked("Description", true);
    showToast("Description updated.");
  });

  // --- VBA: Edit_Description_Click -> enable Description and focus it
  $("Edit_Description")?.addEventListener("click", () => {
    setLocked("Description", false);
    $("Description")?.focus();
    showToast("Description unlocked.");
  });

  // --- VBA: Save_GotFocus locks everything and conditionally enables BCF_Number
  $("Save")?.addEventListener("focus", () => {
    lockAllInputs();
  });

  // --- VBA: Save_Click -> (prototype) store state in memory + update UI
  $("Save")?.addEventListener("click", () => {
    lockAllInputs();

    savedState = readState(); // "committed" state in-memory (prototype)
    setLastSavedNow();
    setDirtyUI(false);

    showToast("Saved (prototype).");
  });

  // --- VBA: Undo_Click -> revert to last saved state (instead of clearing everything)
  $("Undo")?.addEventListener("click", () => {
    const isDirty = updateDirty();
    if (!isDirty) {
      showToast("Nothing to undo.");
      return;
    }

    const ok = confirm("Undo changes? (Revert to last saved state)");
    if (!ok) return;

    applyState(savedState);
    lockAllInputs();
    setDirtyUI(false);
    showToast("Reverted to last saved state.");
  });

  // --- VBA: Quit_Button_Click -> confirm if dirty
  $("Quit_Button")?.addEventListener("click", () => {
    const isDirty = updateDirty();
    if (isDirty) {
      const ok = confirm("You have unsaved changes. Quit anyway?");
      if (!ok) return;
    }

    showToast("Quit (prototype).");
    // Optional: route somewhere if you add another page later
    // location.href = "./";
  });

  // Header Help button
  $("helpBtn")?.addEventListener("click", () => {
    showToast("Help: Use the action buttons to unlock fields, then click Save.");
  });
});
