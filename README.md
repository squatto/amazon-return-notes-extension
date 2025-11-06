# Amazon Return Notes

A lightweight Chrome extension that lets you **add personal notes** and track the status of your **Amazon returns** directly on the [Amazon Return History page](https://www.amazon.com/spr/returns/history).

---

## ✨ Features

- 📝 Add custom **notes** beneath each return
- ✅ Check off when an item has been **dropped off or shipped back**
- ⏱ Automatically saves changes (no button needed)
- 💾 Stores all data in **Chrome Sync Storage** — your notes persist across browsers signed into the same Google account
- 🧾 Export your full return history (including notes and metadata) to **CSV**
- ♾️ Data persists indefinitely (no auto-expiry)

---

## 🧩 Installation (Developer Mode)

1. **Download the ZIP** or clone this repository:
   ```bash
   git clone https://github.com/squatto/amazon-return-notes-extension.git
   ```
2. Open Chrome and go to:
   ```
   chrome://extensions
   ```
3. Toggle **Developer mode** (top right corner).
4. Click **Load unpacked** and select the folder containing this extension.
5. Visit:
   [https://www.amazon.com/spr/returns/history](https://www.amazon.com/spr/returns/history)
6. You’ll now see a **Notes** box and a **checkbox** below each return!

---

## 💡 How It Works

For each return block on the Amazon Returns page, the extension automatically:

- Inserts a horizontal line `<hr>` below the existing return content.
- Adds:
  - A **Notes** textarea
  - A **“Return has been dropped off/shipped back”** checkbox
  - A **“Last Saved: {datetime}”** display
- Extracts and saves metadata for each return:
  - **Order ID**
  - **Return Created date**
  - **RMA ID** (if present)
  - **ASIN**
  - **Product title**
  - **Product price**
  - **Seller name**
  - **Product metadata** (like size, color, etc.)
- Auto-saves on any change (typing, checkbox toggle, or blur).

All data is keyed by **Order ID + ASIN/title**, ensuring each return has a unique record even if Amazon changes layout or ordering.

---

## 📤 Exporting Notes to CSV

1. Open the Chrome Extensions page:
   ```
   chrome://extensions
   ```
2. Find **Amazon Return Notes** and click **Details → Extension options**.
3. Click **Export to CSV** — the file will download automatically with all stored notes and metadata.

Example columns:

| Order ID | Return Created | ASIN | Product Title | Seller | Notes | Completed | Last Saved |
|-----------|----------------|------|----------------|---------|--------|------------|-------------|

---

## 🔒 Storage & Privacy

- Notes and metadata are saved using `chrome.storage.sync`.
- Data syncs with your Google account (same as bookmarks and extensions).
- No external servers or APIs are involved.
- The extension runs only on:
  ```
  https://www.amazon.com/spr/returns/history*
  ```

---

## 🧱 Project Structure

```
amazon-return-notes/
├── manifest.json
├── content.js          # Injected script that adds Notes UI and saves data
├── options.html        # Simple options page for CSV export
├── options.js          # CSV export logic
├── icon-16.png
├── icon-48.png
├── icon-128.png
└── README.md
```

---

## 🧑‍💻 Development Notes

- Built with **Manifest V3**
- Uses **Chrome Storage Sync API**
- Icons and design follow Amazon color themes (orange + black)
- Compatible with all Chromium-based browsers supporting MV3

---

## 🏷️ Credits

**Author:** Scott Carpenter  
**Email:** scott@payforstay.com  
**License:** MIT  
**Version:** 1.0.0

---

## 🚀 Future Ideas

- 🔁 Refresh metadata button to rescan current returns  
- 🗑️ Clear all notes or remove completed returns  
- ☁️ Google Sheets sync or auto-backup  
- 🕶️ Dark mode compatibility  

---

Enjoy smoother returns management — right where you need it.
