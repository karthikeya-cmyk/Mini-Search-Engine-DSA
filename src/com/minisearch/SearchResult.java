package com.minisearch;

public class SearchResult {

    private final Document document;
    private final int frequency;

    public SearchResult(Document document, int frequency) {
        this.document = document;
        this.frequency = frequency;
    }

    public Document getDocument() {
        return document;
    }

    public int getFrequency() {
        return frequency;
    }

    /**
     * Relevance score for this search result.
     * In this engine, score is based on keyword frequency in the document.
     */
    public int getScore() {
        return frequency;
    }

    @Override
    public String toString() {
        return document.getFileName()
                + " | Frequency/Score: "
                + frequency;
    }
}