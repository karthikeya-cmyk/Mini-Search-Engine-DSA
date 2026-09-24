/**
 * ============================================================================
 * NEXUS // MINI SEARCH ENGINE (DSA) — CLIENT APPLICATION CONTROLLER (v4.0)
 * ============================================================================
 */

const API_BASE = window.location.origin;

// Application State
const state = {
  currentTab: 'search',
  currentDsaSubtab: 'heap',
  activeCorpusPath: '',
  activeCorpusName: '',
  searchResults: [],
  selectedDoc: null,
  activeFilter: 'all',
  activeSortMode: 'heap',
  currentQuery: '',
  trieSuggestions: [],
  autoHighlightIdx: -1,
  debounceTimers: {}
};

// DOM References
const elements = {
  // Navigation
  navTabs: document.querySelectorAll('.nav-tab'),
  tabPanels: document.querySelectorAll('.tab-panel'),
  dsaSubtabs: document.querySelectorAll('.dsa-subtab'),
  dsaPanes: document.querySelectorAll('.dsa-pane'),
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

  // Search Omnibar
  mainSearchInput: document.getElementById('main-search-input'),
  btnClearSearch: document.getElementById('btn-clear-search'),
  trieAutocompleteBox: document.getElementById('trie-autocomplete-box'),
  autocompleteItemsList: document.getElementById('autocomplete-items-list'),
  filterPills: document.querySelectorAll('.filter-pill'),
  selectSortMode: document.getElementById('select-sort-mode'),

  // Search Results
  teleTotalTime: document.getElementById('tele-total-time'),
  teleLookupTime: document.getElementById('tele-lookup-time'),
  teleHeapTime: document.getElementById('tele-heap-time'),
  teleMatchCount: document.getElementById('tele-match-count'),
  resultsContainer: document.getElementById('results-container'),

  // DSA Studio: Max-Heap
  heapQueryInput: document.getElementById('heap-query-input'),
  btnRunHeapSim: document.getElementById('btn-run-heap-sim'),
  heapExtractionList: document.getElementById('heap-extraction-list'),

  // DSA Studio: Trie
  triePrefixInput: document.getElementById('trie-prefix-input'),
  btnRefreshTrie: document.getElementById('btn-refresh-trie'),
  trieTotalNodes: document.getElementById('trie-total-nodes'),
  trieTotalWords: document.getElementById('trie-total-words'),
  trieTreeCanvas: document.getElementById('trie-tree-canvas'),

  // DSA Studio: Inverted Index
  invertedFilterInput: document.getElementById('inverted-filter-input'),
  invertedMatchCount: document.getElementById('inverted-match-count'),
  invertedIndexTbody: document.getElementById('inverted-index-tbody'),

  // DSA Studio: Stack & Queue
  btnClearStackHistory: document.getElementById('btn-clear-stack-history'),
  stackGraphicWrap: document.getElementById('stack-graphic-wrap'),
  queueSlotsRow: document.getElementById('queue-slots-row'),

  // DSA Studio: Profiler
  profTotalSearches: document.getElementById('prof-total-searches'),
  profLastSearchTime: document.getElementById('prof-last-search-time'),
  profAvgSearchTime: document.getElementById('prof-avg-search-time'),
  profIndexedDocs: document.getElementById('prof-indexed-docs'),

  // Explorer
  explorerLocationsList: document.getElementById('explorer-locations-list'),
  explorerCrumbsTrail: document.getElementById('explorer-crumbs-trail'),
  explorerFileTree: document.getElementById('explorer-file-tree'),
  explorerActivePath: document.getElementById('explorer-active-path'),
  btnIndexThisFolder: document.getElementById('btn-index-this-folder'),
  btnRevealActiveFolder: document.getElementById('btn-reveal-active-folder'),
  explorerDocList: document.getElementById('explorer-doc-list'),

  // Drawer
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

  // Toast
  appToast: document.getElementById('app-toast')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupEventListeners();
  loadInitialData();
});

