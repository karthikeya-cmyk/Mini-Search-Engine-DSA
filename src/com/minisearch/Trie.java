package com.minisearch;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

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

    public static class TrieSuggestion {
        private final String text;
        private final String displayText;
        private final String category; // "file", "folder", "keyword"
        private final boolean isFileName;
        private final int docCount;
        private final int frequency;
        private final String sampleDoc;

        public TrieSuggestion(String text, String displayText, String category, boolean isFileName, int docCount, int frequency, String sampleDoc) {
            this.text = text;
            this.displayText = (displayText != null && !displayText.isEmpty()) ? displayText : text;
            this.category = category != null ? category : (isFileName ? "file" : "keyword");
            this.isFileName = isFileName;
            this.docCount = docCount;
            this.frequency = frequency;
            this.sampleDoc = sampleDoc != null ? sampleDoc : "";
        }

        public String getText() { return text; }
        public String getDisplayText() { return displayText; }
        public String getCategory() { return category; }
        public boolean isFileName() { return isFileName; }
        public int getDocCount() { return docCount; }
        public int getFrequency() { return frequency; }
        public String getSampleDoc() { return sampleDoc; }
    }

    private static class TrieCandidate {
        final String word;
        final TrieNode node;

        TrieCandidate(String word, TrieNode node) {
            this.word = word;
            this.node = node;
        }
    }

    // Insert a word into the Trie (standard backward-compatible method)
    public void insert(String word) {
        insert(word, 1, 1, false, "keyword", word, "");
    }

    // Insert with rich storage / document metadata
    public void insert(String word, int freq, int docCount, boolean isFileName, String category, String displayWord, String sampleDoc) {
        if (word == null || word.isEmpty()) {
            return;
        }

        String lowerWord = word.toLowerCase().trim();
        if (lowerWord.isEmpty()) return;

        TrieNode current = root;

        for (char ch : lowerWord.toCharArray()) {
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

        current.frequency += Math.max(1, freq);
        current.docCount = Math.max(current.docCount, docCount);
        if (isFileName) {
            current.isFileName = true;
            current.category = category != null ? category : "file";
        }
        if (displayWord != null && !displayWord.isEmpty()) {
            if (current.displayWord == null || current.displayWord.isEmpty() || isFileName) {
                current.displayWord = displayWord;
            }
        }
        if (sampleDoc != null && !sampleDoc.isEmpty()) {
            current.sampleDoc = sampleDoc;
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

    // Get all words beginning with a prefix (ranked by storage file priority and frequency)
    public List<String> autoComplete(String prefix) {
        List<TrieSuggestion> details = autoCompleteDetails(prefix);
        List<String> results = new ArrayList<>();
        for (TrieSuggestion ts : details) {
            results.add(ts.getDisplayText());
        }
        return results;
    }

    // Rich autocomplete returning categorized, ranked suggestions
    public List<TrieSuggestion> autoCompleteDetails(String prefix) {
        List<TrieSuggestion> results = new ArrayList<>();

        if (prefix == null || prefix.isEmpty()) {
            return results;
        }

        String lowerPrefix = prefix.toLowerCase().trim();
        TrieNode node = findNode(lowerPrefix);

        if (node == null) {
            return results;
        }

        List<TrieCandidate> candidates = new ArrayList<>();
        collectCandidates(node, lowerPrefix, candidates);

        // Intelligently rank candidates:
        // 1. Files / Folders in storage come FIRST (what is in storage is prioritized!)
        // 2. Exact match to prefix
        // 3. Higher docCount (keywords that appear across multiple files)
        // 4. Higher frequency
        // 5. Closer in length to prefix
        // 6. Alphabetical
        candidates.sort((a, b) -> {
            boolean aIsFile = a.node.isFileName();
            boolean bIsFile = b.node.isFileName();
            if (aIsFile != bIsFile) {
                return aIsFile ? -1 : 1;
            }

            boolean aExact = a.word.equalsIgnoreCase(lowerPrefix);
            boolean bExact = b.word.equalsIgnoreCase(lowerPrefix);
            if (aExact != bExact) {
                return aExact ? -1 : 1;
            }

            if (a.node.getDocCount() != b.node.getDocCount()) {
                return Integer.compare(b.node.getDocCount(), a.node.getDocCount());
            }

            if (a.node.getFrequency() != b.node.getFrequency()) {
                return Integer.compare(b.node.getFrequency(), a.node.getFrequency());
            }

            if (a.word.length() != b.word.length()) {
                return Integer.compare(a.word.length(), b.word.length());
            }

            return a.word.compareToIgnoreCase(b.word);
        });

        // Limit to top 10 most relevant suggestions
        int limit = Math.min(candidates.size(), 10);
        Set<String> seen = new HashSet<>();

        for (int i = 0; i < candidates.size() && results.size() < limit; i++) {
            TrieCandidate tc = candidates.get(i);
            String display = tc.node.getDisplayWord();
            if (display.isEmpty()) {
                display = tc.word;
            }

            // Deduplicate case-insensitively
            if (seen.add(display.toLowerCase())) {
                results.add(new TrieSuggestion(
                        tc.word,
                        display,
                        tc.node.getCategory(),
                        tc.node.isFileName(),
                        tc.node.getDocCount(),
                        tc.node.getFrequency(),
                        tc.node.getSampleDoc()
                ));
            }
        }

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

    private void collectCandidates(
            TrieNode node,
            String currentWord,
            List<TrieCandidate> results) {

        if (node.isEndOfWord) {
            results.add(new TrieCandidate(currentWord, node));
        }

        for (char ch : node.children.keySet()) {
            collectCandidates(
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