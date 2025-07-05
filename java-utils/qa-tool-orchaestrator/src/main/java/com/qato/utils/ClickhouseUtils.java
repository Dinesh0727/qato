package com.qato.utils;

import java.sql.*;
import java.util.HashMap;
import java.util.Map;

public class ClickhouseUtils {

    private static final String URL = "jdbc:clickhouse://localhost:8123/default";
    private static final String USER = "default";
    private static final String PASSWORD = "";

    public static Map<String, Object> readRow(String query) {
        System.out.println("[DEBUG:ClickhouseUtils] Executing query: " + query);
        try (Connection conn = DriverManager.getConnection(URL, USER, PASSWORD);
             PreparedStatement stmt = conn.prepareStatement(query);
             ResultSet rs = stmt.executeQuery()) {

            ResultSetMetaData md = rs.getMetaData();
            int columns = md.getColumnCount();
            Map<String, Object> row = new HashMap<>(columns);

            if (rs.next()) {
                for (int i = 1; i <= columns; ++i) {
                    row.put(md.getColumnName(i), rs.getObject(i));
                }
                System.out.println("[DEBUG:ClickhouseUtils] Query result: " + row);
                return row;
            } else {
                System.out.println("[DEBUG:ClickhouseUtils] Query returned no results.");
                return new HashMap<>(); // Return empty map if no rows found
            }

        } catch (SQLException e) {
            System.err.println("[DEBUG:ClickhouseUtils] Clickhouse Exception: " + e.getMessage());
            throw new RuntimeException(e);
        }
    }
}
