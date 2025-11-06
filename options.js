// Amazon Return Notes - options script

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value).replace(/\r?\n/g, " ");
  if (/[",]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function setStatus(text) {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = text || "";
}

function exportCsv() {
  setStatus("Building CSV...");

  chrome.storage.sync.get(null, data => {
    const all = data || {};
    const rows = [];

    const header = [
      "Key",
      "Order ID",
      "Return Created",
      "RMA ID",
      "ASIN",
      "Product Title",
      "Product Price",
      "Seller",
      "Product Metadata",
      "Notes",
      "Completed",
      "Last Saved ISO",
      "Last Saved Display"
    ];
    rows.push(header);

    Object.entries(all).forEach(([key, entry]) => {
      if (!key.startsWith("arn_")) return;

      const metaPairs = Array.isArray(entry.metadata)
        ? entry.metadata
        : [];

      const metaString = metaPairs
        .map(pair => `${pair.label}: ${pair.value}`)
        .join(" | ");

      rows.push([
        key,
        entry.orderId || "",
        entry.returnCreated || "",
        entry.rmaId || "",
        entry.asin || "",
        entry.title || "",
        entry.price || "",
        entry.seller || "",
        metaString,
        entry.notes || "",
        entry.completed ? "1" : "0",
        entry.lastSaved || "",
        entry.lastSavedDisplay || ""
      ]);
    });

    if (rows.length === 1) {
      setStatus("No Amazon Return Notes entries found in storage.");
      return;
    }

    const csv = rows
      .map(row => row.map(csvEscape).join(","))
      .join("\r\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);

    const now = new Date();
    const filename = `amazon-return-notes-${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.csv`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatus(`Exported ${rows.length - 1} entries to ${filename}.`);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("exportCsv")
    .addEventListener("click", exportCsv);
  setStatus("");
});
