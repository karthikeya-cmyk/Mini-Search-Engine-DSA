package com.minisearch;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class Trie {

    private final TrieNode root;
    private int nodeCount = 1;
    private int wordCount = 0;

    public Trie() {
        root = new TrieNode();
    }

    public void clear() {
        root.children.clear();
        root.isEndOfWord = false;
        nodeCount = 1;
        wordCount = 0;
    }

    public int getNodeCount() {
        return nodeCount;
    }

    public int getWordCount() {
        return wordCount;
    }

    public TrieNode getRoot() {
        return root;
    }

    // Insert a word into the Trie
    public void insert(String word) {

        if (word == null || word.isEmpty()) {
            return;
        }

        word = word.toLowerCase();

        TrieNode current = root;

        for (char ch : word.toCharArray()) {

            if (!current.children.containsKey(ch)) {
                current.children.put(ch, new TrieNode());
                nodeCount++;
            }

            current = current.children.get(ch);
        }

        if (!current.isEndOfWord) {
            current.isEndOfWord = true;
            wordCount++;
        }
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

    public Map<String, Object> exportTree(String prefix, int maxDepth) {
        Map<String, Object> result = new LinkedHashMap<>();
        int depthLimit = (maxDepth > 0 && maxDepth <= 6) ? maxDepth : 3;

        if (prefix == null || prefix.isBlank()) {
            result.put("name", "ROOT");
            result.put("prefix", "");
            result.put("isEnd", false);
            result.put("children", exportChildren(root, "", 0, depthLimit));
            return result;
        }

        String lower = prefix.toLowerCase();
        TrieNode startNode = findNode(lower);
        if (startNode == null) {
            result.put("name", lower);
            result.put("prefix", lower);
            result.put("isEnd", false);
            result.put("notFound", true);
            result.put("children", Collections.emptyList());
            return result;
        }

        result.put("name", lower);
        result.put("prefix", lower);
        result.put("isEnd", startNode.isEndOfWord);
        result.put("children", exportChildren(startNode, lower, 0, depthLimit));
        return result;
    }

    private List<Map<String, Object>> exportChildren(TrieNode node, String currentPrefix, int currentDepth, int maxDepth) {
        List<Map<String, Object>> list = new ArrayList<>();
        if (node == null || currentDepth >= maxDepth) return list;

        List<Character> sortedKeys = new ArrayList<>(node.children.keySet());
        Collections.sort(sortedKeys);

        int count = 0;
        for (char ch : sortedKeys) {
            if (++count > 25) break; // Limit branch fanout for clean rendering
            TrieNode child = node.children.get(ch);
            Map<String, Object> childMap = new LinkedHashMap<>();
            String nextPrefix = currentPrefix + ch;
            childMap.put("name", String.valueOf(ch));
            childMap.put("prefix", nextPrefix);
            childMap.put("isEnd", child.isEndOfWord);
            childMap.put("children", exportChildren(child, nextPrefix, currentDepth + 1, maxDepth));
            list.add(childMap);
        }
        return list;
    }
}