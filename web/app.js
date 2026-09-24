/**
 * ============================================================================
 * File Search — Desktop Application Controller (v3.6)
 * ============================================================================
 */

const API_BASE = window.location.origin;

// State
let currentIndexedFolder = '';
let currentBrowsePath = '';
let currentResults = [];
let selectedIndex = -1;
let activeFilter = 'all';
let currentQuery = '';
let selectedDocData = null;

let searchDebounceTimer = null;
let autocompleteDebounceTimer = null;
let currentSuggestions = [];
let autoHighlightIndex = -1;

// DOM Elements
const searchInput = document.getElementById('search-input');
const btnClearInput = document.getElementById('btn-clear-input');
const autocompleteDropdown = document.getElementById('autocomplete-dropdown');
const autocompleteList = document.getElementById('autocomplete-list');
const filterTags = document.querySelectorAll('.filter-tag');
const feedCounter = document.getElementById('feed-counter');
const resultsScroll = document.getElementById('results-scroll');
const feedEmptyState = document.getElementById('feed-empty-state');

const quickLocationsBar = document.getElementById('quick-locations-bar');
const statDocCount = document.getElementById('stat-doc-count');
const statWordCount = document.getElementById('stat-word-count');
const btnReindexCurrent = document.getElementById('btn-reindex-current');
const btnOpenCurrentFolder = document.getElementById('btn-open-current-folder');

const pathCrumbsBox = document.getElementById('path-crumbs-box');
const dirBrowserList = document.getElementById('dir-browser-list');
const btnNavParent = document.getElementById('btn-nav-parent');
const recentChips = document.getElementById('recent-chips');
const btnClearRecent = document.getElementById('btn-clear-recent');

// Inspector Elements
const inspectorEmpty = document.getElementById('inspector-empty');
const inspectorContent = document.getElementById('inspector-content');
const previewExtTag = document.getElementById('preview-ext-tag');
const previewFilename = document.getElementById('preview-filename');
const previewFilepath = document.getElementById('preview-filepath');
const previewSize = document.getElementById('preview-size');
const previewWords = document.getElementById('preview-words');
const previewScore = document.getElementById('preview-score');
const codeLinesTable = document.getElementById('code-lines-table');
const btnInspectorOpen = document.getElementById('btn-inspector-open');
const btnInspectorReveal = document.getElementById('btn-inspector-reveal');
const btnInspectorCopy = document.getElementById('btn-inspector-copy');

const appToast = document.getElementById('app-toast');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadLocations();
  loadStats();
  loadRecent();
});

function setupEventListeners() {
  // Global Shortcut: Ctrl+K or / to focus search
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement !== searchInput)) {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    } else if (e.key === 'Escape') {
      hideAutocomplete();
    }
  });

  // REAL-TIME AS-YOU-TYPE INSTANT SEARCH & AUTOCOMPLETE
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;

      if (val.trim()) {
        if (btnClearInput) btnClearInput.classList.remove('hidden');
      } else {
        if (btnClearInput) btnClearInput.classList.add('hidden');
        hideAutocomplete();
        executeSearch('');
        return;
      }

      // Live Instant Search (debounced 80ms)
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        executeSearch(val.trim());
      }, 80);

      // Trie Autocomplete
      clearTimeout(autocompleteDebounceTimer);
      autocompleteDebounceTimer = setTimeout(() => {
        fetchAutocomplete(val.trim());
      }, 100);
    });

    searchInput.addEventListener('keydown', handleSearchKeydown);
  }

  if (btnClearInput) {
    btnClearInput.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      btnClearInput.classList.add('hidden');
      hideAutocomplete();
      executeSearch('');
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-input-wrapper')) {
      hideAutocomplete();
    }
  });

  // Filters
  filterTags.forEach(tag => {
    tag.addEventListener('click', () => {
      filterTags.forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      activeFilter = tag.getAttribute('data-filter');
      renderResults();
    });
  });

  // Parent Navigation
  if (btnNavParent) {
    btnNavParent.addEventListener('click', () => {
      if (currentBrowsePath) {
        const parts = currentBrowsePath.split(/[\\/]/).filter(Boolean);
        if (parts.length > 1) {
          parts.pop();
          const parent = parts.join('\\') + (parts.length === 1 && currentBrowsePath.includes(':') ? '\\' : '');
          browseDirectory(parent);
        }
      }
    });
  }

  // Top Nav Actions
  if (btnReindexCurrent) {
    btnReindexCurrent.addEventListener('click', () => {
      if (currentIndexedFolder) indexDirectory(currentIndexedFolder);
    });
  }

  if (btnOpenCurrentFolder) {
    btnOpenCurrentFolder.addEventListener('click', () => {
      if (currentIndexedFolder) revealInExplorer(currentIndexedFolder);
    });
  }

  // Inspector Buttons
  if (btnInspectorOpen) {
    btnInspectorOpen.addEventListener('click', () => {
      if (selectedDocData && selectedDocData.filePath) {
        openSystemFile(selectedDocData.filePath);
      }
    });
  }

  if (btnInspectorReveal) {
    btnInspectorReveal.addEventListener('click', () => {
      if (selectedDocData && selectedDocData.filePath) {
        revealInExplorer(selectedDocData.filePath);
      }
    });
  }

  if (btnInspectorCopy) {
    btnInspectorCopy.addEventListener('click', () => {
      if (selectedDocData && selectedDocData.filePath) {
        navigator.clipboard.writeText(selectedDocData.filePath);
        showToast('Copied file path to clipboard');
      }
    });
  }

  if (previewFilepath) {
    previewFilepath.addEventListener('click', () => {
      if (selectedDocData && selectedDocData.filePath) {
        navigator.clipboard.writeText(selectedDocData.filePath);
        showToast('Copied file path to clipboard');
      }
    });
  }

  if (btnClearRecent) {
    btnClearRecent.addEventListener('click', clearRecent);
  }
}

