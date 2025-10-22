# cURL Import - Quick Reference Card

## 🚀 Quick Access

| Location | Button | Color |
|----------|--------|-------|
| Editor (Add Step section) | **Import cURL** | Green |
| API Step (Inside card) | **Import cURL** | Blue info box |

## 📋 3-Step Process

```
1. PASTE → 2. PARSE → 3. IMPORT
```

## 🎯 Supported Formats

### Methods
```bash
curl -X GET|POST|PUT|DELETE|PATCH 'url'
```

### Headers
```bash
-H 'Header-Name: value'
--header 'Header-Name: value'
```

### Query Parameters
```bash
curl 'https://api.com/endpoint?key1=value1&key2=value2'
```

### Body Types

#### Raw (JSON/Text)
```bash
--data-raw '{"key":"value"}'
--data '{"key":"value"}'
-d '{"key":"value"}'
```

#### Form Data
```bash
-F 'field=value'
-F 'file=@/path/to/file.pdf'
--form 'field=value'
```

#### URL Encoded
```bash
--data-urlencode 'key=value'
```

## 💡 Quick Examples

### GET with Auth
```bash
curl 'https://api.example.com/data' \
  -H 'Authorization: Bearer TOKEN'
```

### POST JSON
```bash
curl -X POST 'https://api.example.com/users' \
  -H 'Content-Type: application/json' \
  -d '{"name":"John"}'
```

### File Upload
```bash
curl -X POST 'https://api.example.com/upload' \
  -F 'file=@document.pdf'
```

## ⚡ Pro Tips

| Tip | Description |
|-----|-------------|
| 🔄 Line breaks | Use `\` for multi-line curls |
| 📝 Comments | Lines with `#` are ignored |
| 🎨 JSON | Auto-formatted for readability |
| 🔧 Edit after | All fields editable post-import |
| 💾 Save | Can save as template after import |
| 🔗 Variables | Add `${var}$` syntax after import |

## 🎨 What Gets Imported

| Element | Imported | Notes |
|---------|----------|-------|
| Method | ✅ | GET, POST, PUT, DELETE, PATCH |
| URL | ✅ | Full URL with protocol |
| Query Params | ✅ | Extracted and editable |
| Headers | ✅ | All `-H` flags |
| Body | ✅ | Raw, form-data, URL-encoded |
| Files | ✅ | Converted to classpath/file format |
| Cookies | ❌ | Add manually if needed |
| Auth flags | ❌ | Use headers instead |

## 🔍 Common Sources

| Source | How to Get cURL |
|--------|-----------------|
| Chrome DevTools | Network → Right-click → Copy as cURL |
| Firefox DevTools | Network → Right-click → Copy as cURL |
| Postman | Code snippet → cURL |
| API Docs | Usually provided in examples |
| Terminal | Copy from command history |

## ⚠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid curl command" | Ensure starts with `curl` |
| "Could not extract URL" | Check URL is quoted properly |
| File path not working | Use `classpath:` or `file:` prefix |
| Headers not imported | Check `-H` flag format |
| Body not imported | Verify `--data` flag syntax |

## 🎓 Learning Path

1. **Start**: Use built-in examples
2. **Practice**: Import from browser DevTools
3. **Advanced**: Import complex multi-part requests
4. **Master**: Combine with variables and validations

## 📱 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open dialog | Click button |
| Paste | `Ctrl+V` / `Cmd+V` |
| Parse | Click or `Enter` |
| Import | Click button |
| Cancel | `Esc` |

## 🎯 Best Practices

1. ✅ **Test first**: Parse before importing
2. ✅ **Review**: Check preview details
3. ✅ **Edit**: Modify after import if needed
4. ✅ **Validate**: Add response validations
5. ✅ **Save**: Create template for reuse

## 📊 Time Savings

| Task | Manual | With Import | Saved |
|------|--------|-------------|-------|
| Simple GET | 2 min | 15 sec | 1:45 |
| POST + JSON | 5 min | 20 sec | 4:40 |
| Complex + Files | 10 min | 30 sec | 9:30 |

## 🔗 More Help

- **Quick Start**: See `CURL_IMPORT_QUICKSTART.md`
- **Full Guide**: See `CURL_IMPORT.md`
- **Visual Guide**: See `CURL_IMPORT_VISUAL_GUIDE.md`

---

**Remember**: After import, you can:
- Add validations
- Insert variables (`${var}$`)
- Modify any field
- Save as template
- Run immediately
