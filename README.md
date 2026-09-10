# Mini Search Engine (DSA Project)

A high-performance, in-memory search engine developed in Java using core Data Structures and Algorithms (DSA). This project demonstrates prefix-tree indexing, inverted indices, Max-Heap relevance ranking, LIFO history tracking, and FIFO sliding-window queues.

---

## 👥 Project Team & Responsibilities

| Team Member | Component | Key Data Structures | Key Responsibilities |
|---|---|---|---|
| **Member 1** | **Search & Indexing** | Trie (Prefix Tree), Inverted Index (`HashMap<String, List<Document>>`), ArrayList | Document ingestion, vocabulary indexing, inverted index construction, word frequency calculation, prefix autocomplete. |
| **Member 2** | **Ranking & User Interaction** | PriorityQueue (Max-Heap), Stack (`Stack<String>`), Queue (`LinkedList<String>`) | Relevance scoring, Max-Heap result ranking, deterministic tie-breaking, LIFO search history, FIFO recent search queue, UI separation, nano-second performance profiling, unit/integration testing. |

---

## 🏛 Architecture & Data Flow

```text
User Search Query
       │
       ▼
┌─────────────────────────┐
│ Member 1: SearchEngine  │ ◄─── Inverted Index: HashMap<String, List<Document>>
└───────────┬─────────────┘      Trie: Prefix tree for vocabulary & autocomplete
            │ (Unranked List<SearchResult>)
            ▼
┌─────────────────────────┐
│  Member 2: Ranker       │ ◄─── Java PriorityQueue (Max-Heap)
└───────────┬─────────────┘      Score = Keyword frequency in document
            │                    Tie-breaker = Lexicographical document name
            │ (Ranked List<SearchResult>)
            ▼
┌─────────────────────────┐
│  Member 2: UI Layer     │ ───► Prints ranked results table & execution time
└───────────┬─────────────┘
            │
            ├──────────────────────────────┐
            ▼                              ▼
┌─────────────────────────┐   ┌───────────────────────────┐
│ Member 2: History       │   │ Member 2: RecentSearches  │
│ (Java Stack - LIFO)     │   │ (Java Queue - FIFO, cap 5)│
└─────────────────────────┘   └───────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
* Java JDK 11 or higher (tested on Java 26)
* Command terminal (PowerShell, Bash, or CMD)

### Compilation
From the project root directory:
```bash
javac -d bin src/com/minisearch/*.java
```

### Running the Application
```bash
java -cp bin com.minisearch.Main
```

### Running the Automated Test Suite
```bash
java -cp bin com.minisearch.SearchEngineTest
```

---

## 💻 Console Menu & Features

```text
====================================
DOCUMENT SEARCH ENGINE
====================================
1. Search
2. Autocomplete
3. Search History (Stack - LIFO)
4. Recent Searches (Queue - FIFO)
5. Clear History
6. Performance Statistics
7. Exit
```

1. **Search**: Searches indexed text files for a keyword, ranks matching documents by frequency using a Max-Heap `PriorityQueue`, and records execution duration in milliseconds (`System.nanoTime()`).
2. **Autocomplete**: Provides real-time prefix suggestions powered by Member 1's `Trie`.
3. **Search History (Stack - LIFO)**: Displays all past queries entered during the session with the most recent query displayed first.
4. **Recent Searches (Queue - FIFO)**: Displays a bounded sliding window of the last 5 queries, evicting the oldest query when full.
5. **Clear History**: Flushes both the History Stack and Recent Searches Queue.
6. **Performance Statistics**: Displays total documents, unique vocabulary words, total searches executed, last search time, and average search latency.
7. **Exit**: Graceful application shutdown.

---

## 📘 Member 2 — Ranking & User Interaction

### 1. Ranker (`Ranker.java`)
The `Ranker` is responsible for ordering search matches by relevance. Rather than performing a naive sort on a standard list, it employs a **Binary Max-Heap** (`java.util.PriorityQueue`) to extract documents from highest relevance to lowest relevance.

### 2. PriorityQueue / Heap Mechanics
* **Heap Invariant**: In Java, `PriorityQueue` is a Min-Heap by default. We configure a custom `Comparator<SearchResult>` that compares scores in reverse (`Integer.compare(b.getScore(), a.getScore())`), transforming it into a **Max-Heap**.
* **Root Property**: The root of the Max-Heap always contains the document with the highest relevance score.
* **Top-K Efficiency**: For large document corpora where only the top $k$ results are needed, a heap allows extracting the best matches in $O(k \log N)$ time without sorting all $N$ documents ($O(N \log N)$).

### 3. Relevance Score & Tie-Breaking
* **Relevance Score**: The number of occurrences of the searched keyword inside the document (`document.getKeywordFrequency(keyword)`). Higher occurrence count directly corresponds to a higher score.
* **Deterministic Tie-Breaking**: When two documents have the exact same relevance score, the comparator breaks ties by sorting document file names in ascending alphabetical order:
  ```java
  int scoreComparison = Integer.compare(b.getScore(), a.getScore());
  if (scoreComparison != 0) {
      return scoreComparison;
  }
  return a.getDocument().getFileName().compareToIgnoreCase(b.getDocument().getFileName());
  ```

### 4. History Stack (`History.java`)
* **Data Structure**: `java.util.Stack<String>`
* **Principle**: **LIFO** (Last-In, First-Out).
* **Behavior**: Every search query entered is pushed onto the stack via `addSearch(query)`. When displaying history, the stack is traversed from top (`size - 1`) to bottom (`0`), ensuring the most recent search is displayed at the top of the list.
* `clearHistory()` empties the stack.

### 5. Recent Searches Queue (`RecentSearchQueue.java`)
* **Data Structure**: `java.util.Queue<String>` (implemented via `java.util.LinkedList<String>`)
* **Principle**: **FIFO** (First-In, First-Out).
* **Behavior**: Maintains a sliding buffer of the $N$ most recent searches (default capacity: 5). When capacity is exceeded, the oldest query is evicted from the head via `queue.poll()`, and the new query is enqueued at the tail via `queue.offer()`.

### 6. Performance Measurement
* Measured using `System.nanoTime()`:
  ```java
  long startTime = System.nanoTime();
  List<SearchResult> unranked = searchEngine.search(query);
  List<SearchResult> ranked = ranker.rank(unranked);
  long endTime = System.nanoTime();
  double durationMs = (endTime - startTime) / 1_000_000.0;
  ```
* Accurately captures both inverted index lookup time and heap sorting time down to sub-millisecond precision.

### 7. Testing
The project includes a standalone automated test suite (`SearchEngineTest.java`) with 48 assertions covering:
* Single match ranking
* Multiple match ranking with descending scores
* Equal score deterministic tie-breaking
* Null and empty list handling
* LIFO order of history pushes and peeks
* FIFO order and capacity-overflow eviction in recent searches queue
* Trie autocomplete prefix matching
* End-to-end integrated search and ranking pipeline

---

## 📊 Time & Space Complexity Summary (Viva Reference)

| Component | Operation | Data Structure | Time Complexity | Space Complexity | Explanation |
|---|---|---|---|---|---|
| **Ranker** | Insert result | PriorityQueue (Max-Heap) | $O(\log N)$ | $O(N)$ | Sift-up operation in binary heap |
| **Ranker** | Poll highest score | PriorityQueue (Max-Heap) | $O(\log N)$ | $O(1)$ | Sift-down operation after removing root |
| **Ranker** | Peek top score | PriorityQueue (Max-Heap) | $O(1)$ | $O(1)$ | Root element inspection |
| **Ranker** | Full Ranking (N items) | PriorityQueue (Max-Heap) | $O(N \log N)$ | $O(N)$ | Inserting $N$ items and polling $N$ items |
| **Ranker** | Top-K Ranking | PriorityQueue (Max-Heap) | $O(K \log N)$ | $O(N)$ | Polling only $K$ items from heap of size $N$ |
| **History** | `addSearch` (push) | Stack | $O(1)$ | $O(N)$ | Pushing onto top of stack |
| **History** | `peekLatest` | Stack | $O(1)$ | $O(1)$ | Inspecting top element |
| **History** | `showHistory` | Stack | $O(N)$ | $O(1)$ | Iterating $N$ stored queries |
| **Queue** | `addSearch` (enqueue) | Queue (FIFO) | $O(1)$ | $O(C)$ | Inserting at tail, $C \le 5$ |
| **Queue** | Evict oldest (poll) | Queue (FIFO) | $O(1)$ | $O(1)$ | Dequeue from head when full |
| **SearchEngine** | Keyword lookup | HashMap (Inverted Index)| $O(1)$ avg | $O(D)$ | Hash lookup where $D$ = matching docs |
| **Trie** | Autocomplete | Trie (Prefix Tree) | $O(P + M)$ | $O(M)$ | $P$ = prefix length, $M$ = matched words |