// --- FILE SYSTEM LOCATIONS & BROWSER ---

async function loadLocations() {
  try {
    const res = await fetch(`${API_BASE}/api/fs/locations`);
    if (!res.ok) return;
    const data = await res.json();

    currentIndexedFolder = data.currentIndexed || '';
    currentBrowsePath = data.currentIndexed || '';
    renderQuickLocations(data.locations || []);
    renderBreadcrumbs(data.currentIndexed);
    browseDirectory(data.currentIndexed);
  } catch (err) {
    console.error('Locations error:', err);
  }
}

function renderQuickLocations(locations) {
  if (!quickLocationsBar) return;
  quickLocationsBar.innerHTML = '';

  locations.forEach(loc => {
    const pill = document.createElement('button');
    const isActive = loc.path && currentIndexedFolder && loc.path.toLowerCase() === currentIndexedFolder.toLowerCase();
    pill.className = `location-pill ${isActive ? 'active' : ''}`;

    let icon = '📁';
    if (loc.type === 'drive') icon = '💻';
    else if (loc.type === 'project') icon = '🚀';
    else if (loc.name.includes('Download')) icon = '⬇️';
    else if (loc.name.includes('Desktop')) icon = '🖥️';

    pill.innerHTML = `<span>${icon}</span> <span>${escapeHtml(loc.name)}</span>`;
    pill.title = loc.path;

    pill.addEventListener('click', () => {
      browseDirectory(loc.path);
    });

    quickLocationsBar.appendChild(pill);
  });
}

