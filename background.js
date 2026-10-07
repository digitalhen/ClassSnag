'use strict';

const TAB_GROUP_NAME = 'ClassSnag';
const TAB_GROUP_COLOR = 'yellow';
const KEEPALIVE_ALARM = 'classsnag-keepalive';
const KEEPALIVE_INTERVAL_MINUTES = 1;

// Only allow framing class pages initiated by this extension. Ordinary browsing
// and unrelated VirtuaGym frames keep their original security headers.
const frameRulesReady = chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [{
        id: 1,
        priority: 1,
        action: {
            type: 'modifyHeaders',
            responseHeaders: [
                { header: 'X-Frame-Options', operation: 'remove' },
                { header: 'Content-Security-Policy', operation: 'remove' }
            ]
        },
        condition: {
            regexFilter: '^https://([a-zA-Z0-9-]+\\.)*virtuagym\\.com/classes([/?]|$)',
            initiatorDomains: [chrome.runtime.id],
            resourceTypes: ['sub_frame']
        }
    }]
});
frameRulesReady.catch(error => console.error('Could not configure class monitor:', error));

function isClassUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' &&
            (url.hostname === 'virtuagym.com' || url.hostname.endsWith('.virtuagym.com')) &&
            (url.pathname === '/classes' || url.pathname.startsWith('/classes/'));
    } catch { return false; }
}

async function getMonitoredTabIds() {
    const [tabs, contexts] = await Promise.all([
        chrome.tabs.query({ url: 'https://*.virtuagym.com/classes*' }),
        chrome.runtime.getContexts({ contextTypes: ['TAB'] })
    ]);
    const monitorPrefix = chrome.runtime.getURL('monitor.html') + '?';
    return [...new Set([
        ...tabs.map(tab => tab.id),
        ...contexts.filter(context => context.documentUrl?.startsWith(monitorPrefix))
            .map(context => context.tabId)
    ])].filter(id => id >= 0);
}

// Set up periodic keepalive alarm to prevent service worker death
// and act as a fallback for throttled content script timers
chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: KEEPALIVE_INTERVAL_MINUTES });

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== KEEPALIVE_ALARM) return;

    // Ping all VirtuaGym tabs to check their content scripts are alive
    try {
        const tabIds = await getMonitoredTabIds();
        for (const tabId of tabIds) {
            try {
                const response = await chrome.tabs.sendMessage(tabId, { action: 'keepalive' });
                if (response && response.refreshEnabled && response.isEventPage && !response.hasTimer) {
                    // Content script is alive but lost its timer — force refresh
                    console.log(`Keepalive: tab ${tabId} lost timer, forcing refresh`);
                    await chrome.tabs.sendMessage(tabId, { action: 'forceRefresh' });
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
    // Try to find an existing ClassSnag group in this window
    const groups = await chrome.tabGroups.query({ windowId, title: TAB_GROUP_NAME });
    if (groups.length > 0) {
        return groups[0].id;
    }
    return null;
}

async function openTabInGroup(url, sourceTabId) {
    if (!isClassUrl(url)) throw new Error('Unsupported class URL');
    await frameRulesReady;
    // Wrap class event pages in the monitor frame so the status bar persists across refreshes
    const monitorUrl = chrome.runtime.getURL(`monitor.html?url=${encodeURIComponent(url)}`);
    const tab = await chrome.tabs.create({ url: monitorUrl, active: true });

    // Find or create the ClassSnag group
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
