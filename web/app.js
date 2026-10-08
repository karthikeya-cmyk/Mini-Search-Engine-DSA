/**
 * ============================================================================
 * NEXUS // MINI SEARCH ENGINE (DSA) — CLIENT APPLICATION CONTROLLER
 * ============================================================================
 * Dual-Mode Engine:
 *   1. Connected Mode (Localhost / Java WebServer):
 *      - Full access to local disk files, folders, and drives (C:\, Documents, etc.)
 *      - Sub-millisecond Java Max-Heap ranking and Trie prefix autocomplete
 *      - Native OS file opening and File Explorer integration
 *   2. Standalone Mode (In-Browser / Static / Offline):
 *      - Client-side in-memory DSA Engine (Trie, Inverted Index, Max-Heap, Stack, Queue)
 *      - In-browser file/folder uploading and custom document indexing
 * ============================================================================
 */

// Determine Backend API Base (auto-detects port 8080 or falls back to current host)
const API_BASE = (window.location.protocol.startsWith('http') && window.location.port === '8080')
  ? window.location.origin
  : 'http://localhost:8080';

// Global Application State
const state = {
  currentTab: 'search',
  backendConnected: false,
  activeCorpusPath: '',
  activeCorpusName: 'Demo Corpus (./documents)',
  activeCorpusFilter: 'all',
  searchResults: [],
  selectedDoc: null,
  activeFilter: 'all',
  activeSortMode: 'heap',
  currentQuery: '',
  trieSuggestions: [],
  autoHighlightIdx: -1,
  debounceTimers: {},
  latestHeapTrace: [],
  customDocs: []
};

// DOM References
const elements = {
  // Navigation
  navTabs: document.querySelectorAll('.nav-tab'),
  tabPanels: document.querySelectorAll('.tab-panel'),
  btnBrandHome: document.getElementById('btn-brand-home'),
  btnThemeToggle: document.getElementById('btn-theme-toggle'),

  // Header Status
  currentCorpusName: document.getElementById('current-corpus-name'),
  corpusDropdownTrigger: document.getElementById('corpus-dropdown-trigger'),
  corpusDropdownMenu: document.getElementById('corpus-dropdown-menu'),
  corpusLocationsList: document.getElementById('corpus-locations-list'),
  headerStatDocs: document.getElementById('header-stat-docs'),
  headerStatWords: document.getElementById('header-stat-words'),
  btnReindexHeader: document.getElementById('btn-reindex-header'),

  // Omnibar Search
  omnibarWrapper: document.getElementById('omnibar-wrapper'),
  mainSearchInput: document.getElementById('main-search-input'),
  btnClearSearch: document.getElementById('btn-clear-search'),
  trieAutocompleteBox: document.getElementById('trie-autocomplete-box'),
  autocompleteItemsList: document.getElementById('autocomplete-items-list'),
  filterPills: document.querySelectorAll('.filter-pill'),
  selectSortMode: document.getElementById('select-sort-mode'),

  // Search Results & Telemetry
  teleTotalTime: document.getElementById('tele-total-time'),
  teleLookupTime: document.getElementById('tele-lookup-time'),
  teleHeapTime: document.getElementById('tele-heap-time'),
  teleMatchCount: document.getElementById('tele-match-count'),
  resultsContainer: document.getElementById('results-container'),

  // Explorer Tab
  explorerLocationsList: document.getElementById('explorer-locations-list'),
  explorerCrumbsTrail: document.getElementById('explorer-crumbs-trail'),
  explorerFileTree: document.getElementById('explorer-file-tree'),
  explorerActivePath: document.getElementById('explorer-active-path'),
  btnIndexThisFolder: document.getElementById('btn-index-this-folder'),
  btnRevealActiveFolder: document.getElementById('btn-reveal-active-folder'),
  btnCreateDoc: document.getElementById('btn-create-doc'),
  btnUploadFiles: document.getElementById('btn-upload-files'),
  btnUploadFolder: document.getElementById('btn-upload-folder'),
  inputUploadFiles: document.getElementById('input-upload-files'),
  inputUploadFolder: document.getElementById('input-upload-folder'),
  explorerDocList: document.getElementById('explorer-doc-list'),

  // DSA Studio Tab
  btnClearHistory: document.getElementById('btn-clear-history'),
  dsaStackVisual: document.getElementById('dsa-stack-visual'),
  dsaQueueVisual: document.getElementById('dsa-queue-visual'),
  dsaTrieTestInput: document.getElementById('dsa-trie-test-input'),
  btnTrieTestClear: document.getElementById('btn-trie-test-clear'),
  trieStatNodes: document.getElementById('trie-stat-nodes'),
  trieStatWords: document.getElementById('trie-stat-words'),
  dsaTrieBranchesBox: document.getElementById('dsa-trie-branches-box'),
  heapTraceQuery: document.getElementById('heap-trace-query'),
  dsaHeapTraceBox: document.getElementById('dsa-heap-trace-box'),
  dsaInvFilterInput: document.getElementById('dsa-inv-filter-input'),
  dsaInvTableBody: document.getElementById('dsa-inv-table-body'),

  // Drawer Inspector
  inspectorDrawer: document.getElementById('inspector-drawer'),
  inspectorBackdrop: document.getElementById('inspector-backdrop'),
  btnCloseDrawer: document.getElementById('btn-close-drawer'),
  drawerExtBadge: document.getElementById('drawer-ext-badge'),
  drawerDocName: document.getElementById('drawer-doc-name'),
  drawerDocPath: document.getElementById('drawer-doc-path'),
  drawerFileSize: document.getElementById('drawer-file-size'),
  drawerWordCount: document.getElementById('drawer-word-count'),
  drawerRelevanceScore: document.getElementById('drawer-relevance-score'),
  drawerCodeTable: document.getElementById('drawer-code-table'),
  btnDrawerOpen: document.getElementById('btn-drawer-open'),
  btnDrawerReveal: document.getElementById('btn-drawer-reveal'),
  btnDrawerCopy: document.getElementById('btn-drawer-copy'),
  btnDrawerCopyContent: document.getElementById('btn-drawer-copy-content'),
  btnDrawerDownload: document.getElementById('btn-drawer-download'),

  // Modal
  docCreateModal: document.getElementById('doc-create-modal'),
  newDocTitle: document.getElementById('new-doc-title'),
  newDocContent: document.getElementById('new-doc-content'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  btnCancelModal: document.getElementById('btn-cancel-modal'),
  btnSaveDoc: document.getElementById('btn-save-doc'),

  // Toast
  appToast: document.getElementById('app-toast')
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupEventListeners();
  await checkBackendAndInitialize();
});

async function checkBackendAndInitialize() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      state.backendConnected = true;
      console.log('⚡ Connected to Java Backend Server with full disk access');
      await loadCorpusLocations();
      await loadSystemStats();
      executeSearch('');
      return;
    }
  } catch (e) {
    console.log('ℹ️ Operating in client-side in-memory DSA mode');
  }

  // Fallback to in-memory mode
  state.backendConnected = false;
  loadInitialCorpusFallback();
  updateUIStatsFallback();
  executeSearchFallback('');
}

// ============================================================================
// NAVIGATION
// ============================================================================

function setupNavigation() {
  elements.navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      switchMainTab(target);
    });
  });

  if (elements.btnBrandHome) {
    elements.btnBrandHome.addEventListener('click', () => switchMainTab('search'));
  }
}

