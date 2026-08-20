package com.minisearch;

import java.util.ArrayList;
import java.util.List;

public class Trie {

    private final TrieNode root;

    public Trie() {
        root = new TrieNode();
    }

    // Insert a word into the Trie
    public void insert(String word) {

        if (word == null || word.isEmpty()) {
            return;
        }

        word = word.toLowerCase();

        TrieNode current = root;

        for (char ch : word.toCharArray()) {

            current.children.putIfAbsent(
                    ch,
                    new TrieNode()
            );

            current = current.children.get(ch);
        }

        current.isEndOfWord = true;
    }

    // Check whether an exact word exists
    public boolean search(String word) {

        if (word == null || word.isEmpty()) {
            return false;
        }

        TrieNode node = findNode(word.toLowerCase());

        return node != null && node.isEndOfWord;
    }

    // Check whether a prefix exists
    public boolean startsWith(String prefix) {

        if (prefix == null || prefix.isEmpty()) {
            return false;
        }

        return findNode(prefix.toLowerCase()) != null;
    }

    // Get all words beginning with a prefix
    public List<String> autoComplete(String prefix) {

        List<String> results = new ArrayList<>();

        if (prefix == null || prefix.isEmpty()) {
            return results;
        }

        prefix = prefix.toLowerCase();

        TrieNode node = findNode(prefix);

        if (node == null) {
            return results;
        }

        collectWords(node, prefix, results);

        return results;
    }

    private TrieNode findNode(String word) {

        TrieNode current = root;

        for (char ch : word.toCharArray()) {

            if (!current.children.containsKey(ch)) {
                return null;
            }

            current = current.children.get(ch);
        }

        return current;
    }

    private void collectWords(
            TrieNode node,
            String currentWord,
            List<String> results) {

        if (node.isEndOfWord) {
            results.add(currentWord);
        }

        for (char ch : node.children.keySet()) {

            collectWords(
                    node.children.get(ch),
                    currentWord + ch,
                    results
            );
        }
    }
}