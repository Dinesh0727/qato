package com.qato.utils;
import java.sql.*;
import java.util.Map;
import java.util.HashMap;

public class DbUtils {
    public static Map<String, Object> readRow(String query) {
        // DO NOT DO THIS IN PRODUCTION. We will fix this in Phase 3.
        String url = "jdbc:mysql://localhost:4406/dev_apps";
        String user = "dinesh";
        String password = "password";
        try (Connection conn = DriverManager.getConnection(url, user, password); 
             PreparedStatement stmt = conn.prepareStatement(query);
             ResultSet rs = stmt.executeQuery()) {
            if (rs.next()) {
                ResultSetMetaData md = rs.getMetaData();
                int columns = md.getColumnCount();
                Map<String, Object> row = new HashMap<>(columns);
                for (int i = 1; i <= columns; ++i) {
                    row.put(md.getColumnName(i), rs.getObject(i));
                }
                return row;
            }
        } catch (Exception e) { 
            throw new RuntimeException(e); 
        }
        return new HashMap<>();
    }

    public static void execute(String query) {
        // DO NOT DO THIS IN PRODUCTION. We will fix this in Phase 3.
        String url = "jdbc:mysql://localhost:4406/dev_apps";
        String user = "dinesh";
        String password = "password";
        try (Connection conn = DriverManager.getConnection(url, user, password);
             PreparedStatement stmt = conn.prepareStatement(query)) {
            stmt.execute();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
