package com.qato.qa_tool_orchaestrator.dto;

import java.util.List;
import java.util.Map;

public class QueryResponse {
    private List<Map<String, Object>> result;
    private long executionTime;

    public QueryResponse(List<Map<String, Object>> result, long executionTime) {
        this.result = result;
        this.executionTime = executionTime;
    }

    public List<Map<String, Object>> getResult() {
        return result;
    }

    public void setResult(List<Map<String, Object>> result) {
        this.result = result;
    }

    public long getExecutionTime() {
        return executionTime;
    }

    public void setExecutionTime(long executionTime) {
        this.executionTime = executionTime;
    }

    @Override
    public String toString() {
        return "QueryResponse{" +
                "result=" + result +
                ", executionTime=" + executionTime +
                '}';
    }
}
