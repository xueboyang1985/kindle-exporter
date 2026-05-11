// parser.js - Kindle My Clippings.txt parser

function parseClippings(text) {
  const entries = [];
  const rawEntries = text.split('==========').filter(e => e.trim());

  for (const raw of rawEntries) {
    const lines = raw.trim().split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 3) continue;

    // Line 1: Book Title (Author)
    const titleLine = lines[0];
    const titleMatch = titleLine.match(/^(.+?)\s*\(([^)]*)\)\s*$/);
    if (!titleMatch) continue;
    const bookTitle = titleMatch[1].trim();
    const author = titleMatch[2].trim() || 'Unknown';

    // Line 2: Type and metadata
    const metaLine = lines[1];
    let type = 'Highlight';
    let page = '';
    let location = '';
    let dateAdded = '';

    if (metaLine.includes('- Your Highlight')) type = 'Highlight';
    else if (metaLine.includes('- Your Note')) type = 'Note';
    else if (metaLine.includes('- Your Bookmark')) type = 'Bookmark';
    else continue; // Skip unknown types

    // Extract page
    const pageMatch = metaLine.match(/page\s+(\d+)/i);
    if (pageMatch) page = pageMatch[1];

    // Extract location
    const locMatch = metaLine.match(/Location\s+([\d\s-]+)/i);
    if (locMatch) location = locMatch[1].trim();

    // Extract date
    const dateMatch = metaLine.match(/Added on\s+(.+?)$/i);
    if (dateMatch) dateAdded = dateMatch[1].trim();

    // Line 3+: content (highlight text or note text)
    const content = lines.slice(2).join('\n').trim();

    if (!content) continue;

    entries.push({
      bookTitle,
      author,
      type,
      page,
      location,
      dateAdded,
      content,
    });
  }

  // Group by book
  const books = {};
  for (const entry of entries) {
    const key = `${entry.bookTitle}||${entry.author}`;
    if (!books[key]) {
      books[key] = {
        title: entry.bookTitle,
        author: entry.author,
        highlights: [],
        notes: [],
      };
    }
    if (entry.type === 'Highlight') {
      books[key].highlights.push(entry);
    } else if (entry.type === 'Note') {
      books[key].notes.push(entry);
    }
  }

  return {
    totalEntries: entries.length,
    books: Object.values(books),
  };
}

// ─── Export Formats ──────────────────────────────────────

function exportMarkdown(books) {
  let md = `# Kindle Highlights\n\n`;
  md += `*Exported ${new Date().toISOString().split('T')[0]}*\n\n`;
  md += `---\n\n`;

  for (const book of books) {
    md += `## ${book.title}\n\n`;
    md += `*Author: ${book.author}*\n\n`;

    const items = [];
    for (const h of book.highlights) {
      items.push({ text: h.content, location: h.location, date: h.dateAdded, type: 'highlight' });
    }
    for (const n of book.notes) {
      items.push({ text: n.content, location: n.location, date: n.dateAdded, type: 'note' });
    }
    // Sort by location
    items.sort((a, b) => {
      const an = parseInt(a.location) || 0;
      const bn = parseInt(b.location) || 0;
      return an - bn;
    });

    for (const item of items) {
      if (item.type === 'note') {
        md += `📝 *Note:* ${item.text}\n\n`;
      } else {
        md += `> ${item.text}\n\n`;
      }
      if (item.location) md += `*${item.location}*  \n`;
      md += '\n';
    }
    md += `---\n\n`;
  }

  return md;
}

function exportCSV(books) {
  const header = 'Book Title,Author,Type,Content,Location,Page,Date Added\n';
  const rows = [];
  for (const book of books) {
    for (const h of book.highlights) {
      rows.push([book.title, book.author, 'Highlight', h.content, h.location, h.page, h.dateAdded]);
    }
    for (const n of book.notes) {
      rows.push([book.title, book.author, 'Note', n.content, n.location, n.page, n.dateAdded]);
    }
  }
  const esc = s => `"${(s || '').replace(/"/g, '""')}"`;
  const body = rows.map(r => r.map(esc).join(',')).join('\n');
  return '﻿' + header + body;
}

function exportJSON(books) {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    totalBooks: books.length,
    books: books.map(b => ({
      title: b.title,
      author: b.author,
      highlights: b.highlights.map(h => ({ text: h.content, location: h.location, page: h.page, date: h.dateAdded })),
      notes: b.notes.map(n => ({ text: n.content, location: n.location, page: n.page, date: n.dateAdded })),
    })),
  }, null, 2);
}

// ─── Download Helper ─────────────────────────────────────

function downloadFile(filename, content, mimeType = 'text/markdown') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
