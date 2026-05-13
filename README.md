# Kindle Highlights Exporter

**Export your Kindle highlights and notes to Markdown, CSV, or JSON — 100% in your browser, no upload required.**

[🌐 Live Tool](https://xueboyang1985.github.io/kindle-exporter/) • [📖 User Guide](https://xueboyang1985.github.io/kindle-exporter/guide.html) • [🛒 PRO Key](https://xuebo8.gumroad.com/l/iwropv)

---

## Web Tool (GitHub Pages)

The main product is a browser-based tool at **[kindle-exporter](https://xueboyang1985.github.io/kindle-exporter/)** that runs entirely on the client side:

1. Connect your Kindle to computer via USB
2. Find `My Clippings.txt` in the `Kindle/documents/` folder
3. Drag & drop the file onto the web page
4. Export as Markdown, CSV, or JSON — free for one book

**Why use it:**
- ✅ 100% local — your file never leaves your browser
- ✅ No signup, no account, no email
- ✅ Works offline after page load
- ✅ Free for single-book export

## Chrome Extension

A companion Chrome extension (Manifest V3) enhances the tool with auto-sync from Amazon Kindle Notebook:

- **Content Script**: Injects into `read.amazon.com/notebook`
- **Popup**: License management and manual export
- **Background Service Worker**: Gumroad license verification with offline fallback

### Install (Dev Mode)

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" → select this folder
4. Go to https://read.amazon.com/notebook

## Free vs PRO

| Feature | Free | PRO |
|---------|------|-----|
| Books exported | 1 book | Unlimited |
| Export formats | Markdown, CSV, JSON | Markdown, CSV, JSON |
| Notes included | ✅ | ✅ |
| 100% local (no upload) | ✅ | ✅ |
| Priority support | — | ✅ |

**PRO price**: $9.99 one-time payment · 3 devices per key · [Buy here](https://xuebo8.gumroad.com/l/iwropv)

## Project Structure

```
root/
├── index.html          Main web tool page
├── app.js              Web tool logic + PRO key validation
├── parser.js           My Clippings.txt parser + export formatters
├── style.css           Styles
├── guide.html          User guide & FAQ
├── manifest.json       Chrome extension manifest (V3)
├── background.js       Service worker for license verification
├── content.js          Injected into Kindle Notebook page
├── inject.css          Minimal injected styles
├── popup/              Extension popup (license management)
└── icons/              Extension icons
```

## Tech Stack

- Pure HTML + CSS + JavaScript (vanilla, no dependencies)
- GitHub Pages hosting (free CDN)
- Gumroad for payments & license management
- Chrome Extension (Manifest V3, optional)

## License

MIT — free to use, modify, and distribute.