async function browseDirectory(path) {
  if (!path) return;
  currentBrowsePath = path;

  try {
    const res = await fetch(`${API_BASE}/api/fs/browse?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error('Cannot read directory: ' + path);
    const data = await res.json();

    renderBreadcrumbs(data.currentPath || path);
    renderFolderItems(data.items || [], data.currentPath || path);
  } catch (err) {
    if (dirBrowserList) {
      dirBrowserList.innerHTML = `<div class="sidebar-placeholder" style="color:#ef4444; padding:12px;">${escapeHtml(err.message)}</div>`;
    }
  }
}

function renderBreadcrumbs(fullPath) {
  if (!pathCrumbsBox || !fullPath) return;
  const parts = fullPath.split(/[\\/]/).filter(Boolean);
  pathCrumbsBox.innerHTML = '';

  let accumulated = '';
  parts.forEach((part, index) => {
    if (index === 0 && fullPath.includes(':')) {
      accumulated = part + '\\';
    } else {
      accumulated += (accumulated.endsWith('\\') ? '' : '\\') + part;
    }

    const pathToBrowse = accumulated;

    const span = document.createElement('span');
    span.className = 'crumb-link';
    span.textContent = part;
    span.title = pathToBrowse;
    span.addEventListener('click', () => browseDirectory(pathToBrowse));

    pathCrumbsBox.appendChild(span);

    if (index < parts.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'crumb-separator';
      sep.textContent = '›';
      pathCrumbsBox.appendChild(sep);
    }
  });
}

function renderFolderItems(items, currentPath) {
  if (!dirBrowserList) return;
  dirBrowserList.innerHTML = '';

  // Header quick index button
  const topAction = document.createElement('div');
  topAction.style.cssText = 'padding:6px 8px; margin-bottom:4px; display:flex; align-items:center; justify-content:space-between; background:var(--bg-input); border-radius:var(--radius-xs); border:1px solid var(--border-subtle);';
  topAction.innerHTML = `
    <span style="font-size:11px; color:var(--text-secondary); font-weight:600;">Active Folder</span>
    <button class="btn-text-xs" style="color:var(--accent-blue); font-weight:700;" title="Index all files inside this directory">⚡ Index Here</button>
  `;
  topAction.querySelector('button').addEventListener('click', (e) => {
    e.stopPropagation();
    indexDirectory(currentPath);
  });
  dirBrowserList.appendChild(topAction);

  if (!items || items.length === 0) {
    dirBrowserList.innerHTML += '<div class="sidebar-placeholder">Folder is empty</div>';
    return;
  }

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'dir-row';

    const icon = item.isDir ? '📁' : '📄';

    row.innerHTML = `
      <div class="dir-title-wrap">
        <span>${icon}</span>
        <span title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
      </div>
      <div>
        ${item.isDir 
          ? `<button class="dir-btn-quick-index" title="Index this folder">⚡ Index</button>`
          : `<span style="font-size:10px; color:var(--text-muted); font-family:var(--font-mono);">${item.sizeFormatted || ''}</span>`
        }
      </div>
    `;

    row.addEventListener('click', () => {
      if (item.isDir) {
        browseDirectory(item.path);
      } else {
        openFileInInspector(item.path, item.name);
      }
    });

    if (item.isDir) {
      const btn = row.querySelector('.dir-btn-quick-index');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          indexDirectory(item.path);
        });
      }
    }

    dirBrowserList.appendChild(row);
  });
}

// --- INDEXING ---
async function indexDirectory(folderPath) {
  if (!folderPath) return;
  showToast(`Indexing: ${folderPath}...`);

  try {
    const res = await fetch(`${API_BASE}/api/fs/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: folderPath })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Indexing failed');

    currentIndexedFolder = data.folderPath;
    if (statDocCount) statDocCount.textContent = data.docCount;
    if (statWordCount) statWordCount.textContent = data.wordCount;

    showToast(`✓ Indexed ${data.docCount} files (${data.wordCount} words)`);
    loadLocations();
    loadStats();

    // Rerun search with current query or refresh feed
    executeSearch(searchInput ? searchInput.value.trim() : '');
  } catch (err) {
    showToast(err.message, true);
  }
}

// --- AUTOCOMPLETE ---
async function fetchAutocomplete(prefix) {
  if (!prefix) return;
  try {
    const res = await fetch(`${API_BASE}/api/autocomplete?q=${encodeURIComponent(prefix)}`);
    if (!res.ok) return;
    const data = await res.json();
    renderAutocomplete(prefix, data.suggestions || []);
  } catch (err) {
    console.error('Autocomplete error:', err);
  }
}

function renderAutocomplete(prefix, suggestions) {
  currentSuggestions = suggestions;
  autoHighlightIndex = -1;

  if (!autocompleteDropdown || !autocompleteList) return;

  if (suggestions.length === 0) {
    hideAutocomplete();
    return;
  }

  autocompleteList.innerHTML = '';
  suggestions.forEach((word) => {
    const li = document.createElement('li');
    li.className = 'auto-row';

    const lowerWord = word.toLowerCase();
    const lowerPrefix = prefix.toLowerCase();
    let display = word;

    if (lowerWord.startsWith(lowerPrefix)) {
      display = `<span class="auto-bold">${escapeHtml(word.substring(0, prefix.length))}</span>${escapeHtml(word.substring(prefix.length))}`;
    } else {
      display = escapeHtml(word);
    }

    li.innerHTML = `<span>${display}</span> <span style="color:var(--text-muted); font-size:10px;">↵</span>`;
    li.addEventListener('click', () => {
      if (searchInput) searchInput.value = word;
      hideAutocomplete();
      executeSearch(word);
    });

    autocompleteList.appendChild(li);
  });

  autocompleteDropdown.classList.remove('hidden');
}

