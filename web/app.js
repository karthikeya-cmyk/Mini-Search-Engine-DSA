/**
 * ============================================================================
 * NEXUS // MINI SEARCH ENGINE (DSA) — CLIENT-SIDE APPLICATION CONTROLLER
 * ============================================================================
 * 100% In-Browser DSA Engine — Deployable on Netlify with Zero Backend Dependency!
 * Core Data Structures:
 *   - Member 1: Trie (Prefix Tree) for O(L+K) Autocomplete
 *   - Member 1: Inverted Index (HashMap) for O(1) Term Lookup
 *   - Member 2: PriorityQueue (Binary Max-Heap) for O(K log N) Relevance Ranking
 *   - Member 2: Stack (LIFO) for Search History Tracking
 *   - Member 2: Queue (FIFO, Cap 5) for Recent Searches Sliding Window
 * ============================================================================
 */

// ============================================================================
// 1. DATA STRUCTURES & ALGORITHMS (DSA) CORE IMPLEMENTATION
// ============================================================================

/**
 * Document representation with tokenized term frequency mapping
 */
class DocumentItem {
  constructor(name, path, content, size = 0, lastModified = Date.now(), isFolder = false) {
    this.fileName = name;
    this.filePath = path;
    this.content = content || '';
    this.fileSize = size || (content ? content.length : 0);
    this.fileSizeFormatted = formatBytes(this.fileSize);
    this.lastModified = lastModified;
    this.lastModifiedFormatted = formatDate(lastModified);
    this.isFolder = isFolder;
    this.wordFrequencies = new Map();
    this.wordCount = 0;
    this.extension = getFileExtension(name);
    this.tokenize();
  }

  tokenize() {
    if (!this.content) return;
    const tokens = this.content.toLowerCase().split(/[^a-z0-9]+/);
    for (const token of tokens) {
      if (token && token.length > 0) {
        this.wordCount++;
        this.wordFrequencies.set(token, (this.wordFrequencies.get(token) || 0) + 1);
      }
    }
  }

  getKeywordFrequency(token) {
    if (!token) return 0;
    return this.wordFrequencies.get(token.toLowerCase()) || 0;
  }
}

/**
 * MEMBER 1: Trie Node
 */
class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.frequency = 0;
    this.docCount = 0;
    this.isFileName = false;
    this.category = 'keyword'; // 'keyword', 'file', 'folder'
    this.displayWord = '';
    this.sampleDoc = '';
  }
}

/**
 * MEMBER 1: Trie (Prefix Tree) for fast vocabulary autocomplete O(L + K)
 */
class Trie {
  constructor() {
    this.root = new TrieNode();
    this.nodeCount = 1;
    this.wordCount = 0;
  }

  clear() {
    this.root = new TrieNode();
    this.nodeCount = 1;
    this.wordCount = 0;
  }

  insert(word, freq = 1, docCount = 1, isFileName = false, category = 'keyword', displayWord = '', sampleDoc = '') {
    if (!word) return;
    const lowerWord = word.toLowerCase().trim();
    if (!lowerWord) return;

    let current = this.root;
    for (const ch of lowerWord) {
      if (!current.children.has(ch)) {
        current.children.set(ch, new TrieNode());
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
    if (sampleDoc) {
      current.sampleDoc = sampleDoc;
    }
  }

  findNode(prefix) {
    if (!prefix) return this.root;
    let current = this.root;
    for (const ch of prefix) {
      if (!current.children.has(ch)) return null;
      current = current.children.get(ch);
    }
    return current;
  }

  autoCompleteDetails(prefix) {
    if (!prefix) return [];
    const lowerPrefix = prefix.toLowerCase().trim();
    const node = this.findNode(lowerPrefix);
    if (!node) return [];

    const candidates = [];
    const collect = (currNode, currWord) => {
      if (currNode.isEndOfWord) {
        candidates.push({ word: currWord, node: currNode });
      }
      for (const [ch, childNode] of currNode.children.entries()) {
        collect(childNode, currWord + ch);
      }
    };
    collect(node, lowerPrefix);

    // Intelligent candidate ranking:
    // 1. Files in storage prioritized
    // 2. Exact match to prefix
    // 3. Higher docCount
    // 4. Higher frequency
    // 5. Length closer to prefix
    // 6. Alphabetical
    candidates.sort((a, b) => {
      if (a.node.isFileName !== b.node.isFileName) return a.node.isFileName ? -1 : 1;
      const aExact = a.word === lowerPrefix;
      const bExact = b.word === lowerPrefix;
      if (aExact !== bExact) return aExact ? -1 : 1;
      if (a.node.docCount !== b.node.docCount) return b.node.docCount - a.node.docCount;
      if (a.node.frequency !== b.node.frequency) return b.node.frequency - a.node.frequency;
      if (a.word.length !== b.word.length) return a.word.length - b.word.length;
      return a.word.localeCompare(b.word);
    });

    const results = [];
    const seen = new Set();
    for (const c of candidates) {
      const display = c.node.displayWord || c.word;
      if (!seen.has(display.toLowerCase())) {
        seen.add(display.toLowerCase());
        results.push({
          text: c.word,
          displayText: display,
          category: c.node.category,
          isFileName: c.node.isFileName,
          docCount: c.node.docCount,
          frequency: c.node.frequency,
          sampleDoc: c.node.sampleDoc
        });
        if (results.length >= 10) break;
      }
    }
    return results;
  }

  getNodeCount() {
    return this.nodeCount;
  }

  getWordCount() {
    return this.wordCount;
  }
}

/**
 * MEMBER 1: Indexer (Inverted Index + Trie Manager)
 */
class Indexer {
  constructor() {
    this.invertedIndex = new Map(); // token -> DocumentItem[]
    this.trie = new Trie();
    this.documents = [];
    this.currentFolderPath = 'documents';
  }

  clear() {
    this.invertedIndex.clear();
    this.trie.clear();
    this.documents = [];
  }

  indexDocument(doc) {
    this.documents.push(doc);

    // 1. Register file name and tokens in Trie
    this.trie.insert(doc.fileName, 100, 1, true, doc.isFolder ? 'folder' : 'file', doc.fileName, doc.filePath);
    const dotIdx = doc.fileName.lastIndexOf('.');
    const baseName = dotIdx > 0 ? doc.fileName.substring(0, dotIdx) : doc.fileName;
    if (baseName !== doc.fileName && baseName.length >= 2) {
      this.trie.insert(baseName, 80, 1, true, 'file', doc.fileName, doc.filePath);
    }
    const nameParts = baseName.split(/[^a-zA-Z0-9]+/);
    for (const part of nameParts) {
      if (part.length >= 2) {
        this.trie.insert(part, 50, 1, true, 'file', doc.fileName, doc.filePath);
      }
    }

    // 2. Register content tokens in Inverted Index and Trie
    for (const [token, freq] of doc.wordFrequencies.entries()) {
      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, []);
      }
      this.invertedIndex.get(token).push(doc);

      this.trie.insert(
        token,
        freq,
        this.invertedIndex.get(token).length,
        false,
        'keyword',
        token,
        doc.fileName
      );
    }
  }

