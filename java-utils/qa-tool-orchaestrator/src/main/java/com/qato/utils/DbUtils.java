package com.qato.utils;

import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class DbUtils {

    // IMPORTANT: These are hardcoded for now, as per the original plan for this phase.
    // We will address secure credential management in a later step.
    private static final String URL = "jdbc:mysql://localhost:4406/dev_apps";
    private static final String USER = "dinesh";
    private static final String PASSWORD = "password";

    public static List<Map<String, Object>> readRows(String query) {
        System.out.println("[DEBUG:DbUtils] Executing query: " + query);

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
            System.err.println("[DEBUG:DbUtils] SQL Exception: " + e.getMessage());
            throw new RuntimeException(e);
        }

        System.out.println("[DEBUG:DbUtils] Query result: " + resultList.size() + " rows found.");
        return resultList;
    }
}