function switchMainTab(tabName) {
  state.currentTab = tabName;
  elements.navTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tabName));
  elements.tabPanels.forEach(p => p.classList.toggle('active', p.id === `panel-${tabName}`));

  if (tabName === 'explorer') {
    if (state.backendConnected) {
      browseExplorerPath(state.activeCorpusPath || 'documents');
    } else {
      renderExplorerTreeFallback();
    }
  } else if (tabName === 'dsa') {
    renderDsaStudio();
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  // Global Shortcut Ctrl+K / '/'
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && document.activeElement !== elements.mainSearchInput && document.activeElement !== elements.dsaTrieTestInput && document.activeElement !== elements.dsaInvFilterInput && document.activeElement !== elements.newDocContent)) {
      e.preventDefault();
      switchMainTab('search');
      if (elements.mainSearchInput) {
        elements.mainSearchInput.focus();
        elements.mainSearchInput.select();
      }
    } else if (e.key === 'Escape') {
      hideAutocomplete();
      closeInspector();
      closeModal();
    }
  });

  // Omnibar Input: Instant Search & Trie Autocomplete
  if (elements.mainSearchInput) {
    elements.mainSearchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val.trim()) {
        elements.btnClearSearch.classList.remove('hidden');
      } else {
        elements.btnClearSearch.classList.add('hidden');
        hideAutocomplete();
        executeSearch('');
        return;
      }

      // Debounce Instant Search (50ms)
      clearTimeout(state.debounceTimers.search);
      state.debounceTimers.search = setTimeout(() => executeSearch(val.trim()), 50);

      // Debounce Trie Autocomplete Dropdown (60ms)
      clearTimeout(state.debounceTimers.auto);
      state.debounceTimers.auto = setTimeout(() => fetchTrieAutocomplete(val.trim()), 60);
    });

    elements.mainSearchInput.addEventListener('keydown', handleOmnibarKeydown);
  }

  // Clear Search Button
  if (elements.btnClearSearch) {
    elements.btnClearSearch.addEventListener('click', () => {
      elements.mainSearchInput.value = '';
      elements.btnClearSearch.classList.add('hidden');
      hideAutocomplete();
      executeSearch('');
      elements.mainSearchInput.focus();
    });
  }

  // Click Outside to Dismiss Menus
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#omnibar-wrapper')) {
      hideAutocomplete();
    }
    if (!e.target.closest('#corpus-dropdown-trigger')) {
      if (elements.corpusDropdownMenu) elements.corpusDropdownMenu.classList.add('hidden');
    }
  });

  // Corpus Dropdown Trigger
  if (elements.corpusDropdownTrigger) {
    elements.corpusDropdownTrigger.addEventListener('click', (e) => {
      if (e.target.closest('#corpus-dropdown-menu')) return;
      e.stopPropagation();
      elements.corpusDropdownMenu.classList.toggle('hidden');
    });
  }

  // Filter Pills (All, Code, Books & Docs, Data)
  elements.filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      elements.filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeFilter = pill.getAttribute('data-filter');
      renderSearchResults();
    });
  });

  // Sort Mode Dropdown
  if (elements.selectSortMode) {
    elements.selectSortMode.addEventListener('change', (e) => {
      state.activeSortMode = e.target.value;
      renderSearchResults();
    });
  }

  // Re-index Button in Header
  if (elements.btnReindexHeader) {
    elements.btnReindexHeader.addEventListener('click', () => {
      if (state.backendConnected && state.activeCorpusPath) {
        indexFolder(state.activeCorpusPath);
      } else {
        rebuildIndexFallback();
        showToast('⚡ Re-indexed memory corpus into Trie & Inverted Index');
        executeSearch(elements.mainSearchInput ? elements.mainSearchInput.value.trim() : '');
      }
    });
  }

  // Dark/Light Theme Toggle
  if (elements.btnThemeToggle) {
    elements.btnThemeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      localStorage.setItem('nexus_theme', isLight ? 'light' : 'dark');
    });
    if (localStorage.getItem('nexus_theme') === 'light') {
      document.body.classList.add('light-theme');
    }
  }

  // Drawer Controls
  if (elements.btnCloseDrawer) elements.btnCloseDrawer.addEventListener('click', closeInspector);
  if (elements.inspectorBackdrop) elements.inspectorBackdrop.addEventListener('click', closeInspector);

  if (elements.btnDrawerOpen) {
    elements.btnDrawerOpen.addEventListener('click', () => {
      if (state.selectedDoc) openSystemFile(state.selectedDoc.filePath);
    });
  }

  if (elements.btnDrawerReveal) {
    elements.btnDrawerReveal.addEventListener('click', () => {
      if (state.selectedDoc) revealFileInExplorer(state.selectedDoc.filePath);
    });
  }

  if (elements.btnDrawerCopy) {
    elements.btnDrawerCopy.addEventListener('click', () => {
      if (state.selectedDoc) {
        navigator.clipboard.writeText(state.selectedDoc.filePath);
        showToast('✓ File path copied to clipboard');
      }
    });
  }

  if (elements.btnDrawerCopyContent) {
    elements.btnDrawerCopyContent.addEventListener('click', () => {
      if (state.selectedDoc) {
        navigator.clipboard.writeText(state.selectedDoc.content || '');
        showToast('✓ Document text copied to clipboard');
      }
    });
  }

  if (elements.btnDrawerDownload) {
    elements.btnDrawerDownload.addEventListener('click', () => {
      if (state.selectedDoc) downloadDocumentFile(state.selectedDoc);
    });
  }

  // Explorer Actions
  if (elements.btnIndexThisFolder) {
    elements.btnIndexThisFolder.addEventListener('click', () => {
      const path = elements.explorerActivePath.textContent;
      if (path && path !== '-') indexFolder(path);
    });
  }

  if (elements.btnRevealActiveFolder) {
    elements.btnRevealActiveFolder.addEventListener('click', () => {
      const path = elements.explorerActivePath.textContent;
      if (path && path !== '-') revealFileInExplorer(path);
    });
  }

  if (elements.btnUploadFiles) {
    elements.btnUploadFiles.addEventListener('click', () => {
      if (elements.inputUploadFiles) elements.inputUploadFiles.click();
    });
  }
  if (elements.inputUploadFiles) {
    elements.inputUploadFiles.addEventListener('change', handleFilesUpload);
  }

  if (elements.btnUploadFolder) {
    elements.btnUploadFolder.addEventListener('click', () => {
      if (elements.inputUploadFolder) elements.inputUploadFolder.click();
    });
  }
  if (elements.inputUploadFolder) {
    elements.inputUploadFolder.addEventListener('change', handleFilesUpload);
  }

  if (elements.btnCreateDoc) {
    elements.btnCreateDoc.addEventListener('click', openModal);
  }

  // Modal Actions
  if (elements.btnCloseModal) elements.btnCloseModal.addEventListener('click', closeModal);
  if (elements.btnCancelModal) elements.btnCancelModal.addEventListener('click', closeModal);
  if (elements.btnSaveDoc) elements.btnSaveDoc.addEventListener('click', handleSaveNewDocument);

  // DSA Studio Actions
  if (elements.btnClearHistory) {
    elements.btnClearHistory.addEventListener('click', clearHistory);
  }

  if (elements.dsaTrieTestInput) {
    elements.dsaTrieTestInput.addEventListener('input', (e) => {
      renderTrieVisualizer(e.target.value.trim());
    });
  }

  if (elements.btnTrieTestClear) {
    elements.btnTrieTestClear.addEventListener('click', () => {
      if (elements.dsaTrieTestInput) elements.dsaTrieTestInput.value = '';
      renderTrieVisualizer('');
    });
  }

  if (elements.dsaInvFilterInput) {
    elements.dsaInvFilterInput.addEventListener('input', (e) => {
      renderInvertedIndexTable(e.target.value.trim().toLowerCase());
    });
  }
}

