package com.minisearch;

import java.util.List;
import java.util.Scanner;

/**
 * ============================================================================
 * MEMBER 2 RESPONSIBILITY: User Interface (UI) Layer
 * ============================================================================
 *
 * ARCHITECTURAL PRINCIPLE: SEPARATION OF CONCERNS
 * -----------------------------------------------
 * This class encapsulates all Console I/O, rendering, and input validation.
 * It keeps DSA components (Trie, InvertedIndex, PriorityQueue, Stack, Queue)
 * completely decoupled from terminal presentation logic.
 */
public class UI {

    private final Scanner scanner;

    public UI(Scanner scanner) {
        this.scanner = scanner;
    }

    public UI() {
        this(new Scanner(System.in));
    }

    /**
     * Displays the welcome banner and system statistics.
     */
    public void displayWelcome(int docCount, int wordCount) {
        System.out.println("====================================");
        System.out.println("        MINI SEARCH ENGINE          ");
        System.out.println("====================================");
        System.out.println("Indexed Documents   : " + docCount);
        System.out.println("Unique Words in Trie: " + wordCount);
        System.out.println("====================================");
    }

    /**
     * Displays the main interactive menu.
     */
    public void displayMenu() {
        System.out.println("\n====================================");
        System.out.println("DOCUMENT SEARCH ENGINE");
        System.out.println("====================================");
        System.out.println("1. Search");
        System.out.println("2. Autocomplete");
        System.out.println("3. Search History (Stack - LIFO)");
        System.out.println("4. Recent Searches (Queue - FIFO)");
        System.out.println("5. Clear History");
        System.out.println("6. Performance Statistics");
        System.out.println("7. Exit");
        System.out.print("\nEnter choice: ");
    }

    /**
     * Safely reads an integer menu choice with robust error handling.
     * Prevents InputMismatchException or crash on non-numeric input.
     *
     * @return valid choice number, or -1 if invalid
     */
    public int readChoice() {
        String input = scanner.nextLine().trim();
        try {
            return Integer.parseInt(input);
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    /**
     * Prompts the user and safely reads a text string.
     *
     * @param prompt prompt message to display
     * @return trimmed user input
     */
    public String readString(String prompt) {
        System.out.print(prompt);
        return scanner.nextLine().trim();
    }

    /**
     * Displays ranked search results with scores and execution timing.
     *
     * @param query the search term
     * @param results list of results ranked by Ranker (PriorityQueue)
     * @param executionTimeMs search execution duration in milliseconds
     */
    public void displayResults(String query, List<SearchResult> results, double executionTimeMs) {
        System.out.println("\nSearch: " + query);

        if (results == null || results.isEmpty()) {
            System.out.println("No matching documents found.");
            System.out.printf("Search time: %.3f ms%n", executionTimeMs);
            return;
        }

        System.out.println("\nRanked Results (Max-Heap PriorityQueue):");
        int rank = 1;
        for (SearchResult res : results) {
            System.out.printf("%d. %-20s Score: %d%n",
                    rank++,
                    res.getDocument().getFileName(),
                    res.getScore()
            );
        }

        System.out.printf("%nSearch time: %.3f ms%n", executionTimeMs);
        System.out.println("Total documents matched: " + results.size());
    }

    /**
     * Displays prefix autocomplete suggestions from Member 1's Trie.
     */
    public void displayAutocomplete(String prefix, List<String> suggestions) {
        System.out.println("\nEnter prefix: " + prefix);
        if (suggestions == null || suggestions.isEmpty()) {
            System.out.println("No suggestions found for prefix \"" + prefix + "\".");
            return;
        }

        System.out.println("Suggestions:");
        for (String suggestion : suggestions) {
            System.out.println("- " + suggestion);
        }
        System.out.println("Total suggestions: " + suggestions.size());
    }

    /**
     * Displays search history stored in the LIFO Stack.
     */
    public void displayHistory(List<String> history) {
        if (history == null || history.isEmpty()) {
            System.out.println("\nSearch history is empty.");
            return;
        }

        System.out.println("\n====================================");
        System.out.println("SEARCH HISTORY (Stack - LIFO)");
        System.out.println("(Latest searches appear first)");
        System.out.println("====================================");
        int rank = 1;
        for (String q : history) {
            System.out.println(rank++ + ". " + q);
        }
        System.out.println("Total searches recorded: " + history.size());
    }

    /**
     * Displays recent searches stored in the FIFO Queue.
     */
    public void displayRecentSearches(List<String> recent, int maxCapacity) {
        if (recent == null || recent.isEmpty()) {
            System.out.println("\nRecent searches queue is empty.");
            return;
        }

        System.out.println("\n====================================");
        System.out.println("RECENT SEARCHES QUEUE (Queue - FIFO)");
        System.out.println("(Fixed Capacity: " + maxCapacity + " | Oldest to Newest)");
        System.out.println("====================================");
        int rank = 1;
        for (String q : recent) {
            System.out.println(rank++ + ". " + q);
        }
        System.out.println("Queue size: " + recent.size() + " / " + maxCapacity);
    }

    /**
     * Displays comprehensive performance and index statistics.
     */
    public void displayPerformanceStats(
            int docCount,
            int uniqueWordCount,
            int totalSearches,
            double lastSearchTimeMs,
            double avgSearchTimeMs) {

        System.out.println("\n====================================");
        System.out.println("PERFORMANCE & INDEX STATISTICS");
        System.out.println("====================================");
        System.out.println("Total Documents Indexed    : " + docCount);
        System.out.println("Total Unique Words Indexed : " + uniqueWordCount);
        System.out.println("Total Searches Executed    : " + totalSearches);
        if (totalSearches > 0) {
            System.out.printf("Last Search Execution Time : %.4f ms%n", lastSearchTimeMs);
            System.out.printf("Average Search Time        : %.4f ms%n", avgSearchTimeMs);
        } else {
            System.out.println("Last Search Execution Time : N/A (no searches yet)");
            System.out.println("Average Search Time        : N/A (no searches yet)");
        }
        System.out.println("Timing Instrument          : System.nanoTime()");
        System.out.println("====================================");
    }

    public void displayError(String message) {
        System.out.println("[ERROR] " + message);
    }

    public void displaySuccess(String message) {
        System.out.println("[SUCCESS] " + message);
    }

    public void displayExit() {
        System.out.println("\nThank you for using Mini Search Engine. Goodbye!");
    }
}
