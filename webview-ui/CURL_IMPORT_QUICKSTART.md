# cURL Import - Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Copy a cURL Command
Get a curl command from anywhere:
- Browser DevTools (Network tab → Right-click → Copy as cURL)
- Postman (Code snippet → cURL)
- API documentation
- Command line tools

### Step 2: Open Import Dialog
Two ways to access:
1. **From Editor**: Click the green "Import cURL" button
2. **From API Step**: Expand an API step and click "Import cURL" in the blue info box

### Step 3: Import
1. Paste your curl command
2. Click "Parse cURL"
3. Review the preview
4. Click "Import Step"

## 📋 Quick Examples

### Basic GET Request
```bash
curl 'https://api.github.com/users/octocat'
```

### POST with JSON
```bash
curl -X POST 'https://httpbin.org/post' \
  -H 'Content-Type: application/json' \
  -d '{"name":"test","value":123}'
```

### With Authentication
```bash
curl 'https://api.example.com/data' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### File Upload
```bash
curl -X POST 'https://api.example.com/upload' \
  -F 'file=@/path/to/file.pdf' \
  -F 'description=My file'
```

## 💡 Pro Tips

1. **Multi-line Commands**: Use backslash (`\`) for readability - they're handled automatically
2. **After Import**: You can add variable substitution with `${varName}$` syntax
3. **Validation**: Add response validations after importing the step
4. **Templates**: Save frequently used imports as templates for reuse

## 🎯 What Gets Imported

✅ HTTP method (GET, POST, PUT, DELETE, PATCH)  
✅ URL and query parameters  
✅ Headers  
✅ Request body (JSON, form-data, URL-encoded)  
✅ File uploads  

❌ Cookies (add manually if needed)  
❌ SSL/TLS options  
❌ Proxy settings  

## 🔧 Troubleshooting

**"Invalid curl command"**
- Make sure it starts with `curl`
- Check for matching quotes

**"Could not extract URL"**
- Ensure the URL is properly quoted
- Try simplifying the command first

**File paths not working?**
- Use `classpath:` prefix for project files
- Use `file:` prefix for absolute paths

## 📚 Need More Help?

See [CURL_IMPORT.md](./CURL_IMPORT.md) for detailed documentation.
