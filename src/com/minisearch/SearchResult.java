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

    @Override
    public String toString() {
        return document.getFileName()
                + " | Frequency: "
                + frequency;
    }
}