  getInvertedIndex() {
    return this.invertedIndex;
  }

  getTrie() {
    return this.trie;
  }

  getDocuments() {
    return this.documents;
  }
}

/**
 * MEMBER 2: Max-Heap (Binary Heap PriorityQueue) for Relevance Ranking
 */
class MaxHeap {
  constructor(comparator) {
    this.heap = [];
    // Default comparator: descending score, tie-breaker alphabetical ascending
    this.comparator = comparator || ((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const nameA = a.document ? a.document.fileName : '';
      const nameB = b.document ? b.document.fileName : '';
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });
  }

  size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  offer(item) {
    this.heap.push(item);
    this.siftUp(this.heap.length - 1);
  }

  poll() {
    if (this.isEmpty()) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.siftDown(0);
    }
    return top;
  }

  siftUp(idx) {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this.comparator(this.heap[idx], this.heap[parentIdx]) < 0) {
        [this.heap[idx], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[idx]];
        idx = parentIdx;
      } else {
        break;
      }
    }
  }

  siftDown(idx) {
    const len = this.heap.length;
    while (true) {
      let candidate = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < len && this.comparator(this.heap[left], this.heap[candidate]) < 0) {
        candidate = left;
      }
      if (right < len && this.comparator(this.heap[right], this.heap[candidate]) < 0) {
        candidate = right;
      }

      if (candidate !== idx) {
        [this.heap[idx], this.heap[candidate]] = [this.heap[candidate], this.heap[idx]];
        idx = candidate;
      } else {
        break;
      }
    }
  }

  static rank(unrankedResults) {
    const maxHeap = new MaxHeap();
    for (const res of unrankedResults) {
      maxHeap.offer(res);
    }
    const ranked = [];
    while (!maxHeap.isEmpty()) {
      ranked.push(maxHeap.poll());
    }
    return ranked;
  }

  static rankWithTrace(unrankedResults) {
    const maxHeap = new MaxHeap();
    for (const res of unrankedResults) {
      maxHeap.offer(res);
    }

    const initialSize = maxHeap.size();
    const root = maxHeap.peek();
    const ranked = [];
    const steps = [];

    let prev = null;
    let step = 1;
    while (!maxHeap.isEmpty()) {
      const current = maxHeap.poll();
      ranked.push(current);

      let note = `Extracted highest relevance score: ${current.score}`;
      if (prev && prev.score === current.score) {
        note = `Score tie (${current.score}) broken alphabetically: '${prev.document.fileName}' ahead of '${current.document.fileName}'`;
      }

      steps.push({
        step: step++,
        fileName: current.document.fileName,
        score: current.score,
        note
      });
      prev = current;
    }

    return {
      initialSize,
      rootFileName: root ? root.document.fileName : 'None',
      rootScore: root ? root.score : 0,
      ranked,
      steps
    };
  }
}

/**
 * MEMBER 2: History Stack (LIFO)
 */
class HistoryStack {
  constructor() {
    this.stack = [];
  }

  push(query) {
    if (!query || !query.trim()) return;
    this.stack.push(query.trim());
  }

  peek() {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  getHistoryList() {
    // Return newest query first (LIFO order)
    return [...this.stack].reverse();
  }

  clear() {
    this.stack = [];
  }

  size() {
    return this.stack.length;
  }

  isEmpty() {
    return this.stack.length === 0;
  }
}

/**
 * MEMBER 2: Recent Searches Queue (FIFO, Sliding Window Capacity 5)
 */
class RecentSearchQueue {
  constructor(maxCapacity = 5) {
    this.maxCapacity = maxCapacity;
    this.queue = [];
  }

