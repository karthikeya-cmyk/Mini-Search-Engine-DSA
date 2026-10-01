package com.minisearch;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.awt.Desktop;
import java.io.*;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.Executors;

/**
 * ============================================================================
 * FILE SEARCH ENGINE & SYSTEM FILE MANAGER BRIDGE
 * ============================================================================
 * Provides high-speed in-memory indexing across any disk location,
 * real-time interactive file browsing, and native OS File Explorer integration.
 */
public class WebServer {

    private static final int PORT =
        Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
    private static final String WEB_DIR = "web";

    private final SearchEngine searchEngine;
    private final Indexer indexer;
    private final Ranker ranker;
    private final History history;
    private final RecentSearchQueue recentQueue;

    // Performance telemetry
    private int totalSearches = 0;
    private long totalSearchTimeNs = 0;
    private double lastSearchTimeMs = 0.0;

    public WebServer() {
        this.indexer = new Indexer();
        // Start by indexing demo documents if available, otherwise current working directory
        File demoDir = new File("documents");
        if (demoDir.exists() && demoDir.isDirectory()) {
            this.indexer.indexDocuments(demoDir.getAbsolutePath());
        } else {
            this.indexer.indexDocuments(System.getProperty("user.dir"));
        }

        this.searchEngine = new SearchEngine(indexer);
        this.ranker = new Ranker();
        this.history = new History();
        this.recentQueue = new RecentSearchQueue(5);
    }

    public void start() throws IOException {
        HttpServer server = HttpServer.create(
        new InetSocketAddress("0.0.0.0", PORT), 0
);  
        server.setExecutor(Executors.newFixedThreadPool(16));

        // Core Search & Telemetry
        server.createContext("/api/search", new SearchHandler());
        server.createContext("/api/autocomplete", new AutocompleteHandler());
        server.createContext("/api/history", new HistoryHandler());
        server.createContext("/api/recent", new RecentHandler());
        server.createContext("/api/clear", new ClearHandler());
        server.createContext("/api/stats", new StatsHandler());
        server.createContext("/api/document", new DocumentHandler());

        // File Manager & OS Integration
        server.createContext("/api/fs/locations", new LocationsHandler());
        server.createContext("/api/fs/browse", new BrowseHandler());
        server.createContext("/api/fs/index", new IndexFolderHandler());
        server.createContext("/api/open-file", new OpenFileHandler());
        server.createContext("/api/reveal-folder", new RevealFolderHandler());

        // DSA Visualizers & Structure Telemetry
        server.createContext("/api/dsa/trie", new DsaTrieHandler());
        server.createContext("/api/dsa/inverted-index", new DsaInvertedIndexHandler());
        server.createContext("/api/dsa/heap", new DsaHeapHandler());
        server.createContext("/api/dsa/overview", new DsaOverviewHandler());

        // Static Web UI Handler
        server.createContext("/", new StaticFileHandler());

        server.start();
        System.out.println("=================================================");
        System.out.println("⚡ Mini Search Engine (DSA) Server active on: http://localhost:" + PORT);
        System.out.println("Indexed Directory: " + indexer.getCurrentFolderPath());
        System.out.println("Indexed Files: " + searchEngine.getDocumentCount());
        System.out.println("Unique Indexed Words: " + searchEngine.getUniqueWordCount());
        System.out.println("=================================================");
    }

    public static void main(String[] args) {
        try {
            WebServer webServer = new WebServer();
            webServer.start();
        } catch (Exception e) {
            System.err.println("Failed to start WebServer: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // --- FILE SYSTEM BROWSER & LOCATIONS ---

    private class LocationsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendCors(exchange);
                return;
            }

            String userHome = System.getProperty("user.home");
            String userDir = System.getProperty("user.dir");

            List<LocationItem> locations = new ArrayList<>();

            // 1. Curated Project Demo Documents (3 books)
            File demoDocs = new File("documents");
            if (demoDocs.exists() && demoDocs.isDirectory()) {
                locations.add(new LocationItem("Demo Corpus (./documents)", demoDocs.getAbsolutePath(), "docs"));
            }

            // 2. Project Workspace
            addIfValid(locations, "Project Workspace", userDir, "project");

            // 3. User Directories
            addIfValid(locations, "User Documents", Paths.get(userHome, "Documents").toString(), "folder");
            addIfValid(locations, "Downloads", Paths.get(userHome, "Downloads").toString(), "folder");
            addIfValid(locations, "Desktop", Paths.get(userHome, "Desktop").toString(), "folder");

            // 4. System Drives
            File[] roots = File.listRoots();
            if (roots != null) {
                for (File root : roots) {
                    locations.add(new LocationItem("Drive (" + root.getAbsolutePath() + ")", root.getAbsolutePath(), "drive"));
                }
            }

            StringBuilder json = new StringBuilder();
            json.append("{");
            json.append("\"currentIndexed\":").append(quote(indexer.getCurrentFolderPath())).append(",");
            json.append("\"locations\":[");
            for (int i = 0; i < locations.size(); i++) {
                if (i > 0) json.append(",");
                LocationItem loc = locations.get(i);
                json.append("{");
                json.append("\"name\":").append(quote(loc.name)).append(",");
                json.append("\"path\":").append(quote(loc.path)).append(",");
                json.append("\"type\":").append(quote(loc.type));
                json.append("}");
            }
            json.append("]}");

            sendJson(exchange, json.toString(), 200);
        }

        private void addIfValid(List<LocationItem> list, String name, String pathStr, String type) {
            if (pathStr != null) {
                File f = new File(pathStr);
                if (f.exists()) {
                    list.add(new LocationItem(name, f.getAbsolutePath(), type));
                }
            }
        }
    }

