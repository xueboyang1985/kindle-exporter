// app.js - Kindle Clippings Exporter App

const PRO_SECRET = 'KINDLE-EXPORTER-PRO-2024'.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
let isPro = false;

function validateProKey(key) {
  const parts = key.split('-');
  if (parts.length !== 5 || parts[0] !== 'KINDLE') return false;
  for (let i = 1; i < 5; i++) {
    if (parts[i].length !== 4 || !/^\d{4}$/.test(parts[i])) return false;
  }
  const str = parts.slice(1, 4).join('');
  let s = 0;
  for (let i = 0; i < str.length; i++) s += str.charCodeAt(i) * (i + 1);
  s ^= PRO_SECRET;
  return parts[4] === String(s % 10).repeat(4);
}

document.addEventListener('DOMContentLoaded', () => {

  // ─── DOM refs ──────────────────────────────────────────
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const uploadCard = document.getElementById('upload-card');
  const resultsCard = document.getElementById('results-card');
  const bookList = document.getElementById('book-list');
  const bookCount = document.getElementById('book-count');
  const highlightCount = document.getElementById('highlight-count');
  const proModal = document.getElementById('pro-modal');
  const proKeyInput = document.getElementById('pro-key-input');
  const btnActivate = document.getElementById('btn-activate');
  const btnShowPro = document.getElementById('btn-show-pro');
  const proBadge = document.querySelector('.pro-badge-large');
  const proMsg = document.querySelector('.pro-header span:nth-child(2)');
  const proCard = document.getElementById('pro-card');
  const homeLink = document.getElementById('home-link');
  const MAX_DEVICES = 3;

  // Generate a unique device ID (persists in localStorage)
  function getDeviceId() {
    let id = localStorage.getItem('khe_device_id');
    if (!id) {
      id = 'DEVICE-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      localStorage.setItem('khe_device_id', id);
    }
    return id;
  }

  // Track device count per key (anti-sharing deterrent)
  function checkDeviceLimit(key) {
    const registry = JSON.parse(localStorage.getItem('khe_key_registry') || '{}');
    if (!registry[key]) {
      registry[key] = { devices: [], firstSeen: new Date().toISOString() };
    }
    const entry = registry[key];
    const deviceId = getDeviceId();
    if (!entry.devices.includes(deviceId)) {
      entry.devices.push(deviceId);
    }
    localStorage.setItem('khe_key_registry', JSON.stringify(registry));
    return entry.devices.length <= MAX_DEVICES;
  }
  const btnBack = document.getElementById('btn-back');

  let currentData = null;

  // Back button handling: popstate means user pressed back → go to upload view
  window.addEventListener('popstate', () => resetView());

  // Check saved PRO key
  const saved = localStorage.getItem('kindleexporter_pro');
  const activated = localStorage.getItem('kindleexporter_pro_activated') === 'true';
  if (saved && (activated || validateProKey(saved))) {
    isPro = true;
    if (proBadge) proBadge.textContent = '✓ PRO';
    if (proMsg) proMsg.textContent = 'PRO activated — unlimited exports unlocked';
    document.querySelectorAll('#btn-show-pro, #btn-show-pro2').forEach(b => {
      b.textContent = '✅ Activated'; b.style.background = '#10b981';
    });
  }

  // ─── File handling ─────────────────────────────────────

  function handleFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const result = parseClippings(text);
        if (result.books.length === 0) {
          showError('No highlights found. Make sure this is a Kindle "My Clippings.txt" file.');
          return;
        }
        showResults(result);
      } catch (err) {
        showError(`Failed to parse: ${err.message}`);
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  // Drag & drop
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
  document.getElementById('click-upload').addEventListener('click', (e) => { e.preventDefault(); fileInput.click(); });
  fileInput.addEventListener('change', () => { if (fileInput.files.length > 0) handleFile(fileInput.files[0]); });

  // ─── Display results ──────────────────────────────────

  function resetView() {
    uploadCard.style.display = 'block';
    resultsCard.style.display = 'none';
    currentData = null;
    bookList.innerHTML = '';
    if (homeLink) homeLink.style.display = 'none';
  }

  // Back button click
  if (btnBack) {
    btnBack.addEventListener('click', (e) => { e.preventDefault(); history.back(); });
  }

  function showResults(result) {
    currentData = result;
    uploadCard.style.display = 'none';
    resultsCard.style.display = 'block';

    // Show back link
    if (homeLink) homeLink.style.display = 'block';
    // Replace state so back button returns to upload view
    history.pushState(null, '');

    const totalHighlights = result.books.reduce((sum, b) => sum + b.highlights.length, 0);
    const totalNotes = result.books.reduce((sum, b) => sum + b.notes.length, 0);

    bookCount.textContent = `${result.books.length} books`;
    highlightCount.textContent = `${totalHighlights} highlights${totalNotes > 0 ? `, ${totalNotes} notes` : ''}`;

    // Render book list
    bookList.innerHTML = '';
    for (const book of result.books) {
      const items = [];
      for (const h of book.highlights) items.push({ ...h, itemType: 'highlight' });
      for (const n of book.notes) items.push({ ...n, itemType: 'note' });
      items.sort((a, b) => (parseInt(a.location) || 0) - (parseInt(b.location) || 0));

      const div = document.createElement('div');
      div.className = 'book-item';
      div.innerHTML = `
        <div class="book-header">
          <span>${escapeHTML(book.title)} <span class="book-count">(${book.highlights.length} highlights${book.notes.length > 0 ? `, ${book.notes.length} notes` : ''})</span></span>
          <span class="open-indicator">▼</span>
        </div>
        <div class="book-body">
          ${items.map(item => `
            <div class="highlight-card">
              ${item.itemType === 'note'
                ? `<div class="highlight-note">${escapeHTML(item.content)}</div>`
                : `<div class="highlight-text">${escapeHTML(item.content)}</div>`
              }
              <div class="highlight-meta">
                ${item.page ? `<span>p. ${item.page}</span>` : ''}
                ${item.location ? `<span>${item.location}</span>` : ''}
                ${item.dateAdded ? `<span>${item.dateAdded}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;

      div.querySelector('.book-header').addEventListener('click', () => {
        div.classList.toggle('open');
        div.querySelector('.open-indicator').textContent = div.classList.contains('open') ? '▲' : '▼';
      });

      bookList.appendChild(div);
    }

    // Open first book by default
    const firstBook = bookList.querySelector('.book-item');
    if (firstBook) { firstBook.classList.add('open'); firstBook.querySelector('.open-indicator').textContent = '▲'; }

    resultsCard.scrollIntoView({ behavior: 'smooth' });
  }

  // ─── Export handlers ──────────────────────────────────

  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!currentData) return;
      const format = btn.dataset.format;
      let books = isPro ? currentData.books : [currentData.books[0]];

      let content, filename, mime;
      if (format === 'md') {
        content = exportMarkdown(books);
        filename = `kindle-highlights-${new Date().toISOString().split('T')[0]}.md`;
        mime = 'text/markdown';
      } else if (format === 'csv') {
        content = exportCSV(books);
        filename = `kindle-highlights-${new Date().toISOString().split('T')[0]}.csv`;
        mime = 'text/csv';
      } else if (format === 'json') {
        content = exportJSON(books);
        filename = `kindle-highlights-${new Date().toISOString().split('T')[0]}.json`;
        mime = 'application/json';
      }

      downloadFile(filename, content, mime);
    });
  });

  // ─── Load sample ──────────────────────────────────────

  document.getElementById('load-sample').addEventListener('click', () => {
    const sample = `==========
Atomic Habits (James Clear)
- Your Highlight on page 42 | Location 857-859 | Added on Thursday, January 15, 2026 2:30:45 PM

Habits are the compound interest of self-improvement. Getting 1 percent better every day counts for much in the long-run.
==========
Atomic Habits (James Clear)
- Your Highlight on page 47 | Location 934-936 | Added on Thursday, January 15, 2026 2:45:10 PM

The most effective way to change your habits is to focus not on what you want to achieve, but on who you wish to become.
==========
Atomic Habits (James Clear)
- Your Note on page 47 | Location 936 | Added on Thursday, January 15, 2026 2:46:00 PM

Identity-based habits vs outcome-based habits. Focus on the type of person you want to be.
==========
Atomic Habits (James Clear)
- Your Highlight on page 89 | Location 1765-1768 | Added on Friday, January 16, 2026 9:15:30 AM

The task of breaking a bad habit is like uprooting a powerful oak within us. And the task of building a good habit is like cultivating a delicate flower.
==========
Deep Work (Cal Newport)
- Your Highlight on page 15 | Location 289-292 | Added on Sunday, February 2, 2026 10:00:00 AM

To produce at your peak level you need to work for extended periods with full concentration on a single task free from distraction.
==========
Deep Work (Cal Newport)
- Your Highlight on page 37 | Location 756-758 | Added on Monday, February 3, 2026 8:30:15 PM

Clarity about what matters provides clarity about what does not.
==========
The Design of Everyday Things (Don Norman)
- Your Highlight on page 72 | Location 1421-1424 | Added on Saturday, March 15, 2026 3:00:00 PM

When people have trouble using something, it's not their fault — it's the fault of the design.
==========
The Design of Everyday Things (Don Norman)
- Your Note on page 72 | Location 1425 | Added on Saturday, March 15, 2026 3:05:00 PM

Great quote for presentations. Emphasizes that good design is invisible — bad design is what gets noticed.
==========`;

    const result = parseClippings(sample);
    showResults(result);
  });

  // ─── PRO Modal ────────────────────────────────────────

  if (btnShowPro) {
    btnShowPro.addEventListener('click', () => { proModal.style.display = 'flex'; });
  }
  const btnShowPro2 = document.getElementById('btn-show-pro2');
  if (btnShowPro2) {
    btnShowPro2.addEventListener('click', () => { proModal.style.display = 'flex'; });
  }
  document.getElementById('modal-close').addEventListener('click', () => { proModal.style.display = 'none'; });
  proModal.addEventListener('click', (e) => { if (e.target === proModal) proModal.style.display = 'none'; });

  const btnBuyPro = document.getElementById('btn-buy-pro');
  if (btnBuyPro) {
    btnBuyPro.addEventListener('click', () => {
      const url = btnBuyPro.dataset.gumroad;
      if (!url) return;
      const w = Math.min(600, window.innerWidth - 40);
      const h = Math.min(700, window.innerHeight - 40);
      const left = Math.max(0, (window.innerWidth - w) / 2);
      const top = Math.max(0, (window.innerHeight - h) / 2);
      const win = window.open(url, 'gumroad-checkout', `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,status=no`);
      if (!win) window.location.href = url;
    });
  }

  btnActivate.addEventListener('click', async () => {
    const key = proKeyInput.value.trim().toUpperCase();
    if (!key) { alert('Enter a PRO key first.'); return; }

    // Offline KINDLE-XXXX keys
    if (key.startsWith('KINDLE-')) {
      if (!validateProKey(key)) {
        alert('Invalid PRO key. Enter a valid key purchased from our store.');
        return;
      }
      if (!checkDeviceLimit(key)) {
        alert(`This key has been activated on too many devices (max ${MAX_DEVICES}).`);
        return;
      }
      activatePro(key);
      return;
    }

    // Gumroad license key
    btnActivate.textContent = 'Verifying...';
    btnActivate.disabled = true;
    try {
      const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `product_id=0yHNE5LuJrYRgIh7pCfCiQ==&license_key=${encodeURIComponent(key)}`
      });
      const data = await res.json();
      if (data.success && data.purchase) {
        if (data.uses >= 3) {
          alert(`This key has been activated on too many devices (max 3). Current uses: ${data.uses}`);
          return;
        }
        activatePro(key);
      } else {
        alert('This license key is invalid. Make sure you entered it exactly as received in your email.');
      }
    } catch (err) {
      alert('Failed to verify license. Check your internet connection and try again.');
    } finally {
      btnActivate.textContent = 'Activate';
      btnActivate.disabled = false;
    }
  });

  function activatePro(key) {
    isPro = true;
    if (proBadge) proBadge.textContent = '✓ PRO';
    if (proMsg) proMsg.textContent = 'PRO activated — unlimited exports unlocked';
    document.querySelectorAll('#btn-show-pro, #btn-show-pro2').forEach(b => {
      b.textContent = '✅ Activated';
      b.style.background = '#10b981';
    });
    proModal.style.display = 'none';
    localStorage.setItem('kindleexporter_pro', key);
  }

  // ─── Helpers ──────────────────────────────────────────

  function showError(msg) {
    uploadCard.style.display = 'none';
    resultsCard.style.display = 'block';
    bookList.innerHTML = `<div class="error">${escapeHTML(msg)}</div>`;
    bookCount.textContent = 'Error';
    highlightCount.textContent = '';
    if (homeLink) homeLink.style.display = 'block';
    history.pushState(null, '');
  }

  function escapeHTML(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

});
