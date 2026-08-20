package com.minisearch;

import java.util.HashMap;
import java.util.Map;

public class Document {

    private final String fileName;
    private final String content;
    private final int wordCount;

    // Stores how many times each word appears in this document
    private final Map<String, Integer> wordFrequency;

    public Document(String fileName, String content) {
        this.fileName = fileName;
        this.content = content;

        String[] words = content.toLowerCase()
                .split("[^a-z0-9]+");

        this.wordCount = words.length;
        this.wordFrequency = new HashMap<>();

        for (String word : words) {
            if (!word.isEmpty()) {
                wordFrequency.put(
                        word,
                        wordFrequency.getOrDefault(word, 0) + 1
                );
            }
        }
    }

    public String getFileName() {
        return fileName;
    }

    public String getContent() {
        return content;
    }

    public int getWordCount() {
        return wordCount;
    }

    public int getKeywordFrequency(String keyword) {
        return wordFrequency.getOrDefault(
                keyword.toLowerCase(), 0
        );
    }

    @Override
    public String toString() {
        return fileName;
    }
}