function hideAutocomplete() {
  if (autocompleteDropdown) autocompleteDropdown.classList.add('hidden');
  autoHighlightIndex = -1;
  currentSuggestions = [];
}

function handleSearchKeydown(e) {
  if (!autocompleteList) return;
  const items = autocompleteList.querySelectorAll('.auto-row');

  if (e.key === 'ArrowDown') {
    if (autocompleteDropdown && !autocompleteDropdown.classList.contains('hidden') && items.length > 0) {
      e.preventDefault();
      autoHighlightIndex = (autoHighlightIndex + 1) % items.length;
      items.forEach((it, idx) => it.classList.toggle('active', idx === autoHighlightIndex));
    } else if (currentResults.length > 0) {
      e.preventDefault();
      selectResultCard(selectedIndex + 1);
    }
  } else if (e.key === 'ArrowUp') {
    if (autocompleteDropdown && !autocompleteDropdown.classList.contains('hidden') && items.length > 0) {
      e.preventDefault();
      autoHighlightIndex = (autoHighlightIndex - 1 + items.length) % items.length;
      items.forEach((it, idx) => it.classList.toggle('active', idx === autoHighlightIndex));
    } else if (currentResults.length > 0) {
      e.preventDefault();
      selectResultCard(selectedIndex - 1);
    }
  } else if (e.key === 'Enter') {
    if (autocompleteDropdown && !autocompleteDropdown.classList.contains('hidden') && autoHighlightIndex >= 0 && currentSuggestions[autoHighlightIndex]) {
      e.preventDefault();
      const chosen = currentSuggestions[autoHighlightIndex];
      if (searchInput) searchInput.value = chosen;
      hideAutocomplete();
      executeSearch(chosen);
    } else {
      hideAutocomplete();
      if (searchInput) executeSearch(searchInput.value);
    }
  } else if (e.key === 'Escape') {
    hideAutocomplete();
  }
}

// --- SEARCH & FEED RENDERING ---
async function executeSearch(query) {
  query = (query || '').trim();
  currentQuery = query;

  if (!query) {
    if (feedCounter) feedCounter.textContent = 'All indexed files';
    fetchAllIndexedDocs();
    return;
  }

  hideAutocomplete();
  if (feedCounter) feedCounter.textContent = 'Searching...';

  try {
    const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Search error');

    currentResults = data.results || [];
    if (feedCounter) feedCounter.textContent = `${data.totalMatches} matches (${data.durationMs} ms)`;

    renderResults();
    loadRecent();

    // Auto-select top result
    if (currentResults.length > 0) {
      selectResultCard(0);
    } else {
      if (inspectorContent) inspectorContent.classList.add('hidden');
      if (inspectorEmpty) inspectorEmpty.classList.remove('hidden');
    }
  } catch (err) {
    if (resultsScroll) {
      resultsScroll.innerHTML = `
        <div class="feed-empty-state">
          <h3 style="color:#ef4444;">Search Error</h3>
          <p>${escapeHtml(err.message)}</p>
        </div>
      `;
    }
  }
}

async function fetchAllIndexedDocs() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    if (!res.ok) return;
    const data = await res.json();

    currentResults = (data.documents || []).map((d, idx) => ({
      rank: idx + 1,
      fileName: d.fileName,
      filePath: d.filePath,
      extension: getFileExtension(d.fileName),
      fileSizeFormatted: d.fileSizeFormatted,
      lastModified: d.lastModified,
      wordCount: d.wordCount,
      score: 0,
      snippets: []
    }));

    if (feedCounter) feedCounter.textContent = `${currentResults.length} files`;
    renderResults();

    if (currentResults.length > 0) {
      selectResultCard(0);
    }
  } catch (err) {
    console.error('Fetch all error:', err);
  }
}