// --- NAVIGATION LOGIC ---
function setupNavigation() {
  elements.navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      switchMainTab(target);
    });
  });

  elements.dsaSubtabs.forEach(subtab => {
    subtab.addEventListener('click', () => {
      const target = subtab.getAttribute('data-subtab');
      switchDsaSubtab(target);
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

  if (tabName === 'dsa') {
    loadDsaSubtabData(state.currentDsaSubtab);
  } else if (tabName === 'explorer') {
    browseExplorerPath(state.activeCorpusPath);
  }
}

function switchDsaSubtab(subtabName) {
  state.currentDsaSubtab = subtabName;
  elements.dsaSubtabs.forEach(s => s.classList.toggle('active', s.getAttribute('data-subtab') === subtabName));
  elements.dsaPanes.forEach(p => p.classList.toggle('active', p.id === `subpane-${subtabName}`));
  loadDsaSubtabData(subtabName);
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  // Global Shortcut Ctrl+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement !== elements.mainSearchInput)) {
      e.preventDefault();
      switchMainTab('search');
      if (elements.mainSearchInput) {
        elements.mainSearchInput.focus();
        elements.mainSearchInput.select();
      }
    } else if (e.key === 'Escape') {
      hideAutocomplete();
      closeInspector();
    }
  });

  // Search Omnibar Input
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

      // Debounce Instant Search (70ms)
      clearTimeout(state.debounceTimers.search);
      state.debounceTimers.search = setTimeout(() => executeSearch(val.trim()), 70);

      // Debounce Trie Autocomplete (90ms)
      clearTimeout(state.debounceTimers.auto);
      state.debounceTimers.auto = setTimeout(() => fetchTrieAutocomplete(val.trim()), 90);
    });

    elements.mainSearchInput.addEventListener('keydown', handleOmnibarKeydown);
  }

  // Clear Search
  if (elements.btnClearSearch) {
    elements.btnClearSearch.addEventListener('click', () => {
      elements.mainSearchInput.value = '';
      elements.btnClearSearch.classList.add('hidden');
      hideAutocomplete();
      executeSearch('');
      elements.mainSearchInput.focus();
    });
  }

  // Hide autocomplete on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#omnibar-wrapper')) {
      hideAutocomplete();
    }
    if (!e.target.closest('#corpus-dropdown-trigger')) {
      elements.corpusDropdownMenu.classList.add('hidden');
    }
  });

  // Corpus Dropdown Trigger
  if (elements.corpusDropdownTrigger) {
    elements.corpusDropdownTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.corpusDropdownMenu.classList.toggle('hidden');
    });
  }

  // Filter Pills
  elements.filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      elements.filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeFilter = pill.getAttribute('data-filter');
      renderSearchResults();
    });
  });

  // Sort Mode
  if (elements.selectSortMode) {
    elements.selectSortMode.addEventListener('change', (e) => {
      state.activeSortMode = e.target.value;
      renderSearchResults();
    });
  }

  // Re-index Header Button
  if (elements.btnReindexHeader) {
    elements.btnReindexHeader.addEventListener('click', () => {
      if (state.activeCorpusPath) indexFolder(state.activeCorpusPath);
    });
  }

  // Theme Toggle
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

  // DSA Interactive Controls
  if (elements.btnRunHeapSim) {
    elements.btnRunHeapSim.addEventListener('click', () => {
      const q = elements.heapQueryInput.value.trim() || 'java';
      simulateMaxHeap(q);
    });
  }

  if (elements.btnRefreshTrie) {
    elements.btnRefreshTrie.addEventListener('click', () => {
      const prefix = elements.triePrefixInput.value.trim();
      loadTrieVisualizer(prefix);
    });
  }

  if (elements.triePrefixInput) {
    elements.triePrefixInput.addEventListener('input', (e) => {
      clearTimeout(state.debounceTimers.trie);
      state.debounceTimers.trie = setTimeout(() => loadTrieVisualizer(e.target.value.trim()), 150);
    });
  }

  if (elements.invertedFilterInput) {
    elements.invertedFilterInput.addEventListener('input', (e) => {
      clearTimeout(state.debounceTimers.inverted);
      state.debounceTimers.inverted = setTimeout(() => loadInvertedIndex(e.target.value.trim()), 120);
    });
  }

  if (elements.btnClearStackHistory) {
    elements.btnClearStackHistory.addEventListener('click', clearHistoryAndQueue);
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
}

