package com.qato.config;

import java.util.HashMap;
import java.util.Map;

/**
 * Configuration manager for handling database configurations injected from the extension
 */
public class ConfigurationManager {
    private static ConfigurationManager instance;
    private Map<String, DatabaseConfig> configurations;

    private ConfigurationManager() {
        this.configurations = new HashMap<>();
        initializeDefaultConfigurations();
        loadConfigurationFromFile();
    }

    public static synchronized ConfigurationManager getInstance() {
        if (instance == null) {
            instance = new ConfigurationManager();
        }
        return instance;
    }

    /**
     * Initialize default configurations for backward compatibility
     */
    private void initializeDefaultConfigurations() {
        // Default MySQL configuration (matching current hardcoded values)
        DatabaseConfig mysqlConfig = new DatabaseConfig("default-mysql", "Default MySQL", "mysql", "localhost", 4406);
        mysqlConfig.setDatabase("dev_apps");
        mysqlConfig.setUsername("dinesh");
        mysqlConfig.setPassword("password");
        mysqlConfig.setTimeout(30000);
        configurations.put("mysql", mysqlConfig);

        // Default Redis configuration (matching current hardcoded values)
        DatabaseConfig redisConfig = new DatabaseConfig("default-redis", "Default Redis", "redis", "localhost", 6379);
        redisConfig.setTimeout(30000);
        configurations.put("redis", redisConfig);

        // Default ClickHouse configuration (matching current hardcoded values)
        DatabaseConfig clickhouseConfig = new DatabaseConfig("default-clickhouse", "Default ClickHouse", "clickhouse", "localhost", 8123);
        clickhouseConfig.setDatabase("default");
        clickhouseConfig.setUsername("default");
        clickhouseConfig.setPassword("");
        clickhouseConfig.setTimeout(30000);
        configurations.put("clickhouse", clickhouseConfig);
    }

    /**
     * Set configuration for a specific database type
     */
    public void setConfiguration(String dbType, DatabaseConfig config) {
        if (config != null) {
            configurations.put(dbType.toLowerCase(), config);
            System.out.println("[DEBUG:ConfigurationManager] Updated configuration for " + dbType + ": " + config);
        }
    }

    /**
     * Get configuration for a specific database type
     */
    public DatabaseConfig getConfiguration(String dbType) {
        DatabaseConfig config = configurations.get(dbType.toLowerCase());
        if (config == null) {
            System.err.println("[DEBUG:ConfigurationManager] No configuration found for " + dbType + ", using defaults");
            // Return a basic default configuration
            return createDefaultConfig(dbType);
        }
        return config;
    }

    /**
     * Update multiple configurations at once
     */
    public void updateConfigurations(Map<String, DatabaseConfig> newConfigurations) {
        if (newConfigurations != null) {
            for (Map.Entry<String, DatabaseConfig> entry : newConfigurations.entrySet()) {
                setConfiguration(entry.getKey(), entry.getValue());
            }
        }
    }

    /**
     * Create a basic default configuration for a database type
     */
    private DatabaseConfig createDefaultConfig(String dbType) {
        switch (dbType.toLowerCase()) {
            case "mysql":
                DatabaseConfig mysql = new DatabaseConfig("default-mysql", "Default MySQL", "mysql", "localhost", 3306);
                mysql.setDatabase("test");
                mysql.setUsername("root");
                mysql.setPassword("");
                return mysql;
            case "redis":
                return new DatabaseConfig("default-redis", "Default Redis", "redis", "localhost", 6379);
            case "clickhouse":
                DatabaseConfig clickhouse = new DatabaseConfig("default-clickhouse", "Default ClickHouse", "clickhouse", "localhost", 8123);
                clickhouse.setDatabase("default");
                clickhouse.setUsername("default");
                clickhouse.setPassword("");
                return clickhouse;
            default:
                throw new IllegalArgumentException("Unsupported database type: " + dbType);
        }
    }

    /**
     * Clear all configurations (useful for testing)
     */
    public void clearConfigurations() {
        configurations.clear();
        initializeDefaultConfigurations();
    }

    /**
     * Get all current configurations
     */
    public Map<String, DatabaseConfig> getAllConfigurations() {
        return new HashMap<>(configurations);
    }

    /**
     * Load configuration from file written by the extension
     */
    private void loadConfigurationFromFile() {
        try {
            // Look for configuration file in target directory
            String configFilePath = "target/qato-db-config.json";
            java.io.File configFile = new java.io.File(configFilePath);
            
            if (configFile.exists()) {
                System.out.println("[DEBUG:ConfigurationManager] Loading configuration from file: " + configFilePath);
                
                // Read file content
                String content = new String(java.nio.file.Files.readAllBytes(configFile.toPath()));
                
                // Parse JSON (basic parsing - in production use a proper JSON library)
                parseAndLoadConfiguration(content);
                
                System.out.println("[DEBUG:ConfigurationManager] Configuration loaded successfully from file");
            } else {
                System.out.println("[DEBUG:ConfigurationManager] No configuration file found at: " + configFilePath + ", using defaults");
            }
        } catch (Exception e) {
            System.err.println("[DEBUG:ConfigurationManager] Error loading configuration from file: " + e.getMessage());
            // Continue with default configurations
        }
    }

