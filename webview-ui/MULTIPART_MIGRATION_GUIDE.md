# Multipart File Upload - Migration Guide

## Overview

This guide helps you migrate existing test cases to use the new enhanced multipart file upload feature.

## What's New?

### Enhanced Features
1. **Content-Type Support**: Specify MIME types for files
2. **Custom Filenames**: Override auto-detected filenames
3. **Better UI**: Improved visual layout and organization
4. **Proper Karate Syntax**: Generates correct `multipart file` and `multipart field` syntax

### Backward Compatibility

✅ **Good News**: Existing test cases will continue to work!

The new implementation is fully backward compatible. Your existing form-data configurations will be automatically upgraded when you open and save them.

## Migration Scenarios

### Scenario 1: Basic File Upload (No Changes Needed)

**Before** (Still Works):
```typescript
formData: [
  { key: 'file', value: 'classpath:data/test.pdf', type: 'file', enabled: true }
]
```

**After** (Enhanced):
```typescript
formData: [
  { 
    key: 'file', 
    value: 'classpath:data/test.pdf', 
    type: 'file', 
    enabled: true,
    contentType: 'application/pdf',  // NEW
    filename: 'test.pdf'              // NEW
  }
]
```

**Action Required**: None - will work as-is, but you can add content-type for better control

---

### Scenario 2: Multiple Files

**Before**:
```typescript
formData: [
  { key: 'image1', value: 'classpath:images/photo1.jpg', type: 'file' },
  { key: 'image2', value: 'classpath:images/photo2.jpg', type: 'file' }
]
```

**After** (Enhanced):
```typescript
formData: [
  { 
    key: 'image1', 
    value: 'classpath:images/photo1.jpg', 
    type: 'file',
    contentType: 'image/jpeg'  // RECOMMENDED
  },
  { 
    key: 'image2', 
    value: 'classpath:images/photo2.jpg', 
    type: 'file',
    contentType: 'image/jpeg'  // RECOMMENDED
  }
]
```

**Action Required**: Optional - add content-type for explicit MIME type control

---

### Scenario 3: Mixed Text and Files

**Before**:
```typescript
formData: [
  { key: 'userId', value: 'user123', type: 'text' },
  { key: 'document', value: 'classpath:docs/report.pdf', type: 'file' }
]
```

**After** (No Changes):
```typescript
formData: [
  { key: 'userId', value: 'user123', type: 'text' },
  { 
    key: 'document', 
    value: 'classpath:docs/report.pdf', 
    type: 'file',
    contentType: 'application/pdf'  // OPTIONAL
  }
]
```

**Action Required**: None - works perfectly as-is

---

## Karate Code Generation Changes

### Old Generation (Still Works)
```gherkin
And header Content-Type = 'multipart/form-data'
* def formDataObj = {}
* def fileContent = karate.read('classpath:data/test.pdf')
* formDataObj.document = { read: fileContent, filename: 'test.pdf' }
And multipart fields formDataObj
```

### New Generation (Better)
```gherkin
And multipart file document = { read: 'classpath:data/test.pdf', filename: 'test.pdf', contentType: 'application/pdf' }
```

**Benefits**:
- ✅ Cleaner, more readable code
- ✅ Follows Karate best practices
- ✅ Better performance
- ✅ Easier to debug

---

## Step-by-Step Migration

### Step 1: Open Your Test Case
1. Navigate to your test case in QATO
2. Open the API step with form-data

### Step 2: Review Current Configuration
- Check which fields are files vs text
- Note any special requirements

### Step 3: Add Content-Types (Recommended)
For each file field:
1. Click on the file field
2. Add appropriate Content-Type (see reference below)
3. Optionally add custom filename

### Step 4: Test
1. Run the test case
2. Verify file upload works correctly
3. Check generated Karate code

### Step 5: Save
- Save the test case
- Changes are persisted automatically

---

## Content-Type Reference

Add these content types to your file fields:

### Images
- JPEG: `image/jpeg`
- PNG: `image/png`
- GIF: `image/gif`
- SVG: `image/svg+xml`

### Documents
- PDF: `application/pdf`
- Word: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Excel: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- PowerPoint: `application/vnd.openxmlformats-officedocument.presentationml.presentation`

### Data
- JSON: `application/json`
- XML: `application/xml`
- CSV: `text/csv`
- Plain Text: `text/plain`

### Archives
- ZIP: `application/zip`
- TAR: `application/x-tar`
- GZIP: `application/gzip`

---

## Common Migration Issues

### Issue 1: Missing Content-Type

**Symptom**: Server rejects file upload

**Solution**: Add explicit content-type to file field
```typescript
contentType: 'application/pdf'
```

---

### Issue 2: Wrong Filename

**Symptom**: Server receives file with unexpected name

