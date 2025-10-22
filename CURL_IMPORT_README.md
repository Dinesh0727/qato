# 🚀 cURL Import Feature - Complete Guide

## 📖 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [How It Works](#how-it-works)
4. [Features](#features)
5. [Usage Examples](#usage-examples)
6. [Documentation](#documentation)
7. [Architecture](#architecture)
8. [Testing](#testing)
9. [FAQ](#faq)

## Overview

The **cURL Import Feature** allows you to instantly create API test steps by pasting curl commands. This eliminates manual configuration and speeds up test case creation by 10x.

### Why This Feature?

- ⚡ **Speed**: Create API steps in seconds, not minutes
- 🎯 **Accuracy**: No more typos or formatting errors
- 🔄 **Integration**: Works with browser DevTools, Postman, and any curl source
- 📚 **Learning**: Built-in examples help you get started
- 🛠️ **Flexibility**: Supports all common curl formats

## Quick Start

### 1. Get a cURL Command

From browser DevTools:
```
Network tab → Right-click request → Copy as cURL
```

From Postman:
```
Code snippet → cURL
```

### 2. Import It

1. Click **"Import cURL"** button (green button in editor)
2. Paste your curl command
3. Click **"Parse cURL"**
4. Review the preview
5. Click **"Import Step"**

### 3. Done! 🎉

Your API step is ready with:
- ✅ Method configured
- ✅ URL set
- ✅ Headers added
- ✅ Body configured
- ✅ Query params extracted

## How It Works

```
┌─────────────┐
│ cURL Command│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Parser    │ ← Extracts method, URL, headers, body
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Validator  │ ← Checks format and required fields
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Preview   │ ← Shows what will be imported
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  API Step   │ ← Creates configured test step
└─────────────┘
```

## Features

### Supported cURL Options

| Feature | Supported | Example |
|---------|-----------|---------|
| HTTP Methods | ✅ | `-X POST` |
| Headers | ✅ | `-H 'Content-Type: application/json'` |
| Query Params | ✅ | `?page=1&limit=10` |
| Raw Body | ✅ | `--data-raw '{...}'` |
| Form Data | ✅ | `-F 'field=value'` |
| File Upload | ✅ | `-F 'file=@path/to/file'` |
| URL Encoded | ✅ | `--data-urlencode 'key=value'` |
| Line Breaks | ✅ | `\` for multi-line |
| Comments | ✅ | Lines starting with `#` |

### Smart Features

- 🧠 **Auto-detect method** from body presence
- 🎨 **Pretty-print JSON** for readability
- 📁 **Convert file paths** to classpath/file format
- 🔍 **Extract query params** from URL
- 📊 **Group duplicate params** (same key, multiple values)
- ✨ **Clean formatting** (removes extra whitespace)

## Usage Examples

### Example 1: Simple GET Request

**Input:**
```bash
curl 'https://jsonplaceholder.typicode.com/posts/1'
```

**Result:**
- Method: `GET`
- URL: `https://jsonplaceholder.typicode.com/posts/1`
- Body Type: `none`

### Example 2: POST with JSON

**Input:**
```bash
curl -X POST 'https://api.example.com/users' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer abc123' \
  --data-raw '{
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30
  }'
```

**Result:**
- Method: `POST`
- URL: `https://api.example.com/users`
- Headers: `Content-Type`, `Authorization`
- Body Type: `raw`
- Body: Pretty-printed JSON

### Example 3: File Upload

**Input:**
```bash
curl -X POST 'https://api.example.com/upload' \
  -H 'Authorization: Bearer token123' \
  -F 'description=My document' \
  -F 'file=@/Users/john/documents/report.pdf' \
  -F 'category=reports'
```

**Result:**
- Method: `POST`
- URL: `https://api.example.com/upload`
- Headers: `Authorization`
- Body Type: `form-data`
- Form Fields:
  - `description`: "My document" (text)
  - `file`: "file:/Users/john/documents/report.pdf" (file)
  - `category`: "reports" (text)

### Example 4: Query Parameters

**Input:**
```bash
curl 'https://api.example.com/search?q=test&page=1&limit=20&sort=name&sort=date'
```

**Result:**
- Method: `GET`
- URL: `https://api.example.com/search?q=test&page=1&limit=20&sort=name&sort=date`
- Query Params:
  - `q`: "test"
  - `page`: "1"
  - `limit`: "20"
  - `sort`: ["name", "date"] (array for multiple values)

### Example 5: URL Encoded Form

**Input:**
```bash
curl -X POST 'https://api.example.com/login' \
  --data-urlencode 'username=john@example.com' \
  --data-urlencode 'password=secret123' \
  --data-urlencode 'remember=true'
```

**Result:**
- Method: `POST`
- URL: `https://api.example.com/login`
- Body Type: `x-www-form-urlencoded`
- Fields: `username`, `password`, `remember`

## Documentation

### For Users

| Document | Purpose | Location |
|----------|---------|----------|
| **Quick Start** | Get started in 3 steps | `webview-ui/CURL_IMPORT_QUICKSTART.md` |
| **Full Guide** | Comprehensive documentation | `webview-ui/CURL_IMPORT.md` |
| **Cheat Sheet** | Quick reference card | `webview-ui/CURL_IMPORT_CHEATSHEET.md` |
| **Visual Guide** | UI mockups and flows | `webview-ui/CURL_IMPORT_VISUAL_GUIDE.md` |

### For Developers

| Document | Purpose | Location |
|----------|---------|----------|
| **Implementation** | Technical details | `CURL_IMPORT_IMPLEMENTATION.md` |
| **Summary** | Feature overview | `CURL_IMPORT_FEATURE_SUMMARY.md` |
| **This File** | Complete guide | `CURL_IMPORT_README.md` |

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │  Editor.tsx      │      │  StepCard.tsx    │       │
│  │  (Import button) │      │  (Helper box)    │       │
│  └────────┬─────────┘      └────────┬─────────┘       │
│           │                         │                  │
│           └─────────┬───────────────┘                  │
│                     │                                  │
│           ┌─────────▼──────────┐                       │
│           │ CurlImportDialog   │                       │
│           │ (Dialog component) │                       │
│           └─────────┬──────────┘                       │
│                     │                                  │
├─────────────────────┼──────────────────────────────────┤
│                     │                                  │
│           ┌─────────▼──────────┐                       │
│           │   CurlParser       │                       │
│           │   (Core logic)     │                       │
│           └────────────────────┘                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### File Structure

```
webview-ui/
├── src/
│   ├── components/
│   │   ├── CurlImportDialog.tsx    ← UI component
│   │   ├── Editor.tsx               ← Integration point 1
│   │   └── StepCard.tsx             ← Integration point 2
│   └── utils/
│       ├── curlParser.ts            ← Core parser
│       └── __tests__/
│           └── curlParser.test.ts   ← Tests
└── docs/
    ├── CURL_IMPORT.md
    ├── CURL_IMPORT_QUICKSTART.md
    ├── CURL_IMPORT_CHEATSHEET.md
    └── CURL_IMPORT_VISUAL_GUIDE.md
```

### Data Flow

```
User Input (cURL)
    ↓
CurlParser.cleanCurlCommand()
    ↓
CurlParser.isCurlCommand()
    ↓
CurlParser.parse()
    ↓
ApiStepConfig object
    ↓
Preview in Dialog
    ↓
User confirms
    ↓
New TestStep created
    ↓
Added to TestCase
```

## Testing

### Unit Tests

Located in: `webview-ui/src/utils/__tests__/curlParser.test.ts`

**Coverage:**
- ✅ Simple GET requests
- ✅ POST with JSON body
- ✅ Multiple headers
- ✅ Query parameters
- ✅ Form data (text and files)
- ✅ URL encoded data
- ✅ Edge cases
- ✅ Validation methods

### Manual Testing

**Test Checklist:**
- [ ] Import from Chrome DevTools
- [ ] Import from Firefox DevTools
- [ ] Import from Postman
- [ ] Import with authentication headers
- [ ] Import with file upload
- [ ] Import with query parameters
- [ ] Import with multiple values for same param
- [ ] Test error handling (invalid curl)
- [ ] Test from editor button
- [ ] Test from step card helper
- [ ] Verify imported step is editable
- [ ] Verify variable substitution works after import
- [ ] Test with line continuations
- [ ] Test with comments
- [ ] Test JSON pretty-printing

### Running Tests

```bash
cd webview-ui
npm test curlParser
```

## FAQ

### Q: What curl formats are supported?

**A:** We support the most common curl formats:
- Standard curl with `-X` method flag
- Headers with `-H` or `--header`
- Body data with `--data`, `--data-raw`, `-d`
- Form data with `-F`, `--form`
- URL encoded with `--data-urlencode`

### Q: Can I import curl from browser DevTools?

**A:** Yes! This is one of the primary use cases:
1. Open DevTools (F12)
2. Go to Network tab
3. Right-click on a request
4. Select "Copy as cURL"
5. Paste into our import dialog

### Q: What happens to file paths?

**A:** File paths are automatically converted:
- Absolute paths → `file:/absolute/path`
- Relative paths → `classpath:relative/path`

### Q: Can I edit the imported step?

**A:** Yes! After import, you can:
- Modify any field
- Add validations
- Insert variables (`${varName}$`)
- Save as template
- Run immediately

### Q: What if my curl command has errors?

**A:** The parser will:
1. Show a clear error message
2. Indicate what's wrong
3. Suggest how to fix it
4. Let you try again

### Q: Does it work with authentication?

**A:** Yes! Authentication headers are imported:
```bash
-H 'Authorization: Bearer token123'
-H 'X-API-Key: secret'
```

### Q: Can I import multiple curl commands at once?

**A:** Not currently, but this is planned for a future release. For now, import them one at a time.

### Q: What about cookies?

**A:** Cookies are not automatically imported. You can add them manually as headers after import:
```
Cookie: session=abc123; user=john
```

### Q: Does it support proxy settings?

**A:** No, proxy settings from curl are not imported. These are typically environment-specific and should be configured separately.

### Q: Can I export API steps back to curl?

**A:** Not yet, but this is a planned feature for a future release.

## Tips & Tricks

### 💡 Pro Tips

1. **Use Examples**: Start with built-in examples to learn
2. **Test First**: Always click "Parse" before "Import"
3. **Review Preview**: Check the preview details carefully
4. **Edit After**: Don't worry about perfection, edit after import
5. **Save Templates**: Save frequently used imports as templates
6. **Add Variables**: Use `${varName}$` syntax for dynamic values
7. **Add Validations**: Add response validations after import

### 🎯 Best Practices

1. **Clean curl commands**: Remove unnecessary flags before import
2. **Use line breaks**: Multi-line curls are easier to read
3. **Check URLs**: Ensure URLs are complete with protocol
4. **Verify headers**: Review imported headers for sensitive data
5. **Test immediately**: Run the imported step to verify it works

### ⚡ Keyboard Shortcuts

- `Ctrl+V` / `Cmd+V`: Paste curl command
- `Enter`: Parse curl (when textarea focused)
- `Esc`: Close dialog

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Invalid curl command" | Missing `curl` prefix | Add `curl` at the start |
| "Could not extract URL" | URL not quoted | Wrap URL in quotes |
| Headers not imported | Wrong flag format | Use `-H 'Name: Value'` |
| Body not imported | Wrong data flag | Use `--data-raw` or `-d` |
| File path error | Invalid path format | Check file exists and path is correct |

### Getting Help

1. Check the documentation files
2. Review the examples
3. Test with a simple curl first
4. Check browser console for errors
5. Verify curl command works in terminal

## Contributing

### Reporting Issues

If you find a bug or have a suggestion:
1. Check existing documentation
2. Try with a simple example
3. Note the exact curl command that fails
4. Include error messages
5. Describe expected vs actual behavior

### Feature Requests

Ideas for future enhancements:
- Export to curl format
- Batch import
- Browser extension
- Curl history
- Custom templates
- Auto-validation

## License

This feature is part of the QATO VSCode extension.

## Credits

Developed with ❤️ to make API testing faster and easier.

---

**Need Help?**
- 📚 See documentation files in `webview-ui/` folder
- 🎓 Try built-in examples in the import dialog
- 💡 Check the cheat sheet for quick reference