// --- INITIAL DATA LOAD ---
async function loadInitialData() {
  await loadCorpusLocations();
  await loadSystemStats();
  executeSearch('');
}

// --- CORPUS & LOCATIONS ---
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
    const isActive = loc.path.toLowerCase() === state.activeCorpusPath.toLowerCase();
    item.className = `dropdown-item ${isActive ? 'active' : ''}`;
    item.innerHTML = `
      <span>${loc.type === 'docs' ? '📚' : loc.type === 'drive' ? '💻' : '📁'}</span>
      <span>${escapeHtml(loc.name)}</span>
    `;
    item.addEventListener('click', () => {
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

// --- STATS & METRICS ---
async function loadSystemStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    if (!res.ok) return;
    const data = await res.json();

    if (elements.headerStatDocs) elements.headerStatDocs.textContent = data.docCount || 0;
    if (elements.headerStatWords) elements.headerStatWords.textContent = (data.wordCount || 0).toLocaleString();
    if (elements.profIndexedDocs) elements.profIndexedDocs.textContent = data.docCount || 0;
    if (elements.profTotalSearches) elements.profTotalSearches.textContent = data.totalSearches || 0;
    if (elements.profLastSearchTime) elements.profLastSearchTime.textContent = `${data.lastSearchTimeMs || '0.000'} ms`;
    if (elements.profAvgSearchTime) elements.profAvgSearchTime.textContent = `${data.avgSearchTimeMs || '0.000'} ms`;
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// --- SEARCH & RANKING (MAX-HEAP & INVERTED INDEX) ---
async function executeSearch(query) {
  query = (query || '').trim();
  state.currentQuery = query;

  if (!query) {
    loadAllIndexedDocs();
    return;
  }

  hideAutocomplete();

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
    if (elements.resultsContainer) {
      elements.resultsContainer.innerHTML = `
        <div class="feed-empty-state">
          <div class="empty-icon-wrap" style="color:var(--accent-rose);">⚠️</div>
          <h3>Search Error</h3>
          <p>${escapeHtml(err.message)}</p>
        </div>
      `;
    }
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

    const snippetText = item.snippets && item.snippets.length > 0 ? item.snippets[0].text : '';

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
          <span>📁 ${escapeHtml(item.extension.toUpperCase())}</span>
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

    // Bind Actions
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
    // Already sorted by Max-Heap backend
    return copy;
  } else if (sortMode === 'name') {
    return copy.sort((a, b) => a.fileName.localeCompare(b.fileName));
  } else if (sortMode === 'size') {
    return copy.sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0));
  } else if (sortMode === 'date') {
    return copy.sort((a, b) => (b.lastModified || '').localeCompare(a.lastModified || ''));
  }
  return copy;
}

// --- TRIE AUTOCOMPLETE ---
async function fetchTrieAutocomplete(prefix) {
  if (!prefix) return;
  try {
    const res = await fetch(`${API_BASE}/api/autocomplete?q=${encodeURIComponent(prefix)}`);
    if (!res.ok) return;
    const data = await res.json();
    renderTrieAutocomplete(prefix, data.suggestions || []);
  } catch (err) {
    console.error('Trie autocomplete error:', err);
  }
}

