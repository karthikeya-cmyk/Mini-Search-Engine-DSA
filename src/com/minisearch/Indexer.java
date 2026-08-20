package com.minisearch;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;

public class Indexer {

    private final Map<String, List<Document>> invertedIndex;
    private final Trie trie;
    private final List<Document> documents;

    public Indexer() {
        invertedIndex = new HashMap<>();
        trie = new Trie();
        documents = new ArrayList<>();
    }

    // Read all text files from the documents folder
    public void indexDocuments(String folderPath) {

        Path folder = Paths.get(folderPath);

        if (!Files.exists(folder)) {
            System.out.println("Documents folder not found.");
            return;
        }

        try (DirectoryStream<Path> stream =
                     Files.newDirectoryStream(folder, "*.txt")) {

            for (Path path : stream) {

                String content = Files.readString(path);

                Document document =
                        new Document(
                                path.getFileName().toString(),
                                content
                        );

                documents.add(document);

                indexDocument(document);
            }

        } catch (IOException e) {
            System.out.println(
                    "Error reading documents: "
                            + e.getMessage()
            );
        }
    }

    private void indexDocument(Document document) {

        String[] words = document.getContent()
                .toLowerCase()
                .split("[^a-z0-9]+");

        Set<String> wordsInDocument = new HashSet<>();

        for (String word : words) {

            if (word.isEmpty()) {
                continue;
            }

            // Add word to Trie
            trie.insert(word);

            // Avoid adding the same document twice
            // for the same word
            wordsInDocument.add(word);
        }

        // Build inverted index
        for (String word : wordsInDocument) {

            invertedIndex
                    .computeIfAbsent(
                            word,
                            key -> new ArrayList<>()
                    )
                    .add(document);
        }
    }

    public Map<String, List<Document>> getInvertedIndex() {
        return invertedIndex;
    }

    public Trie getTrie() {
        return trie;
    }

    public List<Document> getDocuments() {
        return documents;
    }
}