  offer(query) {
    if (!query || !query.trim()) return;
    const trimmed = query.trim();
    if (this.queue.length >= this.maxCapacity) {
      this.queue.shift(); // Evict oldest from front (FIFO) in O(1)
    }
    this.queue.push(trimmed);
  }

  getRecentSearches() {
    // Returns FIFO arrival order (oldest to newest)
    return [...this.queue];
  }

  clear() {
    this.queue = [];
  }

  size() {
    return this.queue.length;
  }

  isEmpty() {
    return this.queue.length === 0;
  }
}

/**
 * MEMBER 1 + 2: Unified SearchEngine Core
 */
class SearchEngine {
  constructor(indexer) {
    this.indexer = indexer;
    this.ranker = new MaxHeap();
  }

  search(query) {
    const rawLower = (query || '').toLowerCase().trim();
    if (!rawLower) return { results: [], durationMs: '0.000', lookupMs: '0.000', heapSortMs: '0.000', totalMatches: 0, trace: [] };

    const t0 = performance.now();
    const index = this.indexer.getInvertedIndex();
    const allDocs = this.indexer.getDocuments();
    const docScoreMap = new Map();

    // 1. Inverted Index Lookup for tokens O(1)
    const tLookupStart = performance.now();
    const tokens = rawLower.split(/[^a-z0-9]+/).filter(Boolean);

    for (const token of tokens) {
      const matchedDocs = index.get(token) || [];
      for (const doc of matchedDocs) {
        const freq = doc.getKeywordFrequency(token) || 1;
        docScoreMap.set(doc, (docScoreMap.get(doc) || 0) + freq);
      }
    }
    const tLookupEnd = performance.now();

    // 2. Filename Boost & Substring Matching
    for (const doc of allDocs) {
      const lowerName = doc.fileName.toLowerCase();
      const lowerPath = doc.filePath.toLowerCase();
      let fileBonus = 0;

      if (lowerName === rawLower) fileBonus += 100;
      else if (lowerName.startsWith(rawLower)) fileBonus += 50;
      else if (lowerName.includes(rawLower)) fileBonus += 25;
      else if (lowerPath.includes(rawLower)) fileBonus += 10;

      let score = docScoreMap.get(doc) || 0;
      if (score === 0) {
        const lowerContent = doc.content.toLowerCase();
        if (rawLower.length <= 3) {
          // Word boundary prefix match
          const count = countWordPrefixMatches(lowerContent, rawLower);
          if (count > 0) score = count;
        } else {
          // Substring occurrences
          const count = countOccurrences(lowerContent, rawLower);
          if (count > 0) score = count;
        }
      }

      const finalScore = score + fileBonus;
      if (finalScore > 0) {
        docScoreMap.set(doc, finalScore);
      }
    }

    // Convert map to unranked SearchResults
    const unranked = [];
    for (const [doc, score] of docScoreMap.entries()) {
      unranked.push({
        document: doc,
        fileName: doc.fileName,
        filePath: doc.filePath,
        extension: doc.extension,
        fileSizeFormatted: doc.fileSizeFormatted,
        lastModified: doc.lastModifiedFormatted,
        wordCount: doc.wordCount,
        score,
        snippets: extractSnippets(doc.content, rawLower, 2)
      });
    }

    // 3. Max-Heap Relevance Ranking O(K log N)
    const tHeapStart = performance.now();
    const heapTrace = MaxHeap.rankWithTrace(unranked);
    const rankedResults = heapTrace.ranked;
    const tHeapEnd = performance.now();

    const tEnd = performance.now();

    return {
      results: rankedResults,
      durationMs: (tEnd - t0).toFixed(3),
      lookupMs: (tLookupEnd - tLookupStart).toFixed(3),
      heapSortMs: (tHeapEnd - tHeapStart).toFixed(3),
      totalMatches: rankedResults.length,
      trace: heapTrace.steps
    };
  }

  getDocumentCount() {
    return this.indexer.getDocuments().length;
  }