    private static class LocationItem {
        String name;
        String path;
        String type;
        LocationItem(String name, String path, String type) {
            this.name = name;
            this.path = path;
            this.type = type;
        }
    }

    private class BrowseHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendCors(exchange);
                return;
            }

            Map<String, String> params = parseQueryParams(exchange.getRequestURI().getRawQuery());
            String pathParam = params.getOrDefault("path", "").trim();

            File dir;
            if (pathParam.isEmpty()) {
                dir = new File(indexer.getCurrentFolderPath());
            } else {
                dir = new File(pathParam);
            }

            if (!dir.exists() || !dir.isDirectory()) {
                sendJson(exchange, "{\"error\":\"Directory not found: " + quote(dir.getAbsolutePath()) + "\"}", 404);
                return;
            }

            File parent = dir.getParentFile();
            File[] files = dir.listFiles();

            List<FileItem> dirsList = new ArrayList<>();
            List<FileItem> filesList = new ArrayList<>();

            SimpleDateFormat dateFormat = new SimpleDateFormat("MMM dd, yyyy HH:mm");

            if (files != null) {
                for (File f : files) {
                    // Skip hidden files unless desired
                    if (f.isHidden() || f.getName().startsWith(".")) continue;

                    if (f.isDirectory()) {
                        dirsList.add(new FileItem(f.getName(), f.getAbsolutePath(), true, 0, "", dateFormat.format(new Date(f.lastModified())), "dir"));
                    } else {
                        String ext = getFileExtension(f.getName());
                        dirsList.add(new FileItem(f.getName(), f.getAbsolutePath(), false, f.length(), formatBytes(f.length()), dateFormat.format(new Date(f.lastModified())), ext));
                    }
                }
            }

            // Sort: directories first, then alphabetical
            dirsList.sort((a, b) -> {
                if (a.isDir && !b.isDir) return -1;
                if (!a.isDir && b.isDir) return 1;
                return a.name.compareToIgnoreCase(b.name);
            });

            StringBuilder json = new StringBuilder();
            json.append("{");
            json.append("\"currentPath\":").append(quote(dir.getAbsolutePath())).append(",");
            json.append("\"parentPath\":").append(parent != null ? quote(parent.getAbsolutePath()) : "null").append(",");
            json.append("\"isCurrentIndexed\":").append(indexer.getCurrentFolderPath().equalsIgnoreCase(dir.getAbsolutePath())).append(",");
            json.append("\"items\":[");

            for (int i = 0; i < dirsList.size(); i++) {
                if (i > 0) json.append(",");
                FileItem fi = dirsList.get(i);
                json.append("{");
                json.append("\"name\":").append(quote(fi.name)).append(",");
                json.append("\"path\":").append(quote(fi.path)).append(",");
                json.append("\"isDir\":").append(fi.isDir).append(",");
                json.append("\"sizeFormatted\":").append(quote(fi.sizeFormatted)).append(",");
                json.append("\"modified\":").append(quote(fi.modified)).append(",");
                json.append("\"ext\":").append(quote(fi.ext));
                json.append("}");
            }
            json.append("]}");

            sendJson(exchange, json.toString(), 200);
        }
    }

    private static class FileItem {
        String name;
        String path;
        boolean isDir;
        long size;
        String sizeFormatted;
        String modified;
        String ext;

        FileItem(String name, String path, boolean isDir, long size, String sizeFormatted, String modified, String ext) {
            this.name = name;
            this.path = path;
            this.isDir = isDir;
            this.size = size;
            this.sizeFormatted = sizeFormatted;
            this.modified = modified;
            this.ext = ext;
        }
    }

    private class IndexFolderHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendCors(exchange);
                return;
            }

            String body = readBody(exchange);
            String folderPath = extractJsonField(body, "path");

            if (folderPath == null || folderPath.isBlank()) {
                Map<String, String> params = parseQueryParams(exchange.getRequestURI().getRawQuery());
                folderPath = params.getOrDefault("path", "").trim();
            }

            if (folderPath.isEmpty()) {
                sendJson(exchange, "{\"error\":\"Folder path required\"}", 400);
                return;
            }

            File dir = new File(folderPath);
            if (!dir.exists()) {
                sendJson(exchange, "{\"error\":\"Directory not found: " + quote(folderPath) + "\"}", 404);
                return;
            }

            synchronized (WebServer.this) {
                indexer.clear();
                indexer.indexDocuments(dir.getAbsolutePath());
            }

            StringBuilder json = new StringBuilder();
            json.append("{");
            json.append("\"success\":true,");
            json.append("\"folderPath\":").append(quote(indexer.getCurrentFolderPath())).append(",");
            json.append("\"docCount\":").append(searchEngine.getDocumentCount()).append(",");
            json.append("\"wordCount\":").append(searchEngine.getUniqueWordCount());
            json.append("}");

            sendJson(exchange, json.toString(), 200);
        }
    }

    // --- SEARCH & RESULTS ---

    private class SearchHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendCors(exchange);
                return;
            }

            Map<String, String> params = parseQueryParams(exchange.getRequestURI().getRawQuery());
            String query = params.getOrDefault("q", "").trim();

            if (query.isEmpty()) {
                sendJson(exchange, "{\"error\":\"Query parameter 'q' is required\"}", 400);
                return;
            }

            long startNs = System.nanoTime();
            List<SearchResult> rawResults = searchEngine.search(query);
            long afterLookupNs = System.nanoTime();
            List<SearchResult> rankedResults = ranker.rank(rawResults);
            long endNs = System.nanoTime();

            long lookupNs = afterLookupNs - startNs;
            long heapSortNs = endNs - afterLookupNs;
            long durationNs = endNs - startNs;
            double durationMs = durationNs / 1_000_000.0;

            synchronized (WebServer.this) {
                totalSearches++;
                totalSearchTimeNs += durationNs;
                lastSearchTimeMs = durationMs;
                history.addSearch(query);
                recentQueue.addSearch(query);
            }

            SimpleDateFormat dateFormat = new SimpleDateFormat("MMM dd, yyyy HH:mm");

            StringBuilder json = new StringBuilder();
            json.append("{");
            json.append("\"query\":").append(quote(query)).append(",");
            json.append("\"durationNs\":").append(durationNs).append(",");
            json.append("\"durationMs\":").append(String.format(Locale.US, "%.3f", durationMs)).append(",");
            json.append("\"lookupNs\":").append(lookupNs).append(",");
            json.append("\"lookupMs\":").append(String.format(Locale.US, "%.3f", lookupNs / 1_000_000.0)).append(",");
            json.append("\"heapSortNs\":").append(heapSortNs).append(",");
            json.append("\"heapSortMs\":").append(String.format(Locale.US, "%.3f", heapSortNs / 1_000_000.0)).append(",");
            json.append("\"totalMatches\":").append(rankedResults.size()).append(",");
            json.append("\"activeFolder\":").append(quote(indexer.getCurrentFolderPath())).append(",");
            json.append("\"results\":[");

            for (int i = 0; i < rankedResults.size(); i++) {
                if (i > 0) json.append(",");
                SearchResult r = rankedResults.get(i);
                Document doc = r.getDocument();

                json.append("{");
                json.append("\"rank\":").append(i + 1).append(",");
                json.append("\"fileName\":").append(quote(doc.getFileName())).append(",");
                json.append("\"filePath\":").append(quote(doc.getFilePath())).append(",");
                json.append("\"extension\":").append(quote(doc.getExtension())).append(",");
                json.append("\"isDirectory\":").append(doc.isDirectory()).append(",");
                json.append("\"score\":").append(r.getScore()).append(",");
                json.append("\"wordCount\":").append(doc.getWordCount()).append(",");
                json.append("\"fileSizeFormatted\":").append(quote(formatBytes(doc.getFileSize()))).append(",");
                json.append("\"lastModified\":").append(quote(dateFormat.format(new Date(doc.getLastModified())))).append(",");

                // Extract up to 4 matching snippet lines
                json.append("\"snippets\":[");
                List<SnippetLine> snippets = extractSnippets(doc.getContent(), query, 4);
                for (int s = 0; s < snippets.size(); s++) {
                    if (s > 0) json.append(",");
                    SnippetLine sl = snippets.get(s);
                    json.append("{");
                    json.append("\"line\":").append(sl.lineNumber).append(",");
                    json.append("\"text\":").append(quote(sl.text));
                    json.append("}");
                }
                json.append("]");
                json.append("}");
            }
            json.append("]}");

            sendJson(exchange, json.toString(), 200);
        }
    }

    private class AutocompleteHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendCors(exchange);
                return;
            }

            Map<String, String> params = parseQueryParams(exchange.getRequestURI().getRawQuery());
            String prefix = params.getOrDefault("q", "").trim().toLowerCase();

            List<Trie.TrieSuggestion> details = searchEngine.autoCompleteDetails(prefix);
            List<String> suggestions = new ArrayList<>();
            for (Trie.TrieSuggestion item : details) {
                suggestions.add(item.getDisplayText());
            }

            StringBuilder json = new StringBuilder();
            json.append("{");
            json.append("\"prefix\":").append(quote(prefix)).append(",");
            json.append("\"suggestions\":[");
            for (int i = 0; i < suggestions.size(); i++) {
                if (i > 0) json.append(",");
                json.append(quote(suggestions.get(i)));
            }
            json.append("],");
            json.append("\"items\":[");
            for (int i = 0; i < details.size(); i++) {
                if (i > 0) json.append(",");
                Trie.TrieSuggestion item = details.get(i);
                json.append("{");
                json.append("\"text\":").append(quote(item.getText())).append(",");
                json.append("\"displayText\":").append(quote(item.getDisplayText())).append(",");
                json.append("\"category\":").append(quote(item.getCategory())).append(",");
                json.append("\"isFileName\":").append(item.isFileName()).append(",");
                json.append("\"docCount\":").append(item.getDocCount()).append(",");
                json.append("\"frequency\":").append(item.getFrequency()).append(",");
                json.append("\"sampleDoc\":").append(quote(item.getSampleDoc()));
                json.append("}");
            }
            json.append("]}");

            sendJson(exchange, json.toString(), 200);
        }
    }

    // --- OS FILE ACTIONS (OPEN & REVEAL IN EXPLORER) ---