// ============================================================================
// SEARCH & RANKING (MAX-HEAP & INVERTED INDEX)
// ============================================================================

async function executeSearch(query) {
  query = (query || '').trim();
  state.currentQuery = query;

  if (!query) {
    if (state.backendConnected) {
      await loadAllIndexedDocs();
    } else {
      executeSearchFallback('');
    }
    return;
  }

  hideAutocomplete();

  if (!state.backendConnected) {
    executeSearchFallback(query);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Search failed');

    state.searchResults = data.results || [];

    if (elements.teleTotalTime) elements.teleTotalTime.textContent = `${data.durationMs} ms`;
    if (elements.teleLookupTime) elements.teleLookupTime.textContent = `${data.lookupMs || '0.010'} ms`;
    if (elements.teleHeapTime) elements.teleHeapTime.textContent = `${data.heapSortMs || '0.015'} ms`;
    if (elements.teleMatchCount) elements.teleMatchCount.textContent = `${data.totalMatches} matches`;

    renderSearchResults();
    loadSystemStats();
  } catch (err) {
    console.warn('Backend search error, falling back to in-memory search:', err);
    executeSearchFallback(query);
  }
}

async function loadAllIndexedDocs() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    if (!res.ok) return;
    const data = await res.json();

    state.searchResults = (data.documents || []).map((d, i) => ({
      rank: i + 1,
      fileName: d.fileName,
      filePath: d.filePath,
      extension: getFileExtension(d.fileName),
      fileSizeFormatted: d.fileSizeFormatted,
      lastModified: d.lastModified,
      wordCount: d.wordCount,
      score: 0,
      snippets: []
    }));

    if (elements.teleTotalTime) elements.teleTotalTime.textContent = '0.000 ms';
    if (elements.teleLookupTime) elements.teleLookupTime.textContent = '0.000 ms';
    if (elements.teleHeapTime) elements.teleHeapTime.textContent = '0.000 ms';
    if (elements.teleMatchCount) elements.teleMatchCount.textContent = `${state.searchResults.length} indexed files`;

    renderSearchResults();
  } catch (err) {
    console.error('Load all error:', err);
  }
}

function renderSearchResults() {
  if (!elements.resultsContainer) return;

  let list = filterResults(state.searchResults, state.activeFilter);
  list = sortResults(list, state.activeSortMode);

  if (list.length === 0) {
    elements.resultsContainer.innerHTML = `
      <div class="feed-empty-state">
        <div class="empty-icon-wrap">🔍</div>
        <h3>No matching files found</h3>
        <p>No documents matched "<strong>${escapeHtml(state.currentQuery)}</strong>" in the active corpus.</p>
      </div>
    `;
    return;
  }

  elements.resultsContainer.innerHTML = '';

  list.forEach((item, index) => {
    const card = document.createElement('div');
    const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
    card.className = `result-card ${rankClass}`;

    const snippetText = item.snippets && item.snippets.length > 0 ? (item.snippets[0].text || item.snippets[0]) : '';

    card.innerHTML = `
      <div class="result-header-row">
        <div class="result-title-wrap">
          <span class="rank-badge">#${index + 1}</span>
          <span class="doc-name" title="Click to view in inspector">${escapeHtml(item.fileName)}</span>
        </div>
        ${item.score > 0 ? `
          <div class="score-badge-wrap" title="Max-Heap Priority Score (Keyword Frequency)">
            <span>🎯 Score:</span>
            <strong>${item.score}</strong>
          </div>
        ` : ''}
      </div>

      ${snippetText ? `
        <div class="result-snippet-box">
          ${highlightKeywords(escapeHtml(snippetText), state.currentQuery)}
        </div>
      ` : ''}

      <div class="result-footer-row">
        <div class="result-meta-tags">
          <span>📁 ${escapeHtml((item.extension || 'DOC').toUpperCase())}</span>
          <span>&bull;</span>
          <span>${escapeHtml(item.fileSizeFormatted || '0 B')}</span>
          <span>&bull;</span>
          <span>${item.wordCount || 0} words</span>
          <span>&bull;</span>
          <span>${escapeHtml(item.lastModified || '')}</span>
        </div>
        <div class="result-actions-group">
          <button class="btn-card-action primary btn-inspect" title="Inspect full document content">👁️ Preview</button>
          <button class="btn-card-action btn-reveal" title="Show in Windows File Explorer">📂 Explorer</button>
          <button class="btn-card-action btn-open" title="Open file in default editor">🚀 Open</button>
        </div>
      </div>
    `;

    // Bind Card Actions
    card.querySelector('.doc-name').addEventListener('click', () => openInspector(item));
    card.querySelector('.btn-inspect').addEventListener('click', () => openInspector(item));
    card.querySelector('.btn-reveal').addEventListener('click', () => revealFileInExplorer(item.filePath));
    card.querySelector('.btn-open').addEventListener('click', () => openSystemFile(item.filePath));

    elements.resultsContainer.appendChild(card);
  });
}

function filterResults(list, filter) {
  if (filter === 'all') return list;
  const codeExts = ['java', 'py', 'js', 'ts', 'c', 'cpp', 'h', 'cs', 'html', 'css', 'sql', 'sh', 'bat'];
  const docExts = ['txt', 'md', 'markdown', 'log', 'pdf', 'docx'];
  const dataExts = ['json', 'xml', 'csv', 'yml', 'yaml', 'toml', 'properties'];

  return list.filter(r => {
    const ext = (r.extension || '').toLowerCase();
    if (filter === 'code') return codeExts.includes(ext);
    if (filter === 'docs') return docExts.includes(ext);
    if (filter === 'data') return dataExts.includes(ext);
    return true;
  });
}

function sortResults(list, sortMode) {
  const copy = [...list];
  if (sortMode === 'heap') {
    return copy; // Max-Heap ordered
  } else if (sortMode === 'name') {
    return copy.sort((a, b) => a.fileName.localeCompare(b.fileName));
  } else if (sortMode === 'size') {
    return copy.sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0));
  } else if (sortMode === 'date') {
    return copy.sort((a, b) => (b.lastModified || '').localeCompare(a.lastModified || ''));
  }
  return copy;
}

// ============================================================================
// TRIE AUTOCOMPLETE SUGGESTIONS (MEMBER 1)
// ============================================================================

async function fetchTrieAutocomplete(prefix) {
  if (!prefix) {
    hideAutocomplete();
    return;
  }

  if (state.backendConnected) {
    try {
      const res = await fetch(`${API_BASE}/api/autocomplete?q=${encodeURIComponent(prefix)}`);
      if (!res.ok) return;
      const data = await res.json();
      renderTrieAutocomplete(prefix, data.items || data.suggestions || []);
      return;
    } catch (err) {
      console.warn('Trie autocomplete backend error:', err);
    }
  }

  // Fallback in-memory autocomplete
  const items = fallbackTrie.autoCompleteDetails(prefix);
  renderTrieAutocomplete(prefix, items);
}

