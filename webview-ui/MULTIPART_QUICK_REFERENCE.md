# Multipart File Upload - Quick Reference

## Common Use Cases

### 1. Profile Picture Upload
```
POST /users/{id}/avatar

Form Data:
├─ [File] avatar
│  ├─ Value: classpath:images/profile.jpg
│  ├─ Content-Type: image/jpeg
│  └─ Filename: profile.jpg
```

**Generated Karate**:
```gherkin
And multipart file avatar = { read: 'classpath:images/profile.jpg', filename: 'profile.jpg', contentType: 'image/jpeg' }
```

---

### 2. Document Upload with Metadata
```
POST /documents/upload

Form Data:
├─ [Text] userId = user123
├─ [Text] category = reports
└─ [File] document
   ├─ Value: classpath:docs/report.pdf
   ├─ Content-Type: application/pdf
   └─ Filename: monthly-report.pdf
```

**Generated Karate**:
```gherkin
And multipart field userId = 'user123'
And multipart field category = 'reports'
And multipart file document = { read: 'classpath:docs/report.pdf', filename: 'monthly-report.pdf', contentType: 'application/pdf' }
```

---

### 3. Multiple Image Upload
```
POST /gallery/upload

Form Data:
├─ [File] image1
│  ├─ Value: classpath:images/photo1.jpg
│  └─ Content-Type: image/jpeg
├─ [File] image2
│  ├─ Value: classpath:images/photo2.jpg
│  └─ Content-Type: image/jpeg
└─ [File] image3
   ├─ Value: classpath:images/photo3.png
   └─ Content-Type: image/png
```

**Generated Karate**:
```gherkin
And multipart file image1 = { read: 'classpath:images/photo1.jpg', contentType: 'image/jpeg' }
And multipart file image2 = { read: 'classpath:images/photo2.jpg', contentType: 'image/jpeg' }
And multipart file image3 = { read: 'classpath:images/photo3.png', contentType: 'image/png' }
```

---

### 4. Dynamic File Upload (Using Variables)
```
Step 1: Extract file path from API
└─ Extract Variable: filePath = $.data.documentPath

Step 2: Upload file
POST /upload

Form Data:
└─ [File] document
   ├─ Value: ${filePath}$
   └─ Content-Type: application/pdf
```

**Generated Karate**:
```gherkin
# Step 1 extracts: filePath
And multipart file document = { read: '#(filePath)', contentType: 'application/pdf' }
```

---

### 5. CSV Data Import
```
POST /data/import

Form Data:
├─ [Text] importType = users
├─ [Text] overwrite = true
└─ [File] dataFile
   ├─ Value: classpath:data/users.csv
   ├─ Content-Type: text/csv
   └─ Filename: users.csv
```

**Generated Karate**:
```gherkin
And multipart field importType = 'users'
And multipart field overwrite = 'true'
And multipart file dataFile = { read: 'classpath:data/users.csv', filename: 'users.csv', contentType: 'text/csv' }
```

---

## Content-Type Quick Reference

| File Extension | Content-Type | Example |
|----------------|--------------|---------|
| .jpg, .jpeg | image/jpeg | profile.jpg |
| .png | image/png | logo.png |
| .gif | image/gif | animation.gif |
| .pdf | application/pdf | document.pdf |
| .doc | application/msword | report.doc |
| .docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document | report.docx |
| .xls | application/vnd.ms-excel | data.xls |
| .xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | data.xlsx |
| .csv | text/csv | users.csv |
| .txt | text/plain | notes.txt |
| .json | application/json | config.json |
| .xml | application/xml | data.xml |
| .zip | application/zip | archive.zip |
| .mp4 | video/mp4 | video.mp4 |
| .mp3 | audio/mpeg | audio.mp3 |

---

## Path Format Examples

### Classpath (Recommended)
```
classpath:images/profile.jpg
classpath:documents/report.pdf
classpath:data/users.csv
classpath:testfiles/sample.zip
```

### Absolute Path
```
file:C:/Users/username/Documents/file.pdf
file:/home/user/documents/file.pdf
file:D:/projects/testdata/image.jpg
```

### Variable
```
${extractedPath}$
${documentUrl}$
${uploadFile}$
```

---

## Common Patterns

### Pattern 1: User Registration with Avatar
```
POST /users/register

Form Data:
├─ [Text] username = johndoe
├─ [Text] email = john@example.com
├─ [Text] password = ********
└─ [File] avatar
   ├─ Value: classpath:images/default-avatar.png
   └─ Content-Type: image/png
```

### Pattern 2: Bulk Document Upload
```
POST /documents/bulk-upload

Form Data:
├─ [Text] folderId = folder123
├─ [File] doc1 = classpath:docs/file1.pdf
├─ [File] doc2 = classpath:docs/file2.pdf
└─ [File] doc3 = classpath:docs/file3.pdf
```

### Pattern 3: Form Submission with Attachment
```
POST /support/ticket

Form Data:
├─ [Text] subject = Bug Report
├─ [Text] description = Application crashes on startup
├─ [Text] priority = high
└─ [File] screenshot
   ├─ Value: classpath:screenshots/error.png
   └─ Content-Type: image/png
```

### Pattern 4: Profile Update
```
PUT /users/{id}/profile

Form Data:
├─ [Text] name = John Doe
├─ [Text] bio = Software Engineer
├─ [File] avatar = classpath:images/new-avatar.jpg
└─ [File] coverPhoto = classpath:images/cover.jpg
```

---

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| File not found | Check path spelling and file location |
| Wrong content type | Verify MIME type matches file extension |
| Upload fails | Check server file size limits |
| Variable not working | Ensure variable was extracted in previous step |
| Filename not showing | Add custom filename or check path format |

---

## Best Practices Checklist

- ✅ Use `classpath:` for test files in project
- ✅ Specify correct Content-Type for all files
- ✅ Use descriptive field names
- ✅ Keep test files small (< 1MB)
- ✅ Organize files in dedicated folders
- ✅ Use variables for dynamic paths
- ✅ Add custom filenames when needed
- ✅ Test with various file types
- ✅ Enable/disable fields for testing scenarios
- ✅ Document file requirements in test case name

---

## Testing Checklist

Before running your test:
- [ ] File exists at specified path
- [ ] Content-Type is correct
- [ ] Field names match API expectations
- [ ] Variables are extracted in previous steps
- [ ] File size is within server limits
- [ ] All required fields are enabled
- [ ] Optional fields are properly disabled

---

## Quick Tips

💡 **Tip 1**: Use the checkbox to temporarily disable fields without deleting them

💡 **Tip 2**: Leave filename empty to auto-detect from path

💡 **Tip 3**: Use variables for dynamic file selection based on test flow

💡 **Tip 4**: Group related test files in folders (e.g., `testdata/images/`, `testdata/docs/`)

💡 **Tip 5**: Test with small files first, then scale up

💡 **Tip 6**: Use descriptive filenames that indicate test purpose

💡 **Tip 7**: Keep a reference file with common content types

💡 **Tip 8**: Validate file upload success by checking response or downloading file

---

## Need More Help?

- 📖 See [MULTIPART_GUIDE.md](./MULTIPART_GUIDE.md) for detailed documentation
- 🎨 See [MULTIPART_UI_EXAMPLE.md](./MULTIPART_UI_EXAMPLE.md) for UI layout details
- 📋 See [Karate Multipart documentation.txt](../Karate%20Multipart%20documentation.txt) for Karate-specific details
