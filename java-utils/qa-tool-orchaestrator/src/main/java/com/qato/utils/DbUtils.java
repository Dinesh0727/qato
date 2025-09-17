package com.qato.utils;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.qato.config.ConfigurationManager;
import com.qato.config.DatabaseConfig;

public class DbUtils {

    private static final ConfigurationManager configManager = ConfigurationManager.getInstance();

    /**
     * Get database connection using current configuration
     */
    private static Connection getConnection() throws SQLException {
        DatabaseConfig config = configManager.getConfiguration("mysql");
        String url = String.format("jdbc:mysql://%s:%d/%s", 
            config.getHost(), 
            config.getPort(), 
            config.getDatabase() != null ? config.getDatabase() : "");
        
        System.out.println("[DEBUG:DbUtils] Connecting to: " + url + " with user: " + config.getUsername());
        
        return DriverManager.getConnection(url, config.getUsername(), config.getPassword());
    }

    /**
     * Get database connection using provided configuration
     */
    private static Connection getConnection(DatabaseConfig config) throws SQLException {
        if (config == null) {
            return getConnection(); // Fall back to default configuration
        }
        
        String url = String.format("jdbc:mysql://%s:%d/%s", 
            config.getHost(), 
            config.getPort(), 
            config.getDatabase() != null ? config.getDatabase() : "");
        
        System.out.println("[DEBUG:DbUtils] Connecting to: " + url + " with user: " + config.getUsername());
        
        return DriverManager.getConnection(url, config.getUsername(), config.getPassword());
    }

    public static List<Map<String, Object>> readRows(String query) {
        return readRows(query, null);
    }

    public static List<Map<String, Object>> readRows(String query, DatabaseConfig config) {
        System.out.println("[DEBUG:DbUtils] Executing query: " + query);

        if (!query.trim().toLowerCase().startsWith("select")) {
            // If it's not a SELECT query, delegate to executeStatement
            return Collections.singletonList(executeStatement(query, config));
        }

        // Add a default limit if one isn't specified for SELECT queries
        if (!query.toLowerCase().contains("limit")) {
            StringBuilder queryBuilder = new StringBuilder(query);
            // Check if the query ends with a semicolon, if so, remove it before appending LIMIT
            if (queryBuilder.charAt(queryBuilder.length() - 1) == ';') {
                queryBuilder.deleteCharAt(queryBuilder.length() - 1);
            }
            queryBuilder.append(" LIMIT 200;");
            query = queryBuilder.toString();
            System.out.println("[DEBUG:DbUtils] No LIMIT found, updated query: " + query);
        }

        List<Map<String, Object>> resultList = new ArrayList<>();
        try (Connection conn = getConnection(config);
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

    public static Map<String, Object> executeStatement(String query) {
        return executeStatement(query, null);
    }

    public static Map<String, Object> executeStatement(String query, DatabaseConfig config) {
        System.out.println("[DEBUG:DbUtils] Executing statement: " + query);
        try (Connection conn = getConnection(config);
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
}

