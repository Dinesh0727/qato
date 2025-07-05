package com.qato.qa_tool_orchaestrator.dto;

public class QueryRequest {
    private String query;
    private String dbType;

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public String getDbType() {
        return dbType;
    }

    public void setDbType(String dbType) {
        this.dbType = dbType;
    }
}
