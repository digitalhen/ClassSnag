'use strict';

const frame = document.getElementById('classsnag-frame');
const dot = document.getElementById('cs-dot');
const msg = document.getElementById('cs-msg');
const elapsedEl = document.getElementById('cs-elapsed');
const refreshesEl = document.getElementById('cs-refreshes');
const countdownEl = document.getElementById('cs-countdown');

let monitoringStartedAt = null;
let refreshCount = 0;
let nextRefreshAt = null;
let tickTimer = null;
let tabFlashTimer = null;

function getTargetUrl() {
    const params = new URLSearchParams(window.location.search);
    try {
        const url = new URL(params.get('url'));
        if (url.protocol !== 'https:' ||
            !(url.hostname === 'virtuagym.com' || url.hostname.endsWith('.virtuagym.com')) ||
            !(url.pathname === '/classes' || url.pathname.startsWith('/classes/'))) return null;
        return url.href;
    } catch { return null; }
}

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

function updateStatus(status, message) {
    dot.className = 'cs-dot ' + status;
    msg.textContent = message;
}

function startTick() {
    if (tickTimer) return;
    tickTimer = setInterval(() => {
        if (monitoringStartedAt) {
            elapsedEl.textContent = formatDuration(Date.now() - monitoringStartedAt);
        }
        refreshesEl.textContent = refreshCount;

        if (nextRefreshAt) {
            const remaining = Math.max(0, nextRefreshAt - Date.now());
            countdownEl.textContent = remaining > 0 ? formatDuration(remaining) : 'now';
        } else {
            countdownEl.textContent = '--';
        }
    }, 1000);
}

function startTabFlash() {
    if (tabFlashTimer) return;

    const originalTitle = document.title;
    let flashOn = false;
    tabFlashTimer = setInterval(() => {
        flashOn = !flashOn;
        document.title = flashOn ? '🎉 CLASS SNAGGED! 🎉' : originalTitle;
    }, 800);

    const stopFlash = () => {
        if (!tabFlashTimer) return;
        clearInterval(tabFlashTimer);
        tabFlashTimer = null;
        document.title = originalTitle;
    };
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') stopFlash();
    });
    window.addEventListener('click', stopFlash);
}

function reloadFrame() {
    const url = getTargetUrl();
    if (!url) return;
    refreshCount++;
    refreshesEl.textContent = refreshCount;
    frame.src = url;
}

// Listen for messages from the content script in the iframe
window.addEventListener('message', (event) => {
    const targetUrl = getTargetUrl();
    if (!targetUrl || event.source !== frame.contentWindow || event.origin !== new URL(targetUrl).origin) return;
    const data = event.data;
    if (!data || data.type !== 'classsnag') return;

    switch (data.action) {
        case 'statusUpdate':
            updateStatus(data.status, data.message);
            break;

        case 'reload':
            updateStatus('monitoring', 'Refreshing...');
            reloadFrame();
            break;

        case 'nextRefreshAt':
            nextRefreshAt = data.time;
            break;

        case 'monitoringStarted':
            if (!monitoringStartedAt) {
                monitoringStartedAt = Date.now();
            }
            startTick();
            break;

        case 'classBooked':
            startTabFlash();
            break;

        case 'monitoringStopped':
            monitoringStartedAt = null;
            refreshCount = 0;
            nextRefreshAt = null;
            elapsedEl.textContent = '--';
            refreshesEl.textContent = '0';
            countdownEl.textContent = '--';
            break;
    }
});

// Also listen for settings changes to update bar when user toggles off
chrome.storage.onChanged.addListener((changes) => {
    if (changes.refreshEnabled && !changes.refreshEnabled.newValue) {
        updateStatus('stopped', 'Auto-refresh is off');
        monitoringStartedAt = null;
        refreshCount = 0;
        nextRefreshAt = null;
    }
});

// Initial load
const targetUrl = getTargetUrl();
if (targetUrl) {
    frame.src = targetUrl;

    // Update page title based on the class being monitored
    const urlObj = new URL(targetUrl);
    document.title = `ClassSnag - ${urlObj.hostname}`;
} else {
    updateStatus('error', 'No URL provided');
}
