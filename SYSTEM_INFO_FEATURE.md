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

1. Navigate to the Account page
2. Click "Generate bug report info" button
3. A modal opens with automatically collected system information
4. Click "Copy to Clipboard" to copy the information
5. Paste the information when creating a GitHub issue

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