private class OpenFileHandler implements HttpHandler {

    @Override
    public void handle(HttpExchange exchange) throws IOException {

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendCors(exchange);
            return;
        }

        Map<String, String> params =
                parseQueryParams(exchange.getRequestURI().getRawQuery());

        String filePath =
                params.getOrDefault("path", "").trim();

        if (filePath.isEmpty()) {
            sendJson(
                    exchange,
                    "{\"error\":\"Missing 'path' parameter\"}",
                    400
            );
            return;
        }

        File file = new File(filePath);

        if (!file.exists()) {
            sendJson(
                    exchange,
                    "{\"error\":" +
                            quote("File does not exist on server: " + filePath) +
                            "}",
                    404
            );
            return;
        }

        // Opening files is only possible when the server
        // is running on the user's own computer.
        String os = System.getProperty("os.name").toLowerCase();

        if (!os.contains("win")) {
            sendJson(
                    exchange,
                    "{\"error\":" +
                            quote("File opening is available when running the server locally on Windows.") +
                            "}",
                    400
            );
            return;
        }

        try {

            if (Desktop.isDesktopSupported()
                    && Desktop.getDesktop().isSupported(Desktop.Action.OPEN)) {

                Desktop.getDesktop().open(file);

                sendJson(
                        exchange,
                        "{\"success\":true,\"message\":" +
                                quote("Opened " + file.getName()) +
                                "}",
                        200
                );

            } else {

                new ProcessBuilder(
                        "cmd",
                        "/c",
                        "start",
                        "",
                        file.getAbsolutePath()
                ).start();

                sendJson(
                        exchange,
                        "{\"success\":true,\"message\":" +
                                quote("Opened " + file.getName()) +
                                "}",
                        200
                );
            }

        } catch (Exception e) {

            sendJson(
                    exchange,
                    "{\"error\":" +
                            quote("Unable to open file: " + e.getMessage()) +
                            "}",
                    500
            );
        }
    }
}


