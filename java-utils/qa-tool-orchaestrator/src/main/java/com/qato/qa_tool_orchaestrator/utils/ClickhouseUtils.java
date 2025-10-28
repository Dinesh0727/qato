package com.qato.qa_tool_orchaestrator.utils;

import com.qato.qa_tool_orchaestrator.dto.DatabaseConfig;
import com.qato.qa_tool_orchaestrator.service.ConfigurationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.sql.*;
import java.util.HashMap;
import java.util.Map;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class ClickhouseUtils {

    @Autowired
    private ConfigurationService configurationService;

    // Fallback configuration
    private static final String DEFAULT_URL = "jdbc:clickhouse://localhost:8123/default";
    private static final String DEFAULT_USER = "default";
    private static final String DEFAULT_PASSWORD = "";

    public List<Map<String, Object>> readRows(String query, String testCaseName, String workspaceRoot,
            String folderPath) {
        System.out.println("[DEBUG:ClickhouseUtils] Executing query: " + query);

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
            System.out.println("[DEBUG:ClickhouseUtils] No LIMIT found, updated query: " + query);
        }

        // Get database configuration
        DatabaseConfig dbConfig = configurationService.getDatabaseConfig("clickhouse", testCaseName, workspaceRoot,
                folderPath);
        String url = buildConnectionString(dbConfig);
        String user = dbConfig.getUsername();
        String password = dbConfig.getPassword();

        System.out.println("[DEBUG:ClickhouseUtils] Using ClickHouse config: " + dbConfig.getId() + " ("
                + dbConfig.getName() + ")");
        System.out.println("[DEBUG:ClickhouseUtils] Connection URL: " + url);

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
            System.err.println("[DEBUG:ClickhouseUtils] Clickhouse Exception: " + e.getMessage());
            // Return a structured error for consistency
            return Collections.singletonList(Map.of("error", e.getMessage()));
        }

        System.out.println("[DEBUG:ClickhouseUtils] Query result: " + resultList.size() + " rows found.");
        return resultList;
    }

    // Backward compatibility method
    public static List<Map<String, Object>> readRows(String query) {
        System.out.println("[DEBUG:ClickhouseUtils] Using fallback configuration for query: " + query);
        return readRowsWithFallback(query);
    }

    public Map<String, Object> executeStatement(String query, String testCaseName, String workspaceRoot,
            String folderPath) {
        System.out.println("[DEBUG:ClickhouseUtils] Executing statement: " + query);

        // Get database configuration
        DatabaseConfig dbConfig = configurationService.getDatabaseConfig("clickhouse", testCaseName, workspaceRoot,
                folderPath);
        String url = buildConnectionString(dbConfig);
        String user = dbConfig.getUsername();
        String password = dbConfig.getPassword();

        System.out.println("[DEBUG:ClickhouseUtils] Using ClickHouse config: " + dbConfig.getId() + " ("
                + dbConfig.getName() + ")");
        System.out.println("[DEBUG:ClickhouseUtils] Connection URL: " + url);

        try (Connection conn = DriverManager.getConnection(url, user, password);
                PreparedStatement stmt = conn.prepareStatement(query)) {

            int affectedRows = stmt.executeUpdate();
            System.out.println("[DEBUG:ClickhouseUtils] Affected rows: " + affectedRows);
            return Map.of("affectedRows", affectedRows);

        } catch (SQLException e) {
            System.err.println(
                    "[DEBUG:ClickhouseUtils] Clickhouse Exception during statement execution: " + e.getMessage());
            // Return a structured error for consistency
            return Map.of("error", e.getMessage());
        }
    }

    // Backward compatibility method
    public static Map<String, Object> executeStatement(String query) {
        System.out.println("[DEBUG:ClickhouseUtils] Using fallback configuration for statement: " + query);
        return executeStatementWithFallback(query);
    }

    // Helper method to build connection string from database config
    private String buildConnectionString(DatabaseConfig dbConfig) {
        if (dbConfig.getConnectionString() != null && !dbConfig.getConnectionString().isEmpty()) {
            return dbConfig.getConnectionString();
        }

        return String.format("jdbc:clickhouse://%s:%d/%s",
                dbConfig.getHost(),
                dbConfig.getPort(),
                dbConfig.getDatabase());
    }

    // Fallback methods for backward compatibility
    private static List<Map<String, Object>> readRowsWithFallback(String query) {
        System.out.println("[DEBUG:ClickhouseUtils] Executing query with fallback config: " + query);

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
            System.err.println("[DEBUG:ClickhouseUtils] Clickhouse Exception: " + e.getMessage());
            return Collections.singletonList(Map.of("error", e.getMessage()));
        }

        return resultList;
    }

    private static Map<String, Object> executeStatementWithFallback(String query) {
        System.out.println("[DEBUG:ClickhouseUtils] Executing statement with fallback config: " + query);
        try (Connection conn = DriverManager.getConnection(DEFAULT_URL, DEFAULT_USER, DEFAULT_PASSWORD);
                PreparedStatement stmt = conn.prepareStatement(query)) {

            int affectedRows = stmt.executeUpdate();
            return Map.of("affectedRows", affectedRows);

        } catch (SQLException e) {
            System.err.println(
                    "[DEBUG:ClickhouseUtils] Clickhouse Exception during statement execution: " + e.getMessage());
            return Map.of("error", e.getMessage());
        }
    }
}