**Solution**: Add custom filename
```typescript
filename: 'custom-name.pdf'
```

---

### Issue 3: File Not Found

**Symptom**: Karate reports file not found

**Solution**: Verify path format
- Use `classpath:` for project files
- Use `file:` for absolute paths
- Check spelling and location

---

### Issue 4: Variable Not Working

**Symptom**: Variable not substituted in file path

**Solution**: Ensure variable is extracted in previous step
```typescript
// Previous step
extractVars: [{ name: 'filePath', path: '$.documentUrl' }]

// Current step
value: '${filePath}$'
```

---

## Testing Your Migration

### Checklist
- [ ] All file fields have content-type (recommended)
- [ ] Custom filenames are set where needed
- [ ] Test case runs successfully
- [ ] Generated Karate code looks correct
- [ ] Server receives files correctly
- [ ] Response validation passes

### Validation Steps
1. **Run Test**: Execute the migrated test case
2. **Check Logs**: Review Karate execution logs
3. **Verify Response**: Ensure server processed files correctly
4. **Compare Results**: Match with previous test results

---

## Rollback Plan

If you encounter issues:

### Option 1: Keep Old Configuration
Your old configuration will continue to work. No changes needed.

### Option 2: Remove New Fields
Simply remove the `contentType` and `filename` fields:
```typescript
// Remove these if causing issues
contentType: 'application/pdf',  // Remove
filename: 'custom.pdf'           // Remove
```

### Option 3: Contact Support
If issues persist, document:
- Test case configuration
- Error messages
- Expected vs actual behavior

---

## Best Practices After Migration

1. **Add Content-Types**: Specify MIME types for all files
2. **Use Descriptive Names**: Make field names clear and meaningful
3. **Organize Files**: Keep test files in dedicated folders
4. **Document Changes**: Add comments explaining file requirements
5. **Test Thoroughly**: Verify all scenarios work correctly
6. **Update Documentation**: Keep test case descriptions current

---

## Benefits of Migration

### Immediate Benefits
- ✅ Cleaner Karate code generation
- ✅ Better error messages
- ✅ Explicit content-type control
- ✅ Custom filename support

### Long-Term Benefits
- ✅ Easier maintenance
- ✅ Better debugging
- ✅ More reliable tests
- ✅ Improved documentation

---

## Examples: Before and After

### Example 1: Simple Upload

**Before**:
```json
{
  "formData": [
    { "key": "file", "value": "classpath:test.pdf", "type": "file" }
  ]
}
```

**After**:
```json
{
  "formData": [
    { 
      "key": "file", 
      "value": "classpath:test.pdf", 
      "type": "file",
      "contentType": "application/pdf",
      "filename": "test.pdf"
    }
  ]
}
```

---

### Example 2: Profile Update

**Before**:
```json
{
  "formData": [
    { "key": "name", "value": "John Doe", "type": "text" },
    { "key": "avatar", "value": "classpath:avatar.jpg", "type": "file" }
  ]
}
```

**After**:
```json
{
  "formData": [
    { "key": "name", "value": "John Doe", "type": "text" },
    { 
      "key": "avatar", 
      "value": "classpath:avatar.jpg", 
      "type": "file",
      "contentType": "image/jpeg",
      "filename": "avatar.jpg"
    }
  ]
}
```

---

## FAQ

### Q: Do I need to migrate immediately?
**A**: No, existing test cases will continue to work. Migrate when convenient.

### Q: Will my old test cases break?
**A**: No, the implementation is fully backward compatible.

### Q: What if I don't add content-type?
**A**: Tests will still work, but adding content-type is recommended for better control.

### Q: Can I mix old and new configurations?
**A**: Yes, you can have some fields with content-type and some without.

### Q: How do I know if migration was successful?
**A**: Run your test case and verify it passes with the same results as before.

### Q: What if I encounter issues?
**A**: Keep your old configuration - it will continue to work. Report issues for support.

---

## Support

Need help with migration?
- 📖 See [MULTIPART_GUIDE.md](./MULTIPART_GUIDE.md) for detailed documentation
- 📋 See [MULTIPART_QUICK_REFERENCE.md](./MULTIPART_QUICK_REFERENCE.md) for common patterns
- 🎨 See [MULTIPART_UI_EXAMPLE.md](./MULTIPART_UI_EXAMPLE.md) for UI details

---

## Summary

✅ **Backward Compatible**: Old configurations work without changes
✅ **Optional Enhancement**: Add content-type and filename when ready
✅ **Better Code**: Generates cleaner Karate syntax
✅ **Easy Migration**: Simple step-by-step process
✅ **No Risk**: Can rollback anytime if needed

**Recommendation**: Migrate gradually, starting with new test cases, then update existing ones as you work with them.