function renderResults() {
  if (!resultsScroll) return;
  const filtered = filterList(currentResults, activeFilter);

  if (filtered.length === 0) {
    resultsScroll.innerHTML = `
      <div class="feed-empty-state">
        <div class="empty-icon-wrap">📂</div>
        <h3>No Files Found</h3>
        <p>No files match "<strong>${escapeHtml(currentQuery)}</strong>" in the indexed directory.</p>
      </div>
    `;
    return;
  }

  resultsScroll.innerHTML = '';

  filtered.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = `file-card ${index === selectedIndex ? 'selected' : ''}`;
    card.setAttribute('data-idx', index);

    const ext = (item.extension || 'file').toLowerCase();
    const snippetText = item.snippets && item.snippets.length > 0 ? item.snippets[0].text : '';

    card.innerHTML = `
      <div class="card-top-row">
        <div class="card-title-group">
          <span class="ext-badge ${ext}">${escapeHtml(ext)}</span>
          <span class="card-name" title="${escapeHtml(item.fileName)}">${escapeHtml(item.fileName)}</span>
        </div>
        ${item.score > 0 ? `<span class="card-matches-count">${item.score} ${item.score === 1 ? 'hit' : 'hits'}</span>` : ''}
      </div>

      ${snippetText ? `
        <div class="card-snippet">
          ${highlightKeyword(escapeHtml(snippetText), currentQuery)}
        </div>
      ` : ''}

      <div class="card-details-row">
        <span>${escapeHtml(item.fileSizeFormatted || '')}</span>
        <span>${escapeHtml(item.lastModified || '')}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      selectResultCard(index);
    });

    resultsScroll.appendChild(card);
  });
}

function selectResultCard(index) {
  const filtered = filterList(currentResults, activeFilter);
  if (filtered.length === 0) return;

  if (index < 0) index = 0;
  if (index >= filtered.length) index = filtered.length - 1;

  selectedIndex = index;

  if (resultsScroll) {
    const cards = resultsScroll.querySelectorAll('.file-card');
    cards.forEach((c, idx) => c.classList.toggle('selected', idx === index));

    if (cards[index]) {
      cards[index].scrollIntoView({ block: 'nearest' });
    }
  }

  const selectedItem = filtered[index];
  if (selectedItem) {
    openFileInInspector(selectedItem.filePath, selectedItem.fileName, selectedItem);
  }
}

function filterList(results, filter) {
  if (filter === 'all') return results;
  const codeExts = ['java', 'py', 'js', 'ts', 'c', 'cpp', 'h', 'cs', 'html', 'css', 'sql', 'sh', 'bat'];
  const docExts = ['txt', 'md', 'markdown', 'log'];
  const dataExts = ['json', 'xml', 'csv', 'yml', 'yaml', 'toml', 'ini', 'properties'];

  return results.filter(r => {
    const ext = (r.extension || '').toLowerCase();
    if (filter === 'code') return codeExts.includes(ext);
    if (filter === 'docs') return docExts.includes(ext);
    if (filter === 'data') return dataExts.includes(ext);
    return true;
  });
}

// --- INSPECTOR PANE ---

async function openFileInInspector(filePath, fileName, optionalMeta) {
  selectedDocData = { filePath, fileName };

  if (inspectorEmpty) inspectorEmpty.classList.add('hidden');
  if (inspectorContent) inspectorContent.classList.remove('hidden');

  if (previewFilename) previewFilename.textContent = fileName || '';
  if (previewFilepath) previewFilepath.textContent = filePath || '';

  const ext = getFileExtension(fileName);
  if (previewExtTag) {
    previewExtTag.textContent = ext.toUpperCase() || 'FILE';
    previewExtTag.className = `ext-tag ${ext.toLowerCase()}`;
  }

  if (optionalMeta) {
    if (previewSize) previewSize.textContent = optionalMeta.fileSizeFormatted || '0 B';
    if (previewWords) previewWords.textContent = optionalMeta.wordCount || '0';
    if (previewScore) previewScore.textContent = optionalMeta.score || '0';
  } else {
    if (previewSize) previewSize.textContent = '-';
    if (previewWords) previewWords.textContent = '-';
    if (previewScore) previewScore.textContent = '-';
  }

  if (codeLinesTable) {
    codeLinesTable.innerHTML = '<div style="padding:16px; color:var(--text-muted);">Reading file content...</div>';
  }

  try {
    const res = await fetch(`${API_BASE}/api/document?path=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Cannot read file');

    if (previewSize) previewSize.textContent = data.fileSizeFormatted || previewSize.textContent;
    if (previewWords) previewWords.textContent = data.wordCount || previewWords.textContent;

    const lines = (data.content || '').split(/\r?\n/);
    if (codeLinesTable) {
      codeLinesTable.innerHTML = '';

      let firstMatchedEl = null;
      const queryTokens = currentQuery.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

      lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const lower = line.toLowerCase();
        const isMatched = queryTokens.length > 0 && queryTokens.some(t => lower.includes(t));

        const row = document.createElement('div');
        row.className = `code-row ${isMatched ? 'match-highlight' : ''}`;
        row.innerHTML = `
          <span class="code-num">${lineNum}</span>
          <span class="code-text">${highlightKeyword(escapeHtml(line), currentQuery)}</span>
        `;

        if (isMatched && !firstMatchedEl) {
          firstMatchedEl = row;
        }

        codeLinesTable.appendChild(row);
      });

      if (firstMatchedEl) {
        setTimeout(() => {
          firstMatchedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
      }
    }
  } catch (err) {
    if (codeLinesTable) {
      codeLinesTable.innerHTML = `<div style="padding:16px; color:#ef4444;">${escapeHtml(err.message)}</div>`;
    }
  }
}

