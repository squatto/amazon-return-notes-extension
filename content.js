// Amazon Return Notes - content script (fixed Return Created extraction)

const ARN_NAMESPACE = "arn_";
const arnMetaByKey = {};

// Normalize text
function arnExtractText(node) {
  if (!node) return "";
  return node.textContent.replace(/\s+/g, " ").trim();
}

// Format ISO datetime for display: m/d/Y h:ia
function arnFormatDisplayDate(isoString) {
  if (!isoString) return "Never";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "Never";

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  let ampm = "am";

  if (hours >= 12) {
    ampm = "pm";
    if (hours > 12) hours -= 12;
  }
  if (hours === 0) hours = 12;

  return `${month}/${day}/${year} ${hours}:${minutes}${ampm}`;
}

// Build a storage key for a given return
function arnBuildKey(meta) {
  const orderPart = meta.orderId || "unknownOrder";
  const asinPart = meta.asin || "";
  const titlePart = meta.title || "";
  const raw = `${ARN_NAMESPACE}${orderPart}_${asinPart || titlePart}`;
  // storage-safe
  return raw.replace(/[^\w\-]/g, "_");
}

// Extract metadata from a single return box
function arnExtractMetaFromBox(box) {
  const meta = {
    orderId: "",
    returnCreated: "",
    rmaId: "",
    asin: "",
    title: "",
    price: "",
    seller: "",
    metadata: []
  };

  const miniSpans = Array.from(box.querySelectorAll("span.a-size-mini"));

  // Return Created - some markup has the date directly in the same column text
  const rcLabel = miniSpans.find(span =>
    span.textContent.toUpperCase().includes("RETURN CREATED")
  );
  if (rcLabel) {
    const col = rcLabel.closest(".a-column");
    if (col) {
      const colText = arnExtractText(col);
      // e.g. "RETURN CREATED Oct 22, 2025"
      const match = colText.match(/RETURN CREATED\s*(.+)$/i);
      if (match) {
        meta.returnCreated = match[1].trim();
      }
    }
  }

  // Order ID
  const orderSpan = miniSpans.find(span =>
    span.textContent.toUpperCase().includes("ORDER #")
  );
  if (orderSpan) {
    const match = orderSpan.textContent.match(/ORDER\s*#\s*([0-9\-]+)/i);
    if (match) {
      meta.orderId = match[1];
    }
  }

  // RMA ID
  const rmaSpan = miniSpans.find(span =>
    span.textContent.toUpperCase().includes("RMA ID")
  );
  if (rmaSpan) {
    const text = arnExtractText(rmaSpan);
    const match = text.match(/RMA ID\s*:?\s*(.+)$/i);
    if (match) {
      meta.rmaId = match[1].trim();
    }
  }

  // Product column (right-hand side)
  const productCol = box.querySelector(".a-fixed-left-grid-col.a-col-right");
  if (productCol) {
    // Title + ASIN
    let productLink =
      productCol.querySelector('a.a-link-normal[href*="/gp/product/"]') ||
      productCol.querySelector("a.a-link-normal");

    if (productLink) {
      meta.title = arnExtractText(productLink);
      const href = productLink.getAttribute("href") || "";
      const asinMatch = href.match(/\/gp\/product\/([^/?]+)/i);
      if (asinMatch) {
        meta.asin = asinMatch[1];
      }
    }

    // Price (first thing that looks like money)
    const priceSpan = Array.from(productCol.querySelectorAll("span")).find(
      span => /\$\d/.test(span.textContent)
    );
    if (priceSpan) {
      meta.price = arnExtractText(priceSpan);
    }

    const allRows = Array.from(productCol.querySelectorAll("div.a-row"));

    // Seller: any row whose text starts with "Sold by:"
    allRows.forEach(row => {
      if (meta.seller) return;
      const rowText = arnExtractText(row);
      const lower = rowText.toLowerCase();
      if (lower.startsWith("sold by:")) {
        meta.seller = rowText.replace(/^[sS]old by:\s*/,"").trim();
      }
    });

    // Generic metadata pairs like "Size:", "Color:"
    const metaPairs = [];

    allRows.forEach(row => {
      const labelSpans = row.querySelectorAll("span.a-size-small.a-color-secondary");
      labelSpans.forEach(labelSpan => {
        let labelText = arnExtractText(labelSpan);
        if (!labelText) return;

        labelText = labelText.replace(/:$/, "");
        const lower = labelText.toLowerCase();
        if (lower === "sold by") return;

        const rowText = arnExtractText(row);
        if (!rowText) return;

        let valueText = rowText.replace(labelText, "").trim();
        valueText = valueText.replace(/^:\s*/, "").trim();

        if (!valueText && row.nextElementSibling) {
          valueText = arnExtractText(row.nextElementSibling);
        }

        if (valueText) {
          metaPairs.push({
            label: labelText,
            value: valueText
          });
        }
      });
    });

    meta.metadata = metaPairs;
  }

  return meta;
}

// Inject CSS once
function arnInjectStyles() {
  if (document.getElementById("arn-notes-style")) return;

  const style = document.createElement("style");
  style.id = "arn-notes-style";
  style.textContent = `
    .arn-notes-container {
      margin-top: 8px;
      font-family: inherit;
      font-size: 13px;
    }
    .arn-notes-container hr {
      margin: 8px 0 6px 0;
    }
    .arn-notes-label {
      display: block;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .arn-notes-textarea {
      width: 100%;
      min-height: 60px;
      box-sizing: border-box;
      resize: vertical;
      font-family: inherit;
      font-size: 13px;
      padding: 4px;
    }
    .arn-notes-footer {
      margin-top: 4px;
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
    }
    .arn-notes-checkbox-label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
    }
    .arn-notes-last-saved {
      font-size: 11px;
      font-style: italic;
      color: #555;
      margin-left: auto;
    }
    .arn-filter-container {
      margin: 8px 0 12px 0;
      padding: 8px 12px;
      background: #f7f7f7;
      border: 1px solid #ddd;
      border-radius: 4px;
      display: inline-flex;
      flex-direction: column;
      gap: 8px;
    }
    .arn-filter-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .arn-filter-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      cursor: pointer;
      user-select: none;
    }
    #arn-sync-btn {
      font-size: 13px;
      padding: 4px 10px;
      cursor: pointer;
    }
    .arn-sync-status {
      font-size: 12px;
      font-style: italic;
      color: #555;
    }
  `;
  document.head.appendChild(style);
}

// Inject filter UI after the "N returns placed in past X months" row
function arnInjectFilterUI() {
  if (document.getElementById("arn-filter-ui")) return;

  const countBold = Array.from(document.querySelectorAll("b")).find(
    b => /\d+ returns/.test(b.textContent)
  );
  if (!countBold) return;

  const countRow = countBold.closest("div.a-row");
  if (!countRow) return;

  const container = document.createElement("div");
  container.id = "arn-filter-ui";
  container.className = "arn-filter-container";

  // Sync button
  const syncBtn = document.createElement("button");
  syncBtn.id = "arn-sync-btn";
  syncBtn.textContent = "Sync Dropped Off Checkboxes";
  syncBtn.addEventListener("click", arnSyncDroppedOff);

  const syncStatus = document.createElement("span");
  syncStatus.id = "arn-sync-status";
  syncStatus.className = "arn-sync-status";

  const syncRow = document.createElement("div");
  syncRow.className = "arn-filter-row";
  syncRow.appendChild(syncBtn);
  syncRow.appendChild(syncStatus);

  // Hide filter checkbox
  const filterLabel = document.createElement("label");
  filterLabel.className = "arn-filter-label";

  const filterCheckbox = document.createElement("input");
  filterCheckbox.type = "checkbox";
  filterCheckbox.id = "arn-filter-checkbox";
  filterCheckbox.checked = false;

  const filterText = document.createElement("span");
  filterText.textContent = "Hide returns that have been dropped off";

  filterLabel.appendChild(filterCheckbox);
  filterLabel.appendChild(filterText);

  container.appendChild(syncRow);
  container.appendChild(filterLabel);

  countRow.after(container);

  filterCheckbox.addEventListener("change", arnApplyFilter);
}

// Check if a return status should trigger marking as dropped off
function arnStatusTriggersDropoff(statusText) {
  const s = statusText.toLowerCase().trim();
  return (
    s.startsWith("refund issued") ||
    s.startsWith("refund complete") ||
    s.startsWith("refund pending") ||
    s.startsWith("refund processed") ||
    s === "return in transit" ||
    s === "return received"
  );
}

// Sync "dropped off" checkboxes based on return status
function arnSyncDroppedOff() {
  const syncStatus = document.getElementById("arn-sync-status");
  if (syncStatus) syncStatus.textContent = "";

  let checked = 0;

  document.querySelectorAll(".a-box-group.a-spacing-extra-large").forEach(box => {
    const completionCheckbox = box.querySelector(".arn-notes-footer input[type='checkbox']");
    if (!completionCheckbox) return;

    const h4 = box.querySelector("div.a-section > h4");
    if (!h4) return;

    const statusText = h4.textContent.replace(/\s+/g, " ").trim();

    if (!completionCheckbox.checked && arnStatusTriggersDropoff(statusText)) {
      completionCheckbox.checked = true;
      completionCheckbox.dispatchEvent(new Event("change"));
      checked++;
    }
  });

  alert(`Sync complete: ${checked} checked.`);

}

// Show/hide return boxes based on filter state
function arnApplyFilter() {
  const filterCheckbox = document.getElementById("arn-filter-checkbox");
  const hideCompleted = filterCheckbox && filterCheckbox.checked;

  document.querySelectorAll(".a-box-group.a-spacing-extra-large").forEach(box => {
    if (!hideCompleted) {
      box.style.display = "";
      return;
    }
    const completionCheckbox = box.querySelector(".arn-notes-footer input[type='checkbox']");
    box.style.display = (completionCheckbox && completionCheckbox.checked) ? "none" : "";
  });
}

// Create UI for a single box
function arnCreateUiForBox(box, key, savedEntry, meta) {
  if (box.dataset.arnInitialized === "true") return;
  box.dataset.arnInitialized = "true";
  box.dataset.arnKey = key;

  const inner = box.querySelector(".a-box-inner");
  if (!inner) return;

  const notesContainer = document.createElement("div");
  notesContainer.className = "arn-notes-container";

  const hr = document.createElement("hr");

  const label = document.createElement("label");
  label.className = "arn-notes-label";
  label.textContent = "Notes";

  const textarea = document.createElement("textarea");
  textarea.className = "arn-notes-textarea";
  textarea.placeholder = "Add notes about this return...";
  textarea.value = savedEntry.notes || "";

  const footer = document.createElement("div");
  footer.className = "arn-notes-footer";

  const checkboxLabel = document.createElement("label");
  checkboxLabel.className = "arn-notes-checkbox-label";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = !!savedEntry.completed;

  const checkboxText = document.createElement("span");
  checkboxText.textContent = "Return has been dropped off/shipped back";

  checkboxLabel.appendChild(checkbox);
  checkboxLabel.appendChild(checkboxText);

  const lastSavedSpan = document.createElement("span");
  lastSavedSpan.className = "arn-notes-last-saved";
  const displaySaved =
    savedEntry.lastSavedDisplay || arnFormatDisplayDate(savedEntry.lastSaved);
  lastSavedSpan.textContent = `Last Saved: ${displaySaved || "Never"}`;

  footer.appendChild(checkboxLabel);
  footer.appendChild(lastSavedSpan);

  notesContainer.appendChild(hr);
  notesContainer.appendChild(label);
  notesContainer.appendChild(textarea);
  notesContainer.appendChild(footer);

  inner.appendChild(notesContainer);

  function save() {
    const nowIso = new Date().toISOString();
    const display = arnFormatDisplayDate(nowIso);

    const entryToSave = {
      orderId: meta.orderId || "",
      returnCreated: meta.returnCreated || "",
      rmaId: meta.rmaId || "",
      asin: meta.asin || "",
      title: meta.title || "",
      price: meta.price || "",
      seller: meta.seller || "",
      metadata: meta.metadata || [],
      notes: textarea.value || "",
      completed: checkbox.checked,
      lastSaved: nowIso,
      lastSavedDisplay: display
    };

    chrome.storage.sync.set({ [key]: entryToSave }, () => {
      lastSavedSpan.textContent = `Last Saved: ${display}`;
    });
  }

  textarea.addEventListener("change", save);
  textarea.addEventListener("blur", save);
  checkbox.addEventListener("change", save);
}

// Process all return boxes currently present
function arnProcessAllReturns(existingData) {
  const boxes = document.querySelectorAll(
    ".a-box-group.a-spacing-extra-large"
  );
  boxes.forEach(box => {
    const meta = arnExtractMetaFromBox(box);
    const key = arnBuildKey(meta);
    arnMetaByKey[key] = meta;
    const savedEntry = existingData[key] || {};
    arnCreateUiForBox(box, key, savedEntry, meta);
  });
  arnApplyFilter();
}

// Watch for new content
function arnObserveMutations(existingData) {
  const observer = new MutationObserver(() => {
    arnProcessAllReturns(existingData);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Init
function arnInit() {
  arnInjectStyles();
  arnInjectFilterUI();

  chrome.storage.sync.get(null, data => {
    const existingData = data || {};
    arnProcessAllReturns(existingData);
    arnObserveMutations(existingData);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", arnInit);
} else {
  arnInit();
}
