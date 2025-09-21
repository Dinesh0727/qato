package com.qato.qa_tool_orchaestrator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

public class FolderConfig {
    @JsonProperty("description")
    private String description;

    @JsonProperty("defaultCollectionSettings")
    private Map<String, Object> defaultCollectionSettings;

    @JsonProperty("databases")
    private List<DatabaseConfig> databases;

    @JsonProperty("defaultDatabaseConnections")
    private Map<String, String> defaultDatabaseConnections;

    // Default constructor
    public FolderConfig() {
    }

    // Getters and Setters
    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Map<String, Object> getDefaultCollectionSettings() {
        return defaultCollectionSettings;
    }

    public void setDefaultCollectionSettings(Map<String, Object> defaultCollectionSettings) {
        this.defaultCollectionSettings = defaultCollectionSettings;
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
        return "FolderConfig{" +
                "description='" + description + '\'' +
                ", databases=" + (databases != null ? databases.size() : 0) + " databases" +
                ", defaultDatabaseConnections=" + defaultDatabaseConnections +
                '}';
    }
}
