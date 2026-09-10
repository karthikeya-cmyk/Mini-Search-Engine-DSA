package com.minisearch;

import java.util.ArrayList;
import java.util.List;

/**
 * Comprehensive Automated Test Suite for Mini Search Engine (Member 1 + Member 2).
 * Verifies:
 * 1. Ranking (PriorityQueue / Max-Heap, scores, tie-breaking, empty input)
 * 2. History (Stack / LIFO, ordering, clear, empty handling)
 * 3. Queue (FIFO, bounded capacity eviction, clear)
 * 4. Autocomplete (Trie prefix matching)
 * 5. End-to-End Integration (SearchEngine -> Ranker -> History)
 */
public class SearchEngineTest {

    private static int testsPassed = 0;
    private static int testsFailed = 0;

    public static void main(String[] args) {
        System.out.println("=================================================");
        System.out.println("RUNNING MINI SEARCH ENGINE AUTOMATED TESTS");
        System.out.println("=================================================");

        testRankingSingleMatch();
        testRankingMultipleMatchesAndScores();
        testRankingEqualScoresTieBreaking();
        testRankingEmptyResults();
        testHistoryLIFO();
        testHistoryClearAndEmpty();
        testQueueFIFOAndEviction();
        testAutocomplete();
        testEndToEndSearchAndRank();

        System.out.println("=================================================");
        System.out.printf("TEST SUMMARY: %d Passed, %d Failed%n", testsPassed, testsFailed);
        System.out.println("=================================================");

        if (testsFailed > 0) {
            System.err.println("SOME TESTS FAILED!");
            System.exit(1);
        } else {
            System.out.println("ALL TESTS PASSED SUCCESSFULLY!");
        }
    }

    private static void assertTrue(String testName, boolean condition) {
        if (condition) {
            System.out.println("[PASS] " + testName);
            testsPassed++;
        } else {
            System.err.println("[FAIL] " + testName);
            testsFailed++;
        }
    }

    private static void assertEquals(String testName, Object expected, Object actual) {
        boolean match = (expected == null && actual == null) || (expected != null && expected.equals(actual));
        if (match) {
            System.out.println("[PASS] " + testName);
            testsPassed++;
        } else {
            System.err.println("[FAIL] " + testName + " - Expected: " + expected + ", Got: " + actual);
            testsFailed++;
        }
    }

    // --- 1. RANKING TESTS (PriorityQueue / Max-Heap) ---

    private static void testRankingSingleMatch() {
        Ranker ranker = new Ranker();
        Document doc1 = new Document("doc1.txt", "java is great");
        List<SearchResult> unranked = new ArrayList<>();
        unranked.add(new SearchResult(doc1, 5));

        List<SearchResult> ranked = ranker.rank(unranked);
        assertEquals("testRankingSingleMatch size", 1, ranked.size());
        assertEquals("testRankingSingleMatch file", "doc1.txt", ranked.get(0).getDocument().getFileName());
        assertEquals("testRankingSingleMatch score", 5, ranked.get(0).getScore());
    }

    private static void testRankingMultipleMatchesAndScores() {
        Ranker ranker = new Ranker();
        Document doc1 = new Document("alpha.txt", "content");
        Document doc2 = new Document("beta.txt", "content");
        Document doc3 = new Document("gamma.txt", "content");

        // Intentionally provide out-of-order frequencies
        List<SearchResult> unranked = new ArrayList<>();
        unranked.add(new SearchResult(doc1, 2));  // score 2
        unranked.add(new SearchResult(doc2, 10)); // score 10 (highest)
        unranked.add(new SearchResult(doc3, 6));  // score 6  (middle)

        List<SearchResult> ranked = ranker.rank(unranked);

        assertEquals("testRankingMultipleMatchesAndScores size", 3, ranked.size());
        // Highest score (10) must be first (Max-Heap)
        assertEquals("1st should be beta.txt (score 10)", "beta.txt", ranked.get(0).getDocument().getFileName());
        assertEquals("1st score should be 10", 10, ranked.get(0).getScore());

        // 2nd score (6)
        assertEquals("2nd should be gamma.txt (score 6)", "gamma.txt", ranked.get(1).getDocument().getFileName());
        assertEquals("2nd score should be 6", 6, ranked.get(1).getScore());

        // 3rd score (2)
        assertEquals("3rd should be alpha.txt (score 2)", "alpha.txt", ranked.get(2).getDocument().getFileName());
        assertEquals("3rd score should be 2", 2, ranked.get(2).getScore());
    }

    private static void testRankingEqualScoresTieBreaking() {
        Ranker ranker = new Ranker();
        Document docZ = new Document("zebra.txt", "content");
        Document docA = new Document("apple.txt", "content");
        Document docM = new Document("mango.txt", "content");

        // Equal scores = 5 for all three
        List<SearchResult> unranked = new ArrayList<>();
        unranked.add(new SearchResult(docZ, 5));
        unranked.add(new SearchResult(docA, 5));
        unranked.add(new SearchResult(docM, 5));

        List<SearchResult> ranked = ranker.rank(unranked);

        assertEquals("Equal scores size", 3, ranked.size());
        // Tie-breaker should sort alphabetically: apple.txt, mango.txt, zebra.txt
        assertEquals("Tie-breaker 1st should be apple.txt", "apple.txt", ranked.get(0).getDocument().getFileName());
        assertEquals("Tie-breaker 2nd should be mango.txt", "mango.txt", ranked.get(1).getDocument().getFileName());
        assertEquals("Tie-breaker 3rd should be zebra.txt", "zebra.txt", ranked.get(2).getDocument().getFileName());
    }

