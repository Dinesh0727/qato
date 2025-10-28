package com.qato.qa_tool_orchaestrator.utils;

import com.qato.qa_tool_orchaestrator.dto.DatabaseConfig;
import com.qato.qa_tool_orchaestrator.service.ConfigurationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Collections;

@Component
public class DbUtils {

    @Autowired
    private ConfigurationService configurationService;

    // Fallback configuration if no config is provided
    private static final String DEFAULT_URL = "jdbc:mysql://localhost:4406/dev_apps";
    private static final String DEFAULT_USER = "dinesh";
    private static final String DEFAULT_PASSWORD = "password";

    public List<Map<String, Object>> readRows(String query, String testCaseName, String workspaceRoot,
            String folderPath) {
        System.out.println("[DEBUG:DbUtils] Executing query: " + query);

        if (!query.trim().toLowerCase().startsWith("select")) {
            // If it's not a SELECT query, delegate to executeStatement
            return Collections.singletonList(executeStatement(query, testCaseName, workspaceRoot, folderPath));
        }

        // Add a default limit if one isn't specified for SELECT queries
        if (!query.toLowerCase().contains("limit")) {
            StringBuilder queryBuilder = new StringBuilder(query);
            // Check if the query ends with a semicolon, if so, remove it before appending
            // LIMIT
            if (queryBuilder.charAt(queryBuilder.length() - 1) == ';') {
                queryBuilder.deleteCharAt(queryBuilder.length() - 1);
            }
            queryBuilder.append(" LIMIT 200;");
            query = queryBuilder.toString();
            System.out.println("[DEBUG:DbUtils] No LIMIT found, updated query: " + query);
        }

        // Get database configuration
        DatabaseConfig dbConfig = configurationService.getDatabaseConfig("sql", testCaseName, workspaceRoot,
                folderPath);
        String url = buildConnectionString(dbConfig);
        String user = dbConfig.getUsername();
        String password = dbConfig.getPassword();

        System.out.println(
                "[DEBUG:DbUtils] Using database config: " + dbConfig.getId() + " (" + dbConfig.getName() + ")");
        System.out.println("[DEBUG:DbUtils] Connection URL: " + url);

        List<Map<String, Object>> resultList = new ArrayList<>();
        try (Connection conn = DriverManager.getConnection(url, user, password);
                PreparedStatement stmt = conn.prepareStatement(query);
                ResultSet rs = stmt.executeQuery()) {

            ResultSetMetaData md = rs.getMetaData();
            int columns = md.getColumnCount();

            while (rs.next()) {
                Map<String, Object> row = new HashMap<>(columns);
                for (int i = 1; i <= columns; ++i) {
                    row.put(md.getColumnName(i), rs.getObject(i));
                }
                resultList.add(row);
            }

        } catch (SQLException e) {
            System.err.println("[DEBUG:DbUtils] SQL Exception: " + e.getMessage());
            // Return a structured error for consistency
            return Collections.singletonList(Map.of("error", e.getMessage()));
        }

        System.out.println("[DEBUG:DbUtils] Query result: " + resultList.size() + " rows found.");
        return resultList;
    }

    // Backward compatibility method
    public static List<Map<String, Object>> readRows(String query) {
        System.out.println("[DEBUG:DbUtils] Using fallback configuration for query: " + query);
        return readRowsWithFallback(query);
    }

    public Map<String, Object> executeStatement(String query, String testCaseName, String workspaceRoot,
            String folderPath) {
        System.out.println("[DEBUG:DbUtils] Executing statement: " + query);

        // Get database configuration
        DatabaseConfig dbConfig = configurationService.getDatabaseConfig("sql", testCaseName, workspaceRoot,
                folderPath);
        String url = buildConnectionString(dbConfig);
        String user = dbConfig.getUsername();
        String password = dbConfig.getPassword();

        System.out.println(
                "[DEBUG:DbUtils] Using database config: " + dbConfig.getId() + " (" + dbConfig.getName() + ")");
        System.out.println("[DEBUG:DbUtils] Connection URL: " + url);

        try (Connection conn = DriverManager.getConnection(url, user, password);
                PreparedStatement stmt = conn.prepareStatement(query)) {

            int affectedRows = stmt.executeUpdate();
            System.out.println("[DEBUG:DbUtils] Affected rows: " + affectedRows);
            return Map.of("affectedRows", affectedRows);

        } catch (SQLException e) {
            System.err.println("[DEBUG:DbUtils] SQL Exception during statement execution: " + e.getMessage());
            // Return a structured error for consistency
            return Map.of("error", e.getMessage());
        }
    }