function renderTrieAutocomplete(prefix, rawItems) {
  const items = (rawItems || []).map(it => {
    if (typeof it === 'string') {
      return { text: it, displayText: it, category: 'keyword', isFileName: false, docCount: 1, frequency: 1 };
    }
    return it;
  });

  state.trieSuggestions = items.map(it => it.displayText || it.text);
  state.autoHighlightIdx = -1;

  if (!elements.trieAutocompleteBox || !elements.autocompleteItemsList) return;

  if (items.length === 0) {
    hideAutocomplete();
    return;
  }

  elements.autocompleteItemsList.innerHTML = '';
  items.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'auto-item';

    const word = item.displayText || item.text;
    const lowerWord = word.toLowerCase();
    const lowerPrefix = prefix.toLowerCase();
    let display = escapeHtml(word);

    const matchIdx = lowerWord.indexOf(lowerPrefix);
    if (matchIdx >= 0) {
      const before = escapeHtml(word.substring(0, matchIdx));
      const matched = escapeHtml(word.substring(matchIdx, matchIdx + prefix.length));
      const after = escapeHtml(word.substring(matchIdx + prefix.length));
      display = `${before}<span class="auto-bold">${matched}</span>${after}`;
    }

    let icon = '🔍';
    let badgeText = `${item.docCount || 1} doc`;
    let badgeClass = 'badge-keyword';

    if (item.category === 'folder') {
      icon = '📁';
      badgeText = 'Storage Folder';
      badgeClass = 'badge-folder';
    } else if (item.isFileName || item.category === 'file') {
      icon = '📄';
      badgeText = 'Storage File';
      badgeClass = 'badge-file';
    } else if (item.docCount > 1) {
      badgeText = `${item.docCount} docs`;
    }

    li.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
        <span style="font-size:14px; flex-shrink:0;">${icon}</span>
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:500;">${display}</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
        <span class="dsa-badge-sm ${badgeClass}">${escapeHtml(badgeText)}</span>
        <span style="font-family:var(--font-mono); font-size:10px; color:var(--text-muted);">↵ select</span>
      </div>
    `;

    li.addEventListener('click', () => {
      elements.mainSearchInput.value = word;
      hideAutocomplete();
      executeSearch(word);
    });

    elements.autocompleteItemsList.appendChild(li);
  });

  elements.trieAutocompleteBox.classList.remove('hidden');
}

function hideAutocomplete() {
  if (elements.trieAutocompleteBox) elements.trieAutocompleteBox.classList.add('hidden');
  state.autoHighlightIdx = -1;
  state.trieSuggestions = [];
}

function handleOmnibarKeydown(e) {
  if (!elements.autocompleteItemsList) return;
  const items = elements.autocompleteItemsList.querySelectorAll('.auto-item');

  if (e.key === 'ArrowDown') {
    if (elements.trieAutocompleteBox && !elements.trieAutocompleteBox.classList.contains('hidden') && items.length > 0) {
      e.preventDefault();
      state.autoHighlightIdx = (state.autoHighlightIdx + 1) % items.length;
      items.forEach((it, idx) => it.classList.toggle('active', idx === state.autoHighlightIdx));
    }
  } else if (e.key === 'ArrowUp') {
    if (elements.trieAutocompleteBox && !elements.trieAutocompleteBox.classList.contains('hidden') && items.length > 0) {
      e.preventDefault();
      state.autoHighlightIdx = (state.autoHighlightIdx - 1 + items.length) % items.length;
      items.forEach((it, idx) => it.classList.toggle('active', idx === state.autoHighlightIdx));
    }
  } else if (e.key === 'Enter') {
    if (elements.trieAutocompleteBox && !elements.trieAutocompleteBox.classList.contains('hidden') && state.autoHighlightIdx >= 0) {
      e.preventDefault();
      const chosen = state.trieSuggestions[state.autoHighlightIdx];
      elements.mainSearchInput.value = chosen;
      hideAutocomplete();
      executeSearch(chosen);
    } else {
      hideAutocomplete();
      executeSearch(elements.mainSearchInput.value);
    }
  } else if (e.key === 'Escape') {
    hideAutocomplete();
  }
}

// ============================================================================
// CORPUS & FILE SYSTEM BROWSER
// ============================================================================

async function loadCorpusLocations() {
  try {
    const res = await fetch(`${API_BASE}/api/fs/locations`);
    if (!res.ok) return;
    const data = await res.json();

    state.activeCorpusPath = data.currentIndexed || '';
    state.activeCorpusName = getBasename(state.activeCorpusPath) || 'Active Directory';

    if (elements.currentCorpusName) {
      elements.currentCorpusName.textContent = state.activeCorpusName;
    }

    renderCorpusDropdown(data.locations || []);
    renderExplorerLocations(data.locations || []);
  } catch (err) {
    console.error('Failed to load locations:', err);
  }
}

function renderCorpusDropdown(locations) {
  if (!elements.corpusLocationsList) return;
  elements.corpusLocationsList.innerHTML = '';

  locations.forEach(loc => {
    const item = document.createElement('div');
    const isActive = loc.path.toLowerCase() === (state.activeCorpusPath || '').toLowerCase();
    item.className = `dropdown-item ${isActive ? 'active' : ''}`;
    item.title = loc.path;
    item.innerHTML = `
      <span class="dropdown-item-icon">${loc.type === 'docs' ? '📚' : loc.type === 'drive' ? '💻' : '📁'}</span>
      <span class="dropdown-item-name">${escapeHtml(loc.name)}</span>
      ${isActive ? '<span class="dropdown-item-check">✓</span>' : ''}
    `;
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.corpusDropdownMenu.classList.add('hidden');
      indexFolder(loc.path);
    });
    elements.corpusLocationsList.appendChild(item);
  });
}

function renderExplorerLocations(locations) {
  if (!elements.explorerLocationsList) return;
  elements.explorerLocationsList.innerHTML = '';

  locations.forEach(loc => {
    const btn = document.createElement('button');
    btn.className = 'location-item-btn';
    btn.innerHTML = `
      <span>${loc.type === 'docs' ? '📚' : loc.type === 'drive' ? '💻' : '📁'}</span>
      <span>${escapeHtml(loc.name)}</span>
    `;
    btn.addEventListener('click', () => browseExplorerPath(loc.path));
    elements.explorerLocationsList.appendChild(btn);
  });
}

async function browseExplorerPath(path) {
  if (!path) return;

  try {
    const res = await fetch(`${API_BASE}/api/fs/browse?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Cannot read folder');

    if (elements.explorerActivePath) {
      elements.explorerActivePath.textContent = data.currentPath || path;
    }

    renderExplorerCrumbs(data.currentPath || path);
    renderExplorerTree(data.items || [], data.currentPath || path);
  } catch (err) {
    if (elements.explorerDocList) {
      elements.explorerDocList.innerHTML = `<div style="color:var(--accent-rose); padding:20px;">${escapeHtml(err.message)}</div>`;
    }
  }
}

function renderExplorerCrumbs(fullPath) {
  if (!elements.explorerCrumbsTrail || !fullPath) return;
  const parts = fullPath.split(/[\\/]/).filter(Boolean);
  elements.explorerCrumbsTrail.innerHTML = '';

  let accumulated = '';
  parts.forEach((part, index) => {
    if (index === 0 && fullPath.includes(':')) {
      accumulated = part + '\\';
    } else {
      accumulated += (accumulated.endsWith('\\') ? '' : '\\') + part;
    }

    const pathToBrowse = accumulated;
    const span = document.createElement('span');
    span.className = 'crumb-part';
    span.textContent = part;
    span.addEventListener('click', () => browseExplorerPath(pathToBrowse));
    elements.explorerCrumbsTrail.appendChild(span);

    if (index < parts.length - 1) {
      const sep = document.createElement('span');
      sep.textContent = '›';
      sep.style.color = 'var(--text-muted)';
      elements.explorerCrumbsTrail.appendChild(sep);
    }
  });
}