  getUniqueWordCount() {
    return this.indexer.getInvertedIndex().size;
  }
}

// ============================================================================
// 2. DEFAULT CORPUS DATA & REPOSITORY INGESTION
// ============================================================================

const DEFAULT_DOCUMENTS = [
  {
    name: 'book1.txt',
    path: 'documents/book1.txt',
    content: `Java is a programming language.\nJava is object oriented.\nJava is used to build applications.`
  },
  {
    name: 'book2.txt',
    path: 'documents/book2.txt',
    content: `Data structures are important in programming.\nHashMap provides fast data lookup.\nTrees are useful data structures.`
  },
  {
    name: 'book3.txt',
    path: 'documents/book3.txt',
    content: `Trie is a tree based data structure.\nTrie is useful for fast searching.\nTrie can provide autocomplete suggestions.`
  },
  {
    name: 'BinarySearch.java',
    path: 'src/algorithms/BinarySearch.java',
    content: `package com.minisearch.algorithms;

/**
 * Binary Search Algorithm - O(log N) Time Complexity
 * Operates on sorted arrays with divide-and-conquer logic.
 */
public class BinarySearch {
    public static int search(int[] arr, int target) {
        int low = 0;
        int high = arr.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (arr[mid] == target) return mid;
            else if (arr[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }
}`
  },
  {
    name: 'MaxHeap.java',
    path: 'src/structures/MaxHeap.java',
    content: `package com.minisearch.structures;

import java.util.PriorityQueue;
import java.util.Comparator;

/**
 * PriorityQueue Max-Heap Implementation for Relevance Ranking.
 * Extracts the document with highest keyword score in O(log N) time.
 * Breaks ties alphabetically for deterministic order.
 */
public class MaxHeap<T> {
    private PriorityQueue<SearchResult> queue;

    public MaxHeap() {
        this.queue = new PriorityQueue<>((a, b) -> {
            int diff = Integer.compare(b.getScore(), a.getScore());
            if (diff != 0) return diff;
            return a.getDocument().getFileName().compareToIgnoreCase(b.getDocument().getFileName());
        });
    }

    public void insert(SearchResult r) { queue.offer(r); }
    public SearchResult extractMax() { return queue.poll(); }
}`
  },
  {
    name: 'Algorithms_Guide.md',
    path: 'documents/Algorithms_Guide.md',
    content: `# Mini Search Engine (DSA Project Architecture)

## Core Data Structures:
1. **Trie (Prefix Tree)**: Vocabulary indexing & autocomplete suggestions in O(L + K) time.
2. **Inverted Index (HashMap)**: Fast O(1) keyword lookup mapping terms to document postings.
3. **Max-Heap (PriorityQueue)**: Sub-millisecond relevance ranking in O(K log N) time.
4. **Stack (LIFO)**: Historical query tracking with constant-time push and pop.
5. **Queue (FIFO)**: Sliding buffer managing the 5 most recent search queries.`
  },
  {
    name: 'Project_Overview.txt',
    path: 'documents/Project_Overview.txt',
    content: `DOCUMENT SEARCH ENGINE (DSA VIVA OVERVIEW)
========================================
- Member 1 Responsibilities: Document ingestion, Trie prefix indexing, Inverted Index construction, word frequency calculation, autocomplete.
- Member 2 Responsibilities: Relevance scoring, Max-Heap PriorityQueue ranking, LIFO history stack, FIFO recent search queue, UI and telemetry profiling.`
  }
];

// ============================================================================
// 3. APPLICATION STATE & INITIALIZATION
// ============================================================================

const indexer = new Indexer();
const searchEngine = new SearchEngine(indexer);
const historyStack = new HistoryStack();
const recentQueue = new RecentSearchQueue(5);

// Client State
const state = {
  currentTab: 'search',
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

// DOM Elements
const elements = {
  // Navigation
  navTabs: document.querySelectorAll('.nav-tab'),
  tabPanels: document.querySelectorAll('.tab-panel'),
  btnBrandHome: document.getElementById('btn-brand-home'),
  btnThemeToggle: document.getElementById('btn-theme-toggle'),

  // Header
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

  // Telemetry Banner
  teleTotalTime: document.getElementById('tele-total-time'),
  teleLookupTime: document.getElementById('tele-lookup-time'),
  teleHeapTime: document.getElementById('tele-heap-time'),
  teleMatchCount: document.getElementById('tele-match-count'),
  resultsContainer: document.getElementById('results-container'),

  // Explorer
  explorerLocationsList: document.getElementById('explorer-locations-list'),
  explorerCrumbsTrail: document.getElementById('explorer-crumbs-trail'),
  explorerFileTree: document.getElementById('explorer-file-tree'),
  explorerActivePath: document.getElementById('explorer-active-path'),
  btnIndexThisFolder: document.getElementById('btn-index-this-folder'),
  btnUploadFiles: document.getElementById('btn-upload-files'),
  btnUploadFolder: document.getElementById('btn-upload-folder'),
  btnCreateDoc: document.getElementById('btn-create-doc'),
  btnResetCorpus: document.getElementById('btn-reset-corpus'),
  inputUploadFiles: document.getElementById('input-upload-files'),
  inputUploadFolder: document.getElementById('input-upload-folder'),
  explorerDocList: document.getElementById('explorer-doc-list'),

  // DSA Studio
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

// Application Boot
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupEventListeners();
  loadInitialCorpus();
  updateUIStats();
  executeSearch('');
});

// ============================================================================
// 4. NAVIGATION & TABS
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
    renderExplorerTree();
  } else if (tabName === 'dsa') {
    renderDsaStudio();
  }
}

