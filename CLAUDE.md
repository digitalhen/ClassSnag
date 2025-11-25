# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClassSnag is a Chrome browser extension that automatically books fitness classes on any VirtuGym-powered booking system as soon as they become available. The extension monitors class availability and can automatically refresh the page, click booking buttons, and reserve spots. It works with any gym or fitness center that uses VirtuGym (*.virtuagym.com).

## Architecture

This is a simple Chrome Manifest V3 extension with three main components:

### Component Breakdown

1. **popup.html + popup.js + styles.css** - Extension popup UI that provides user settings:
   - Toggle auto-refresh functionality
   - Set refresh interval (1-60 seconds)
   - Enable/disable automatic class reservation
   - Modern, responsive design with toggle switches and range sliders
   - All settings are persisted to `chrome.storage.sync`
   - Uses constants for storage keys to prevent typos
   - Implements proper error handling for storage operations

2. **content.js** - Content script injected into VirtuGym class pages:
   - Monitors for booking buttons and class availability status
   - Implements automatic page refresh when classes are "Fully booked" or "Too early to book"
   - Automatically clicks the booking button when `addToBasketEnabled` is true
   - Uses MutationObserver with fallback timer to detect dynamic button loading
   - Listens for settings changes from popup via `chrome.storage.onChanged`
   - Works on URLs matching: `https://*.virtuagym.com/classes*` (universal support)
   - Dynamically builds URLs using `window.location.origin` for cross-site compatibility
   - Maintains internal state object instead of polluting window scope

3. **manifest.json** - Chrome extension configuration (Manifest V3):
   - Content scripts run at `document_start` for early DOM manipulation
   - Uses jQuery for DOM manipulation
   - Permissions: `activeTab`, `storage`
   - Host permissions: `https://*.virtuagym.com/*` (works with any VirtuGym site)

### Key Data Flow

Settings (popup.js) → Chrome Storage → content.js → Page Monitoring → Auto-booking

The content script maintains a state object that syncs with Chrome storage:
- `state.refreshEnabled` - Enable/disable auto-refresh
- `state.refreshAmount` - Seconds between refreshes
- `state.addToBasketEnabled` - Enable/disable auto-click booking
- `state.refreshTimer` - Reference to the active refresh timer

### Page Monitoring Logic

The content script uses two approaches to detect button availability:
1. MutationObserver on `.event-actions` element for real-time detection
2. Fallback setInterval (1s) to ensure buttons are eventually detected

Once buttons load, `beginRefresh()` checks for:
- Available booking button (`#book_btn`) - clicks if auto-booking enabled
- Already booked status (`"Cancel booking"` span) - stops monitoring
- "Fully booked" or "Too early to book" - sets up auto-refresh timer
- "Too late to book" - stops monitoring

## Development Commands

This extension has no build process. Load directly in Chrome:

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the project directory

To test changes, click the refresh icon on the extension card after modifying files.

## Code Style

The codebase follows modern JavaScript conventions:
- Uses `const` and `let` instead of `var`
- Consistent use of constants for configuration values
- Arrow functions for callbacks
- Proper function naming and separation of concerns
- State management through objects rather than global variables

## Important Constraints

- jQuery dependency included (jquery.min.js)
- Only works with VirtuGym-powered booking systems
- Uses `chrome.storage.sync` which syncs settings across devices
- Requires Chrome or Chromium-based browser

## Branding

- **Name**: ClassSnag
- **Tagline**: "Never miss your favorite class"
- **Color Scheme**: Purple gradient (primary: #667eea, secondary: #764ba2)
- **Target Audience**: Fitness enthusiasts using VirtuGym booking systems
