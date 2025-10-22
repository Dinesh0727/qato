# cURL Import - Visual Guide

## 🎨 User Interface Overview

### 1. Main Import Button (Editor Level)

```
┌─────────────────────────────────────────────────────────┐
│  Add New Step                                           │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌──────────────────────────┐│
│  │  📚 Use Template     │  │  📄 Import cURL          ││
│  │  (Primary button)    │  │  (Green accent)          ││
│  └──────────────────────┘  └──────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 2. In-Step Helper (API Step Level)

```
┌─────────────────────────────────────────────────────────┐
│  API Step Configuration                                 │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐ │
│  │ ℹ️  Want to import from a cURL command?           │ │
│  │                              [Import cURL] button │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Method: [GET ▼]  URL: [________________]              │
└─────────────────────────────────────────────────────────┘
```

### 3. Import Dialog

```
┌─────────────────────────────────────────────────────────┐
│  📄 Import from cURL                              [×]   │
├─────────────────────────────────────────────────────────┤
│  Paste a curl command to automatically create an API    │
│  step configuration                                     │
│                                                         │
│  cURL Command                    [Show Examples ▼]     │
│  ┌───────────────────────────────────────────────────┐ │
│  │ curl 'https://api.example.com/users' \            │ │
│  │   -H 'Content-Type: application/json' \           │ │
│  │   --data-raw '{"name":"John"}'                    │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [Cancel]                              [Parse cURL]    │
└─────────────────────────────────────────────────────────┘
```

### 4. Success Preview

```
┌─────────────────────────────────────────────────────────┐
│  📄 Import from cURL                              [×]   │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐ │
│  │ ✅ Successfully parsed curl command!              │ │
│  │                                                   │ │
│  │ Method: POST                                      │ │
│  │ URL: https://api.example.com/users                │ │
│  │ Headers: 2 header(s)                              │ │
│  │ Body: raw                                         │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [Cancel]                              [Import Step]   │
└─────────────────────────────────────────────────────────┘
```

## 🔄 User Flow Diagram

```
┌─────────────────┐
│  User has curl  │
│    command      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Opens import dialog                │
│  (from editor or step card)         │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Pastes curl command                │
│  (or uses example)                  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Clicks "Parse cURL"                │
└────────┬────────────────────────────┘
         │
         ▼
    ┌────────┐
    │ Valid? │
    └───┬────┘
        │
    ┌───┴───┐
    │       │
   Yes     No
    │       │
    │       ▼
    │   ┌──────────────────┐
    │   │ Show error       │
    │   │ message          │
    │   └──────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  Shows preview with details         │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  User clicks "Import Step"          │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  New API step created               │
│  Dialog closes                      │
│  Success toast shown                │
└─────────────────────────────────────┘
```

## 🎯 Feature Locations

### Location 1: Editor Add Step Section
```
Test Case Editor
├── Flow Control Settings
├── Tags
├── Step 1: API Call
├── Step 2: SQL Query
├── ...
└── ┌─────────────────────────────────┐
    │ [+] Add New Step                │  ← Click to expand
    ├─────────────────────────────────┤
    │ [SQL] [Redis] [API] [Clickhouse]│
    │                                 │
    │ ┌─────────────┐ ┌─────────────┐│
    │ │Use Template │ │Import cURL  ││  ← Import button here
    │ └─────────────┘ └─────────────┘│
    └─────────────────────────────────┘
```

### Location 2: Inside API Step Card
```
API Step Card (Expanded)
├── Header (Method badge, step name)
├── ┌─────────────────────────────────────┐
│   │ ℹ️  Import from cURL helper box    │  ← Helper here
│   └─────────────────────────────────────┘
├── Method & URL inputs
├── Tabs (Params, Headers, Body)
└── Validations
```

## 📱 Responsive Behavior

### Desktop View
- Full dialog width (max-w-3xl)
- Side-by-side buttons in grid layout
- Expanded examples section

### Mobile/Narrow View
- Stacked buttons
- Scrollable dialog content
- Compact examples

## 🎨 Color Scheme

### Import Button (Main)
- Background: Green (matches API theme)
- Border: Green dashed
- Hover: Darker green
- Icon: FileCode

### Helper Box (In-step)
- Background: Blue-50 (light blue)
- Border: Blue-200
- Text: Blue-700
- Icon: FileCode

### Success Preview
- Background: Green-50
- Border: Green-200
- Icon: CheckCircle2 (green)

### Error Alert
- Background: Red-50
- Border: Red-200
- Icon: AlertCircle (red)

## 🔤 Typography

### Dialog Title
- Font: Semibold
- Size: Large
- Icon: FileCode (inline)

### Labels
- Font: Medium
- Size: Small
- Color: Muted foreground

### Code/Curl Input
- Font: Monospace
- Size: Small
- Background: Muted

### Preview Details
- Font: Regular
- Size: Small
- Spacing: Compact list

## 🎭 Animations

### Dialog Open/Close
- Fade in/out
- Slide from top

### Button Hover
- Smooth color transition
- Subtle scale effect

### Success/Error Messages
- Fade in
- Slide down

## 📐 Layout Measurements

### Dialog
- Max width: 3xl (48rem)
- Max height: 80vh
- Padding: Standard (1rem)

### Textarea (Curl input)
- Min height: 150px
- Max height: 600px (auto-expand)
- Font size: Small (0.875rem)

### Buttons
- Height: Standard (2.5rem)
- Padding: 0.5rem 1rem
- Border radius: 0.5rem

### Helper Box
- Padding: 0.75rem
- Border radius: 0.5rem
- Margin bottom: 0.75rem

## 🎪 Interactive Elements

### Clickable Areas
1. Main import button
2. In-step helper button
3. Example snippets
4. Copy example buttons
5. Parse button
6. Import button
7. Cancel button

### Hover States
- All buttons show hover effect
- Example cards highlight on hover
- Copy icons show tooltip

### Focus States
- Textarea has focus ring
- Buttons have focus outline
- Keyboard navigation supported

## 🌈 Theme Support

### Light Mode
- Clean white backgrounds
- Subtle gray borders
- Vibrant accent colors

### Dark Mode
- Dark backgrounds
- Lighter borders
- Adjusted accent colors
- Proper contrast ratios

## 📊 Information Hierarchy

### Priority 1 (Most Important)
- Curl input textarea
- Parse/Import buttons
- Error/success messages

### Priority 2 (Secondary)
- Examples section
- Preview details
- Helper text

### Priority 3 (Tertiary)
- Cancel button
- Copy buttons
- Show/hide examples toggle