// --- OS INTEGRATION (OPEN & REVEAL) ---

async function openSystemFile(filePath) {
  try {
    const res = await fetch(`${API_BASE}/api/open-file?path=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    if (res.ok) {
      showToast(`✓ Opened in default app: ${getBasename(filePath)}`);
    } else {
      showToast(data.error || 'Failed to open file', true);
    }
  } catch (err) {
    showToast('Failed to open file: ' + err.message, true);
  }
}

async function revealInExplorer(filePath) {
  try {
    const res = await fetch(`${API_BASE}/api/reveal-folder?path=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    if (res.ok) {
      showToast('✓ Opened in Windows File Explorer');
    } else {
      showToast(data.error || 'Failed to open Explorer', true);
    }
  } catch (err) {
    showToast('Explorer error: ' + err.message, true);
  }
}

// --- STATS & RECENT ---

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    if (!res.ok) return;
    const data = await res.json();

    if (statDocCount) statDocCount.textContent = data.docCount || 0;
    if (statWordCount) statWordCount.textContent = data.wordCount || 0;

    // Load initial feed
    if (searchInput && !searchInput.value.trim()) {
      fetchAllIndexedDocs();
    }
  } catch (err) {
    console.error('Stats error:', err);
  }
}

async function loadRecent() {
  try {
    const res = await fetch(`${API_BASE}/api/recent`);
    if (!res.ok) return;
    const data = await res.json();
    renderRecent(data.recent || []);
  } catch (err) {
    console.error('Recent error:', err);
  }
}

function renderRecent(recent) {
  if (!recentChips) return;
  if (!recent || recent.length === 0) {
    recentChips.innerHTML = '<span class="empty-hint">No recent searches</span>';
    return;
  }

  recentChips.innerHTML = '';
  recent.slice().reverse().forEach(q => {
    const chip = document.createElement('span');
    chip.className = 'recent-chip';
    chip.textContent = q;
    chip.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = q;
        if (btnClearInput) btnClearInput.classList.remove('hidden');
      }
      executeSearch(q);
    });
    recentChips.appendChild(chip);
  });
}

async function clearRecent() {
  try {
    await fetch(`${API_BASE}/api/clear`, { method: 'POST' });
    loadRecent();
    showToast('Cleared recent searches');
  } catch (err) {
    showToast('Failed to clear: ' + err.message, true);
  }
}

// --- UTILITIES ---

function highlightKeyword(text, keyword) {
  if (!text || !keyword) return text || '';
  const tokens = keyword.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (tokens.length === 0) return text;

  const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getBasename(path) {
  if (!path) return '';
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1];
}

function getFileExtension(filename) {
  if (!filename) return '';
  const dot = filename.lastIndexOf('.');
  if (dot > 0 && dot < filename.length - 1) {
    return filename.substring(dot + 1).toLowerCase();
  }
  return '';
}

let toastTimer = null;
function showToast(msg, isError = false) {
  if (!appToast) return;
  appToast.textContent = msg;
  appToast.style.borderColor = isError ? '#ef4444' : 'var(--accent-blue)';
  appToast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    appToast.classList.add('hidden');
  }, 2600);
}