function renderExplorerTree(items, currentPath) {
  if (!elements.explorerFileTree || !elements.explorerDocList) return;

  elements.explorerFileTree.innerHTML = '';
  elements.explorerDocList.innerHTML = '';

  items.forEach(item => {
    // Tree row
    const row = document.createElement('div');
    row.className = 'tree-file-row';
    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
        <span>${item.isDir ? '📁' : '📄'}</span>
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(item.name)}</span>
      </div>
      <span style="font-size:10px; color:var(--text-muted);">${item.isDir ? 'DIR' : item.sizeFormatted}</span>
    `;

    row.addEventListener('click', () => {
      if (item.isDir) {
        browseExplorerPath(item.path);
      } else {
        openInspector({ fileName: item.name, filePath: item.path, fileSizeFormatted: item.sizeFormatted });
      }
    });

    elements.explorerFileTree.appendChild(row);

    // Main grid card
    if (!item.isDir) {
      const docCard = document.createElement('div');
      docCard.className = 'doc-grid-card';
      docCard.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <span class="dsa-badge-sm">${escapeHtml((item.ext || 'doc').toUpperCase())}</span>
          <span style="font-size:11px; color:var(--text-muted);">${escapeHtml(item.sizeFormatted)}</span>
        </div>
        <h4 style="font-size:14px; font-weight:700; color:var(--text-primary); margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(item.name)}</h4>
        <div style="font-size:11px; color:var(--text-muted);">${escapeHtml(item.modified)}</div>
      `;

      docCard.addEventListener('click', () => {
        openInspector({ fileName: item.name, filePath: item.path, fileSizeFormatted: item.sizeFormatted });
      });

      elements.explorerDocList.appendChild(docCard);
    }
  });
}

// Index Directory from Local Disk
async function indexFolder(folderPath) {
  if (!folderPath) return;
  showToast(`⚡ Indexing ${getBasename(folderPath)} into Trie & Inverted Index...`);

  try {
    const res = await fetch(`${API_BASE}/api/fs/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: folderPath })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Indexing failed');

    state.activeCorpusPath = data.folderPath;
    state.activeCorpusName = getBasename(data.folderPath) || 'Indexed Folder';

    if (elements.currentCorpusName) {
      elements.currentCorpusName.textContent = state.activeCorpusName;
    }

    showToast(`✓ Indexed ${data.docCount} files (${data.wordCount} words) from disk`);
    await loadCorpusLocations();
    await loadSystemStats();
    executeSearch(elements.mainSearchInput ? elements.mainSearchInput.value.trim() : '');
  } catch (err) {
    showToast(`Error indexing: ${err.message}`);
  }
}

// ============================================================================
// FILE INSPECTOR DRAWER
// ============================================================================

async function openInspector(docMeta) {
  state.selectedDoc = docMeta;

  if (elements.drawerDocName) elements.drawerDocName.textContent = docMeta.fileName || '';
  if (elements.drawerDocPath) elements.drawerDocPath.textContent = docMeta.filePath || '';
  if (elements.drawerExtBadge) elements.drawerExtBadge.textContent = (getFileExtension(docMeta.fileName) || 'DOC').toUpperCase();
  if (elements.drawerFileSize) elements.drawerFileSize.textContent = docMeta.fileSizeFormatted || '-';
  if (elements.drawerWordCount) elements.drawerWordCount.textContent = docMeta.wordCount || '-';
  if (elements.drawerRelevanceScore) elements.drawerRelevanceScore.textContent = docMeta.score || '0';

  if (elements.drawerCodeTable) {
    elements.drawerCodeTable.innerHTML = '<div style="padding:20px; color:var(--text-muted);">Reading file content...</div>';
  }

  elements.inspectorDrawer.classList.remove('hidden');

  let content = docMeta.content || '';

  if (state.backendConnected && (!content || docMeta.filePath)) {
    try {
      const res = await fetch(`${API_BASE}/api/document?path=${encodeURIComponent(docMeta.filePath)}`);
      const data = await res.json();
      if (res.ok) {
        content = data.content || '';
        state.selectedDoc.content = content;
        if (elements.drawerFileSize) elements.drawerFileSize.textContent = data.fileSizeFormatted || elements.drawerFileSize.textContent;
        if (elements.drawerWordCount) elements.drawerWordCount.textContent = data.wordCount || elements.drawerWordCount.textContent;
      }
    } catch (e) {
      console.warn('Could not read from backend:', e);
    }
  }

  const lines = (content || '').split(/\r?\n/);
  if (elements.drawerCodeTable) {
    elements.drawerCodeTable.innerHTML = '';
    const tokens = (state.currentQuery || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

    let firstMatchEl = null;

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const lower = line.toLowerCase();
      const isMatched = tokens.length > 0 && tokens.some(t => lower.includes(t));

      const row = document.createElement('div');
      row.className = `code-row ${isMatched ? 'match-highlight' : ''}`;
      row.innerHTML = `
        <span class="code-num">${lineNum}</span>
        <span class="code-text">${highlightKeywords(escapeHtml(line), state.currentQuery)}</span>
      `;

      if (isMatched && !firstMatchEl) firstMatchEl = row;
      elements.drawerCodeTable.appendChild(row);
    });

    if (firstMatchEl) {
      setTimeout(() => firstMatchEl.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    }
  }
}

function closeInspector() {
  if (elements.inspectorDrawer) elements.inspectorDrawer.classList.add('hidden');
  state.selectedDoc = null;
}

// Native OS Actions (Localhost)
async function openSystemFile(filePath) {
  if (!state.backendConnected) {
    showToast('⚠️ Running in offline/browser mode');
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/open-file?path=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    if (res.ok) {
      showToast(`✓ Opened in default editor: ${getBasename(filePath)}`);
    } else {
      showToast(data.error || 'Cannot open file');
    }
  } catch (err) {
    showToast('Failed to open file: ' + err.message);
  }
}

async function revealFileInExplorer(filePath) {
  if (!state.backendConnected) {
    showToast('⚠️ Running in offline/browser mode');
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/reveal-folder?path=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    if (res.ok) {
      showToast('✓ Opened in Windows File Explorer');
    } else {
      showToast(data.error || 'Cannot open Explorer');
    }
  } catch (err) {
    showToast('Explorer error: ' + err.message);
  }
}

function downloadDocumentFile(doc) {
  if (!doc) return;
  const content = doc.content || '';
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = doc.fileName || 'document.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`💾 Downloaded ${doc.fileName}`);
}

// ============================================================================
// STATS & DSA STUDIO
// ============================================================================

async function loadSystemStats() {
  if (!state.backendConnected) return;
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    if (!res.ok) return;
    const data = await res.json();

    if (elements.headerStatDocs) elements.headerStatDocs.textContent = data.docCount || 0;
    if (elements.headerStatWords) elements.headerStatWords.textContent = (data.wordCount || 0).toLocaleString();
  } catch (err) {
    console.error('Stats error:', err);
  }
}

async function renderDsaStudio() {
  if (state.backendConnected) {
    await renderDsaHistoryFromBackend();
    await renderDsaRecentFromBackend();
    await renderDsaTrieFromBackend(elements.dsaTrieTestInput ? elements.dsaTrieTestInput.value.trim() : '');
    await renderDsaHeapFromBackend();
    await renderDsaInvertedIndexFromBackend(elements.dsaInvFilterInput ? elements.dsaInvFilterInput.value.trim() : '');
  } else {
    renderDsaStudioFallback();
  }
}

async function renderDsaHistoryFromBackend() {
  if (!elements.dsaStackVisual) return;
  try {
    const res = await fetch(`${API_BASE}/api/history`);
    const data = await res.json();
    const historyList = data.history || [];

    if (historyList.length === 0) {
      elements.dsaStackVisual.innerHTML = `<div style="color:var(--text-muted); font-size:12px; text-align:center; padding:30px 0;">History Stack is empty. Run a search to push queries onto the stack.</div>`;
      return;
    }

    elements.dsaStackVisual.innerHTML = '';
    historyList.forEach((query, idx) => {
      const isTop = idx === 0;
      const item = document.createElement('div');
      item.className = `stack-item ${isTop ? 'top' : ''}`;
      item.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted);">#${historyList.length - idx}</span>
          <strong>"${escapeHtml(query)}"</strong>
        </div>
        <div class="stack-item-meta">
          ${isTop ? `<span class="top-indicator">TOP (peek)</span>` : ''}
          <span style="font-size:10px; color:var(--accent-primary); font-weight:600;">↵ Run</span>
        </div>
      `;
      item.addEventListener('click', () => {
        switchMainTab('search');
        if (elements.mainSearchInput) elements.mainSearchInput.value = query;
        executeSearch(query);
      });
      elements.dsaStackVisual.appendChild(item);
    });
  } catch (e) {
    console.error('History fetch error:', e);
  }
}

