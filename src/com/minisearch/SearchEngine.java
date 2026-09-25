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

        // 2. Comprehensive Filename Match & Content Word-Boundary Matching
        for (Document doc : allDocs) {
            String lowerFileName = doc.getFileName().toLowerCase();
            String lowerFilePath = doc.getFilePath().toLowerCase();
            int fileBonus = 0;

            // Filename / folder match boosts (storage items matching query)
            if (lowerFileName.equals(rawLower)) {
                fileBonus += 100;
            } else if (lowerFileName.startsWith(rawLower)) {
                fileBonus += 50;
            } else if (lowerFileName.contains(rawLower)) {
                fileBonus += 25;
            } else if (lowerFilePath.contains(rawLower)) {
                fileBonus += 10;
            }

            int existingScore = docScoreMap.getOrDefault(doc, 0);
            int calculatedScore = existingScore;

            if (calculatedScore == 0) {
                // If not found in inverted index tokens, check word prefixes or substrings
                if (rawLower.length() <= 3) {
                    // Short query (<= 3 chars): ONLY match at word boundaries (e.g. \bds\w*),
                    // preventing false positives like "words" or "methods" matching "ds"
                    calculatedScore = countWordPrefixMatches(doc.getContent().toLowerCase(), rawLower);
                } else {
                    calculatedScore = countOccurrences(doc.getContent().toLowerCase(), rawLower);
                }
            }

            int finalScore = calculatedScore + fileBonus;
            if (finalScore > 0) {
                docScoreMap.put(doc, finalScore);
            }
        }

        for (Map.Entry<Document, Integer> entry : docScoreMap.entrySet()) {
            results.add(new SearchResult(entry.getKey(), entry.getValue()));
        }

        return results;
    }

    private int countWordPrefixMatches(String text, String prefix) {
        if (text == null || prefix == null || prefix.isEmpty()) return 0;
        int count = 0;
        int len = text.length();
        int subLen = prefix.length();

        for (int i = 0; i <= len - subLen; i++) {
            boolean isWordStart = (i == 0) || !Character.isLetterOrDigit(text.charAt(i - 1));
            if (isWordStart && text.regionMatches(true, i, prefix, 0, subLen)) {
                count++;
            }
        }
        return count;
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

    // Rich Auto-complete with storage items and keywords
    public List<Trie.TrieSuggestion> autoCompleteDetails(String prefix) {
        return indexer
                .getTrie()
                .autoCompleteDetails(prefix);
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