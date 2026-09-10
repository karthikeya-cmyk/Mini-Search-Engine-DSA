package com.minisearch;

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;

/**
 * ============================================================================
 * MEMBER 2 RESPONSIBILITY: Recent Searches Queue (FIFO)
 * ============================================================================
 *
 * DSA CONCEPT: QUEUE & FIFO PRINCIPLE
 * -----------------------------------
 * A Queue is a linear collection adhering to the FIFO (First-In, First-Out) principle.
 * Elements are inserted at the tail (rear) and retrieved/removed from the head (front).
 *
 * In this search engine, a bounded Queue maintains the N most recent searches
 * (e.g., maximum capacity of 5). When a 6th search arrives, the oldest search
 * is evicted from the head of the queue, making room for the new query at the tail.
 *
 * VIVA EXPLANATION: CONTRASTING STACK (LIFO) VS QUEUE (FIFO)
 * -----------------------------------------------------------
 * - STACK (History.java): LIFO (Last-In, First-Out). Unbounded storage of all
 *   searches, allowing inspection of the most recent item first.
 * - QUEUE (RecentSearchQueue.java): FIFO (First-In, First-Out). Fixed-capacity
 *   sliding buffer where the oldest entry is removed first upon capacity overflow.
 *
 * Time Complexity:
 * - offer() [enqueue at tail]: O(1)
 * - poll()  [dequeue at head]: O(1)
 * - peek()  [inspect head]:   O(1)
 *
 * Space Complexity:
 * - O(C) where C is the fixed capacity (e.g., 5 items maximum).
 */
public class RecentSearchQueue {

    private final Queue<String> queue;
    private final int maxCapacity;

    public RecentSearchQueue(int maxCapacity) {
        this.maxCapacity = (maxCapacity > 0) ? maxCapacity : 5;
        this.queue = new LinkedList<>();
    }

    public RecentSearchQueue() {
        this(5); // Default capacity of 5 recent searches
    }

    /**
     * Adds a query to the rear of the FIFO queue.
     * If the queue is at capacity, the oldest query at the front is evicted (poll).
     *
     * @param query search query
     */
    public void addSearch(String query) {
        if (query == null || query.isBlank()) {
            return;
        }

        query = query.trim();

        // If capacity reached, remove the oldest search (FIFO eviction)
        if (queue.size() >= maxCapacity) {
            queue.poll(); // Evicts oldest query from the head in O(1)
        }

        // Insert new query at the tail in O(1)
        queue.offer(query);
    }

    /**
     * Returns the recent searches in FIFO arrival order (oldest to newest).
     */
    public List<String> getRecentSearches() {
        return new ArrayList<>(queue);
    }

    /**
     * Displays the recent searches queue to the console.
     */
    public void showRecentSearches() {
        if (queue.isEmpty()) {
            System.out.println("Recent searches queue is empty.");
            return;
        }

        System.out.println("\n--- Recent Searches Queue (FIFO Order, Max " + maxCapacity + ") ---");
        int index = 1;
        for (String q : queue) {
            System.out.println(index++ + ". " + q);
        }
        System.out.println("---------------------------------------------------------");
    }

    /**
     * Clears all items in the queue.
     */
    public void clear() {
        queue.clear();
    }

    public boolean isEmpty() {
        return queue.isEmpty();
    }

    public int size() {
        return queue.size();
    }

    public int getMaxCapacity() {
        return maxCapacity;
    }
}
