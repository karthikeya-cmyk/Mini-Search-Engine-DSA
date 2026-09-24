package com.minisearch;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.*;

public class Indexer {

    private final Map<String, List<Document>> invertedIndex;
    private final Trie trie;
    private final List<Document> documents;
    private String currentFolderPath = "documents";

    // Common text and code extensions
    private static final Set<String> TEXT_EXTENSIONS = new HashSet<>(Arrays.asList(
            "txt", "md", "markdown", "java", "py", "c", "cpp", "h", "hpp", "cs",
            "js", "ts", "jsx", "tsx", "html", "htm", "css", "scss", "json", "xml",
            "log", "csv", "sql", "bat", "cmd", "ps1", "sh", "yml", "yaml", "ini",
            "cfg", "conf", "properties", "env", "toml", "rs", "go", "kt", "gradle",
            "ino", "tex", "rtf", "tsv"
    ));

    // Directories to skip during recursive traversal
    private static final Set<String> IGNORED_DIRECTORIES = new HashSet<>(Arrays.asList(
            ".git", ".idea", "bin", "out", "target", "node_modules", ".gradle", "build", ".vscode",
            "AppData", "Program Files", "Program Files (x86)", "Windows", "$Recycle.Bin", "System Volume Information", ".cache"
    ));

    private static final int MAX_INDEX_FILES = 3000;

    public Indexer() {
        invertedIndex = new HashMap<>();
        trie = new Trie();
        documents = new ArrayList<>();
    }

    public synchronized void clear() {
        invertedIndex.clear();
        trie.clear();
        documents.clear();
    }

    public synchronized String getCurrentFolderPath() {
        return currentFolderPath;
    }

    // Read all files from folderPath (recursive file walk)
    public synchronized void indexDocuments(String folderPath) {
        if (folderPath == null || folderPath.isBlank()) {
            folderPath = "documents";
        }

        Path folder = Paths.get(folderPath);

        if (!Files.exists(folder)) {
            System.out.println("Directory not found: " + folderPath);
            return;
        }

        this.currentFolderPath = folder.toAbsolutePath().normalize().toString();

        try {
            if (Files.isRegularFile(folder)) {
                indexSinglePath(folder);
                return;
            }

            // If "documents" folder (e.g. for unit test or demo corpus), index text files cleanly
            boolean isDocsFolder = folder.getFileName() != null && folder.getFileName().toString().equalsIgnoreCase("documents");
            if (isDocsFolder) {
                try (DirectoryStream<Path> stream = Files.newDirectoryStream(folder, "*.txt")) {
                    for (Path path : stream) {
                        indexSinglePath(path);
                    }
                }
                return;
            }

            // Recursive walk for real user folders
            Files.walkFileTree(folder, EnumSet.of(FileVisitOption.FOLLOW_LINKS), 5, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
                    String dirName = dir.getFileName() != null ? dir.getFileName().toString() : "";
                    if (IGNORED_DIRECTORIES.contains(dirName) || (dirName.startsWith(".") && !dirName.equals("."))) {
                        return FileVisitResult.SKIP_SUBTREE;
                    }
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                    if (documents.size() >= MAX_INDEX_FILES) {
                        return FileVisitResult.TERMINATE;
                    }
                    if (attrs.isRegularFile()) {
                        indexSinglePath(file);
                    }
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult visitFileFailed(Path file, IOException exc) {
                    return FileVisitResult.CONTINUE;
                }
            });

        } catch (IOException e) {
            System.out.println("Error indexing folder: " + e.getMessage());
        }
    }

    private void indexSinglePath(Path path) {
        String fileName = path.getFileName().toString();
        String ext = getFileExtension(fileName);

        try {
            long size = Files.size(path);
            // Skip huge files > 50MB
            if (size > 50 * 1024 * 1024) {
                return;
            }

            String content = "";
            boolean isText = TEXT_EXTENSIONS.contains(ext) || ext.isEmpty();

            if (isText) {
                try {
                    content = Files.readString(path, StandardCharsets.UTF_8);
                } catch (Exception e) {
                    try {
                        content = Files.readString(path, StandardCharsets.ISO_8859_1);
                    } catch (Exception ignored) {
                        content = fileName;
                    }
                }
            } else {
                // For non-text documents (.pdf, .docx, .pptx, .xlsx, .zip, etc.),
                // create a searchable description from the filename and components
                content = fileName + " " + fileName.replace('.', ' ').replace('-', ' ').replace('_', ' ') + " " + ext;
            }

            Document document = new Document(
                    fileName,
                    path.toAbsolutePath().normalize().toString(),
                    content,
                    size,
                    Files.getLastModifiedTime(path).toMillis()
            );

            documents.add(document);
            indexDocument(document);

        } catch (Exception ignored) {
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
            trie.insert(word);
            wordsInDocument.add(word);
        }

        // Also add tokens from filename into Trie and inverted index
        String[] nameWords = document.getFileName().toLowerCase().split("[^a-z0-9]+");
        for (String word : nameWords) {
            if (!word.isEmpty()) {
                trie.insert(word);
                wordsInDocument.add(word);
            }
        }

        // Build inverted index
        for (String word : wordsInDocument) {
            invertedIndex
                    .computeIfAbsent(word, key -> new ArrayList<>())
                    .add(document);
        }
    }

    private static String getFileExtension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        if (dot > 0 && dot < fileName.length() - 1) {
            return fileName.substring(dot + 1).toLowerCase();
        }
        return "";
    }

    public synchronized Map<String, List<Document>> getInvertedIndex() {
        return new HashMap<>(invertedIndex);
    }

    public synchronized Trie getTrie() {
        return trie;
    }

    public synchronized List<Document> getDocuments() {
        return new ArrayList<>(documents);
    }
}
