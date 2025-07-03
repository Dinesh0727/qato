# API Setup Guide

## Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api

# Development Settings
VITE_USE_MOCK_API=true

# Production Settings (uncomment for production)
# VITE_USE_MOCK_API=false
# VITE_API_BASE_URL=https://your-backend-api.com/api
```

## Backend API Endpoints

The frontend expects the following API endpoints to be available:

### Health Check
- `GET /api/health`
- Returns: `{ status: string, timestamp: string }`

### Test Case Execution
- `POST /api/execute-test-case`
- Body: `{ testCase: TestCase }`
- Returns: `{ success: boolean, data?: { executionLogs: ExecutionLog[], apiResponses: Record<number, ApiResponse> }, error?: string }`

### Test Case Management
- `GET /api/test-cases/:id` - Get test case by ID
- `POST /api/test-cases` - Create new test case
- `PUT /api/test-cases/:id` - Update test case
- `DELETE /api/test-cases/:id` - Delete test case

### Folder Management
- `GET /api/folders` - Get all folders with collections and test cases
- `POST /api/folders` - Create new folder
- `POST /api/collections` - Create new collection

## Development Mode

When `VITE_USE_MOCK_API=true`, the frontend will use mock data and simulated execution instead of making real API calls. This is useful for development and testing.

## Production Mode

When `VITE_USE_MOCK_API=false`, the frontend will make real API calls to the backend service. Make sure your backend is running and accessible at the configured `VITE_API_BASE_URL`.

## Backend Requirements

Your backend should handle:

1. **SQL Query Execution**: Execute raw SQL queries against configured databases
2. **Redis Command Execution**: Execute Redis commands against configured Redis instances
3. **API Request Execution**: Make HTTP requests to external APIs
4. **Step Delay Handling**: Respect the `delayMs` field for each step
5. **Error Handling**: Provide meaningful error messages for failed steps
6. **Logging**: Generate execution logs for each step
7. **Response Formatting**: Return API responses in the expected format

## Example Backend Response

```json
{
  "success": true,
  "data": {
    "executionLogs": [
      {
        "id": "1234567890",
        "timestamp": "2024-01-01T12:00:00.000Z",
        "level": "info",
        "message": "Starting execution of test case: Create User Flow",
        "stepIndex": -1
      },
      {
        "id": "1234567891",
        "timestamp": "2024-01-01T12:00:01.000Z",
        "level": "success",
        "message": "Step 1 completed successfully",
        "stepIndex": 0
      }
    ],
    "apiResponses": {
      "2": {
        "status": 200,
        "statusText": "OK",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "success": true,
          "data": { "id": 1, "name": "John Doe" }
        },
        "executionTime": 234
      }
    }
  }
}
``` 