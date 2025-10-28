package com.qato.qa_tool_orchaestrator.utils;

import com.qato.qa_tool_orchaestrator.dto.DatabaseConfig;
import com.qato.qa_tool_orchaestrator.service.ConfigurationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import redis.clients.jedis.Jedis;

import java.util.Map;
import java.util.Collections;
import java.util.List;

@Component
public class RedisUtils {

    @Autowired
    private ConfigurationService configurationService;

    // Fallback configuration
    private static final String DEFAULT_HOST = "localhost";
    private static final int DEFAULT_PORT = 6379;

    public List<Map<String, Object>> executeCommand(String command, String testCaseName, String workspaceRoot,
            String folderPath) {
        System.out.println("[DEBUG:RedisUtils] Executing command: " + command);

        // Get database configuration
        DatabaseConfig dbConfig = configurationService.getDatabaseConfig("redis", testCaseName, workspaceRoot,
                folderPath);
        String host = dbConfig.getHost();
        int port = dbConfig.getPort();

        System.out.println(
                "[DEBUG:RedisUtils] Using Redis config: " + dbConfig.getId() + " (" + dbConfig.getName() + ")");
        System.out.println("[DEBUG:RedisUtils] Connection: " + host + ":" + port);

        try (Jedis jedis = new Jedis(host, port)) {
            String[] parts = command.trim().split("\\s+");
            String mainCommand = parts[0].toLowerCase();

            switch (mainCommand) {
                case "get":
                    if (parts.length < 2)
                        return Collections.singletonList(Map.of("error", "GET command requires a key."));
                    String key = parts[1];
                    String value = jedis.get(key);
                    System.out.println("[DEBUG:RedisUtils] Command result: " + value);
                    return Collections.singletonList(Map.of("result", value != null ? value : "(nil)"));
                case "set":
                    if (parts.length < 3)
                        return Collections.singletonList(Map.of("error", "SET command requires a key and a value."));
                    String setResult = jedis.set(parts[1], parts[2]);
                    System.out.println("[DEBUG:RedisUtils] Command result: " + setResult);
                    return Collections.singletonList(Map.of("result", setResult));
                case "flushdb":
                    String flushResult = jedis.flushDB();
                    System.out.println("[DEBUG:RedisUtils] Command result: " + flushResult);
                    return Collections.singletonList(Map.of("result", flushResult));
                default:
                    System.out.println("[DEBUG:RedisUtils] Unsupported command: " + command);
                    return Collections.singletonList(Map.of("error", "Unsupported command: " + mainCommand));
            }
        } catch (Exception e) {
            System.err.println("[DEBUG:RedisUtils] Redis Exception: " + e.getMessage());
            // Return a structured error
            return Collections.singletonList(Map.of("error", e.getMessage()));
        }
    }

    // Backward compatibility method
    public static List<Map<String, Object>> executeCommand(String command) {
        System.out.println("[DEBUG:RedisUtils] Using fallback configuration for command: " + command);
        return executeCommandWithFallback(command);
    }

    private static List<Map<String, Object>> executeCommandWithFallback(String command) {
        System.out.println("[DEBUG:RedisUtils] Executing command with fallback config: " + command);
        try (Jedis jedis = new Jedis(DEFAULT_HOST, DEFAULT_PORT)) {
            String[] parts = command.trim().split("\\s+");
            String mainCommand = parts[0].toLowerCase();

            switch (mainCommand) {
                case "get":
                    if (parts.length < 2)
                        return Collections.singletonList(Map.of("error", "GET command requires a key."));
                    String key = parts[1];
                    String value = jedis.get(key);
                    return Collections.singletonList(Map.of("result", value != null ? value : "(nil)"));
                case "set":
                    if (parts.length < 3)
                        return Collections.singletonList(Map.of("error", "SET command requires a key and a value."));
                    String setResult = jedis.set(parts[1], parts[2]);
                    return Collections.singletonList(Map.of("result", setResult));
                case "flushdb":
                    String flushResult = jedis.flushDB();
                    return Collections.singletonList(Map.of("result", flushResult));
                default:
                    return Collections.singletonList(Map.of("error", "Unsupported command: " + mainCommand));
            }
        } catch (Exception e) {
            System.err.println("[DEBUG:RedisUtils] Redis Exception: " + e.getMessage());
            return Collections.singletonList(Map.of("error", e.getMessage()));
        }
    }
}