// ============================================================================
// 5. EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  // Global Shortcut: Ctrl+K or /
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

  // Main Search Input
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

      // Instant live search debounce (50ms)
      clearTimeout(state.debounceTimers.search);
      state.debounceTimers.search = setTimeout(() => executeSearch(val.trim()), 50);

      // Trie prefix autocomplete debounce (70ms)
      clearTimeout(state.debounceTimers.auto);
      state.debounceTimers.auto = setTimeout(() => handleTrieAutocomplete(val.trim()), 70);
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

  // Click outside to dismiss autocomplete
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

  // Sort Selector
  if (elements.selectSortMode) {
    elements.selectSortMode.addEventListener('change', (e) => {
      state.activeSortMode = e.target.value;
      renderSearchResults();
    });
  }

  // Re-index Header
  if (elements.btnReindexHeader) {
    elements.btnReindexHeader.addEventListener('click', () => {
      rebuildIndex();
      showToast('⚡ Re-indexed entire memory corpus into Trie & Inverted Index');
      executeSearch(elements.mainSearchInput ? elements.mainSearchInput.value.trim() : '');
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

  if (elements.btnDrawerCopyContent) {
    elements.btnDrawerCopyContent.addEventListener('click', () => {
      if (state.selectedDoc) {
        navigator.clipboard.writeText(state.selectedDoc.content || '');
        showToast('✓ Document content copied to clipboard');
      }
    });
  }

  if (elements.btnDrawerDownload) {
    elements.btnDrawerDownload.addEventListener('click', () => {
      if (state.selectedDoc) {
        downloadDocumentFile(state.selectedDoc);
      }
    });
  }

  // Explorer Toolbar Actions
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

  if (elements.btnResetCorpus) {
    elements.btnResetCorpus.addEventListener('click', () => {
      loadInitialCorpus();
      showToast('🔄 Restored default DSA corpus');
    });
  }

  // Modal Actions
  if (elements.btnCloseModal) elements.btnCloseModal.addEventListener('click', closeModal);
  if (elements.btnCancelModal) elements.btnCancelModal.addEventListener('click', closeModal);
  if (elements.btnSaveDoc) elements.btnSaveDoc.addEventListener('click', handleSaveNewDocument);

  // DSA Studio Actions
  if (elements.btnClearHistory) {
    elements.btnClearHistory.addEventListener('click', () => {
      historyStack.clear();
      recentQueue.clear();
      renderDsaStudio();
      showToast('🗑️ Search History Stack and Recent Queue cleared');
    });
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
// 6. CORPUS MANAGEMENT & INGESTION
// ============================================================================

function loadInitialCorpus() {
  indexer.clear();
  state.customDocs = [];

  for (const doc of DEFAULT_DOCUMENTS) {
    const item = new DocumentItem(doc.name, doc.path, doc.content);
    indexer.indexDocument(item);
  }

  state.activeCorpusName = 'Demo Corpus (./documents)';
  if (elements.currentCorpusName) elements.currentCorpusName.textContent = state.activeCorpusName;

  renderCorpusDropdown();
  updateUIStats();
  executeSearch(elements.mainSearchInput ? elements.mainSearchInput.value.trim() : '');
}

function rebuildIndex() {
  const currentDocs = [...indexer.getDocuments()];
  indexer.clear();
  for (const doc of currentDocs) {
    indexer.indexDocument(doc);
  }
  updateUIStats();
}

function updateUIStats() {
  const docCount = indexer.getDocuments().length;
  const wordCount = indexer.getInvertedIndex().size;

  if (elements.headerStatDocs) elements.headerStatDocs.textContent = docCount;
  if (elements.headerStatWords) elements.headerStatWords.textContent = wordCount.toLocaleString();
  if (elements.trieStatNodes) elements.trieStatNodes.textContent = indexer.getTrie().getNodeCount();
  if (elements.trieStatWords) elements.trieStatWords.textContent = indexer.getTrie().getWordCount();
}

function renderCorpusDropdown() {
  if (!elements.corpusLocationsList || !elements.explorerLocationsList) return;

  const locations = [
    { name: 'Demo Corpus (./documents)', path: 'documents', type: 'docs' },
    { name: 'Algorithms & Code (./src)', path: 'src', type: 'code' },
    { name: 'All Indexed Files', path: 'all', type: 'all' }
  ];

  elements.corpusLocationsList.innerHTML = '';
  elements.explorerLocationsList.innerHTML = '';

  locations.forEach(loc => {
    // Dropdown item
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.innerHTML = `<span>${loc.type === 'docs' ? '📚' : loc.type === 'code' ? '💻' : '📁'}</span> <span>${escapeHtml(loc.name)}</span>`;
    item.addEventListener('click', () => {
      elements.corpusDropdownMenu.classList.add('hidden');
      state.activeCorpusName = loc.name;
      if (elements.currentCorpusName) elements.currentCorpusName.textContent = loc.name;
      state.activeCorpusFilter = loc.path;
      executeSearch(elements.mainSearchInput ? elements.mainSearchInput.value.trim() : '');
      renderExplorerTree();
    });
    elements.corpusLocationsList.appendChild(item);

    // Explorer sidebar button
    const btn = document.createElement('button');
    btn.className = 'location-item-btn';
    btn.innerHTML = `<span>${loc.type === 'docs' ? '📚' : loc.type === 'code' ? '💻' : '📁'}</span> <span>${escapeHtml(loc.name)}</span>`;
    btn.addEventListener('click', () => {
      state.activeCorpusName = loc.name;
      if (elements.currentCorpusName) elements.currentCorpusName.textContent = loc.name;
      state.activeCorpusFilter = loc.path;
      renderExplorerTree();
    });
    elements.explorerLocationsList.appendChild(btn);
  });
}

// User File / Folder Upload
async function handleFilesUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  showToast(`⚡ Ingesting ${files.length} file(s) into Trie & Inverted Index...`);

  let loadedCount = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const path = file.webkitRelativePath || file.name;
    try {
      const content = await readFileAsText(file);
      const docItem = new DocumentItem(file.name, path, content, file.size, file.lastModified);
      indexer.indexDocument(docItem);
      state.customDocs.push(docItem);
      loadedCount++;
    } catch (err) {
      console.warn('Could not read file:', file.name, err);
    }
  }

  event.target.value = ''; // Reset input
  updateUIStats();
  renderExplorerTree();
  executeSearch(elements.mainSearchInput ? elements.mainSearchInput.value.trim() : '');
  showToast(`✓ Ingested & indexed ${loadedCount} file(s) into Trie & Inverted Index`);
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result || '');
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

// New Document Creation Modal
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
    showToast('⚠️ Please provide a document name');
    return;
  }

  const docItem = new DocumentItem(title, `custom/${title}`, content, content.length, Date.now());
  indexer.indexDocument(docItem);
  state.customDocs.push(docItem);

  closeModal();
  updateUIStats();
  renderExplorerTree();
  executeSearch(elements.mainSearchInput ? elements.mainSearchInput.value.trim() : '');
  showToast(`✓ Created and indexed "${title}" into memory`);
}

