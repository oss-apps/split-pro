# System Info Button Feature

## Overview

This feature adds a "Generate bug report info" button to the account page that automatically collects environment details to help with issue reporting on GitHub.

## Implementation Details

### Components Added

- `src/components/Account/SystemInfoButton.tsx` - Main component that collects and displays system information

### Files Modified

- `src/pages/account.tsx` - Added SystemInfoButton import and placement
- `public/locales/en/account_page.json` - Added English translations
- `public/locales/de/account_page.json` - Added German translations

### Features

1. **System Information Collection**: Automatically gathers:

   - App version (0.1.0-dev for development, 0.1.0 for production)
   - Browser name and version
   - Operating system
   - Screen resolution
   - Language and timezone
   - User agent string
   - Timestamp

2. **Formatted Output**: Creates a markdown-formatted template that includes:

   - System information section
   - Issue description template
   - Steps to reproduce template
   - Expected vs actual behavior sections
   - Additional context section

3. **Copy to Clipboard**: One-click copying of the formatted information

4. **Internationalization**: Supports multiple languages with translation keys

### Usage

#### How to Access the System Info Button

**Step 1: Open the Application**

1. Open your web browser (Chrome, Firefox, Safari, etc.)
2. Navigate to: `http://localhost:3001` (or the deployed URL)
3. You should see the SplitPro homepage

**Step 2: Navigate to Account Page**
You have two ways to reach the Account page:

- **Option A: Direct URL**

  - Type in address bar: `http://localhost:3001/account`

- **Option B: Through the UI**
  - From the homepage, look for the user icon/profile menu (usually in top-right corner)
  - Click on it to access the account page
  - Note: Authentication may be required

**Step 3: Locate the System Info Button**
Once on the Account page, scroll down to find the button list:

- You'll see your profile information at the top (name, email, avatar)
- Below that, there's a list of action buttons including:
  - "Change language" (Languages icon)
  - "Star us on GitHub" (GitHub icon)
  - **"Generate bug report info"** ← **OUR NEW BUTTON** 🎯
    - **Icon:** Orange Bug icon 🐛
    - **Position:** Between "Star us on GitHub" and "Sponsor us"
  - "Sponsor us" (Heart icon)
  - Other account options...

#### Using the Feature

1. Click "Generate bug report info" button
2. A modal opens with automatically collected system information
3. Review the generated system details and bug report template
4. Click "Copy to Clipboard" to copy the information
5. Paste the information when creating a GitHub issue

#### What You'll See

The button appears as:

```
🐛 Generate bug report info  >
```

The generated system information includes:

- App version (0.1.0-dev for development)
- Browser name and version
- Operating system
- Screen resolution
- Language and timezone settings
- Complete user agent string
- Formatted markdown template for bug reporting

### Button Placement

The button is positioned in the account page between the "Star us on GitHub" and "Sponsor us" buttons, making it easily discoverable for users who want to report issues.

### Translation Keys

- `ui.system_info.title` - Button text
- `ui.system_info.dialog.title` - Modal title
- `ui.system_info.dialog.description` - Modal description
- `ui.system_info.buttons.copy` - Copy button text
- `ui.system_info.buttons.close` - Close button text
- `ui.system_info.messages.copied_success` - Success message
- `ui.system_info.errors.copy_failed` - Error message

### Technical Implementation

- Uses React hooks (useState, useCallback) for state management
- Leverages browser APIs for system information gathering
- Uses the existing UI component library (Dialog, Button, Textarea)
- Follows the existing code patterns and style guidelines
- Integrates with the existing translation system

This feature addresses the GitHub issue by making it much easier for users to provide comprehensive environment information when reporting bugs, similar to how `flutter doctor` provides system diagnostics.