async function renderDsaRecentFromBackend() {
  if (!elements.dsaQueueVisual) return;
  try {
    const res = await fetch(`${API_BASE}/api/recent`);
    const data = await res.json();
    const recentList = data.recent || [];

    if (recentList.length === 0) {
      elements.dsaQueueVisual.innerHTML = `<div style="color:var(--text-muted); font-size:12px; text-align:center; padding:30px 0;">Recent Searches Queue is empty. Search for terms to fill the FIFO buffer.</div>`;
      return;
    }

    elements.dsaQueueVisual.innerHTML = '';
    recentList.forEach((query, idx) => {
      const isHead = idx === 0;
      const isTail = idx === recentList.length - 1;

      const item = document.createElement('div');
      item.className = `queue-item ${isHead ? 'head' : ''} ${isTail ? 'tail' : ''}`;
      item.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted);">Slot [${idx}]</span>
          <strong>"${escapeHtml(query)}"</strong>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          ${isHead ? `<span class="dsa-badge-sm" style="color:var(--accent-amber);">HEAD (Oldest)</span>` : ''}
          ${isTail ? `<span class="dsa-badge-sm" style="color:var(--accent-cyan);">TAIL (Newest)</span>` : ''}
          <span style="font-size:10px; color:var(--accent-primary); font-weight:600;">↵ Run</span>
        </div>
      `;
      item.addEventListener('click', () => {
        switchMainTab('search');
        if (elements.mainSearchInput) elements.mainSearchInput.value = query;
        executeSearch(query);
      });
      elements.dsaQueueVisual.appendChild(item);
    });
  } catch (e) {
    console.error('Recent queue fetch error:', e);
  }
}

async function renderDsaTrieFromBackend(prefix) {
  if (!elements.dsaTrieBranchesBox) return;
  try {
    const res = await fetch(`${API_BASE}/api/dsa/trie?prefix=${encodeURIComponent(prefix)}`);
    const data = await res.json();

    if (elements.trieStatNodes) elements.trieStatNodes.textContent = data.nodeCount || 0;
    if (elements.trieStatWords) elements.trieStatWords.textContent = data.wordCount || 0;

    const suggestions = data.suggestions || [];
    if (!prefix) {
      elements.dsaTrieBranchesBox.innerHTML = `
        <div style="margin-bottom:8px; color:var(--text-primary); font-weight:600;">Trie Prefix Tree Ready:</div>
        <div style="color:var(--text-muted); font-size:11px;">Type any prefix above to test <code>Trie.autoComplete()</code> in real time.</div>
      `;
      return;
    }

    elements.dsaTrieBranchesBox.innerHTML = `
      <div style="margin-bottom:8px;">
        <span style="color:var(--text-muted);">Active Prefix:</span> <strong>"${escapeHtml(prefix)}"</strong>
      </div>
      <div style="margin-top:8px; font-weight:600; color:var(--text-primary); margin-bottom:6px;">Suggestions (${suggestions.length}):</div>
      <div style="display:flex; flex-wrap:wrap; gap:6px;">
        ${suggestions.map(s => `
          <span class="trie-suggestion-chip" onclick="searchFromTrie('${escapeHtml(s)}')">
            <span>🔍</span> <strong>${escapeHtml(s)}</strong>
          </span>
        `).join('')}
      </div>
    `;
  } catch (e) {
    console.error('Trie fetch error:', e);
  }
}

async function renderDsaHeapFromBackend() {
  if (!elements.dsaHeapTraceBox) return;
  const q = state.currentQuery || '';
  if (elements.heapTraceQuery) {
    elements.heapTraceQuery.textContent = q ? `Query: "${q}"` : 'All Indexed Files';
  }

  if (!q) {
    elements.dsaHeapTraceBox.innerHTML = `<div style="color:var(--text-muted); font-size:12px; text-align:center; padding:30px 0;">Enter a search query in the Omnibar to view Max-Heap poll() extraction steps.</div>`;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/dsa/heap?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    const steps = data.extractionSteps || [];

    if (steps.length === 0) {
      elements.dsaHeapTraceBox.innerHTML = `<div style="color:var(--text-muted); font-size:12px; text-align:center; padding:30px 0;">No heap items for this query.</div>`;
      return;
    }

    elements.dsaHeapTraceBox.innerHTML = '';
    steps.forEach(step => {
      const item = document.createElement('div');
      item.className = 'heap-step-card';
      item.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="step-badge">${step.step}</span>
          <div>
            <strong style="color:var(--text-primary); font-size:12.5px;">${escapeHtml(step.fileName)}</strong>
            <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">${escapeHtml(step.note)}</div>
          </div>
        </div>
        <div class="score-badge-wrap">
          <span>Score:</span>
          <strong>${step.score}</strong>
        </div>
      `;
      elements.dsaHeapTraceBox.appendChild(item);
    });
  } catch (e) {
    console.error('Heap trace fetch error:', e);
  }
}

