# cURL Import Feature

## Overview

The cURL import feature allows you to quickly create API test steps by pasting curl commands. This is especially useful when you already have curl commands from tools like Postman, browser DevTools, or API documentation.

## How to Use

### Method 1: Import from Editor

1. Open a test case in the editor
2. Click the **"Import cURL"** button (green button with file icon)
3. Paste your curl command in the dialog
4. Click **"Parse cURL"** to validate
5. Review the parsed configuration
6. Click **"Import Step"** to add it to your test case

### Method 2: Import from Existing API Step

1. Expand an existing API step
2. Look for the blue info box at the top
3. Click **"Import cURL"** button
4. Follow the same steps as Method 1

## Supported Features

### HTTP Methods

- GET
- POST
- PUT
- DELETE
- PATCH

### Headers

All headers specified with `-H` or `--header` flags are imported:

```bash
curl 'https://api.example.com/users' \
  -H 'Authorization: Bearer token123' \
  -H 'Content-Type: application/json'
```

### Query Parameters

Query parameters in the URL are automatically extracted:

```bash
curl 'https://api.example.com/users?page=1&limit=10&sort=name'
```

### Request Body Types

#### 1. Raw Body (JSON/Text)

```bash
curl -X POST 'https://api.example.com/users' \
  -H 'Content-Type: application/json' \
  --data-raw '{"name":"John","email":"john@example.com"}'
```

#### 2. Form Data (multipart/form-data)

```bash
curl -X POST 'https://api.example.com/upload' \
  -F 'name=John' \
  -F 'email=john@example.com' \
  -F 'file=@/path/to/document.pdf'
```

File uploads are automatically detected when the value starts with `@`.

#### 3. URL Encoded (application/x-www-form-urlencoded)

```bash
curl -X POST 'https://api.example.com/login' \
  --data-urlencode 'username=john' \
  --data-urlencode 'password=secret123'
```

## Examples

### Example 1: Simple GET Request

```bash
curl 'https://jsonplaceholder.typicode.com/posts/1'
```

**Result:**

- Method: GET
- URL: https://jsonplaceholder.typicode.com/posts/1
- Body Type: none

### Example 2: POST with JSON

```bash
curl -X POST 'https://jsonplaceholder.typicode.com/posts' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer abc123' \
  --data-raw '{
    "title": "My Post",
    "body": "This is the content",
    "userId": 1
  }'
```

**Result:**

- Method: POST
- URL: https://jsonplaceholder.typicode.com/posts
- Headers: Content-Type, Authorization
- Body Type: raw
- Body: JSON formatted

### Example 3: File Upload

```bash
curl -X POST 'https://api.example.com/upload' \
  -H 'Authorization: Bearer token123' \
  -F 'description=My document' \
  -F 'file=@/Users/john/documents/report.pdf' \
  -F 'category=reports'
```

**Result:**

- Method: POST
- URL: https://api.example.com/upload
- Headers: Authorization
- Body Type: form-data
- Form Fields:
  - description: "My document" (text)
  - file: "file:/Users/john/documents/report.pdf" (file)
  - category: "reports" (text)

### Example 4: Complex Request with Query Params

```bash
curl -X GET 'https://api.example.com/search?q=test&page=1&limit=20' \
  -H 'Accept: application/json' \
  -H 'X-API-Key: secret123'
```

**Result:**

- Method: GET
- URL: https://api.example.com/search?q=test&page=1&limit=20
- Query Params: q, page, limit (all enabled)
- Headers: Accept, X-API-Key

## Tips

1. **Line Continuations**: The parser handles backslash line continuations (`\`) automatically
2. **Comments**: Lines starting with `#` are ignored
3. **Quotes**: Both single and double quotes are supported
4. **Method Detection**: If no method is specified but body data exists, POST is assumed
5. **JSON Formatting**: JSON bodies are automatically pretty-printed for readability

## Limitations

- Compressed data (`--compressed`) is not supported
- Cookie files (`--cookie`, `--cookie-jar`) are not imported
- Proxy settings are not imported
- SSL/TLS options are not imported
- Authentication flags (`--user`, `--basic`, etc.) are not parsed (use headers instead)

## Integration with Variables

After importing, you can manually add variable substitution using the `${varName}$` syntax in:

- URL
- Headers
- Body
- Query parameters
- Form data fields

## Architecture

The curl import feature consists of three main components:

### 1. CurlParser (`webview-ui/src/utils/curlParser.ts`)

- Core parsing logic
- Converts curl commands to API step configuration
- Handles all supported curl flags and options

### 2. CurlImportDialog (`webview-ui/src/components/CurlImportDialog.tsx`)

- User interface for importing curl commands
- Validation and preview functionality
- Error handling and user feedback

### 3. Editor Integration (`webview-ui/src/components/Editor.tsx`)

- Integrates curl import into the test case editor
- Manages dialog state
- Creates new steps from imported configuration

## Future Enhancements

Potential improvements for future versions:

- Support for cookie import
- Authentication method detection
- Proxy configuration import
- Import multiple curl commands at once
- Export API steps back to curl format
- Browser extension for direct import from DevTools
