package com.qato.qa_tool_orchaestrator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class TestContext {
    @JsonProperty("testCaseName")
    private String testCaseName;

    @JsonProperty("workspaceRoot")
    private String workspaceRoot;

    @JsonProperty("folderPath")
    private String folderPath;

    @JsonProperty("collectionPath")
    private String collectionPath;

    @JsonProperty("globalConfig")
    private GlobalConfig globalConfig;

    @JsonProperty("folderConfig")
    private FolderConfig folderConfig;

    // Default constructor
    public TestContext() {
    }

    // Getters and Setters
    public String getTestCaseName() {
        return testCaseName;
    }

    public void setTestCaseName(String testCaseName) {
        this.testCaseName = testCaseName;
    }

    public String getWorkspaceRoot() {
        return workspaceRoot;
    }

    public void setWorkspaceRoot(String workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
    }

    public String getFolderPath() {
        return folderPath;
    }

    public void setFolderPath(String folderPath) {
        this.folderPath = folderPath;
    }

    public String getCollectionPath() {
        return collectionPath;
    }

    public void setCollectionPath(String collectionPath) {
        this.collectionPath = collectionPath;
    }

    public GlobalConfig getGlobalConfig() {
        return globalConfig;
    }

    public void setGlobalConfig(GlobalConfig globalConfig) {
        this.globalConfig = globalConfig;
    }

    public FolderConfig getFolderConfig() {
        return folderConfig;
    }

    public void setFolderConfig(FolderConfig folderConfig) {
        this.folderConfig = folderConfig;
    }

    @Override
    public String toString() {
        return "TestContext{" +
                "testCaseName='" + testCaseName + '\'' +
                ", workspaceRoot='" + workspaceRoot + '\'' +
                ", folderPath='" + folderPath + '\'' +
                ", collectionPath='" + collectionPath + '\'' +
                ", hasGlobalConfig=" + (globalConfig != null) +
                ", hasFolderConfig=" + (folderConfig != null) +
                '}';
    }
}
