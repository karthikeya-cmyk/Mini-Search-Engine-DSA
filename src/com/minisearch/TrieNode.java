package com.minisearch;

import java.util.HashMap;
import java.util.Map;

public class TrieNode {

    Map<Character, TrieNode> children;
    boolean isEndOfWord;

    // Metadata for ranking & identifying storage files vs keywords
    int frequency;
    int docCount;
    boolean isFileName;
    String category; // "file", "folder", or "keyword"
    String displayWord; // Preserves proper capitalization / formatting
    String sampleDoc; // Associated document / file path

    public TrieNode() {
        this.children = new HashMap<>();
        this.isEndOfWord = false;
        this.frequency = 0;
        this.docCount = 0;
        this.isFileName = false;
        this.category = "keyword";
        this.displayWord = "";
        this.sampleDoc = "";
    }

    public Map<Character, TrieNode> getChildren() {
        return children;
    }

    public boolean isEndOfWord() {
        return isEndOfWord;
    }

    public void setEndOfWord(boolean endOfWord) {
        this.isEndOfWord = endOfWord;
    }

    public int getFrequency() {
        return frequency;
    }

    public void setFrequency(int frequency) {
        this.frequency = frequency;
    }

    public int getDocCount() {
        return docCount;
    }

    public void setDocCount(int docCount) {
        this.docCount = docCount;
    }

    public boolean isFileName() {
        return isFileName;
    }

    public void setFileName(boolean fileName) {
        isFileName = fileName;
    }

    public String getCategory() {
        return category != null ? category : (isFileName ? "file" : "keyword");
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDisplayWord() {
        return (displayWord != null && !displayWord.isEmpty()) ? displayWord : "";
    }

    public void setDisplayWord(String displayWord) {
        this.displayWord = displayWord;
    }

    public String getSampleDoc() {
        return sampleDoc;
    }

    public void setSampleDoc(String sampleDoc) {
        this.sampleDoc = sampleDoc;
    }
}