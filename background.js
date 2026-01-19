'use strict';

const TAB_GROUP_NAME = 'YMCA';
const TAB_GROUP_COLOR = 'yellow';

let ymcaGroupId = null;

async function findOrCreateGroup(windowId) {
    // Try to find an existing "ymca" group in this window
    const groups = await chrome.tabGroups.query({ windowId, title: TAB_GROUP_NAME });
    if (groups.length > 0) {
        return groups[0].id;
    }
    return null;
}

async function openTabInGroup(url, sourceTabId) {
    // Create the new tab
    const tab = await chrome.tabs.create({ url, active: true });

    // Find or create the YMCA group
    let groupId = await findOrCreateGroup(tab.windowId);

    // Collect tabs to group (new tab + source tab if provided)
    const tabIds = [tab.id];
    if (sourceTabId) {
        tabIds.unshift(sourceTabId); // Add source tab first so it appears before new tab
    }

    if (groupId) {
        // Add tabs to existing group
        await chrome.tabs.group({ tabIds, groupId });
    } else {
        // Create new group with these tabs
        groupId = await chrome.tabs.group({ tabIds });
        await chrome.tabGroups.update(groupId, {
            title: TAB_GROUP_NAME,
            color: TAB_GROUP_COLOR
        });
    }

    return tab;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openTabInGroup') {
        const sourceTabId = sender.tab?.id;
        openTabInGroup(message.url, sourceTabId)
            .then(tab => sendResponse({ success: true, tabId: tab.id }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open for async response
    }
});
