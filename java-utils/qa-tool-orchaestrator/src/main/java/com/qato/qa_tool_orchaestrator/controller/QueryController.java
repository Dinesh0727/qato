package com.qato.qa_tool_orchaestrator.controller;

import com.qato.qa_tool_orchaestrator.dto.QueryResponse;
import com.qato.qa_tool_orchaestrator.dto.TestContext;
import com.qato.qa_tool_orchaestrator.service.ConfigurationService;
import com.qato.utils.DbUtils;
import com.qato.utils.RedisUtils;
import com.qato.utils.ClickhouseUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class QueryController {

    @Autowired
    private DbUtils dbUtils;

    @Autowired
    private RedisUtils redisUtils;

    @Autowired
    private ClickhouseUtils clickhouseUtils;

    @Autowired
    private ConfigurationService configurationService;

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

    @PostMapping("/query-with-context")
    public QueryResponse queryWithContext(@RequestBody Map<String, Object> request) {
        System.out.println("[DEBUG:QueryController] Received context-aware request: " + request);

        String query = (String) request.get("query");
        String type = (String) request.get("type");
        Map<String, Object> contextMap = (Map<String, Object>) request.get("context");

        if (query == null || type == null) {
            throw new IllegalArgumentException("Request body must contain 'query' and 'type' keys.");
        }

        // Parse test context
        TestContext testContext = parseTestContext(contextMap);

        // Load configuration for this test context
        configurationService.loadConfigurationForTest(testContext);

        long startTime = System.currentTimeMillis();
        List<Map<String, Object>> result;

        String testCaseName = testContext.getTestCaseName();
        String workspaceRoot = testContext.getWorkspaceRoot();
        String folderPath = testContext.getFolderPath();

        switch (type.toLowerCase()) {
            case "sql":
                result = dbUtils.readRows(query, testCaseName, workspaceRoot, folderPath);
                break;
            case "redis":
                result = redisUtils.executeCommand(query, testCaseName, workspaceRoot, folderPath);
                break;
            case "clickhouse":
                result = clickhouseUtils.readRows(query, testCaseName, workspaceRoot, folderPath);
                break;
            case "api":
                // API calls are handled directly by Karate, not through this service.
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

        System.out.println("[DEBUG:QueryController] Context-aware query result: " + queryResponse);

        return queryResponse;
    }

    private TestContext parseTestContext(Map<String, Object> contextMap) {
        TestContext context = new TestContext();

        if (contextMap != null) {
            context.setTestCaseName((String) contextMap.get("testCaseName"));
            context.setWorkspaceRoot((String) contextMap.get("workspaceRoot"));
            context.setFolderPath((String) contextMap.get("folderPath"));
            context.setCollectionPath((String) contextMap.get("collectionPath"));

            // Parse global config if present
            Map<String, Object> globalConfigMap = (Map<String, Object>) contextMap.get("globalConfig");
            if (globalConfigMap != null) {
                // Convert map to GlobalConfig object (simplified for now)
                // In a real implementation, you'd use ObjectMapper or similar
                System.out.println("[DEBUG:QueryController] Global config provided: " + globalConfigMap);
            }

            // Parse folder config if present
            Map<String, Object> folderConfigMap = (Map<String, Object>) contextMap.get("folderConfig");
            if (folderConfigMap != null) {
                System.out.println("[DEBUG:QueryController] Folder config provided: " + folderConfigMap);
            }
        }

        return context;
    }

    @PostMapping("/debug-config")
    public Map<String, Object> debugConfig(@RequestBody Map<String, Object> request) {
        System.out.println("[DEBUG:QueryController] Debug config request: " + request);

        Map<String, Object> response = new HashMap<>();

        try {
            // Parse test context
            Map<String, Object> contextMap = (Map<String, Object>) request.get("context");
            TestContext testContext = parseTestContext(contextMap);

            // Load configuration
            configurationService.loadConfigurationForTest(testContext);

            // Get cache stats
            Map<String, Integer> cacheStats = configurationService.getCacheStats();

            // Test database config resolution
            String testCaseName = testContext.getTestCaseName();
            String workspaceRoot = testContext.getWorkspaceRoot();
            String folderPath = testContext.getFolderPath();

            Map<String, Object> dbConfigs = new HashMap<>();
            dbConfigs.put("sql",
                    configurationService.getDatabaseConfig("sql", testCaseName, workspaceRoot, folderPath));
            dbConfigs.put("redis",
                    configurationService.getDatabaseConfig("redis", testCaseName, workspaceRoot, folderPath));
            dbConfigs.put("clickhouse",
                    configurationService.getDatabaseConfig("clickhouse", testCaseName, workspaceRoot, folderPath));

            response.put("success", true);
            response.put("testContext", testContext);
            response.put("cacheStats", cacheStats);
            response.put("databaseConfigs", dbConfigs);
            response.put("message", "Configuration loaded successfully");

        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Failed to load configuration");
        }

        return response;
    }
}
