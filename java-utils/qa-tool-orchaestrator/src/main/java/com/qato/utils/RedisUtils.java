package com.qato.utils;

import redis.clients.jedis.Jedis;

import java.util.Map;

import java.util.Collections;
import java.util.List;

public class RedisUtils {

    private static final String HOST = "localhost";
    private static final int PORT = 6379;

    public static List<Map<String, Object>> executeCommand(String command) {
        System.out.println("[DEBUG:RedisUtils] Executing command: " + command);
        try (Jedis jedis = new Jedis(HOST, PORT)) {
            String[] parts = command.trim().split("\\s+");
            String mainCommand = parts[0].toLowerCase();

            switch (mainCommand) {
                case "get":
                    if (parts.length < 2) return Collections.singletonList(Map.of("error", "GET command requires a key."));
                    String key = parts[1];
                    String value = jedis.get(key);
                    System.out.println("[DEBUG:RedisUtils] Command result: " + value);
                    return Collections.singletonList(Map.of("result", value != null ? value : "(nil)"));
                case "set":
                    if (parts.length < 3) return Collections.singletonList(Map.of("error", "SET command requires a key and a value."));
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
}