function renderTrieAutocomplete(prefix, suggestions) {
  state.trieSuggestions = suggestions;
  state.autoHighlightIdx = -1;

  if (!elements.trieAutocompleteBox || !elements.autocompleteItemsList) return;

  if (suggestions.length === 0) {
    hideAutocomplete();
    return;
  }

  elements.autocompleteItemsList.innerHTML = '';
  suggestions.forEach((word, idx) => {
    const li = document.createElement('li');
    li.className = 'auto-item';

    const lowerWord = word.toLowerCase();
    const lowerPrefix = prefix.toLowerCase();
    let display = word;

    if (lowerWord.startsWith(lowerPrefix)) {
      display = `<span class="auto-bold">${escapeHtml(word.substring(0, prefix.length))}</span>${escapeHtml(word.substring(prefix.length))}`;
    } else {
      display = escapeHtml(word);
    }

    li.innerHTML = `
      <span>${display}</span>
      <span style="font-family:var(--font-mono); font-size:10px; color:var(--text-muted);">↵ select</span>
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

// --- DSA STUDIO SUBTAB LOADERS ---
async function loadDsaSubtabData(subtab) {
  if (subtab === 'heap') {
    simulateMaxHeap(state.currentQuery || 'java');
  } else if (subtab === 'trie') {
    loadTrieVisualizer('');
  } else if (subtab === 'inverted') {
    loadInvertedIndex('');
  } else if (subtab === 'stack' || subtab === 'queue' || subtab === 'profiler') {
    loadDsaOverview();
  }
}

// 1. Max-Heap Simulation
async function simulateMaxHeap(query) {
  if (!elements.heapExtractionList) return;
  elements.heapExtractionList.innerHTML = '<div class="dsa-placeholder-text">Executing Binary Max-Heap extraction...</div>';

  try {
    const res = await fetch(`${API_BASE}/api/dsa/heap?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Heap simulation failed');

    if (!data.extractionSteps || data.extractionSteps.length === 0) {
      elements.heapExtractionList.innerHTML = `<div class="dsa-placeholder-text">No documents matched query "${escapeHtml(query)}" to insert into Max-Heap.</div>`;
      return;
    }

    elements.heapExtractionList.innerHTML = '';
    data.extractionSteps.forEach(step => {
      const div = document.createElement('div');
      div.className = 'heap-step-item';
      div.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="heap-step-badge">Step ${step.step}</span>
          <strong style="color:var(--text-primary);">${escapeHtml(step.fileName)}</strong>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="color:var(--accent-cyan); font-family:var(--font-mono); font-weight:700;">Score: ${step.score}</span>
          <span style="font-size:11px; color:var(--text-muted);">${escapeHtml(step.note)}</span>
        </div>
      `;
      elements.heapExtractionList.appendChild(div);
    });
  } catch (err) {
    elements.heapExtractionList.innerHTML = `<div class="dsa-placeholder-text" style="color:var(--accent-rose);">${escapeHtml(err.message)}</div>`;
  }
}

// 2. Trie Interactive Visualizer
async function loadTrieVisualizer(prefix) {
  if (!elements.trieTreeCanvas) return;
  elements.trieTreeCanvas.innerHTML = '<div class="dsa-placeholder-text">Traversing Trie prefix branches...</div>';

  try {
    const res = await fetch(`${API_BASE}/api/dsa/trie?prefix=${encodeURIComponent(prefix)}&depth=3`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Trie error');

    if (elements.trieTotalNodes) elements.trieTotalNodes.textContent = (data.nodeCount || 0).toLocaleString();
    if (elements.trieTotalWords) elements.trieTotalWords.textContent = (data.wordCount || 0).toLocaleString();

    elements.trieTreeCanvas.innerHTML = '';
    const rootEl = renderTrieNode(data.tree);
    elements.trieTreeCanvas.appendChild(rootEl);
  } catch (err) {
    elements.trieTreeCanvas.innerHTML = `<div class="dsa-placeholder-text" style="color:var(--accent-rose);">${escapeHtml(err.message)}</div>`;
  }
}

function renderTrieNode(node) {
  const wrap = document.createElement('div');
  wrap.className = 'trie-node-wrapper';

  const bubble = document.createElement('div');
  bubble.className = `trie-node-bubble ${node.isEnd ? 'is-end' : ''}`;
  bubble.textContent = node.name || 'ROOT';
  bubble.title = `Prefix: "${node.prefix || ''}" | IsEndOfWord: ${node.isEnd}`;

  wrap.appendChild(bubble);

  if (node.children && node.children.length > 0) {
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'trie-children-container';
    node.children.forEach(child => {
      childrenContainer.appendChild(renderTrieNode(child));
    });
    wrap.appendChild(childrenContainer);
  }

  return wrap;
}

// 3. Inverted Index Explorer
async function loadInvertedIndex(filter) {
  if (!elements.invertedIndexTbody) return;

  try {
    const res = await fetch(`${API_BASE}/api/dsa/inverted-index?q=${encodeURIComponent(filter)}&limit=80`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Inverted index error');

    if (elements.invertedMatchCount) {
      elements.invertedMatchCount.textContent = `${data.matchedTermsCount || 0} unique words in index`;
    }

    elements.invertedIndexTbody.innerHTML = '';

    (data.terms || []).forEach(termItem => {
      const tr = document.createElement('tr');

      const postingsHtml = (termItem.postings || []).map(p => `
        <span class="posting-chip">
          📄 ${escapeHtml(p.fileName)} (<span class="posting-freq">${p.frequency}</span>)
        </span>
      `).join('');

      tr.innerHTML = `
        <td><strong style="color:var(--accent-cyan); font-family:var(--font-mono);">${escapeHtml(termItem.term)}</strong></td>
        <td><span class="dsa-badge-sm">${termItem.docCount} docs</span></td>
        <td>${postingsHtml}</td>
      `;

      elements.invertedIndexTbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Inverted index error:', err);
  }
}

// 4. DSA Overview (Stack, Queue, Profiler)
async function loadDsaOverview() {
  try {
    const res = await fetch(`${API_BASE}/api/dsa/overview`);
    const data = await res.json();
    if (!res.ok) return;

    // Render Stack (LIFO)
    if (elements.stackGraphicWrap) {
      elements.stackGraphicWrap.innerHTML = '';
      const stackItems = (data.stack && data.stack.items) || [];
      if (stackItems.length === 0) {
        elements.stackGraphicWrap.innerHTML = '<div class="dsa-placeholder-text">History stack is empty. Run a search to push onto stack.</div>';
      } else {
        stackItems.forEach((q, idx) => {
          const isTop = idx === 0;
          const slot = document.createElement('div');
          slot.className = `stack-slot ${isTop ? 'top-of-stack' : ''}`;
          slot.innerHTML = `
            <span>🔍 ${escapeHtml(q)}</span>
            ${isTop ? '<span class="top-indicator">TOP (LIFO)</span>' : `<span style="font-size:10px; color:var(--text-muted);">Slot #${stackItems.length - idx}</span>`}
          `;
          elements.stackGraphicWrap.appendChild(slot);
        });
      }
    }

    // Render Queue (FIFO)
    if (elements.queueSlotsRow) {
      elements.queueSlotsRow.innerHTML = '';
      const queueItems = (data.queue && data.queue.items) || [];
      const cap = (data.queue && data.queue.capacity) || 5;

      for (let i = 0; i < cap; i++) {
        const slotCard = document.createElement('div');
        const hasItem = i < queueItems.length;
        slotCard.className = `queue-slot-card ${hasItem ? 'occupied' : ''}`;

        if (hasItem) {
          const isHead = i === 0;
          const isTail = i === queueItems.length - 1;
          slotCard.innerHTML = `
            ${isHead ? '<span class="queue-head-tag">HEAD (EVICT)</span>' : ''}
            ${isTail ? '<span class="queue-tail-tag">TAIL (NEW)</span>' : ''}
            <div style="font-size:12.5px; font-weight:700; color:var(--text-primary); margin-top:4px;">${escapeHtml(queueItems[i])}</div>
            <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">Slot [${i}]</div>
          `;
        } else {
          slotCard.innerHTML = `
            <div style="font-size:11px; color:var(--text-muted);">Empty Slot</div>
            <div style="font-size:9.5px; color:var(--border-medium); margin-top:2px;">Slot [${i}]</div>
          `;
        }

        elements.queueSlotsRow.appendChild(slotCard);
      }
    }

    // Profiler metrics
    if (data.telemetry) {
      if (elements.profTotalSearches) elements.profTotalSearches.textContent = data.telemetry.totalSearches || 0;
      if (elements.profLastSearchTime) elements.profLastSearchTime.textContent = `${data.telemetry.lastSearchTimeMs || '0.000'} ms`;
      if (elements.profAvgSearchTime) elements.profAvgSearchTime.textContent = `${data.telemetry.avgSearchTimeMs || '0.000'} ms`;
    }
  } catch (err) {
    console.error('DSA overview error:', err);
  }
}

async function clearHistoryAndQueue() {
  try {
    await fetch(`${API_BASE}/api/clear`, { method: 'POST' });
    showToast('✓ Search history stack & recent queue cleared');
    loadDsaOverview();
  } catch (err) {
    showToast('Failed to clear history: ' + err.message);
  }
}

// --- CORPUS & FILE EXPLORER ---
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
      elements.explorerDocList.innerHTML = `<div class="dsa-placeholder-text" style="color:var(--accent-rose);">${escapeHtml(err.message)}</div>`;
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
          <span class="dsa-badge-sm">${escapeHtml(item.ext.toUpperCase())}</span>
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

// --- INDEXING ACTIONS ---
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

    showToast(`✓ Successfully indexed ${data.docCount} files (${data.wordCount} words)`);
    await loadCorpusLocations();
    await loadSystemStats();
    executeSearch(elements.mainSearchInput ? elements.mainSearchInput.value.trim() : '');
  } catch (err) {
    showToast(`Error indexing: ${err.message}`);
  }
}

// --- FILE INSPECTOR DRAWER ---
async function openInspector(docMeta) {
  state.selectedDoc = docMeta;

  if (elements.drawerDocName) elements.drawerDocName.textContent = docMeta.fileName || '';
  if (elements.drawerDocPath) elements.drawerDocPath.textContent = docMeta.filePath || '';
  if (elements.drawerExtBadge) elements.drawerExtBadge.textContent = (getFileExtension(docMeta.fileName) || 'DOC').toUpperCase();
  if (elements.drawerFileSize) elements.drawerFileSize.textContent = docMeta.fileSizeFormatted || '-';
  if (elements.drawerWordCount) elements.drawerWordCount.textContent = docMeta.wordCount || '-';
  if (elements.drawerRelevanceScore) elements.drawerRelevanceScore.textContent = docMeta.score || '0';

  if (elements.drawerCodeTable) {
    elements.drawerCodeTable.innerHTML = '<div style="padding:20px; color:var(--text-muted);">Reading file content from disk...</div>';
  }

  elements.inspectorDrawer.classList.remove('hidden');

  try {
    const res = await fetch(`${API_BASE}/api/document?path=${encodeURIComponent(docMeta.filePath)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Cannot read document');

    if (elements.drawerFileSize) elements.drawerFileSize.textContent = data.fileSizeFormatted || elements.drawerFileSize.textContent;
    if (elements.drawerWordCount) elements.drawerWordCount.textContent = data.wordCount || elements.drawerWordCount.textContent;

    const lines = (data.content || '').split(/\r?\n/);
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
  } catch (err) {
    if (elements.drawerCodeTable) {
      elements.drawerCodeTable.innerHTML = `<div style="padding:20px; color:var(--accent-rose);">${escapeHtml(err.message)}</div>`;
    }
  }
}

function closeInspector() {
  if (elements.inspectorDrawer) elements.inspectorDrawer.classList.add('hidden');
  state.selectedDoc = null;
}

// --- OS INTEGRATION ---
async function openSystemFile(filePath) {
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

// --- UTILITIES ---
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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
  return '';
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
