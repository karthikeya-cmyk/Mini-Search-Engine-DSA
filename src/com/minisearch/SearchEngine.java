package com.minisearch;

import java.util.*;

public class SearchEngine {

    private final Indexer indexer;

    public SearchEngine(Indexer indexer) {
        this.indexer = indexer;
    }

    // Exact keyword search
    public List<SearchResult> search(String keyword) {

        List<SearchResult> results = new ArrayList<>();

        if (keyword == null || keyword.isBlank()) {
            return results;
        }

        keyword = keyword.toLowerCase().trim();

        Map<String, List<Document>> index =
                indexer.getInvertedIndex();

        List<Document> documents =
                index.getOrDefault(
                        keyword,
                        Collections.emptyList()
                );

        for (Document document : documents) {

            int frequency =
                    document.getKeywordFrequency(keyword);

            results.add(
                    new SearchResult(
                            document,
                            frequency
                    )
            );
        }

        return results;
    }

    // Auto-complete
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
}