    // Backward compatibility method
    public static Map<String, Object> executeStatement(String query) {
        System.out.println("[DEBUG:DbUtils] Using fallback configuration for statement: " + query);
        return executeStatementWithFallback(query);
    }

    // Helper method to build connection string from database config
    private String buildConnectionString(DatabaseConfig dbConfig) {
        if (dbConfig.getConnectionString() != null && !dbConfig.getConnectionString().isEmpty()) {
            return dbConfig.getConnectionString();
        }

        String type = dbConfig.getType().toLowerCase();
        switch (type) {
            case "mysql":
                return String.format("jdbc:mysql://%s:%d/%s%s",
                        dbConfig.getHost(),
                        dbConfig.getPort(),
                        dbConfig.getDatabase(),
                        dbConfig.getSsl() != null && dbConfig.getSsl() ? "?useSSL=true" : "?useSSL=false");
            case "postgresql":
                return String.format("jdbc:postgresql://%s:%d/%s",
                        dbConfig.getHost(),
                        dbConfig.getPort(),
                        dbConfig.getDatabase());
            default:
                return String.format("jdbc:%s://%s:%d/%s",
                        type,
                        dbConfig.getHost(),
                        dbConfig.getPort(),
                        dbConfig.getDatabase());
        }
    }

    // Fallback methods for backward compatibility
    private static List<Map<String, Object>> readRowsWithFallback(String query) {
        System.out.println("[DEBUG:DbUtils] Executing query with fallback config: " + query);

        if (!query.trim().toLowerCase().startsWith("select")) {
            return Collections.singletonList(executeStatementWithFallback(query));
        }

        if (!query.toLowerCase().contains("limit")) {
            StringBuilder queryBuilder = new StringBuilder(query);
            if (queryBuilder.charAt(queryBuilder.length() - 1) == ';') {
                queryBuilder.deleteCharAt(queryBuilder.length() - 1);
            }
            queryBuilder.append(" LIMIT 200;");
            query = queryBuilder.toString();
        }

        List<Map<String, Object>> resultList = new ArrayList<>();
        try (Connection conn = DriverManager.getConnection(DEFAULT_URL, DEFAULT_USER, DEFAULT_PASSWORD);
                PreparedStatement stmt = conn.prepareStatement(query);
                ResultSet rs = stmt.executeQuery()) {

            ResultSetMetaData md = rs.getMetaData();
            int columns = md.getColumnCount();

            while (rs.next()) {
                Map<String, Object> row = new HashMap<>(columns);
                for (int i = 1; i <= columns; ++i) {
                    row.put(md.getColumnName(i), rs.getObject(i));
                }
                resultList.add(row);
            }

        } catch (SQLException e) {
            System.err.println("[DEBUG:DbUtils] SQL Exception: " + e.getMessage());
            return Collections.singletonList(Map.of("error", e.getMessage()));
        }

        return resultList;
    }

    private static Map<String, Object> executeStatementWithFallback(String query) {
        System.out.println("[DEBUG:DbUtils] Executing statement with fallback config: " + query);
        try (Connection conn = DriverManager.getConnection(DEFAULT_URL, DEFAULT_USER, DEFAULT_PASSWORD);
                PreparedStatement stmt = conn.prepareStatement(query)) {

            int affectedRows = stmt.executeUpdate();
            return Map.of("affectedRows", affectedRows);

        } catch (SQLException e) {
            System.err.println("[DEBUG:DbUtils] SQL Exception during statement execution: " + e.getMessage());
            return Map.of("error", e.getMessage());
        }
    }
}
