package com.qato.qa_tool_orchaestrator.controller;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.qato.qa_tool_orchaestrator.dto.QueryResponse;
import com.qato.utils.ClickhouseUtils;
import com.qato.utils.DbUtils;
import com.qato.utils.RedisUtils;

@RestController
public class QueryController {

    @PostMapping("/query")
    public QueryResponse query(@RequestBody Map<String, Object> request) {
        System.out.println("[DEBUG:QueryController] Received request: " + request);
        String query = (String) request.get("query");
        String type = (String) request.get("type");

        if (query == null || type == null) {
            throw new IllegalArgumentException("Request body must contain 'query' and 'type' keys.");
        }

        // Check if database configuration is provided in the request
        com.qato.config.DatabaseConfig providedConfig = null;
        if (request.containsKey("databaseConfig")) {
            @SuppressWarnings("unchecked")
            Map<String, Object> configMap = (Map<String, Object>) request.get("databaseConfig");
            providedConfig = parseDatabaseConfigFromRequest(configMap, type);
        }

        long startTime = System.currentTimeMillis();
        List<Map<String, Object>> result;

        switch (type.toLowerCase()) {
            case "sql":
                result = providedConfig != null ? DbUtils.readRows(query, providedConfig) : DbUtils.readRows(query);
                break;
            case "redis":
                result = providedConfig != null ? RedisUtils.executeCommand(query, providedConfig) : RedisUtils.executeCommand(query);
                break;
            case "clickhouse":
                result = providedConfig != null ? ClickhouseUtils.readRows(query, providedConfig) : ClickhouseUtils.readRows(query);
                break;
            case "api":
                // API calls are handled directly by Karate, not through this service.
                // This case should ideally not be reached for API calls.
                System.out.println(
                        "[DEBUG:QueryController] API call type received, but should be handled by Karate directly.");
                result = List.of(Map.of("status", "success", "message", "API call type received, handled by Karate."));
                break;
            default:
                throw new IllegalArgumentException("Unsupported query type: " + type);
        }

        long endTime = System.currentTimeMillis();
        long executionTime = endTime - startTime;

        QueryResponse queryResponse = new QueryResponse(result, executionTime);

        System.out.println("[DEBUG:QueryController] Query step result : " + queryResponse);

        return queryResponse;
    }

    /**
     * Parse database configuration from request payload
     */
    private com.qato.config.DatabaseConfig parseDatabaseConfigFromRequest(Map<String, Object> configMap, String type) {
        try {
            com.qato.config.DatabaseConfig config = new com.qato.config.DatabaseConfig();
            
            config.setId((String) configMap.get("id"));
            config.setName((String) configMap.get("name"));
            config.setType(type.equals("sql") ? "mysql" : type); // Map 'sql' type to 'mysql'
            config.setHost((String) configMap.get("host"));
            config.setDatabase((String) configMap.get("database"));
            config.setUsername((String) configMap.get("username"));
            config.setPassword((String) configMap.get("password"));
            config.setDescription((String) configMap.get("description"));

            // Handle numeric fields
            if (configMap.get("port") != null) {
                config.setPort(((Number) configMap.get("port")).intValue());
            }
            if (configMap.get("timeout") != null) {
                config.setTimeout(((Number) configMap.get("timeout")).intValue());
            }
            if (configMap.get("maxConnections") != null) {
                config.setMaxConnections(((Number) configMap.get("maxConnections")).intValue());
            }

            // Handle boolean fields
            if (configMap.get("ssl") != null) {
                config.setSsl((Boolean) configMap.get("ssl"));
            }

            System.out.println("[DEBUG:QueryController] Parsed database config from request: " + config);
            return config;

        } catch (Exception e) {
            System.err.println("[DEBUG:QueryController] Error parsing database config from request: " + e.getMessage());
            return null;
        }
    }

    /**
     * Update database configurations
     */
    @PostMapping("/config/update")
    public Map<String, Object> updateConfigurations(@RequestBody Map<String, Object> request) {
        System.out.println("[DEBUG:QueryController] Received configuration update request: " + request);
        
        try {
            ConfigurationManager configManager = ConfigurationManager.getInstance();
            
            // Check if databases configuration is provided
            if (request.containsKey("databases")) {
                @SuppressWarnings("unchecked")
                Map<String, Object> databases = (Map<String, Object>) request.get("databases");
                
                // Update each database configuration
                for (Map.Entry<String, Object> entry : databases.entrySet()) {
                    String dbType = entry.getKey();
                    @SuppressWarnings("unchecked")
                    Map<String, Object> configMap = (Map<String, Object>) entry.getValue();
                    
                    if (configMap != null) {
                        DatabaseConfig config = parseDatabaseConfigFromRequest(configMap, dbType);
                        if (config != null) {
                            configManager.setConfiguration(dbType, config);
                            System.out.println("[DEBUG:QueryController] Updated " + dbType + " configuration");
                        }
                    }
                }
            }
            
            // Also reload configuration from file if requested
            if (request.containsKey("reloadFromFile") && (Boolean) request.get("reloadFromFile")) {
                configManager.reloadConfigurationFromFile();
                System.out.println("[DEBUG:QueryController] Reloaded configuration from file");
            }
            
            return Map.of(
                "status", "success",
                "message", "Database configurations updated successfully",
                "timestamp", System.currentTimeMillis()
            );
            
        } catch (Exception e) {
            System.err.println("[DEBUG:QueryController] Error updating configurations: " + e.getMessage());
            return Map.of(
                "status", "error",
                "message", "Failed to update configurations: " + e.getMessage(),
                "timestamp", System.currentTimeMillis()
            );
        }
    }

    /**
     * Get current database configurations
     */
    @PostMapping("/config/get")
    public Map<String, Object> getConfigurations() {
        System.out.println("[DEBUG:QueryController] Received configuration get request");
        
        try {
            ConfigurationManager configManager = ConfigurationManager.getInstance();
            Map<String, DatabaseConfig> configurations = configManager.getAllConfigurations();
            
            return Map.of(
                "status", "success",
                "configurations", configurations,
                "timestamp", System.currentTimeMillis()
            );
            
        } catch (Exception e) {
            System.err.println("[DEBUG:QueryController] Error getting configurations: " + e.getMessage());
            return Map.of(
                "status", "error",
                "message", "Failed to get configurations: " + e.getMessage(),
                "timestamp", System.currentTimeMillis()
            );
        }
    }

}
