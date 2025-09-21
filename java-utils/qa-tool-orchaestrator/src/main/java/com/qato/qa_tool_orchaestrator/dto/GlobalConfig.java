package com.qato.qa_tool_orchaestrator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

public class GlobalConfig {
    @JsonProperty("version")
    private String version;

    @JsonProperty("defaultSettings")
    private Map<String, Object> defaultSettings;

    @JsonProperty("databases")
    private List<DatabaseConfig> databases;

    @JsonProperty("defaultDatabaseConnections")
    private Map<String, String> defaultDatabaseConnections;

    // Default constructor
    public GlobalConfig() {
    }

    // Getters and Setters
    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public Map<String, Object> getDefaultSettings() {
        return defaultSettings;
    }

    public void setDefaultSettings(Map<String, Object> defaultSettings) {
        this.defaultSettings = defaultSettings;
    }

    public List<DatabaseConfig> getDatabases() {
        return databases;
    }

    public void setDatabases(List<DatabaseConfig> databases) {
        this.databases = databases;
    }

    public Map<String, String> getDefaultDatabaseConnections() {
        return defaultDatabaseConnections;
    }

    public void setDefaultDatabaseConnections(Map<String, String> defaultDatabaseConnections) {
        this.defaultDatabaseConnections = defaultDatabaseConnections;
    }

    @Override
    public String toString() {
        return "GlobalConfig{" +
                "version='" + version + '\'' +
                ", databases=" + (databases != null ? databases.size() : 0) + " databases" +
                ", defaultDatabaseConnections=" + defaultDatabaseConnections +
                '}';
    }
}
