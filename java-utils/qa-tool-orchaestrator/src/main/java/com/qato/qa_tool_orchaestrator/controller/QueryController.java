package com.qato.qa_tool_orchaestrator.controller;

import com.qato.utils.DbUtils;
import com.qato.utils.RedisUtils;
import com.qato.utils.ClickhouseUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class QueryController {

    @PostMapping("/query")
    public Map<String, Object> query(@RequestBody Map<String, String> request) {
        System.out.println("[DEBUG:QueryController] Received request: " + request);
        String query = request.get("query");
        String type = request.get("type");

        if (query == null || type == null) {
            throw new IllegalArgumentException("Request body must contain 'query' and 'type' keys.");
        }

        switch (type.toLowerCase()) {
            case "sql":
                return DbUtils.readRow(query);
            case "redis":
                return RedisUtils.executeCommand(query);
            case "clickhouse":
                return ClickhouseUtils.readRow(query);
            case "api":
                // API calls are handled directly by Karate, not through this service.
                // This case should ideally not be reached for API calls.
                System.out.println("[DEBUG:QueryController] API call type received, but should be handled by Karate directly.");
                return Map.of("status", "success", "message", "API call type received, handled by Karate.");
            default:
                throw new IllegalArgumentException("Unsupported query type: " + type);
        }
    }
}