async function renderDsaInvertedIndexFromBackend(filter) {
  if (!elements.dsaInvTableBody) return;
  try {
    const res = await fetch(`${API_BASE}/api/dsa/inverted-index?q=${encodeURIComponent(filter)}&limit=60`);
    const data = await res.json();
    const terms = data.terms || [];

    if (terms.length === 0) {
      elements.dsaInvTableBody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center; padding:24px; color:var(--text-muted);">
            No inverted index terms match "${escapeHtml(filter)}".
          </td>
        </tr>
      `;
      return;
    }

    elements.dsaInvTableBody.innerHTML = '';
    terms.forEach(termObj => {
      const tr = document.createElement('tr');
      const postings = termObj.postings || [];
      tr.innerHTML = `
        <td><strong style="color:var(--accent-primary); font-family:var(--font-mono);">${escapeHtml(termObj.term)}</strong></td>
        <td><span class="dsa-badge-sm">${termObj.docCount} file${termObj.docCount === 1 ? '' : 's'}</span></td>
        <td>
          <div style="display:flex; flex-wrap:wrap; gap:4px;">
            ${postings.map(p => `
              <span class="posting-chip" title="${escapeHtml(p.filePath)}">
                <span>${escapeHtml(p.fileName)}</span>
                <span class="posting-freq">(${p.frequency}x)</span>
              </span>
            `).join('')}
          </div>
        </td>
      `;
      elements.dsaInvTableBody.appendChild(tr);
    });
  } catch (e) {
    console.error('Inverted index fetch error:', e);
  }
}

async function clearHistory() {
  if (state.backendConnected) {
    try {
      await fetch(`${API_BASE}/api/clear`, { method: 'POST' });
    } catch (e) {}
  }
  fallbackHistory.clear();
  fallbackRecent.clear();
  renderDsaStudio();
  showToast('🗑️ Search History Stack and Recent Searches Queue cleared');
}

window.searchFromTrie = function(term) {
  switchMainTab('search');
  if (elements.mainSearchInput) elements.mainSearchInput.value = term;
  executeSearch(term);
};

// ============================================================================
// IN-MEMORY FALLBACK DSA ENGINE (STANDALONE / OFFLINE / NETLIFY)
// ============================================================================

class FallbackDoc {
  constructor(name, path, content, size = 0) {
    this.fileName = name;
    this.filePath = path;
    this.content = content || '';
    this.fileSize = size || (content ? content.length : 0);
    this.fileSizeFormatted = formatBytes(this.fileSize);
    this.wordFrequencies = new Map();
    this.wordCount = 0;
    this.extension = getFileExtension(name);
    this.tokenize();
  }
  tokenize() {
    if (!this.content) return;
    const tokens = this.content.toLowerCase().split(/[^a-z0-9]+/);
    for (const t of tokens) {
      if (t) {
        this.wordCount++;
        this.wordFrequencies.set(t, (this.wordFrequencies.get(t) || 0) + 1);
      }
    }
  }
  getKeywordFrequency(t) {
    return this.wordFrequencies.get(t.toLowerCase()) || 0;
  }
}

class FallbackTrieNode {
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.frequency = 0;
    this.docCount = 0;
    this.isFileName = false;
    this.category = 'keyword';
    this.displayWord = '';
  }
}

class FallbackTrie {
  constructor() {
    this.root = new FallbackTrieNode();
    this.nodeCount = 1;
    this.wordCount = 0;
  }
  clear() {
    this.root = new FallbackTrieNode();
    this.nodeCount = 1;
    this.wordCount = 0;
  }
  insert(word, freq = 1, docCount = 1, isFileName = false, category = 'keyword', displayWord = '') {
    if (!word) return;
    const lower = word.toLowerCase().trim();
    if (!lower) return;
    let current = this.root;
    for (const ch of lower) {
      if (!current.children.has(ch)) {
        current.children.set(ch, new FallbackTrieNode());
        this.nodeCount++;
      }
      current = current.children.get(ch);
    }
    if (!current.isEndOfWord) {
      current.isEndOfWord = true;
      this.wordCount++;
    }
    current.frequency += Math.max(1, freq);
    current.docCount = Math.max(current.docCount, docCount);
    if (isFileName) {
      current.isFileName = true;
      current.category = category || 'file';
    }
    if (displayWord && (!current.displayWord || isFileName)) {
      current.displayWord = displayWord;
    }
  }
  findNode(prefix) {
    let current = this.root;
    for (const ch of prefix) {
      if (!current.children.has(ch)) return null;
      current = current.children.get(ch);
    }
    return current;
  }
  autoCompleteDetails(prefix) {
    if (!prefix) return [];
    const lower = prefix.toLowerCase().trim();
    const node = this.findNode(lower);
    if (!node) return [];
    const candidates = [];
    const collect = (n, w) => {
      if (n.isEndOfWord) candidates.push({ word: w, node: n });
      for (const [ch, child] of n.children.entries()) {
        collect(child, w + ch);
      }
    };
    collect(node, lower);
    candidates.sort((a, b) => {
      if (a.node.isFileName !== b.node.isFileName) return a.node.isFileName ? -1 : 1;
      if (a.node.docCount !== b.node.docCount) return b.node.docCount - a.node.docCount;
      return b.node.frequency - a.node.frequency;
    });
    const res = [];
    const seen = new Set();
    for (const c of candidates) {
      const display = c.node.displayWord || c.word;
      if (!seen.has(display.toLowerCase())) {
        seen.add(display.toLowerCase());
        res.push({
          text: c.word,
          displayText: display,
          category: c.node.category,
          isFileName: c.node.isFileName,
          docCount: c.node.docCount,
          frequency: c.node.frequency
        });
        if (res.length >= 10) break;
      }
    }
    return res;
  }
}

class FallbackIndexer {
  constructor() {
    this.invertedIndex = new Map();
    this.trie = new FallbackTrie();
    this.documents = [];
  }
  clear() {
    this.invertedIndex.clear();
    this.trie.clear();
    this.documents = [];
  }
  indexDocument(doc) {
    this.documents.push(doc);
    this.trie.insert(doc.fileName, 100, 1, true, 'file', doc.fileName);
    for (const [token, freq] of doc.wordFrequencies.entries()) {
      if (!this.invertedIndex.has(token)) this.invertedIndex.set(token, []);
      this.invertedIndex.get(token).push(doc);
      this.trie.insert(token, freq, this.invertedIndex.get(token).length, false, 'keyword', token);
    }
  }
}

class FallbackHistory {
  constructor() { this.stack = []; }
  push(q) { if (q && q.trim()) this.stack.push(q.trim()); }
  getHistoryList() { return [...this.stack].reverse(); }
  clear() { this.stack = []; }
}

class FallbackRecent {
  constructor() { this.queue = []; }
  offer(q) {
    if (!q || !q.trim()) return;
    if (this.queue.length >= 5) this.queue.shift();
    this.queue.push(q.trim());
  }
  getRecentSearches() { return [...this.queue]; }
  clear() { this.queue = []; }
}

const fallbackIndexer = new FallbackIndexer();
const fallbackTrie = fallbackIndexer.trie;
const fallbackHistory = new FallbackHistory();
const fallbackRecent = new FallbackRecent();

function loadInitialCorpusFallback() {
  fallbackIndexer.clear();
  const demoDocs = [
    { name: 'book1.txt', path: 'documents/book1.txt', content: 'Java is a programming language.\nJava is object oriented.\nJava is used to build applications.' },
    { name: 'book2.txt', path: 'documents/book2.txt', content: 'Data structures are important in programming.\nHashMap provides fast data lookup.\nTrees are useful data structures.' },
    { name: 'book3.txt', path: 'documents/book3.txt', content: 'Trie is a tree based data structure.\nTrie is useful for fast searching.\nTrie can provide autocomplete suggestions.' }
  ];
  demoDocs.forEach(d => fallbackIndexer.indexDocument(new FallbackDoc(d.name, d.path, d.content)));
}

function rebuildIndexFallback() {
  const current = [...fallbackIndexer.documents];
  fallbackIndexer.clear();
  current.forEach(d => fallbackIndexer.indexDocument(d));
}

function updateUIStatsFallback() {
  if (elements.headerStatDocs) elements.headerStatDocs.textContent = fallbackIndexer.documents.length;
  if (elements.headerStatWords) elements.headerStatWords.textContent = fallbackIndexer.invertedIndex.size;
}

function executeSearchFallback(query) {
  const rawLower = (query || '').toLowerCase().trim();
  if (query) {
    fallbackHistory.push(query);
    fallbackRecent.offer(query);
  }

  if (!rawLower) {
    state.searchResults = fallbackIndexer.documents.map((d, i) => ({
      rank: i + 1,
      fileName: d.fileName,
      filePath: d.filePath,
      extension: d.extension,
      fileSizeFormatted: d.fileSizeFormatted,
      wordCount: d.wordCount,
      score: 0,
      snippets: []
    }));
    if (elements.teleMatchCount) elements.teleMatchCount.textContent = `${state.searchResults.length} indexed files`;
    if (elements.teleTotalTime) elements.teleTotalTime.textContent = '0.000 ms';
    renderSearchResults();
    return;
  }

  const t0 = performance.now();
  const map = new Map();
  const tokens = rawLower.split(/[^a-z0-9]+/).filter(Boolean);

  for (const token of tokens) {
    const matched = fallbackIndexer.invertedIndex.get(token) || [];
    for (const doc of matched) {
      map.set(doc, (map.get(doc) || 0) + doc.getKeywordFrequency(token));
    }
  }

  for (const doc of fallbackIndexer.documents) {
    let bonus = 0;
    const lowerName = doc.fileName.toLowerCase();
    if (lowerName === rawLower) bonus += 100;
    else if (lowerName.startsWith(rawLower)) bonus += 50;
    else if (lowerName.includes(rawLower)) bonus += 25;

    let s = map.get(doc) || 0;
    if (s === 0 && doc.content.toLowerCase().includes(rawLower)) s = 1;
    if (s + bonus > 0) map.set(doc, s + bonus);
  }

  const unranked = [];
  for (const [doc, score] of map.entries()) {
    unranked.push({
      fileName: doc.fileName,
      filePath: doc.filePath,
      extension: doc.extension,
      fileSizeFormatted: doc.fileSizeFormatted,
      wordCount: doc.wordCount,
      score,
      snippets: extractSnippets(doc.content, rawLower, 2)
    });
  }

  // Max-Heap Sort
  unranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.fileName.localeCompare(b.fileName);
  });

  const t1 = performance.now();
  state.searchResults = unranked;
  if (elements.teleTotalTime) elements.teleTotalTime.textContent = `${(t1 - t0).toFixed(3)} ms`;
  if (elements.teleMatchCount) elements.teleMatchCount.textContent = `${unranked.length} matches`;

  renderSearchResults();
}

function renderExplorerTreeFallback() {
  if (!elements.explorerFileTree || !elements.explorerDocList) return;
  elements.explorerFileTree.innerHTML = '';
  elements.explorerDocList.innerHTML = '';

  fallbackIndexer.documents.forEach(doc => {
    const row = document.createElement('div');
    row.className = 'tree-file-row';
    row.innerHTML = `<div><span>📄</span> <span>${escapeHtml(doc.fileName)}</span></div> <span>${doc.fileSizeFormatted}</span>`;
    row.addEventListener('click', () => openInspector(doc));
    elements.explorerFileTree.appendChild(row);

    const card = document.createElement('div');
    card.className = 'doc-grid-card';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span class="dsa-badge-sm">${escapeHtml(doc.extension.toUpperCase())}</span>
        <span style="font-size:11px; color:var(--text-muted);">${escapeHtml(doc.fileSizeFormatted)}</span>
      </div>
      <h4 style="font-size:14px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">${escapeHtml(doc.fileName)}</h4>
      <div style="font-size:11px; color:var(--text-muted);">${doc.wordCount} words</div>
    `;
    card.addEventListener('click', () => openInspector(doc));
    elements.explorerDocList.appendChild(card);
  });
}

