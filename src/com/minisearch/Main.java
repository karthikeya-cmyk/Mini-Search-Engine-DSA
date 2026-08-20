package com.minisearch;

import java.util.List;

public class Main {

    public static void main(String[] args) {

        // Create indexer
        Indexer indexer = new Indexer();

        // Read and index documents
        indexer.indexDocuments("documents");

        // Create search engine
        SearchEngine searchEngine =
                new SearchEngine(indexer);

        System.out.println(
                "================================="
        );

        System.out.println(
                "      MINI SEARCH ENGINE"
        );

        System.out.println(
                "================================="
        );

        System.out.println(
                "Documents indexed: "
                        + searchEngine.getDocumentCount()
        );

        System.out.println(
                "Unique words indexed: "
                        + searchEngine.getUniqueWordCount()
        );

        System.out.println("\nSearch: java");

        List<SearchResult> results =
                searchEngine.search("java");

        for (SearchResult result : results) {
            System.out.println(result);
        }

        System.out.println("\nSearch: trie");

        results = searchEngine.search("trie");

        for (SearchResult result : results) {
            System.out.println(result);
        }

        System.out.println("\nAuto-complete: ja");

        List<String> suggestions =
                searchEngine.autoComplete("ja");

        for (String suggestion : suggestions) {
            System.out.println("- " + suggestion);
        }

        System.out.println("\nAuto-complete: tr");

        suggestions =
                searchEngine.autoComplete("tr");

        for (String suggestion : suggestions) {
            System.out.println("- " + suggestion);
        }
    }
}