// ============================================================================
// 7. SEARCH & RANKING (MAX-HEAP & INVERTED INDEX)
// ============================================================================

function executeSearch(query) {
  query = (query || '').trim();
  state.currentQuery = query;

  if (query) {
    // Record into Member 2's DSA Structures: Stack (LIFO) & Queue (FIFO)
    historyStack.push(query);
    recentQueue.offer(query);
  }

  const searchRes = searchEngine.search(query);
  state.searchResults = searchRes.results;
  state.latestHeapTrace = searchRes.trace || [];

  if (elements.teleTotalTime) elements.teleTotalTime.textContent = `${searchRes.durationMs} ms`;
  if (elements.teleLookupTime) elements.teleLookupTime.textContent = `${searchRes.lookupMs} ms`;
  if (elements.teleHeapTime) elements.teleHeapTime.textContent = `${searchRes.heapSortMs} ms`;
  if (elements.teleMatchCount) elements.teleMatchCount.textContent = `${searchRes.totalMatches} matches`;

  // If query is empty, show all documents
  if (!query) {
    const allDocs = indexer.getDocuments();
    state.searchResults = allDocs.map((doc, idx) => ({
      document: doc,
      fileName: doc.fileName,
      filePath: doc.filePath,
      extension: doc.extension,
      fileSizeFormatted: doc.fileSizeFormatted,
      lastModified: doc.lastModifiedFormatted,
      wordCount: doc.wordCount,
      score: 0,
      snippets: extractSnippets(doc.content, '', 1)
    }));
    if (elements.teleMatchCount) elements.teleMatchCount.textContent = `${allDocs.length} indexed files`;
    if (elements.teleTotalTime) elements.teleTotalTime.textContent = '0.000 ms';
  }

  renderSearchResults();
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
          <span class="doc-name" title="Click to inspect content">${escapeHtml(item.fileName)}</span>
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
          <button class="btn-card-action btn-copy-path" title="Copy document path">📋 Copy Path</button>
          <button class="btn-card-action btn-download-file" title="Download file">💾 Download</button>
        </div>
      </div>
    `;

    // Bind Actions
    card.querySelector('.doc-name').addEventListener('click', () => openInspector(item.document || item));
    card.querySelector('.btn-inspect').addEventListener('click', () => openInspector(item.document || item));
    card.querySelector('.btn-copy-path').addEventListener('click', () => {
      navigator.clipboard.writeText(item.filePath);
      showToast('✓ Copied document path');
    });
    card.querySelector('.btn-download-file').addEventListener('click', () => {
      downloadDocumentFile(item.document || item);
    });

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
    return copy; // Already Max-Heap sorted
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
// 8. TRIE PREFIX AUTOCOMPLETE (MEMBER 1)
// ============================================================================

function handleTrieAutocomplete(prefix) {
  if (!prefix) {
    hideAutocomplete();
    return;
  }

  const items = indexer.getTrie().autoCompleteDetails(prefix);
  renderTrieAutocomplete(prefix, items);
}

function renderTrieAutocomplete(prefix, items) {
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
// 9. CORPUS & FILE EXPLORER VIEW
// ============================================================================

function renderExplorerTree() {
  if (!elements.explorerFileTree || !elements.explorerDocList) return;

  const docs = indexer.getDocuments();
  let filteredDocs = docs;

  if (state.activeCorpusFilter === 'documents') {
    filteredDocs = docs.filter(d => d.filePath.startsWith('documents'));
  } else if (state.activeCorpusFilter === 'src') {
    filteredDocs = docs.filter(d => d.filePath.startsWith('src'));
  }

  if (elements.explorerActivePath) {
    elements.explorerActivePath.textContent = state.activeCorpusFilter === 'all' ? 'All Corpus Locations' : `./${state.activeCorpusFilter}`;
  }

  if (elements.explorerCrumbsTrail) {
    elements.explorerCrumbsTrail.innerHTML = `
      <span class="crumb-part">root</span>
      <span style="color:var(--text-muted);">&rsaquo;</span>
      <span class="crumb-part">${escapeHtml(state.activeCorpusFilter)}</span>
    `;
  }

  // Sidebar tree items
  elements.explorerFileTree.innerHTML = '';
  filteredDocs.forEach(doc => {
    const row = document.createElement('div');
    row.className = 'tree-file-row';
    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
        <span>📄</span>
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(doc.fileName)}</span>
      </div>
      <span style="font-size:10px; color:var(--text-muted);">${escapeHtml(doc.fileSizeFormatted)}</span>
    `;
    row.addEventListener('click', () => openInspector(doc));
    elements.explorerFileTree.appendChild(row);
  });

  // Main grid cards
  elements.explorerDocList.innerHTML = '';
  filteredDocs.forEach(doc => {
    const card = document.createElement('div');
    card.className = 'doc-grid-card';
    card.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
        <span class="dsa-badge-sm">${escapeHtml(doc.extension.toUpperCase())}</span>
        <span style="font-size:11px; color:var(--text-muted);">${escapeHtml(doc.fileSizeFormatted)}</span>
      </div>
      <h4 style="font-size:14px; font-weight:700; color:var(--text-primary); margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(doc.fileName)}</h4>
      <div style="font-size:11px; color:var(--text-muted); margin-bottom:6px;">${doc.wordCount} words &bull; ${escapeHtml(doc.lastModifiedFormatted)}</div>
      <div style="font-family:var(--font-mono); font-size:10.5px; color:var(--text-secondary); opacity:0.8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(doc.filePath)}</div>
    `;
    card.addEventListener('click', () => openInspector(doc));
    elements.explorerDocList.appendChild(card);
  });
}

// ============================================================================
// 10. FILE INSPECTOR DRAWER
// ============================================================================

function openInspector(doc) {
  state.selectedDoc = doc;

  if (elements.drawerDocName) elements.drawerDocName.textContent = doc.fileName || '';
  if (elements.drawerDocPath) elements.drawerDocPath.textContent = doc.filePath || '';
  if (elements.drawerExtBadge) elements.drawerExtBadge.textContent = (doc.extension || 'DOC').toUpperCase();
  if (elements.drawerFileSize) elements.drawerFileSize.textContent = doc.fileSizeFormatted || formatBytes(doc.content ? doc.content.length : 0);
  if (elements.drawerWordCount) elements.drawerWordCount.textContent = doc.wordCount || '-';
  if (elements.drawerRelevanceScore) elements.drawerRelevanceScore.textContent = doc.score || '0';

  if (elements.drawerCodeTable) {
    elements.drawerCodeTable.innerHTML = '';
    const lines = (doc.content || '').split(/\r?\n/);
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

  elements.inspectorDrawer.classList.remove('hidden');
}

function closeInspector() {
  if (elements.inspectorDrawer) elements.inspectorDrawer.classList.add('hidden');
  state.selectedDoc = null;
}

function downloadDocumentFile(doc) {
  if (!doc) return;
  const blob = new Blob([doc.content || ''], { type: 'text/plain;charset=utf-8' });
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
// 11. DSA STUDIO & TELEMETRY VISUALIZERS
// ============================================================================

function renderDsaStudio() {
  renderStackVisualizer();
  renderQueueVisualizer();
  renderTrieVisualizer(elements.dsaTrieTestInput ? elements.dsaTrieTestInput.value.trim() : '');
  renderHeapTraceVisualizer();
  renderInvertedIndexTable(elements.dsaInvFilterInput ? elements.dsaInvFilterInput.value.trim().toLowerCase() : '');
}

// 1. Stack Visualizer (LIFO)
function renderStackVisualizer() {
  if (!elements.dsaStackVisual) return;
  const historyList = historyStack.getHistoryList();

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
}

// 2. Queue Visualizer (FIFO)
function renderQueueVisualizer() {
  if (!elements.dsaQueueVisual) return;
  const recentList = recentQueue.getRecentSearches();

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
        ${isHead ? `<span class="dsa-badge-sm" style="color:var(--accent-amber);">HEAD (Next to evict)</span>` : ''}
        ${isTail ? `<span class="dsa-badge-sm" style="color:var(--accent-cyan);">TAIL (Newest arrival)</span>` : ''}
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
}

// 3. Trie Prefix Visualizer
function renderTrieVisualizer(prefix) {
  if (!elements.dsaTrieBranchesBox) return;

  const trie = indexer.getTrie();
  if (elements.trieStatNodes) elements.trieStatNodes.textContent = trie.getNodeCount();
  if (elements.trieStatWords) elements.trieStatWords.textContent = trie.getWordCount();

  if (!prefix) {
    const rootChildren = Array.from(trie.root.children.keys()).sort();
    elements.dsaTrieBranchesBox.innerHTML = `
      <div style="margin-bottom:8px; color:var(--text-primary); font-weight:600;">Root Node Branches (${rootChildren.length} character edges):</div>
      <div style="display:flex; flex-wrap:wrap; gap:4px;">
        ${rootChildren.map(ch => `<span class="stat-bubble" style="cursor:pointer;" onclick="setTrieTestInput('${ch}')">'${ch}'</span>`).join('')}
      </div>
      <div style="margin-top:12px; color:var(--text-muted); font-size:11px;">Type any letter or prefix above to test Trie.autoCompleteDetails(prefix) in real time.</div>
    `;
    return;
  }

  const node = trie.findNode(prefix.toLowerCase());
  const suggestions = trie.autoCompleteDetails(prefix);

  if (!node) {
    elements.dsaTrieBranchesBox.innerHTML = `
      <div style="color:var(--accent-rose); margin-bottom:6px;">⚠️ Prefix <strong>"${escapeHtml(prefix)}"</strong> not found in Trie tree.</div>
      <div style="color:var(--text-muted); font-size:11px;">No branches exist starting with this sequence.</div>
    `;
    return;
  }

  const directChildren = Array.from(node.children.keys()).sort();

  elements.dsaTrieBranchesBox.innerHTML = `
    <div style="margin-bottom:8px;">
      <span style="color:var(--text-muted);">Active Node Prefix:</span> <strong>"${escapeHtml(prefix)}"</strong>
      <span class="dsa-badge-sm" style="margin-left:8px;">${node.isEndOfWord ? '✓ EndOfWord' : 'Intermediate Node'}</span>
    </div>
    <div style="margin-bottom:8px; font-size:11px;">
      Direct Outgoing Branches: 
      ${directChildren.length > 0 ? directChildren.map(ch => `<span class="dsa-badge-sm" style="margin:2px;">+${ch}</span>`).join(' ') : 'None (Leaf)'}
    </div>
    <div style="margin-top:10px; font-weight:600; color:var(--text-primary); margin-bottom:6px;">Autocomplete Candidates (${suggestions.length}):</div>
    <div style="display:flex; flex-wrap:wrap; gap:6px;">
      ${suggestions.map(s => `
        <span class="trie-suggestion-chip" onclick="searchFromTrie('${escapeHtml(s.displayText)}')">
          <span>${s.isFileName ? '📄' : '🔍'}</span>
          <strong>${escapeHtml(s.displayText)}</strong>
          <span style="font-size:10px; color:var(--text-muted);">&bull; ${s.frequency}x</span>
        </span>
      `).join('')}
    </div>
  `;
}

window.setTrieTestInput = function(val) {
  if (elements.dsaTrieTestInput) {
    elements.dsaTrieTestInput.value = val;
    renderTrieVisualizer(val);
  }
};

window.searchFromTrie = function(term) {
  switchMainTab('search');
  if (elements.mainSearchInput) elements.mainSearchInput.value = term;
  executeSearch(term);
};

// 4. Max-Heap Extraction Trace Visualizer
function renderHeapTraceVisualizer() {
  if (!elements.dsaHeapTraceBox) return;

  if (elements.heapTraceQuery) {
    elements.heapTraceQuery.textContent = state.currentQuery ? `Query: "${state.currentQuery}"` : 'All Indexed Files';
  }

  const steps = state.latestHeapTrace || [];
  if (steps.length === 0) {
    elements.dsaHeapTraceBox.innerHTML = `<div style="color:var(--text-muted); font-size:12px; text-align:center; padding:30px 0;">No active query trace. Enter a query in the Search tab to view Max-Heap poll() steps.</div>`;
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
}

// 5. Inverted Index Table Visualizer
function renderInvertedIndexTable(filterTerm) {
  if (!elements.dsaInvTableBody) return;

  const index = indexer.getInvertedIndex();
  let terms = Array.from(index.keys()).sort();

  if (filterTerm) {
    terms = terms.filter(t => t.includes(filterTerm));
  }

  // Display top 60 terms for optimal rendering performance
  const displayTerms = terms.slice(0, 60);

  if (displayTerms.length === 0) {
    elements.dsaInvTableBody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; padding:24px; color:var(--text-muted);">
          No index terms match "${escapeHtml(filterTerm)}".
        </td>
      </tr>
    `;
    return;
  }

  elements.dsaInvTableBody.innerHTML = '';
  displayTerms.forEach(term => {
    const docs = index.get(term) || [];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong style="color:var(--accent-primary); font-family:var(--font-mono);">${escapeHtml(term)}</strong></td>
      <td><span class="dsa-badge-sm">${docs.length} file${docs.length === 1 ? '' : 's'}</span></td>
      <td>
        <div style="display:flex; flex-wrap:wrap; gap:4px;">
          ${docs.map(d => `
            <span class="posting-chip" title="${escapeHtml(d.filePath)}">
              <span>${escapeHtml(d.fileName)}</span>
              <span class="posting-freq">(${d.getKeywordFrequency(term)}x)</span>
            </span>
          `).join('')}
        </div>
      </td>
    `;
    elements.dsaInvTableBody.appendChild(tr);
  });
}

// ============================================================================
// 12. UTILITY FUNCTIONS
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
      snippets.push({ lineNum: i + 1, text: line.trim() });
      if (snippets.length >= maxSnippets) break;
    }
  }

  if (snippets.length === 0 && lines.length > 0) {
    snippets.push({ lineNum: 1, text: lines[0].trim() });
  }

  return snippets;
}

function countWordPrefixMatches(text, prefix) {
  if (!text || !prefix) return 0;
  let count = 0;
  const len = text.length;
  const subLen = prefix.length;
  for (let i = 0; i <= len - subLen; i++) {
    const isWordStart = (i === 0) || !/[a-zA-Z0-9]/.test(text[i - 1]);
    if (isWordStart && text.substring(i, i + subLen) === prefix) {
      count++;
    }
  }
  return count;
}

function countOccurrences(text, sub) {
  if (!text || !sub) return 0;
  let count = 0;
  let idx = 0;
  while ((idx = text.indexOf(sub, idx)) !== -1) {
    count++;
    idx += Math.max(1, sub.length);
  }
  return count;
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

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  const exp = Math.floor(Math.log(bytes) / Math.log(1024));
  const pre = 'KMGTPE'[exp - 1];
  return (bytes / Math.pow(1024, exp)).toFixed(1) + ' ' + pre + 'B';
}

function formatDate(timestamp) {
  if (!timestamp) return 'Just now';
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getFileExtension(filename) {
  if (!filename) return '';
  const dot = filename.lastIndexOf('.');
  if (dot > 0 && dot < filename.length - 1) {
    return filename.substring(dot + 1).toLowerCase();
  }
  return 'file';
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
