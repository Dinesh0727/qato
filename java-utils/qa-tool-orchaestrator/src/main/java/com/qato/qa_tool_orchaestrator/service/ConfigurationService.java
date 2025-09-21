package com.qato.qa_tool_orchaestrator.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qato.qa_tool_orchaestrator.dto.DatabaseConfig;
import com.qato.qa_tool_orchaestrator.dto.FolderConfig;
import com.qato.qa_tool_orchaestrator.dto.GlobalConfig;
import com.qato.qa_tool_orchaestrator.dto.TestContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ConfigurationService {

    private static final Logger log = LoggerFactory.getLogger(ConfigurationService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, DatabaseConfig> databaseConfigCache = new ConcurrentHashMap<>();
    private final Map<String, GlobalConfig> globalConfigCache = new ConcurrentHashMap<>();
    private final Map<String, FolderConfig> folderConfigCache = new ConcurrentHashMap<>();

    /**
     * Load and cache configuration for a test context
     */
    public void loadConfigurationForTest(TestContext testContext) {
        System.out.println(
                "[DEBUG:ConfigurationService] Loading configuration for test: " + testContext.getTestCaseName());

        // Load global config
        if (testContext.getGlobalConfig() != null) {
            loadGlobalConfig(testContext.getGlobalConfig());
        } else if (testContext.getWorkspaceRoot() != null) {
            loadGlobalConfigFromFile(testContext.getWorkspaceRoot());
        }

        // Load folder config
        if (testContext.getFolderConfig() != null) {
            loadFolderConfig(testContext.getFolderPath(), testContext.getFolderConfig());
        } else if (testContext.getFolderPath() != null) {
            loadFolderConfigFromFile(testContext.getFolderPath());
        }
    }

    /**
     * Get database configuration for a specific type and context
     */
    public DatabaseConfig getDatabaseConfig(String type, String testCaseName, String workspaceRoot, String folderPath) {
        System.out.println("[DEBUG:ConfigurationService] Getting database config for type: " + type +
                ", test: " + testCaseName + ", folder: " + folderPath);

        // First try to get from folder-specific config
        if (folderPath != null) {
            FolderConfig folderConfig = folderConfigCache.get(folderPath);
            if (folderConfig != null && folderConfig.getDefaultDatabaseConnections() != null) {
                String dbId = folderConfig.getDefaultDatabaseConnections().get(type);
                if (dbId != null) {
                    DatabaseConfig dbConfig = findDatabaseConfigById(dbId, folderConfig.getDatabases());
                    if (dbConfig != null) {
                        System.out.println("[DEBUG:ConfigurationService] Found database config in folder config: "
                                + dbConfig.getId());
                        return dbConfig;
                    }
                }
            }
        }

        // Fall back to global config
        GlobalConfig globalConfig = globalConfigCache.get(workspaceRoot);
        if (globalConfig != null && globalConfig.getDefaultDatabaseConnections() != null) {
            String dbId = globalConfig.getDefaultDatabaseConnections().get(type);
            if (dbId != null) {
                DatabaseConfig dbConfig = findDatabaseConfigById(dbId, globalConfig.getDatabases());
                if (dbConfig != null) {
                    System.out.println(
                            "[DEBUG:ConfigurationService] Found database config in global config: " + dbConfig.getId());
                    return dbConfig;
                }
            }
        }

        // Return default configuration if nothing found
        System.out
                .println("[DEBUG:ConfigurationService] No specific config found, returning default for type: " + type);
        return getDefaultDatabaseConfig(type);
    }

    /**
     * Load global configuration from object
     */
    private void loadGlobalConfig(GlobalConfig globalConfig) {
        if (globalConfig != null && globalConfig.getDatabases() != null) {
            for (DatabaseConfig dbConfig : globalConfig.getDatabases()) {
                databaseConfigCache.put(dbConfig.getId(), dbConfig);
                System.out.println("[DEBUG:ConfigurationService] Cached database config: " + dbConfig.getId());
            }
            globalConfigCache.put("global", globalConfig);
            System.out.println("[DEBUG:ConfigurationService] Cached global config");
        }
    }

    /**
     * Load global configuration from file
     */
    private void loadGlobalConfigFromFile(String workspaceRoot) {
        try {
            log.info("Attempting to load global config from workspace root: {}", workspaceRoot);

            Path configPath = normalizeAndValidatePath(workspaceRoot, "global-config.json");
            log.info("Looking for global config at: {}", configPath.toAbsolutePath());

            if (Files.exists(configPath)) {
                GlobalConfig globalConfig = objectMapper.readValue(configPath.toFile(), GlobalConfig.class);
                loadGlobalConfig(globalConfig);
                globalConfigCache.put(workspaceRoot, globalConfig);
                log.info("Successfully loaded global config from file: {}", configPath.toAbsolutePath());
                System.out.println("[DEBUG:ConfigurationService] Loaded global config from file: " + configPath);
            } else {
                log.warn("Global config file not found at: {}", configPath.toAbsolutePath());
                System.out.println("[DEBUG:ConfigurationService] Global config file not found at: " + configPath);
            }
        } catch (Exception e) {
            log.error("Failed to load global config from file: {}", e.getMessage(), e);
            System.err
                    .println("[DEBUG:ConfigurationService] Failed to load global config from file: " + e.getMessage());
        }
    }

    /**
     * Load folder configuration from object
     */
    private void loadFolderConfig(String folderPath, FolderConfig folderConfig) {
        if (folderConfig != null && folderConfig.getDatabases() != null) {
            for (DatabaseConfig dbConfig : folderConfig.getDatabases()) {
                databaseConfigCache.put(dbConfig.getId(), dbConfig);
                System.out.println("[DEBUG:ConfigurationService] Cached folder database config: " + dbConfig.getId());
            }
            folderConfigCache.put(folderPath, folderConfig);
            System.out.println("[DEBUG:ConfigurationService] Cached folder config for: " + folderPath);
        }
    }

    /**
     * Load folder configuration from file
     */
    private void loadFolderConfigFromFile(String folderPath) {
        try {
            log.info("Attempting to load folder config from folder path: {}", folderPath);

            Path configPath = normalizeAndValidatePath(folderPath, "folder-config.json");
            log.info("Looking for folder config at: {}", configPath.toAbsolutePath());

            if (Files.exists(configPath)) {
                FolderConfig folderConfig = objectMapper.readValue(configPath.toFile(), FolderConfig.class);
                loadFolderConfig(folderPath, folderConfig);
                log.info("Successfully loaded folder config from file: {}", configPath.toAbsolutePath());
                System.out.println("[DEBUG:ConfigurationService] Loaded folder config from file: " + configPath);
            } else {
                log.warn("Folder config file not found at: {}", configPath.toAbsolutePath());
                System.out.println("[DEBUG:ConfigurationService] Folder config file not found at: " + configPath);
            }
        } catch (Exception e) {
            log.error("Failed to load folder config from file: {}", e.getMessage(), e);
            System.err
                    .println("[DEBUG:ConfigurationService] Failed to load folder config from file: " + e.getMessage());
        }
    }

    /**
     * Find database configuration by ID in a list
     */
    private DatabaseConfig findDatabaseConfigById(String id, List<DatabaseConfig> databases) {
        if (databases == null)
            return null;
        return databases.stream()
                .filter(db -> id.equals(db.getId()))
                .findFirst()
                .orElse(null);
    }

    /**
     * Get default database configuration for a type
     */
    private DatabaseConfig getDefaultDatabaseConfig(String type) {
        switch (type.toLowerCase()) {
            case "sql":
            case "mysql":
                return createDefaultMysqlConfig();
            case "redis":
                return createDefaultRedisConfig();
            case "clickhouse":
                return createDefaultClickhouseConfig();
            default:
                return createDefaultMysqlConfig();
        }
    }

    private DatabaseConfig createDefaultMysqlConfig() {
        DatabaseConfig config = new DatabaseConfig();
        config.setId("default-mysql");
        config.setName("Default MySQL");
        config.setType("mysql");
        config.setHost("localhost");
        config.setPort(4406);
        config.setDatabase("dev_apps");
        config.setUsername("dinesh");
        config.setPassword("password");
        config.setTimeout(30000);
        config.setMaxConnections(10);
        config.setSsl(false);
        return config;
    }

    private DatabaseConfig createDefaultRedisConfig() {
        DatabaseConfig config = new DatabaseConfig();
        config.setId("default-redis");
        config.setName("Default Redis");
        config.setType("redis");
        config.setHost("localhost");
        config.setPort(6379);
        config.setTimeout(30000);
        config.setMaxConnections(10);
        config.setSsl(false);
        return config;
    }

    private DatabaseConfig createDefaultClickhouseConfig() {
        DatabaseConfig config = new DatabaseConfig();
        config.setId("default-clickhouse");
        config.setName("Default ClickHouse");
        config.setType("clickhouse");
        config.setHost("localhost");
        config.setPort(9000);
        config.setDatabase("default");
        config.setUsername("default");
        config.setPassword("");
        config.setTimeout(30000);
        config.setMaxConnections(10);
        config.setSsl(false);
        return config;
    }

    /**
     * Clear all cached configurations
     */
    public void clearCache() {
        databaseConfigCache.clear();
        globalConfigCache.clear();
        folderConfigCache.clear();
        System.out.println("[DEBUG:ConfigurationService] Cleared all configuration caches");
    }

    /**
     * Get cache statistics
     */
    public Map<String, Integer> getCacheStats() {
        Map<String, Integer> stats = new HashMap<>();
        stats.put("databaseConfigs", databaseConfigCache.size());
        stats.put("globalConfigs", globalConfigCache.size());
        stats.put("folderConfigs", folderConfigCache.size());
        return stats;
    }

    /**
     * Utility method to normalize and validate file paths
     */
    private Path normalizeAndValidatePath(String basePath, String fileName) {
        if (basePath == null || basePath.trim().isEmpty()) {
            throw new IllegalArgumentException("Base path cannot be null or empty");
        }

        try {
            // Normalize the path to handle different path separators and resolve relative
            // paths
            Path normalizedBasePath = Paths.get(basePath).normalize();

            // Check if the base path exists and is a directory
            if (!Files.exists(normalizedBasePath)) {
                log.warn("Base path does not exist: {}", normalizedBasePath.toAbsolutePath());
                return normalizedBasePath.resolve(fileName);
            }

            if (!Files.isDirectory(normalizedBasePath)) {
                log.warn("Base path is not a directory: {}", normalizedBasePath.toAbsolutePath());
                return normalizedBasePath.resolve(fileName);
            }

            return normalizedBasePath.resolve(fileName);
        } catch (Exception e) {
            log.error("Error normalizing path: basePath={}, fileName={}, error={}", basePath, fileName, e.getMessage());
            throw new RuntimeException("Failed to normalize path: " + basePath, e);
        }
    }
}
