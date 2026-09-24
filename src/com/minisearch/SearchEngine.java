package com.minisearch;

import java.util.*;

public class SearchEngine {

    private final Indexer indexer;

    public SearchEngine(Indexer indexer) {
        this.indexer = indexer;
    }

    /**
     * Searches across all indexed documents.
     * Combines Inverted Index O(1) lookups with comprehensive content & filename
     * substring matching so that identifiers, camelCase, partial words, and multi-word
     * phrases are always 100% reliably matched without missing any valid files.
     */
    public List<SearchResult> search(String query) {
        List<SearchResult> results = new ArrayList<>();

        if (query == null || query.isBlank()) {
            return results;
        }

        String rawLower = query.toLowerCase().trim();
        Map<String, List<Document>> index = indexer.getInvertedIndex();
        List<Document> allDocs = indexer.getDocuments();

        // Map of document to calculated relevance score
        Map<Document, Integer> docScoreMap = new LinkedHashMap<>();

        // 1. Inverted Index Lookup for tokens
        String[] tokens = rawLower.split("[^a-z0-9]+");
        List<String> validTokens = new ArrayList<>();
        for (String t : tokens) {
            if (!t.isEmpty()) {
                validTokens.add(t);
            }
        }

        for (String token : validTokens) {
            List<Document> matched = index.getOrDefault(token, Collections.emptyList());
            for (Document doc : matched) {
                int freq = doc.getKeywordFrequency(token);
                if (freq <= 0) freq = 1;
                docScoreMap.put(doc, docScoreMap.getOrDefault(doc, 0) + freq);
            }
        }

        // 2. Comprehensive Substring & Phrase Matching across all indexed documents
        // Catches partial words, code identifiers, and filenames (e.g. "result" in "SearchResult", "book" in "book1.txt")
        for (Document doc : allDocs) {
            int score = countOccurrences(doc.getContent().toLowerCase(), rawLower);

            // Check filename matches (give filename matches bonus weight)
            int nameMatches = countOccurrences(doc.getFileName().toLowerCase(), rawLower);
            if (nameMatches > 0) {
                score += nameMatches * 3;
            }

            if (score > 0) {
                // Take maximum of inverted index score or substring score
                int existing = docScoreMap.getOrDefault(doc, 0);
                docScoreMap.put(doc, Math.max(existing, score));
            }
        }

        for (Map.Entry<Document, Integer> entry : docScoreMap.entrySet()) {
            results.add(new SearchResult(entry.getKey(), entry.getValue()));
        }

        return results;
    }

    private int countOccurrences(String text, String sub) {
        if (text == null || sub == null || sub.isEmpty()) return 0;
        int count = 0;
        int idx = 0;
        while ((idx = text.indexOf(sub, idx)) != -1) {
            count++;
            idx += Math.max(1, sub.length());
        }
        return count;
    }

    // Auto-complete (powered by Trie)
    public List<String> autoComplete(String prefix) {
        return indexer
                .getTrie()
                .autoComplete(prefix);
    }

    // Number of indexed documents
    public int getDocumentCount() {
        return indexer
                .getDocuments()
                .size();
    }

    // Number of unique indexed words
    public int getUniqueWordCount() {
        return indexer
                .getInvertedIndex()
                .size();
    }

    public Indexer getIndexer() {
        return indexer;
    }
}