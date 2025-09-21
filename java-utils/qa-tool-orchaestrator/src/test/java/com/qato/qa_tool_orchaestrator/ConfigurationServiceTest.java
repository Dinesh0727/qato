//package com.qato.qa_tool_orchaestrator;
//
//import com.qato.qa_tool_orchaestrator.dto.DatabaseConfig;
//import com.qato.qa_tool_orchaestrator.dto.GlobalConfig;
//import com.qato.qa_tool_orchaestrator.dto.TestContext;
//import com.qato.qa_tool_orchaestrator.service.ConfigurationService;
//import org.junit.jupiter.api.Test;
//import org.springframework.boot.test.context.SpringBootTest;
//
//import java.util.Arrays;
//import java.util.HashMap;
//import java.util.Map;
//
//import static org.junit.jupiter.api.Assertions.*;
//
//@SpringBootTest
//public class ConfigurationServiceTest {
//
//    @Test
//    public void testGetDatabaseConfig() {
//        ConfigurationService service = new ConfigurationService();
//
//        // Create test context
//        TestContext testContext = new TestContext();
//        testContext.setTestCaseName("test-case-1");
//        testContext.setWorkspaceRoot("/workspace");
//        testContext.setFolderPath("/workspace/folder1");
//
//        // Create global config
//        GlobalConfig globalConfig = new GlobalConfig();
//        globalConfig.setVersion("1.0.0");
//
//        DatabaseConfig dbConfig = new DatabaseConfig();
//        dbConfig.setId("test-mysql");
//        dbConfig.setName("Test MySQL");
//        dbConfig.setType("mysql");
//        dbConfig.setHost("test-host");
//        dbConfig.setPort(3306);
//        dbConfig.setDatabase("test_db");
//        dbConfig.setUsername("test_user");
//        dbConfig.setPassword("test_pass");
//
//        globalConfig.setDatabases(Arrays.asList(dbConfig));
//
//        Map<String, String> defaultConnections = new HashMap<>();
//        defaultConnections.put("sql", "test-mysql");
//        globalConfig.setDefaultDatabaseConnections(defaultConnections);
//
//        testContext.setGlobalConfig(globalConfig);
//
//        // Load configuration
//        service.loadConfigurationForTest(testContext);
//
//        // Test getting database config
//        DatabaseConfig result = service.getDatabaseConfig("sql", "test-case-1", "/workspace", "/workspace/folder1");
//
//        assertNotNull(result);
//        assertEquals("test-mysql", result.getId());
//        assertEquals("test-host", result.getHost());
//        assertEquals(3306, result.getPort());
//        assertEquals("test_db", result.getDatabase());
//        assertEquals("test_user", result.getUsername());
//        assertEquals("test_pass", result.getPassword());
//    }
//
//    @Test
//    public void testDefaultDatabaseConfig() {
//        ConfigurationService service = new ConfigurationService();
//
//        // Test with no configuration loaded - should return default
//        DatabaseConfig result = service.getDatabaseConfig("sql", "test-case-1", "/workspace", "/workspace/folder1");
//
//        assertNotNull(result);
//        assertEquals("default-mysql", result.getId());
//        assertEquals("localhost", result.getHost());
//        assertEquals(4406, result.getPort());
//    }
//}
