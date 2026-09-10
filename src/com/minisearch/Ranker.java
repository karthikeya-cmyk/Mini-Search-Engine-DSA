package com.minisearch;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.PriorityQueue;

/**
 * ============================================================================
 * MEMBER 2 RESPONSIBILITY: Relevance Ranking using PriorityQueue (Max-Heap)
 * ============================================================================
 *
 * DSA CONCEPT: HEAP / PRIORITY QUEUE
 * ----------------------------------
 * A PriorityQueue in Java is an implementation of a Binary Heap. By default,
 * Java's PriorityQueue is a Min-Heap (smallest element at the root).
 *
 * To rank search results by relevance (highest score first), we configure a
 * custom Comparator that reverses the natural ordering, effectively turning it
 * into a MAX-HEAP where the document with the highest relevance score sits at
 * the root.
 *
 * VIVA EXPLANATION POINTS:
 * ------------------------
 * 1. Why PriorityQueue instead of sorting an ArrayList?
 *    - A heap maintains the partial ordering property (Heap Invariant) where
 *      the maximum element is always at the root in O(1) peek time.
 *    - If we only need the top-k results out of N documents, a heap allows us
 *      to extract top-k in O(k log N) time without fully sorting all N items.
 *
 * 2. How the Comparator works:
 *    - Primary criterion: `b.getScore() - a.getScore()` (descending order).
 *      If document B has higher frequency/score than document A, B is given
 *      higher priority.
 *    - Secondary criterion (Tie-breaker): If two documents have identical
 *      scores, we compare file names alphabetically (`a.getFileName().compareTo(b.getFileName())`).
 *      This guarantees consistent and deterministic output.
 *
 * 3. Time Complexity:
 *    - Heap construction (inserting N elements): O(N log N)
 *    - Extracting root (poll): O(log N) per element due to siftDown operation
 *    - Extracting all N sorted elements: O(N log N)
 *    - Extracting top K elements: O(K log N)
 *    - Peek top element: O(1)
 *
 * 4. Space Complexity:
 *    - O(N) auxiliary space to store elements inside the PriorityQueue.
 */
public class Ranker {

    // Comparator defining Max-Heap ordering with alphabetical tie-breaking
    private final Comparator<SearchResult> relevanceComparator;

    public Ranker() {
        this.relevanceComparator = (a, b) -> {
            // 1. Primary: Compare relevance scores (frequency) in descending order
            int scoreComparison = Integer.compare(b.getScore(), a.getScore());
            if (scoreComparison != 0) {
                return scoreComparison;
            }

            // 2. Secondary: Tie-breaker by document name in ascending alphabetical order
            String nameA = (a.getDocument() != null) ? a.getDocument().getFileName() : "";
            String nameB = (b.getDocument() != null) ? b.getDocument().getFileName() : "";
            return nameA.compareToIgnoreCase(nameB);
        };
    }

    /**
     * Ranks the given unranked search results in descending order of relevance.
     * Uses a PriorityQueue (Max-Heap) to extract elements in order.
     *
     * @param unrankedResults list of search results from Member 1's SearchEngine
     * @return sorted list of SearchResults from highest score to lowest score
     */
    public List<SearchResult> rank(List<SearchResult> unrankedResults) {
        List<SearchResult> rankedList = new ArrayList<>();

        if (unrankedResults == null || unrankedResults.isEmpty()) {
            return rankedList;
        }

        // Initialize PriorityQueue with custom Max-Heap comparator
        // Initial capacity is sized to unrankedResults.size()
        PriorityQueue<SearchResult> maxHeap =
                new PriorityQueue<>(unrankedResults.size(), relevanceComparator);

        // Step 1: Insert all results into the Max-Heap
        // Each insertion takes O(log N) time to maintain the heap property
        for (SearchResult result : unrankedResults) {
            if (result != null) {
                maxHeap.offer(result);
            }
        }

        // Step 2: Continuously poll (extract-max) the root element
        // poll() removes the highest priority item in O(log N) time
        while (!maxHeap.isEmpty()) {
            rankedList.add(maxHeap.poll());
        }

        return rankedList;
    }

    /**
     * Extracts only the top-K highest ranked search results.
     * Demonstrates the efficiency of Heap: O(K log N) instead of full O(N log N).
     *
     * @param unrankedResults list of unranked search results
     * @param k number of top results to retrieve
     * @return top-k search results
     */
    public List<SearchResult> rankTopK(List<SearchResult> unrankedResults, int k) {
        List<SearchResult> topKList = new ArrayList<>();

        if (unrankedResults == null || unrankedResults.isEmpty() || k <= 0) {
            return topKList;
        }

        PriorityQueue<SearchResult> maxHeap =
                new PriorityQueue<>(unrankedResults.size(), relevanceComparator);

        for (SearchResult result : unrankedResults) {
            if (result != null) {
                maxHeap.offer(result);
            }
        }

        int count = 0;
        while (!maxHeap.isEmpty() && count < k) {
            topKList.add(maxHeap.poll());
            count++;
        }

        return topKList;
    }

    /**
     * Returns the configured comparator (useful for verification and testing).
     */
    public Comparator<SearchResult> getRelevanceComparator() {
        return relevanceComparator;
    }
}
