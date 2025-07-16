package com.qato.qa_tool_orchaestrator.controller;

import com.qato.qa_tool_orchaestrator.dto.QueryResponse;
import com.qato.utils.DbUtils;
import com.qato.utils.RedisUtils;
import com.qato.utils.ClickhouseUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class QueryController {

    @PostMapping("/query")
    public QueryResponse query(@RequestBody Map<String, String> request) {
        System.out.println("[DEBUG:QueryController] Received request: " + request);
        String query = request.get("query");
        String type = request.get("type");

        if (query == null || type == null) {
            throw new IllegalArgumentException("Request body must contain 'query' and 'type' keys.");
        }

        long startTime = System.currentTimeMillis();
        List<Map<String, Object>> result;

        switch (type.toLowerCase()) {
            case "sql":
                result = DbUtils.readRows(query);
                break;
            case "redis":
                result = RedisUtils.executeCommand(query);
                break;
            case "clickhouse":
                result = ClickhouseUtils.readRows(query);
                break;
            case "api":
                // API calls are handled directly by Karate, not through this service.
                // This case should ideally not be reached for API calls.
                System.out.println(
                        "[DEBUG:QueryController] API call type received, but should be handled by Karate directly.");
                result = List.of(Map.of("status", "success", "message", "API call type received, handled by Karate."));
                break;
            default:
                throw new IllegalArgumentException("Unsupported query type: " + type);
        }

        long endTime = System.currentTimeMillis();
        long executionTime = endTime - startTime;

        QueryResponse queryResponse = new QueryResponse(result, executionTime);

        System.out.println("[DEBUG:QueryController] Query step result : " + queryResponse);

        return queryResponse;
    }
}
