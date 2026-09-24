package com.minisearch;

import java.util.HashMap;
import java.util.Map;

public class Document {

    private final String fileName;
    private final String filePath;
    private final String content;
    private final int wordCount;
    private final long fileSize;
    private final long lastModified;

    // Stores how many times each word appears in this document
    private final Map<String, Integer> wordFrequency;

    public Document(String fileName, String content) {
        this(fileName, fileName, content, content != null ? content.getBytes().length : 0, System.currentTimeMillis());
    }

    public Document(String fileName, String filePath, String content, long fileSize, long lastModified) {
        this.fileName = fileName;
        this.filePath = filePath != null ? filePath : fileName;
        this.content = content != null ? content : "";
        this.fileSize = fileSize;
        this.lastModified = lastModified;

        String[] words = this.content.toLowerCase()
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

        // Also index keywords from the file name itself (e.g. "Main.java" -> "main", "java")
        String[] nameParts = fileName.toLowerCase().split("[^a-z0-9]+");
        for (String part : nameParts) {
            if (!part.isEmpty()) {
                // Give filename matches a small bonus frequency
                wordFrequency.put(part, wordFrequency.getOrDefault(part, 0) + 2);
            }
        }
    }

    public String getFileName() {
        return fileName;
    }

    public String getFilePath() {
        return filePath;
    }

    public String getContent() {
        return content;
    }

    public int getWordCount() {
        return wordCount;
    }

    public long getFileSize() {
        return fileSize;
    }

    public long getLastModified() {
        return lastModified;
    }

    public String getExtension() {
        int dotIdx = fileName.lastIndexOf('.');
        if (dotIdx > 0 && dotIdx < fileName.length() - 1) {
            return fileName.substring(dotIdx + 1).toLowerCase();
        }
        return "file";
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