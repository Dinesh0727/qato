# Multipart File Upload UI Example

## Visual Layout

### Form Data Tab - Empty State
```
┌─────────────────────────────────────────────────────────────┐
│ Body Type: [Form Data ▼]                                    │
├─────────────────────────────────────────────────────────────┤
│ ℹ For files: use classpath:path/to/file.ext or             │
│   file:/absolute/path                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [+ Add Field]                                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Form Data Tab - Text Field
```
┌─────────────────────────────────────────────────────────────┐
│ ☑ [Text ▼] ┌──────────────────────────────────────────┐    │
│            │ Field Name: userId                        │    │
│            ├──────────────────────────────────────────┤    │
│            │ Value: user123                           │ [🗑] │
│            └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Form Data Tab - File Field (Full Configuration)
```
┌─────────────────────────────────────────────────────────────┐
│ ☑ [File ▼] ┌──────────────────────────────────────────┐    │
│            │ Field Name: avatar                        │    │
│            ├──────────────────────────────────────────┤    │
│            │ Value: classpath:images/profile.jpg      │    │
│            ├──────────────────────────────────────────┤    │
│            │ Content-Type: image/jpeg                 │    │
│            │ Filename: profile.jpg                    │ [🗑] │
│            └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Complete Example - Mixed Content
```
┌─────────────────────────────────────────────────────────────┐
│ Body Type: [Form Data ▼]                                    │
├─────────────────────────────────────────────────────────────┤
│ ℹ For files: use classpath:path/to/file.ext or             │
│   file:/absolute/path                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ☑ [Text ▼] ┌────────────────────────────────────┐    │   │
│ │            │ Field Name: userId                  │    │   │
│ │            ├────────────────────────────────────┤    │   │
│ │            │ Value: user123                     │ [🗑]│   │
│ │            └────────────────────────────────────┘    │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ☑ [Text ▼] ┌────────────────────────────────────┐    │   │
│ │            │ Field Name: description             │    │   │
│ │            ├────────────────────────────────────┤    │   │
│ │            │ Value: Profile picture upload      │ [🗑]│   │
│ │            └────────────────────────────────────┘    │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ☑ [File ▼] ┌────────────────────────────────────┐    │   │
│ │            │ Field Name: avatar                  │    │   │
│ │            ├────────────────────────────────────┤    │   │
│ │            │ Value: classpath:images/profile.jpg│    │   │
│ │            ├────────────────────────────────────┤    │   │
│ │            │ Content-Type: image/jpeg           │    │   │
│ │            │ Filename: profile.jpg              │ [🗑]│   │
│ │            └────────────────────────────────────┘    │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ☐ [File ▼] ┌────────────────────────────────────┐    │   │
│ │            │ Field Name: backup                  │    │   │
│ │            ├────────────────────────────────────┤    │   │
│ │            │ Value: classpath:images/backup.jpg │    │   │
│ │            ├────────────────────────────────────┤    │   │
│ │            │ Content-Type: image/jpeg           │    │   │
│ │            │ Filename: backup.jpg               │ [🗑]│   │
│ │            └────────────────────────────────────┘    │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│  [+ Add Field]                                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Field States

### Enabled Field (Checked)
- ☑ Checkbox is checked
- All inputs are active and editable
- Field will be included in the request
- Normal opacity and colors

### Disabled Field (Unchecked)
- ☐ Checkbox is unchecked
- Inputs remain visible but appear muted
- Field will NOT be included in the request
- Reduced opacity to indicate disabled state

## Interactive Elements

### Type Selector
```
[Text ▼]  or  [File ▼]
```
- Dropdown to switch between Text and File types
- Changing type shows/hides relevant fields

### Add Field Button
```
[+ Add Field]
```
- Adds a new field (defaults to Text type)
- Appears at the bottom of the field list

### Delete Button
```
[🗑]
```
- Removes the field from the list
- Appears on the right side of each field

### Enable/Disable Checkbox
```
☑  or  ☐
```
- Toggles field inclusion in request
- Appears on the left side of each field

## Placeholder Text Examples

### Text Field Value
```
Value or ${varName}$
```

### File Field Value
```
classpath:data/file.pdf or ${varName}$
```

### Content-Type
```
Content-Type (e.g., image/jpeg)
```

### Filename
```
Filename (optional)
```

## Color Coding (Theme-Aware)

### Light Theme
- Background: Light gray (#f5f5f5)
- Border: Medium gray (#e0e0e0)
- Text: Dark gray (#333333)
- Accent: Blue (#3b82f6)

### Dark Theme
- Background: Dark gray (#1e1e1e)
- Border: Medium gray (#404040)
- Text: Light gray (#e0e0e0)
- Accent: Blue (#60a5fa)

## Responsive Behavior

### Desktop (> 1024px)
- Full width fields
- Side-by-side Content-Type and Filename inputs
- Comfortable spacing

### Tablet (768px - 1024px)
- Slightly reduced spacing
- Side-by-side Content-Type and Filename inputs
- Adjusted button sizes

### Mobile (< 768px)
- Stacked Content-Type and Filename inputs
- Full width buttons
- Reduced padding

## Accessibility Features

1. **Keyboard Navigation**: All fields are keyboard accessible
2. **Screen Reader Support**: Proper ARIA labels
3. **Focus Indicators**: Clear focus states for all interactive elements
4. **Color Contrast**: WCAG AA compliant contrast ratios
5. **Touch Targets**: Minimum 44x44px touch targets for mobile

## User Flow

1. **Select Body Type**: Choose "Form Data" from dropdown
2. **Add Field**: Click "+ Add Field" button
3. **Configure Field**:
   - Select type (Text or File)
   - Enter field name
   - Enter value/path
   - For files: optionally add content-type and filename
4. **Enable/Disable**: Use checkbox to toggle field
5. **Add More Fields**: Repeat steps 2-4 as needed
6. **Delete Field**: Click trash icon to remove
7. **Save**: Changes auto-save to test case

## Tips Display

A helpful tip is shown at the top of the form data section:
```
ℹ For files: use classpath:path/to/file.ext or file:/absolute/path
```

This provides immediate guidance on file path formats without cluttering the interface.
