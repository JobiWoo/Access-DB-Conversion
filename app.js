const $ = id => document.getElementById(id);

function lockAll() {
  [
    "cmbInitiator","Combo37","Proposal_Number","Temp_ID","CFES_Date",
    "Utility_Date","Ameritech_File_Number","Combo9","Date_Completed","Description"
  ].forEach(id => $(id).disabled = true);

  $("BCF_Number").disabled = $("Proposal_Prefix").value !== "BCF";
}

lockAll();

$("Answered").onclick = () => {
  $("CFES_Date").disabled = false;
  $("CFES_Date").focus();
};

$("Command39").onclick = () => {
  $("Utility_Date").disabled = false;
  $("Ameritech_File_Number").disabled = false;
};

$("BCF_Number").onclick = () => {
  $("Proposal_Number").disabled = false;
  $("Temp_ID").disabled = false;
};

$("Completion").onclick = () => {
  $("Combo9").disabled = false;
  $("Date_Completed").disabled = false;
  $("dateCompletedDialog").showModal();
};

$("dialog_ok").onclick = () => $("dateCompletedDialog").close();
$("dialog_cancel").onclick = () => $("dateCompletedDialog").close();

$("Edit_Description").onclick = () => {
  $("Description").disabled = false;
  $("Description").focus();
};

$("Save").onclick = () => {
  alert("Saved (prototype only)");
  lockAll();
};

$("Undo").onclick = () => {
  if (confirm("Undo changes?")) {
    document.querySelectorAll("input, textarea").forEach(el => el.value = "");
    lockAll();
  }
};

$("Quit_Button").onclick = () => {
  alert("Quit form (prototype)");
};