    /**
     * Parse JSON configuration and load it
     * This is a basic implementation - in production, use Jackson or Gson
     */
    private void parseAndLoadConfiguration(String jsonContent) {
        try {
            System.out.println("[DEBUG:ConfigurationManager] Parsing configuration JSON: " + jsonContent);
            
            // Basic JSON parsing for database configurations
            // Look for the "databases" section in the JSON
            if (jsonContent.contains("\"databases\"")) {
                // Parse MySQL configuration
                parseDatabaseConfig(jsonContent, "mysql");
                // Parse Redis configuration
                parseDatabaseConfig(jsonContent, "redis");
                // Parse ClickHouse configuration
                parseDatabaseConfig(jsonContent, "clickhouse");
            }
            
        } catch (Exception e) {
            System.err.println("[DEBUG:ConfigurationManager] Error parsing configuration JSON: " + e.getMessage());
        }
    }

    /**
     * Parse a specific database configuration from JSON content
     */
    private void parseDatabaseConfig(String jsonContent, String dbType) {
        try {
            // Look for the database type section
            String searchPattern = "\"" + dbType + "\"\\s*:\\s*\\{";
            int startIndex = jsonContent.indexOf("\"" + dbType + "\"");
            if (startIndex == -1) {
                System.out.println("[DEBUG:ConfigurationManager] No " + dbType + " configuration found in JSON");
                return;
            }

            // Find the opening brace for this database config
            int braceStart = jsonContent.indexOf("{", startIndex);
            if (braceStart == -1) return;

            // Find the matching closing brace
            int braceCount = 1;
            int braceEnd = braceStart + 1;
            while (braceEnd < jsonContent.length() && braceCount > 0) {
                char c = jsonContent.charAt(braceEnd);
                if (c == '{') braceCount++;
                else if (c == '}') braceCount--;
                braceEnd++;
            }

            if (braceCount == 0) {
                String configSection = jsonContent.substring(braceStart + 1, braceEnd - 1);
                DatabaseConfig config = parseConfigSection(configSection, dbType);
                if (config != null) {
                    setConfiguration(dbType, config);
                    System.out.println("[DEBUG:ConfigurationManager] Loaded " + dbType + " configuration: " + config);
                }
            }

        } catch (Exception e) {
            System.err.println("[DEBUG:ConfigurationManager] Error parsing " + dbType + " configuration: " + e.getMessage());
        }
    }

    /**
     * Parse a configuration section and create a DatabaseConfig object
     */
    private DatabaseConfig parseConfigSection(String configSection, String dbType) {
        try {
            DatabaseConfig config = new DatabaseConfig();
            config.setType(dbType);

            // Parse each field
            config.setId(extractStringValue(configSection, "id"));
            config.setName(extractStringValue(configSection, "name"));
            config.setHost(extractStringValue(configSection, "host"));
            config.setDatabase(extractStringValue(configSection, "database"));
            config.setUsername(extractStringValue(configSection, "username"));
            config.setPassword(extractStringValue(configSection, "password"));
            config.setDescription(extractStringValue(configSection, "description"));

            // Parse numeric fields
            String portStr = extractStringValue(configSection, "port");
            if (portStr != null && !portStr.isEmpty()) {
                try {
                    config.setPort(Integer.parseInt(portStr));
                } catch (NumberFormatException e) {
                    System.err.println("[DEBUG:ConfigurationManager] Invalid port value: " + portStr);
                }
            }

            String timeoutStr = extractStringValue(configSection, "timeout");
            if (timeoutStr != null && !timeoutStr.isEmpty()) {
                try {
                    config.setTimeout(Integer.parseInt(timeoutStr));
                } catch (NumberFormatException e) {
                    System.err.println("[DEBUG:ConfigurationManager] Invalid timeout value: " + timeoutStr);
                }
            }

            String maxConnectionsStr = extractStringValue(configSection, "maxConnections");
            if (maxConnectionsStr != null && !maxConnectionsStr.isEmpty()) {
                try {
                    config.setMaxConnections(Integer.parseInt(maxConnectionsStr));
                } catch (NumberFormatException e) {
                    System.err.println("[DEBUG:ConfigurationManager] Invalid maxConnections value: " + maxConnectionsStr);
                }
            }

            // Parse boolean fields
            String sslStr = extractStringValue(configSection, "ssl");
            if (sslStr != null && !sslStr.isEmpty()) {
                config.setSsl(Boolean.parseBoolean(sslStr));
            }

            return config;

        } catch (Exception e) {
            System.err.println("[DEBUG:ConfigurationManager] Error creating DatabaseConfig: " + e.getMessage());
            return null;
        }
    }

    /**
     * Extract a string value from a JSON-like configuration section
     */
    private String extractStringValue(String configSection, String key) {
        try {
            String pattern = "\"" + key + "\"\\s*:\\s*\"([^\"]+)\"";
            java.util.regex.Pattern p = java.util.regex.Pattern.compile(pattern);
            java.util.regex.Matcher m = p.matcher(configSection);
            if (m.find()) {
                return m.group(1);
            }

            // Also try to match numeric values without quotes
            String numericPattern = "\"" + key + "\"\\s*:\\s*([0-9]+)";
            java.util.regex.Pattern np = java.util.regex.Pattern.compile(numericPattern);
            java.util.regex.Matcher nm = np.matcher(configSection);
            if (nm.find()) {
                return nm.group(1);
            }

            // Also try to match boolean values without quotes
            String booleanPattern = "\"" + key + "\"\\s*:\\s*(true|false)";
            java.util.regex.Pattern bp = java.util.regex.Pattern.compile(booleanPattern);
            java.util.regex.Matcher bm = bp.matcher(configSection);
            if (bm.find()) {
                return bm.group(1);
            }

        } catch (Exception e) {
            System.err.println("[DEBUG:ConfigurationManager] Error extracting value for key " + key + ": " + e.getMessage());
        }
        return null;
    }

    /**
     * Reload configuration from file (can be called when file is updated)
     */
    public void reloadConfigurationFromFile() {
        loadConfigurationFromFile();
    }
}