    private static void testRankingEmptyResults() {
        Ranker ranker = new Ranker();
        List<SearchResult> emptyList = new ArrayList<>();
        List<SearchResult> ranked = ranker.rank(emptyList);
        assertTrue("testRankingEmptyResults empty list", ranked.isEmpty());

        List<SearchResult> rankedNull = ranker.rank(null);
        assertTrue("testRankingEmptyResults null list", rankedNull.isEmpty());
    }

    // --- 2. HISTORY TESTS (Stack / LIFO) ---

    private static void testHistoryLIFO() {
        History history = new History();
        history.addSearch("algorithms");
        history.addSearch("binary tree");
        history.addSearch("heap sort");

        List<String> list = history.getHistoryList();
        assertEquals("History count should be 3", 3, list.size());
        // LIFO order: latest search "heap sort" must be first
        assertEquals("1st history item (latest)", "heap sort", list.get(0));
        assertEquals("2nd history item", "binary tree", list.get(1));
        assertEquals("3rd history item (oldest)", "algorithms", list.get(2));
        assertEquals("peekLatest returns most recent", "heap sort", history.peekLatest());
    }

    private static void testHistoryClearAndEmpty() {
        History history = new History();
        assertTrue("Newly created history should be empty", history.isEmpty());
        assertEquals("peekLatest on empty should be null", null, history.peekLatest());

        history.addSearch("java");
        assertTrue("History after add is not empty", !history.isEmpty());

        history.clearHistory();
        assertTrue("History after clear is empty", history.isEmpty());
        assertEquals("History size after clear is 0", 0, history.size());
    }

    // --- 3. QUEUE TESTS (Queue / FIFO) ---

    private static void testQueueFIFOAndEviction() {
        RecentSearchQueue queue = new RecentSearchQueue(3); // capacity 3
        assertTrue("New queue is empty", queue.isEmpty());

        queue.addSearch("first");
        queue.addSearch("second");
        queue.addSearch("third");

        List<String> list = queue.getRecentSearches();
        assertEquals("Queue size should be 3", 3, list.size());
        // FIFO order: oldest "first" is index 0, newest "third" is index 2
        assertEquals("FIFO 1st element", "first", list.get(0));
        assertEquals("FIFO 2nd element", "second", list.get(1));
        assertEquals("FIFO 3rd element", "third", list.get(2));

        // Now add a 4th element: "fourth". "first" should be evicted
        queue.addSearch("fourth");
        List<String> evictedList = queue.getRecentSearches();
        assertEquals("Queue size remains at capacity 3", 3, evictedList.size());
        assertEquals("Oldest element after eviction should be 'second'", "second", evictedList.get(0));
        assertEquals("Middle element should be 'third'", "third", evictedList.get(1));
        assertEquals("Newest element should be 'fourth'", "fourth", evictedList.get(2));

        queue.clear();
        assertTrue("Queue is empty after clear", queue.isEmpty());
    }

    // --- 4. AUTOCOMPLETE TESTS (Member 1 Trie) ---

    private static void testAutocomplete() {
        Trie trie = new Trie();
        trie.insert("program");
        trie.insert("programming");
        trie.insert("project");
        trie.insert("java");

        List<String> suggestions = trie.autoComplete("pro");
        assertEquals("Prefix 'pro' count", 3, suggestions.size());
        assertTrue("Suggestions contain 'program'", suggestions.contains("program"));
        assertTrue("Suggestions contain 'programming'", suggestions.contains("programming"));
        assertTrue("Suggestions contain 'project'", suggestions.contains("project"));

        List<String> emptySuggestions = trie.autoComplete("xyz");
        assertTrue("Non-existent prefix returns empty", emptySuggestions.isEmpty());
    }

    // --- 5. END-TO-END INTEGRATION TEST ---

    private static void testEndToEndSearchAndRank() {
        Indexer indexer = new Indexer();
        indexer.indexDocuments("documents");

        SearchEngine searchEngine = new SearchEngine(indexer);
        Ranker ranker = new Ranker();
        History history = new History();

        // 1. Search for "java"
        List<SearchResult> unranked = searchEngine.search("java");
        assertTrue("Should find matching documents for 'java'", !unranked.isEmpty());

        List<SearchResult> ranked = ranker.rank(unranked);
        assertTrue("Ranked results should not be empty", !ranked.isEmpty());
        // book1.txt has 3 occurrences of java
        assertEquals("Top result for java should be book1.txt", "book1.txt", ranked.get(0).getDocument().getFileName());
        assertEquals("Score for book1.txt should be 3", 3, ranked.get(0).getScore());

        history.addSearch("java");
        assertEquals("History records search", "java", history.peekLatest());

        // 2. Search for nonexistent term
        List<SearchResult> none = searchEngine.search("nonexistentword123");
        List<SearchResult> rankedNone = ranker.rank(none);
        assertTrue("Nonexistent search returns empty ranked list", rankedNone.isEmpty());

        // 3. Search for empty term
        List<SearchResult> empty = searchEngine.search("");
        List<SearchResult> rankedEmpty = ranker.rank(empty);
        assertTrue("Empty search returns empty ranked list", rankedEmpty.isEmpty());
    }
}
