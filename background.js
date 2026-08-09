'use strict';

const TAB_GROUP_NAME = 'YMCA';
const TAB_GROUP_COLOR = 'yellow';
const KEEPALIVE_ALARM = 'classsnag-keepalive';
const KEEPALIVE_INTERVAL_MINUTES = 1;

// Set up periodic keepalive alarm to prevent service worker death
// and act as a fallback for throttled content script timers
chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: KEEPALIVE_INTERVAL_MINUTES });

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== KEEPALIVE_ALARM) return;

    // Ping all VirtuaGym tabs to check their content scripts are alive
    try {
        const tabs = await chrome.tabs.query({ url: 'https://*.virtuagym.com/classes*' });
        for (const tab of tabs) {
            try {
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'keepalive' });
                if (response && response.refreshEnabled && response.isEventPage && !response.hasTimer) {
                    // Content script is alive but lost its timer — force refresh
                    console.log(`Keepalive: tab ${tab.id} lost timer, forcing refresh`);
                    await chrome.tabs.sendMessage(tab.id, { action: 'forceRefresh' });
                }
            } catch {
                // Content script not loaded or tab not ready — ignore
            }
        }
    } catch {
        // tabs.query failed — ignore
    }
});

function showBookingNotification(className) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon-128.png',
        title: 'Class Snagged!',
        message: className || 'Your class has been booked successfully!',
        priority: 2
    });
}

async function findOrCreateGroup(windowId) {
    // Try to find an existing "ymca" group in this window
    const groups = await chrome.tabGroups.query({ windowId, title: TAB_GROUP_NAME });
    if (groups.length > 0) {
        return groups[0].id;
    }
    return null;
}

async function openTabInGroup(url, sourceTabId) {
    // Wrap class event pages in the monitor frame so the status bar persists across refreshes
    const monitorUrl = chrome.runtime.getURL(`monitor.html?url=${encodeURIComponent(url)}`);
    const tab = await chrome.tabs.create({ url: monitorUrl, active: true });

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
        return true;
    }

    if (message.action === 'classBooked') {
        showBookingNotification(message.className);
        sendResponse({ success: true });
    }
});
