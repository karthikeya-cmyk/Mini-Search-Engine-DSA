package com.minisearch;

import java.io.File;
import java.util.List;

/**
 * ============================================================================
 * MINI SEARCH ENGINE - MAIN APPLICATION
 * ============================================================================
 *
 * Integrated application combining:
 * - MEMBER 1:
 *   - Trie & TrieNode: Prefix tree for indexing vocabulary and autocomplete
 *   - Inverted Index & Document: Fast keyword lookup mapping words to documents
 *   - SearchEngine: Query processing and initial match retrieval
 *
 * - MEMBER 2:
 *   - Ranker: Relevance ranking using Java PriorityQueue (Max-Heap)
 *   - History: Search history tracking using Java Stack (LIFO)
 *   - RecentSearchQueue: Sliding window of recent queries using Java Queue (FIFO)
 *   - UI: Clean console rendering, robust input validation, and user interaction
 *   - Performance: High-precision execution timing via System.nanoTime()
 */
public class Main {

    private static final String DEFAULT_DOCS_PATH = "documents";

    public static void main(String[] args) {
        // Step 1: Initialize Member 1 Components
        Indexer indexer = new Indexer();

        // Check if documents directory exists
        File docsDir = new File(DEFAULT_DOCS_PATH);
        if (!docsDir.exists() || !docsDir.isDirectory()) {
            System.err.println("[WARNING] Documents folder '" + DEFAULT_DOCS_PATH + "' not found.");
            System.err.println("Please ensure the documents directory exists with .txt files.");
        }

        // Index all text documents
        indexer.indexDocuments(DEFAULT_DOCS_PATH);

        SearchEngine searchEngine = new SearchEngine(indexer);

        // Step 2: Initialize Member 2 Components
        Ranker ranker = new Ranker();
        History history = new History();
        RecentSearchQueue recentQueue = new RecentSearchQueue(5); // Fixed capacity of 5
        UI ui = new UI();

        // Performance tracking variables
        int totalSearches = 0;
        long totalSearchTimeNs = 0;
        double lastSearchTimeMs = 0.0;

        // Display welcome banner
        ui.displayWelcome(searchEngine.getDocumentCount(), searchEngine.getUniqueWordCount());

        boolean running = true;

        while (running) {
            ui.displayMenu();
            int choice = ui.readChoice();

            switch (choice) {
                case 1: {
                    // --- 1. SEARCH WITH RANKING (MEMBER 1 + MEMBER 2) ---
                    String query = ui.readString("Enter search keyword: ");

                    // Error handling: Empty search query
                    if (query.isBlank()) {
                        ui.displayError("Search query cannot be empty.");
                        break;
                    }

                    // Performance measurement using System.nanoTime()
                    long startTime = System.nanoTime();

                    // Member 1: Fetch matching documents via Inverted Index
                    List<SearchResult> unrankedResults = searchEngine.search(query);

                    // Member 2: Rank results via PriorityQueue (Max-Heap)
                    List<SearchResult> rankedResults = ranker.rank(unrankedResults);

                    long endTime = System.nanoTime();
                    long durationNs = endTime - startTime;
                    double durationMs = durationNs / 1_000_000.0;

                    // Update performance statistics
                    totalSearches++;
                    totalSearchTimeNs += durationNs;
                    lastSearchTimeMs = durationMs;

                    // Member 2: Add query to LIFO Stack and FIFO Queue
                    history.addSearch(query);
                    recentQueue.addSearch(query);

                    // Display ranked results with timing
                    ui.displayResults(query, rankedResults, durationMs);
                    break;
                }

                case 2: {
                    // --- 2. AUTOCOMPLETE (MEMBER 1 TRIE) ---
                    String prefix = ui.readString("Enter prefix: ");

                    // Error handling: Empty prefix
                    if (prefix.isBlank()) {
                        ui.displayError("Prefix cannot be empty.");
                        break;
                    }

                    // Use Member 1's Trie autocomplete
                    List<String> suggestions = searchEngine.autoComplete(prefix);
                    ui.displayAutocomplete(prefix, suggestions);
                    break;
                }

                case 3: {
                    // --- 3. SEARCH HISTORY (MEMBER 2 STACK - LIFO) ---
                    ui.displayHistory(history.getHistoryList());
                    break;
                }

                case 4: {
                    // --- 4. RECENT SEARCHES (MEMBER 2 QUEUE - FIFO) ---
                    ui.displayRecentSearches(recentQueue.getRecentSearches(), recentQueue.getMaxCapacity());
                    break;
                }

                case 5: {
                    // --- 5. CLEAR HISTORY ---
                    if (history.isEmpty() && recentQueue.isEmpty()) {
                        ui.displayError("History is already empty.");
                    } else {
                        history.clearHistory();
                        recentQueue.clear();
                        ui.displaySuccess("Search history and recent searches queue cleared.");
                    }
                    break;
                }

                case 6: {
                    // --- 6. PERFORMANCE STATISTICS ---
                    double avgSearchTimeMs = (totalSearches > 0)
                            ? (totalSearchTimeNs / (double) totalSearches) / 1_000_000.0
                            : 0.0;

                    ui.displayPerformanceStats(
                            searchEngine.getDocumentCount(),
                            searchEngine.getUniqueWordCount(),
                            totalSearches,
                            lastSearchTimeMs,
                            avgSearchTimeMs
                    );
                    break;
                }

                case 7: {
                    // --- 7. EXIT ---
                    ui.displayExit();
                    running = false;
                    break;
                }

                default: {
                    // Error handling: Invalid menu choice
                    ui.displayError("Invalid choice. Please enter a number between 1 and 7.");
                    break;
                }
            }
        }
    }
}
