# Multipart File Upload Guide

This guide explains how to use the multipart file upload feature in QATO for API testing.

## Overview

The multipart file upload feature allows you to send files and form data in a single HTTP request, similar to Postman. This is essential for testing file upload endpoints, profile picture uploads, document submissions, and any API that accepts `multipart/form-data`.

## Basic Usage

### 1. Select Body Type

In your API step configuration:
1. Navigate to the **Body** tab
2. Select **Form Data** from the Body Type dropdown

### 2. Add Form Fields

Click **Add Field** to add a new form field. Each field can be either:
- **Text**: Simple key-value pairs (strings, numbers, JSON, etc.)
- **File**: File uploads with full configuration options

### 3. Configure Text Fields

For text fields:
- **Field Name**: The parameter name (e.g., `userId`, `description`)
- **Value**: The field value (supports variable substitution with `${varName}$`)
- **Enabled**: Toggle to enable/disable the field

### 4. Configure File Fields

For file fields, you have additional options:
- **Field Name**: The parameter name (e.g., `avatar`, `document`)
- **File Path**: Path to the file (see path formats below)
- **Content-Type**: MIME type (e.g., `image/jpeg`, `application/pdf`)
- **Filename**: Custom filename (optional, auto-detected if not provided)
- **Enabled**: Toggle to enable/disable the field

## File Path Formats

### Classpath (Recommended)
```
classpath:data/image.png
classpath:files/document.pdf
classpath:testdata/avatar.jpg
```
- Files are loaded from your project's resource folder
- Portable across different machines
- Best for test files committed to version control

### Absolute File Path
```
file:/path/to/your/file.pdf
file:C:/Users/username/Documents/test.jpg
```
- Uses absolute paths on your file system
- Less portable but useful for local testing
- Can reference files outside your project

### Variable Substitution
```
${filePath}$
```
- Use variables extracted from previous steps
- Allows dynamic file selection based on test flow

## Examples

### Example 1: Simple File Upload

**Scenario**: Upload a single profile picture

**Configuration**:
- Method: `POST`
- URL: `https://api.example.com/users/123/avatar`
- Body Type: `Form Data`

**Fields**:
| Type | Field Name | Value | Content-Type | Filename |
|------|-----------|-------|--------------|----------|
| File | avatar | classpath:images/profile.jpg | image/jpeg | profile.jpg |

**Generated Karate Code**:
```gherkin
Given url 'https://api.example.com/users/123/avatar'
And multipart file avatar = { read: 'classpath:images/profile.jpg', filename: 'profile.jpg', contentType: 'image/jpeg' }
When method post
```

### Example 2: File Upload with Metadata

**Scenario**: Upload a document with user information

**Configuration**:
- Method: `POST`
- URL: `https://api.example.com/documents/upload`
- Body Type: `Form Data`

**Fields**:
| Type | Field Name | Value | Content-Type | Filename |
|------|-----------|-------|--------------|----------|
| Text | userId | user123 | - | - |
| Text | description | Monthly report | - | - |
| File | document | classpath:docs/report.pdf | application/pdf | report.pdf |

**Generated Karate Code**:
```gherkin
Given url 'https://api.example.com/documents/upload'
And multipart field userId = 'user123'
And multipart field description = 'Monthly report'
And multipart file document = { read: 'classpath:docs/report.pdf', filename: 'report.pdf', contentType: 'application/pdf' }
When method post
```

### Example 3: Multiple File Upload

**Scenario**: Upload multiple images in one request

**Configuration**:
- Method: `POST`
- URL: `https://api.example.com/gallery/upload`
- Body Type: `Form Data`

**Fields**:
| Type | Field Name | Value | Content-Type | Filename |
|------|-----------|-------|--------------|----------|
| File | image1 | classpath:images/photo1.jpg | image/jpeg | photo1.jpg |
| File | image2 | classpath:images/photo2.jpg | image/jpeg | photo2.jpg |
| File | image3 | classpath:images/photo3.png | image/png | photo3.png |

**Generated Karate Code**:
```gherkin
Given url 'https://api.example.com/gallery/upload'
And multipart file image1 = { read: 'classpath:images/photo1.jpg', filename: 'photo1.jpg', contentType: 'image/jpeg' }
And multipart file image2 = { read: 'classpath:images/photo2.jpg', filename: 'photo2.jpg', contentType: 'image/jpeg' }
And multipart file image3 = { read: 'classpath:images/photo3.png', filename: 'photo3.png', contentType: 'image/png' }
When method post
```

### Example 4: Dynamic File Upload with Variables

**Scenario**: Upload a file using a path extracted from a previous API call

**Step 1 - Get File Path**:
- Extract variable `filePath` from previous API response

**Step 2 - Upload File**:
- Method: `POST`
- URL: `https://api.example.com/upload`
- Body Type: `Form Data`

**Fields**:
| Type | Field Name | Value | Content-Type |
|------|-----------|-------|--------------|
| File | document | ${filePath}$ | application/pdf |

**Generated Karate Code**:
```gherkin
# Previous step extracted: filePath = 'classpath:docs/report.pdf'
Given url 'https://api.example.com/upload'
And multipart file document = { read: '#(filePath)', contentType: 'application/pdf' }
When method post
```

## Common Content Types

| File Type | Content-Type |
|-----------|--------------|
| JPEG Image | image/jpeg |
| PNG Image | image/png |
| GIF Image | image/gif |
| PDF Document | application/pdf |
| Word Document | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
| Excel Spreadsheet | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| Plain Text | text/plain |
| JSON | application/json |
| XML | application/xml |
| ZIP Archive | application/zip |
| CSV | text/csv |

## Best Practices

1. **Use Classpath for Test Files**: Store test files in your project's resource folder and use `classpath:` prefix for portability

2. **Specify Content-Type**: Always specify the correct MIME type for files to ensure proper handling by the server

3. **Custom Filenames**: Use custom filenames when the server expects specific naming conventions

4. **Enable/Disable Fields**: Use the checkbox to temporarily disable fields without deleting them

5. **Variable Substitution**: Leverage variables for dynamic file paths and field values

6. **Small Test Files**: Keep test files small to avoid repository bloat and faster test execution

7. **Organize Files**: Create a dedicated folder structure for test files (e.g., `testdata/images/`, `testdata/documents/`)

## Troubleshooting

### File Not Found Error
- Verify the file path is correct
- Ensure the file exists in the specified location
- Check for typos in the path

### Wrong Content-Type
- Verify the Content-Type matches the actual file type
- Some servers are strict about MIME types

### Large File Upload Fails
- Check server file size limits
- Consider using smaller test files
- Verify timeout settings

### Variable Not Substituted
- Ensure the variable was extracted in a previous step
- Check variable name spelling
- Verify the variable extraction JSONPath is correct

## Advanced Features

### Custom Headers for Files
You can add custom headers in the Headers tab that will apply to the entire request, including file parts.

### Multiple Files with Same Field Name
Some APIs accept multiple files under the same field name. Simply add multiple file fields with the same Field Name.

### Mixing Body Types
Note: You cannot mix Form Data with Raw JSON body. Choose one body type per request.

## Integration with Karate

The generated Karate code follows best practices:
- Uses `multipart file` for file uploads
- Uses `multipart field` for text fields
- Properly handles variable substitution
- Supports all Karate file reading methods (`classpath:`, `file:`)

For more details on Karate's multipart capabilities, refer to the [Karate documentation](https://github.com/karatelabs/karate#multipart-file).
