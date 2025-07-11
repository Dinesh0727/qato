package com.qato.utils;

import java.sql.*;
import java.util.HashMap;
import java.util.Map;

import java.util.ArrayList;
import java.util.List;

public class ClickhouseUtils {

    private static final String URL = "jdbc:clickhouse://localhost:8123/default";
    private static final String USER = "default";
    private static final String PASSWORD = "";

    public static List<Map<String, Object>> readRows(String query) {
        System.out.println("[DEBUG:ClickhouseUtils] Executing query: " + query);

        // Add a default limit if one isn't specified for SELECT queries
        if (!query.toLowerCase().contains("limit")) {
            StringBuilder queryBuilder = new StringBuilder(query);
            queryBuilder.deleteCharAt(queryBuilder.length() - 1);
            queryBuilder.append(" LIMIT 200").append(";");
            query = queryBuilder.toString();
            System.out.println("[DEBUG:ClickhouseUtils] No LIMIT found, updated query: " + query);
        }

        List<Map<String, Object>> resultList = new ArrayList<>();
        try (Connection conn = DriverManager.getConnection(URL, USER, PASSWORD);
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
            throw new RuntimeException(e);
        }

        System.out.println("[DEBUG:ClickhouseUtils] Query result: " + resultList.size() + " rows found.");
        return resultList;
    }
}
