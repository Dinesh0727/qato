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
            // This is a very basic implementation. A real implementation would
            // need to parse the command and call the appropriate Jedis method.
            // For now, we'll just support a simple GET command.
            if (command.toLowerCase().startsWith("get")) {
                String key = command.split(" ")[1];
                String value = jedis.get(key);
                System.out.println("[DEBUG:RedisUtils] Command result: " + value);
                return Collections.singletonList(Map.of("result", value));
            } else if (command.toLowerCase().startsWith("set")) {
                String key = command.split(" ")[1];
                String value = command.split(" ")[2];
                jedis.set(key, value);
                System.out.println("[DEBUG:RedisUtils] Command result: " + value);
                return Collections.singletonList(Map.of("result", value));
            } else {
                System.out.println("[DEBUG:RedisUtils] Unsupported command: " + command);
                return Collections.singletonList(Map.of("error", "Unsupported command"));
            }
        } catch (Exception e) {
            System.err.println("[DEBUG:RedisUtils] Redis Exception: " + e.getMessage());
            throw new RuntimeException(e);
        }
    }
}