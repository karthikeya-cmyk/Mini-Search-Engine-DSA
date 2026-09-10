package com.minisearch;

import java.util.ArrayList;
import java.util.List;
import java.util.Stack;

/**
 * ============================================================================
 * MEMBER 2 RESPONSIBILITY: Search History using Stack (LIFO)
 * ============================================================================
 *
 * DSA CONCEPT: STACK & LIFO PRINCIPLE
 * -----------------------------------
 * A Stack is a linear data structure that adheres to the LIFO principle:
 * Last-In, First-Out. The last element pushed onto the stack is the first one
 * to be removed or inspected.
 *
 * In this search engine, search queries entered by the user are pushed onto
 * the stack. When viewing history, we iterate from top to bottom so that the
 * most recently performed search is displayed first.
 *
 * VIVA EXPLANATION POINTS:
 * ------------------------
 * 1. Why use a Stack for search history?
 *    - Search history naturally follows LIFO order: users care most about
 *      what they just searched for moments ago.
 *    - Push and Pop operations are O(1) constant time, making history tracking
 *      extremely fast and lightweight without shifting array elements.
 *
 * 2. Time Complexity:
 *    - push() [addSearch]: O(1) amortized
 *    - pop() / peek(): O(1)
 *    - clear(): O(N) or O(1) depending on JVM implementation
 *    - Traversing history: O(N) where N is the number of stored searches
 *
 * 3. Space Complexity:
 *    - O(N) where N is the number of historical queries recorded.
 */
public class History {

    // Internal stack storing search query strings
    private final Stack<String> searchStack;

    public History() {
        this.searchStack = new Stack<>();
    }

    /**
     * Adds a search query to the history stack.
     * Operation: push() -> O(1)
     *
     * @param query search query entered by the user
     */
    public void addSearch(String query) {
        if (query == null || query.isBlank()) {
            return;
        }
        // Push query to the top of the stack (LIFO)
        searchStack.push(query.trim());
    }

    /**
     * Prints all previous search queries in LIFO order (latest search first).
     * Handles empty history gracefully.
     */
    public void showHistory() {
        if (searchStack.isEmpty()) {
            System.out.println("Search history is empty.");
            return;
        }

        System.out.println("\n--- Search History (Latest First - LIFO) ---");
        int index = 1;
        // Iterate from top of the stack (size - 1) down to bottom (0)
        for (int i = searchStack.size() - 1; i >= 0; i--) {
            System.out.println(index++ + ". " + searchStack.get(i));
        }
        System.out.println("--------------------------------------------");
    }

    /**
     * Returns a list of search queries in LIFO order (latest first).
     * Allows UI or testing classes to format the history output independently.
     *
     * @return List of past searches from most recent to oldest
     */
    public List<String> getHistoryList() {
        List<String> list = new ArrayList<>();
        // Read from top of stack to bottom
        for (int i = searchStack.size() - 1; i >= 0; i--) {
            list.add(searchStack.get(i));
        }
        return list;
    }

    /**
     * Removes all searches from history.
     * Operation: stack.clear()
     */
    public void clearHistory() {
        searchStack.clear();
        System.out.println("Search history has been cleared.");
    }

    /**
     * Returns the most recent search query without removing it.
     * Operation: peek() -> O(1)
     *
     * @return latest query, or null if empty
     */
    public String peekLatest() {
        if (searchStack.isEmpty()) {
            return null;
        }
        return searchStack.peek();
    }

    /**
     * Checks if history is empty.
     */
    public boolean isEmpty() {
        return searchStack.isEmpty();
    }

    /**
     * Returns total number of searches stored.
     */
    public int size() {
        return searchStack.size();
    }
}