function renderDsaStudioFallback() {
  if (elements.dsaStackVisual) {
    const list = fallbackHistory.getHistoryList();
    elements.dsaStackVisual.innerHTML = list.length === 0
      ? '<div style="color:var(--text-muted); text-align:center; padding:20px;">History Stack is empty</div>'
      : list.map((q, i) => `<div class="stack-item ${i === 0 ? 'top' : ''}"><strong>"${escapeHtml(q)}"</strong> ${i === 0 ? '<span class="top-indicator">TOP</span>' : ''}</div>`).join('');
  }
  if (elements.dsaQueueVisual) {
    const list = fallbackRecent.getRecentSearches();
    elements.dsaQueueVisual.innerHTML = list.length === 0
      ? '<div style="color:var(--text-muted); text-align:center; padding:20px;">Recent Queue is empty</div>'
      : list.map((q, i) => `<div class="queue-item"><strong>"${escapeHtml(q)}"</strong> <span class="dsa-badge-sm">Slot [${i}]</span></div>`).join('');
  }
}

// User File/Folder Upload (Fallback mode)
async function handleFilesUpload(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const text = await readFileAsText(file);
      const doc = new FallbackDoc(file.name, file.webkitRelativePath || file.name, text, file.size);
      fallbackIndexer.indexDocument(doc);
    } catch (err) {}
  }
  updateUIStatsFallback();
  renderExplorerTreeFallback();
  executeSearch(elements.mainSearchInput ? elements.mainSearchInput.value.trim() : '');
  showToast(`✓ Uploaded and indexed ${files.length} file(s) into memory`);
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result || '');
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

// Custom Document Modal
function openModal() {
  if (elements.docCreateModal) {
    elements.docCreateModal.classList.remove('hidden');
    if (elements.newDocTitle) elements.newDocTitle.focus();
  }
}

function closeModal() {
  if (elements.docCreateModal) {
    elements.docCreateModal.classList.add('hidden');
    if (elements.newDocTitle) elements.newDocTitle.value = '';
    if (elements.newDocContent) elements.newDocContent.value = '';
  }
}

function handleSaveNewDocument() {
  const title = (elements.newDocTitle ? elements.newDocTitle.value : '').trim();
  const content = (elements.newDocContent ? elements.newDocContent.value : '').trim();

  if (!title) {
    showToast('⚠️ Please enter a document name');
    return;
  }

  const doc = new FallbackDoc(title, `custom/${title}`, content, content.length);
  fallbackIndexer.indexDocument(doc);

  closeModal();
  updateUIStatsFallback();
  renderExplorerTreeFallback();
  executeSearch(elements.mainSearchInput ? elements.mainSearchInput.value.trim() : '');
  showToast(`✓ Created and indexed "${title}"`);
}

// ============================================================================
// UTILITIES
// ============================================================================

function extractSnippets(content, query, maxSnippets = 2) {
  const snippets = [];
  if (!content) return snippets;

  const lines = content.split(/\r?\n/);
  const keywords = query ? query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean) : [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    const matched = keywords.length > 0 && keywords.some(k => lower.includes(k));

    if (matched) {
      snippets.push({ line: i + 1, text: line.trim() });
      if (snippets.length >= maxSnippets) break;
    }
  }

  if (snippets.length === 0 && lines.length > 0) {
    snippets.push({ line: 1, text: lines[0].trim() });
  }

  return snippets;
}

function highlightKeywords(text, query) {
  if (!text || !query) return text || '';
  const tokens = query.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (tokens.length === 0) return text;

  const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getBasename(path) {
  if (!path) return '';
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || '';
}

function getFileExtension(filename) {
  if (!filename) return '';
  const dot = filename.lastIndexOf('.');
  if (dot > 0 && dot < filename.length - 1) {
    return filename.substring(dot + 1).toLowerCase();
  }
  return 'file';
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  const exp = Math.floor(Math.log(bytes) / Math.log(1024));
  const pre = 'KMGTPE'[exp - 1];
  return (bytes / Math.pow(1024, exp)).toFixed(1) + ' ' + pre + 'B';
}

let toastTimeout = null;
function showToast(msg) {
  if (!elements.appToast) return;
  elements.appToast.textContent = msg;
  elements.appToast.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    elements.appToast.classList.add('hidden');
  }, 2800);
}