private class RevealFolderHandler implements HttpHandler {

    @Override
    public void handle(HttpExchange exchange) throws IOException {

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendCors(exchange);
            return;
        }

        Map<String, String> params =
                parseQueryParams(exchange.getRequestURI().getRawQuery());

        String filePath =
                params.getOrDefault("path", "").trim();

        if (filePath.isEmpty()) {
            sendJson(
                    exchange,
                    "{\"error\":\"Missing 'path' parameter\"}",
                    400
            );
            return;
        }

        File file = new File(filePath);

        if (!file.exists()) {
            sendJson(
                    exchange,
                    "{\"error\":" +
                            quote("File does not exist on server: " + filePath) +
                            "}",
                    404
            );
            return;
        }

        String os = System.getProperty("os.name").toLowerCase();

        if (!os.contains("win")) {
            sendJson(
                    exchange,
                    "{\"error\":" +
                            quote("Windows File Explorer is available when running the server locally on Windows.") +
                            "}",
                    400
            );
            return;
        }

        try {

            new ProcessBuilder(
                    "explorer.exe",
                    "/select,",
                    file.getAbsolutePath()
            ).start();

            sendJson(
                    exchange,
                    "{\"success\":true,\"message\":\"Revealed in File Explorer\"}",
                    200
            );

        } catch (Exception e) {

            sendJson(
                    exchange,
                    "{\"error\":" +
                            quote("Failed to open File Explorer: " + e.getMessage()) +
                            "}",
                    500
            );
        }
    }
}

    

    // --- DOCUMENT FULL CONTENT PREVIEW ---

    private class DocumentHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendCors(exchange);
                return;
            }

            Map<String, String> params = parseQueryParams(exchange.getRequestURI().getRawQuery());
            String pathParam = params.getOrDefault("path", "").trim();
            String nameParam = params.getOrDefault("name", "").trim();

            Document found = null;
            for (Document doc : indexer.getDocuments()) {
                if (!pathParam.isEmpty() && doc.getFilePath().equalsIgnoreCase(pathParam)) {
                    found = doc;
                    break;
                }
                if (!nameParam.isEmpty() && doc.getFileName().equalsIgnoreCase(nameParam)) {
                    found = doc;
                    break;
                }
            }

            if (found == null) {
                if (!pathParam.isEmpty()) {
                    File f = new File(pathParam);
                    if (f.exists() && f.isFile()) {
                        try {
                            String content = Files.readString(f.toPath(), StandardCharsets.UTF_8);
                            sendJson(exchange, "{\"fileName\":" + quote(f.getName()) + ",\"filePath\":" + quote(f.getAbsolutePath()) + ",\"fileSizeFormatted\":" + quote(formatBytes(f.length())) + ",\"wordCount\":" + content.split("\\s+").length + ",\"content\":" + quote(content) + "}", 200);
                            return;
                        } catch (Exception ignored) {}
                    }
                }
                sendJson(exchange, "{\"error\":\"Document not found\"}", 404);
                return;
            }

            StringBuilder json = new StringBuilder();
            json.append("{");
            json.append("\"fileName\":").append(quote(found.getFileName())).append(",");
            json.append("\"filePath\":").append(quote(found.getFilePath())).append(",");
            json.append("\"fileSizeFormatted\":").append(quote(formatBytes(found.getFileSize()))).append(",");
            json.append("\"wordCount\":").append(found.getWordCount()).append(",");
            json.append("\"content\":").append(quote(found.getContent()));
            json.append("}");

            sendJson(exchange, json.toString(), 200);
        }
    }

    // --- HISTORY, RECENT & STATS ---

    private class HistoryHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendCors(exchange);
                return;
            }

            List<String> stackHistory;
            synchronized (WebServer.this) {
                stackHistory = history.getHistoryList();
            }

            StringBuilder json = new StringBuilder();
            json.append("{");
            json.append("\"history\":[");
            for (int i = 0; i < stackHistory.size(); i++) {
                if (i > 0) json.append(",");
                json.append(quote(stackHistory.get(i)));
            }
            json.append("]}");

            sendJson(exchange, json.toString(), 200);
        }
    }

    private class RecentHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendCors(exchange);
                return;
            }

            List<String> recentList;
            synchronized (WebServer.this) {
                recentList = recentQueue.getRecentSearches();
            }

            StringBuilder json = new StringBuilder();
            json.append("{");
            json.append("\"recent\":[");
            for (int i = 0; i < recentList.size(); i++) {
                if (i > 0) json.append(",");
                json.append(quote(recentList.get(i)));
            }
            json.append("]}");

            sendJson(exchange, json.toString(), 200);
        }
    }

    private class ClearHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendCors(exchange);
                return;
            }

            synchronized (WebServer.this) {
                history.clearHistory();
                recentQueue.clear();
            }

            sendJson(exchange, "{\"success\":true}", 200);
        }
    }

    private class StatsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendCors(exchange);
                return;
            }

            double avgMs = totalSearches > 0 ? (totalSearchTimeNs / 1_000_000.0) / totalSearches : 0.0;
            List<Document> docs = indexer.getDocuments();
            SimpleDateFormat dateFormat = new SimpleDateFormat("MMM dd, yyyy");

            StringBuilder json = new StringBuilder();
            json.append("{");
            json.append("\"docCount\":").append(searchEngine.getDocumentCount()).append(",");
            json.append("\"wordCount\":").append(searchEngine.getUniqueWordCount()).append(",");
            json.append("\"currentFolder\":").append(quote(indexer.getCurrentFolderPath())).append(",");
            json.append("\"totalSearches\":").append(totalSearches).append(",");
            json.append("\"lastSearchTimeMs\":").append(String.format(Locale.US, "%.3f", lastSearchTimeMs)).append(",");
            json.append("\"avgSearchTimeMs\":").append(String.format(Locale.US, "%.3f", avgMs)).append(",");
            json.append("\"documents\":[");
            for (int i = 0; i < docs.size(); i++) {
                if (i > 0) json.append(",");
                Document d = docs.get(i);
                json.append("{");
                json.append("\"fileName\":").append(quote(d.getFileName())).append(",");
                json.append("\"filePath\":").append(quote(d.getFilePath())).append(",");
                json.append("\"fileSizeFormatted\":").append(quote(formatBytes(d.getFileSize()))).append(",");
                json.append("\"lastModified\":").append(quote(dateFormat.format(new Date(d.getLastModified())))).append(",");
                json.append("\"wordCount\":").append(d.getWordCount());
                json.append("}");
            }
            json.append("]}");

            sendJson(exchange, json.toString(), 200);
        }
    }

    private class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            if (path == null || path.equals("/") || path.isEmpty()) {
                path = "/index.html";
            }

            path = path.replace("\\", "/").replaceAll("/+", "/");
            if (path.startsWith("/")) {
                path = path.substring(1);
            }

            Path baseDir = Paths.get(WEB_DIR).toAbsolutePath().normalize();
            Path filePath = baseDir.resolve(path).normalize();

            if (!filePath.startsWith(baseDir) || !Files.exists(filePath) || Files.isDirectory(filePath)) {
                filePath = baseDir.resolve("index.html").normalize();
                if (!Files.exists(filePath)) {
                    String notFound = "<h1>404 Not Found</h1>";
                    exchange.sendResponseHeaders(404, notFound.length());
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(notFound.getBytes(StandardCharsets.UTF_8));
                    }
                    return;
                }
            }

            byte[] bytes = Files.readAllBytes(filePath);
            String contentType = getMimeType(filePath.getFileName().toString());
            exchange.getResponseHeaders().set("Content-Type", contentType + "; charset=utf-8");
            exchange.getResponseHeaders().set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
            exchange.getResponseHeaders().set("Pragma", "no-cache");
            exchange.getResponseHeaders().set("Expires", "0");
            exchange.sendResponseHeaders(200, bytes.length);

            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }
    }

    // --- UTILITIES ---

    private static class SnippetLine {
        int lineNumber;
        String text;
        SnippetLine(int lineNumber, String text) {
            this.lineNumber = lineNumber;
            this.text = text;
        }
    }

    private static List<SnippetLine> extractSnippets(String content, String query, int maxSnippets) {
        List<SnippetLine> snippets = new ArrayList<>();
        if (content == null || content.isEmpty()) return snippets;

        String[] lines = content.split("\\r?\\n");
        String[] keywords = query.toLowerCase().split("[^a-z0-9]+");

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            String lower = line.toLowerCase();

            boolean matched = false;
            for (String kw : keywords) {
                if (!kw.isEmpty() && lower.contains(kw)) {
                    matched = true;
                    break;
                }
            }

            if (matched) {
                snippets.add(new SnippetLine(i + 1, line.trim()));
                if (snippets.size() >= maxSnippets) {
                    break;
                }
            }
        }

        if (snippets.isEmpty() && lines.length > 0) {
            snippets.add(new SnippetLine(1, lines[0].trim()));
        }

        return snippets;
    }

    private static String getFileExtension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        if (dot > 0 && dot < fileName.length() - 1) {
            return fileName.substring(dot + 1).toLowerCase();
        }
        return "file";
    }

    private static String formatBytes(long bytes) {
        if (bytes <= 0) return "0 B";
        if (bytes < 1024) return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        char pre = "KMGTPE".charAt(exp - 1);
        return String.format(Locale.US, "%.1f %sB", bytes / Math.pow(1024, exp), pre);
    }

    private static String getMimeType(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".js")) return "application/javascript";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".ico")) return "image/x-icon";
        return "text/plain";
    }

    private static void sendCors(HttpExchange exchange) throws IOException {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
        exchange.sendResponseHeaders(204, -1);
    }

    private static void sendJson(HttpExchange exchange, String json, int statusCode) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static Map<String, String> parseQueryParams(String rawQuery) {
        Map<String, String> params = new HashMap<>();
        if (rawQuery == null || rawQuery.isEmpty()) return params;

        String[] pairs = rawQuery.split("&");
        for (String pair : pairs) {
            int idx = pair.indexOf("=");
            try {
                if (idx > 0 && idx < pair.length() - 1) {
                    String key = URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8);
                    String value = URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8);
                    params.put(key, value);
                } else if (idx > 0) {
                    String key = URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8);
                    params.put(key, "");
                }
            } catch (Exception ignored) {}
        }
        return params;
    }

    private static String readBody(HttpExchange exchange) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        }
    }

    private static String quote(String string) {
        if (string == null || string.isEmpty()) return "\"\"";
        StringBuilder sb = new StringBuilder();
        sb.append('"');
        for (int i = 0; i < string.length(); i++) {
            char c = string.charAt(i);
            switch (c) {
                case '\\':
                case '"':
                    sb.append('\\').append(c);
                    break;
                case '\b':
                    sb.append("\\b");
                    break;
                case '\t':
                    sb.append("\\t");
                    break;
                case '\n':
                    sb.append("\\n");
                    break;
                case '\f':
                    sb.append("\\f");
                    break;
                case '\r':
                    sb.append("\\r");
                    break;
                default:
                    if (c < ' ') {
                        String t = "000" + Integer.toHexString(c);
                        sb.append("\\u").append(t.substring(t.length() - 4));
                    } else {
                        sb.append(c);
                    }
            }
        }
        sb.append('"');
        return sb.toString();
    }

    private static String extractJsonField(String json, String field) {
        if (json == null) return null;
        String pattern = "\"" + field + "\"\\s*:\\s*\"([^\"]*)\"";
        java.util.regex.Matcher m = java.util.regex.Pattern.compile(pattern).matcher(json);
        if (m.find()) {
            return m.group(1).replace("\\\\", "\\");
        }
        return null;
    }

    // --- DSA VISUALIZER & TELEMETRY HANDLERS ---

    private class DsaTrieHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendCors(exchange);
                return;
            }

            Map<String, String> params = parseQueryParams(exchange.getRequestURI().getRawQuery());
            String prefix = params.getOrDefault("prefix", "").trim().toLowerCase();
            int depth = 3;
            try {
                depth = Integer.parseInt(params.getOrDefault("depth", "3"));
            } catch (Exception ignored) {}

            Trie trie;
            synchronized (WebServer.this) {
                trie = indexer.getTrie();
            }

            Map<String, Object> tree = trie.exportTree(prefix, depth);
            List<String> suggestions = trie.autoComplete(prefix);
            if (suggestions.size() > 15) {
                suggestions = suggestions.subList(0, 15);
            }

            StringBuilder json = new StringBuilder();
            json.append("{");
            json.append("\"prefix\":").append(quote(prefix)).append(",");
            json.append("\"nodeCount\":").append(trie.getNodeCount()).append(",");
            json.append("\"wordCount\":").append(trie.getWordCount()).append(",");
            json.append("\"suggestions\":[");
            for (int i = 0; i < suggestions.size(); i++) {
                if (i > 0) json.append(",");
                json.append(quote(suggestions.get(i)));
            }
            json.append("],");
            json.append("\"tree\":");
            writeTreeJson(json, tree);
            json.append("}");

            sendJson(exchange, json.toString(), 200);
        }
    }

    private static void writeTreeJson(StringBuilder sb, Map<String, Object> node) {
        sb.append("{");
        sb.append("\"name\":").append(quote((String) node.get("name"))).append(",");
        sb.append("\"prefix\":").append(quote((String) node.get("prefix"))).append(",");
        sb.append("\"isEnd\":").append(node.get("isEnd"));
        if (node.containsKey("notFound")) {
            sb.append(",\"notFound\":").append(node.get("notFound"));
        }
        sb.append(",\"children\":[");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> children = (List<Map<String, Object>>) node.get("children");
        if (children != null) {
            for (int i = 0; i < children.size(); i++) {
                if (i > 0) sb.append(",");
                writeTreeJson(sb, children.get(i));
            }
        }
        sb.append("]}");
    }

    private class DsaInvertedIndexHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendCors(exchange);
                return;
            }

            Map<String, String> params = parseQueryParams(exchange.getRequestURI().getRawQuery());
            String filter = params.getOrDefault("q", "").trim().toLowerCase();
            int limit = 60;
            try {
                limit = Integer.parseInt(params.getOrDefault("limit", "60"));
            } catch (Exception ignored) {}

            Map<String, List<Document>> invIndex;
            List<Document> allDocs;
            synchronized (WebServer.this) {
                invIndex = indexer.getInvertedIndex();
                allDocs = indexer.getDocuments();
            }

            List<String> terms = new ArrayList<>(invIndex.keySet());
            Collections.sort(terms);

            if (!filter.isEmpty()) {
                terms.removeIf(t -> !t.contains(filter));
            }

            int totalMatchedTerms = terms.size();
            if (terms.size() > limit) {
                terms = terms.subList(0, limit);
            }

            StringBuilder json = new StringBuilder();
            json.append("{");
            json.append("\"totalUniqueWords\":").append(invIndex.size()).append(",");
            json.append("\"totalDocuments\":").append(allDocs.size()).append(",");
            json.append("\"filter\":").append(quote(filter)).append(",");
            json.append("\"matchedTermsCount\":").append(totalMatchedTerms).append(",");
            json.append("\"terms\":[");

            for (int i = 0; i < terms.size(); i++) {
                if (i > 0) json.append(",");
                String term = terms.get(i);
                List<Document> docList = invIndex.get(term);
                json.append("{");
                json.append("\"term\":").append(quote(term)).append(",");
                json.append("\"docCount\":").append(docList != null ? docList.size() : 0).append(",");
                json.append("\"postings\":[");
                if (docList != null) {
                    for (int d = 0; d < docList.size(); d++) {
                        if (d > 0) json.append(",");
                        Document doc = docList.get(d);
                        json.append("{");
                        json.append("\"fileName\":").append(quote(doc.getFileName())).append(",");
                        json.append("\"filePath\":").append(quote(doc.getFilePath())).append(",");
                        json.append("\"frequency\":").append(doc.getKeywordFrequency(term));
                        json.append("}");
                    }
                }
                json.append("]");
                json.append("}");
            }

            json.append("]}");
            sendJson(exchange, json.toString(), 200);
        }
    }

    private class DsaHeapHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendCors(exchange);
                return;
            }

            Map<String, String> params = parseQueryParams(exchange.getRequestURI().getRawQuery());
            String query = params.getOrDefault("q", "").trim();

            if (query.isEmpty()) {
                sendJson(exchange, "{\"query\":\"\",\"initialHeapSize\":0,\"extractionSteps\":[]}", 200);
                return;
            }

            List<SearchResult> rawResults = searchEngine.search(query);
            PriorityQueue<SearchResult> maxHeap = new PriorityQueue<>(
                    Math.max(1, rawResults.size()),
                    ranker.getRelevanceComparator()
            );

            for (SearchResult r : rawResults) {
                if (r != null) {
                    maxHeap.offer(r);
                }
            }

            int heapSize = maxHeap.size();
            SearchResult root = maxHeap.peek();

            List<SearchResult> rankedList = new ArrayList<>();
            List<String> tieBreakNotes = new ArrayList<>();

            SearchResult prev = null;
            while (!maxHeap.isEmpty()) {
                SearchResult current = maxHeap.poll();
                rankedList.add(current);
                if (prev != null && prev.getScore() == current.getScore()) {
                    tieBreakNotes.add("Score tie (" + current.getScore() + ") broken alphabetically: '" + prev.getDocument().getFileName() + "' ahead of '" + current.getDocument().getFileName() + "'");
                } else {
                    tieBreakNotes.add("Extracted highest relevance score: " + current.getScore());
                }
                prev = current;
            }

            StringBuilder json = new StringBuilder();
            json.append("{");
            json.append("\"query\":").append(quote(query)).append(",");
            json.append("\"initialHeapSize\":").append(heapSize).append(",");
            json.append("\"rootFileName\":").append(root != null ? quote(root.getDocument().getFileName()) : "null").append(",");
            json.append("\"rootScore\":").append(root != null ? root.getScore() : 0).append(",");
            json.append("\"extractionSteps\":[");

            for (int i = 0; i < rankedList.size(); i++) {
                if (i > 0) json.append(",");
                SearchResult sr = rankedList.get(i);
                json.append("{");
                json.append("\"step\":").append(i + 1).append(",");
                json.append("\"fileName\":").append(quote(sr.getDocument().getFileName())).append(",");
                json.append("\"score\":").append(sr.getScore()).append(",");
                json.append("\"note\":").append(quote(tieBreakNotes.get(i)));
                json.append("}");
            }
            json.append("]}");

            sendJson(exchange, json.toString(), 200);
        }
    }

    private class DsaOverviewHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendCors(exchange);
                return;
            }

            List<String> stackHistory;
            List<String> queueRecent;
            int totalDocs, totalWords, nodeCount;
            String topQuery;
            double avgMs;

            synchronized (WebServer.this) {
                stackHistory = history.getHistoryList();
                topQuery = history.peekLatest();
                queueRecent = recentQueue.getRecentSearches();
                totalDocs = searchEngine.getDocumentCount();
                totalWords = searchEngine.getUniqueWordCount();
                nodeCount = indexer.getTrie().getNodeCount();
                avgMs = totalSearches > 0 ? (totalSearchTimeNs / 1_000_000.0) / totalSearches : 0.0;
            }

            StringBuilder json = new StringBuilder();
            json.append("{");
            json.append("\"stack\":{");
            json.append("\"name\":\"Search History Stack\",");
            json.append("\"type\":\"LIFO (Last-In, First-Out)\",");
            json.append("\"size\":").append(stackHistory.size()).append(",");
            json.append("\"top\":").append(topQuery != null ? quote(topQuery) : "null").append(",");
            json.append("\"items\":[");
            for (int i = 0; i < stackHistory.size(); i++) {
                if (i > 0) json.append(",");
                json.append(quote(stackHistory.get(i)));
            }
            json.append("]},");

            json.append("\"queue\":{");
            json.append("\"name\":\"Recent Searches Sliding Buffer\",");
            json.append("\"type\":\"FIFO (First-In, First-Out)\",");
            json.append("\"capacity\":").append(recentQueue.getMaxCapacity()).append(",");
            json.append("\"size\":").append(queueRecent.size()).append(",");
            json.append("\"items\":[");
            for (int i = 0; i < queueRecent.size(); i++) {
                if (i > 0) json.append(",");
                json.append(quote(queueRecent.get(i)));
            }
            json.append("]},");

            json.append("\"trie\":{");
            json.append("\"nodeCount\":").append(nodeCount).append(",");
            json.append("\"wordCount\":").append(totalWords);
            json.append("},");

            json.append("\"invertedIndex\":{");
            json.append("\"termsCount\":").append(totalWords).append(",");
            json.append("\"docsCount\":").append(totalDocs);
            json.append("},");

            json.append("\"heap\":{");
            json.append("\"type\":\"Max-Heap PriorityQueue\",");
            json.append("\"comparator\":\"(b.score - a.score) -> then alphabetical by fileName\"");
            json.append("},");

            json.append("\"telemetry\":{");
            json.append("\"totalSearches\":").append(totalSearches).append(",");
            json.append("\"lastSearchTimeMs\":").append(String.format(Locale.US, "%.3f", lastSearchTimeMs)).append(",");
            json.append("\"avgSearchTimeMs\":").append(String.format(Locale.US, "%.3f", avgMs));
            json.append("}");

            json.append("}");

            sendJson(exchange, json.toString(), 200);
        }
    }
}
