'use strict';

(function () {
    const STORAGE_KEYS = {
        REFRESH_ENABLED: 'refreshEnabled',
        REFRESH_AMOUNT: 'refreshAmount',
        ADD_TO_BASKET_ENABLED: 'addToBasketEnabled'
    };

    const BOOKING_STATUS = {
        BOOK_BUTTON: '#book_btn',
        WAITING_LIST_BUTTON: '#join_waiting_list_btn',
        BLOCKED_BUTTON_CLASS: '.event_button_blocked',
        ALREADY_BOOKED: 'Cancel booking',
        FULLY_BOOKED: 'Fully booked',
        TOO_EARLY: 'Too early to book',
        TOO_LATE: 'Too late to book'
    };

    const ERROR_INDICATORS = [
        'redis',
        'rate limit',
        'too many requests',
        'server error',
        '500',
        '502',
        '503',
        '504',
        'temporarily unavailable',
        'try again later'
    ];

    const BOOKING_RESULT_TIMEOUT = 15000; // Reload to verify if the site never responds
    const ERROR_RETRY_BASE = 10000; // 10 seconds initial
    const ERROR_RETRY_MAX = 300000; // 5 minutes max
    const JITTER_FACTOR = 0.2; // ±20% randomization
    const IN_MONITOR_FRAME = window !== window.top;

    let state = {
        bookingPending: false,
        bookingObserver: null,
        bookingResultTimer: null,
        bookingPollTimer: null,
        buttonObserver: null,
        buttonWaitTimer: null,
        monitoringStopped: false,
        refreshEnabled: false,
        refreshAmount: 30,
        addToBasketEnabled: false,
        refreshTimer: null,
        watchdogTimer: null,
        errorRetryCount: 0,
        lastRefreshScheduledAt: null,
        statusBarTimer: null,
        monitoringStartedAt: null,
        refreshCount: 0,
        nextRefreshAt: null,
        currentStatus: 'idle',
        statusMessage: '',
        tabFlashTimer: null
    };

    function postToMonitor(action, data) {
        if (IN_MONITOR_FRAME) {
            window.parent.postMessage({ type: 'classsnag', action, ...data }, '*');
        }
    }

    function doReload() {
        if (IN_MONITOR_FRAME) {
            postToMonitor('reload');
        } else {
            location.reload();
        }
    }

    function addJitter(ms) {
        const jitter = ms * JITTER_FACTOR * (2 * Math.random() - 1);
        return Math.max(1000, Math.round(ms + jitter));
    }

    function clearRefreshTimer() {
        if (state.refreshTimer) {
            clearTimeout(state.refreshTimer);
            state.refreshTimer = null;
        }
    }

    function clearWatchdog() {
        if (state.watchdogTimer) {
            clearInterval(state.watchdogTimer);
            state.watchdogTimer = null;
        }
    }

    function checkForErrorPage() {
        // Empty or missing body is likely a failed load
        if (!document.body || document.body.innerText.trim().length < 50) {
            return 'empty page / failed load';
        }

        const pageText = document.body.innerText.toLowerCase();
        const pageTitle = document.title.toLowerCase();
        const combinedText = pageText + ' ' + pageTitle;

        for (const indicator of ERROR_INDICATORS) {
            if (combinedText.includes(indicator.toLowerCase())) {
                return indicator;
            }
        }
        return null;
    }

    function getErrorRetryDelay() {
        const base = Math.min(ERROR_RETRY_BASE * Math.pow(2, state.errorRetryCount), ERROR_RETRY_MAX);
        state.errorRetryCount++;
        return addJitter(base);
    }

    function handleErrorPage(errorType) {
        const delay = getErrorRetryDelay();
        console.log(`⚠️ Server error detected (${errorType}) - retry #${state.errorRetryCount} in ${Math.round(delay / 1000)}s...`);
        clearRefreshTimer();
        state.nextRefreshAt = Date.now() + delay;
        postToMonitor('nextRefreshAt', { time: state.nextRefreshAt });
        updateStatusBar('error', `Server error: ${errorType} — retrying (#${state.errorRetryCount})`);
        state.refreshTimer = setTimeout(() => {
            if (state.refreshEnabled) {
                console.log('Retrying after error...');
                doReload();
            }
        }, delay);
        state.lastRefreshScheduledAt = Date.now();
        startWatchdog();
    }

    function scheduleRefresh() {
        clearRefreshTimer();
        const delay = addJitter(state.refreshAmount * 1000);
        state.nextRefreshAt = Date.now() + delay;
        postToMonitor('nextRefreshAt', { time: state.nextRefreshAt });
        state.refreshTimer = setTimeout(() => {
            if (state.refreshEnabled) {
                if (!navigator.onLine) {
                    console.log('⏸️  Offline - waiting for connection before refreshing...');
                    updateStatusBar('error', 'Offline — waiting for connection...');
                    state.nextRefreshAt = null;
                    const onlineHandler = () => {
                        window.removeEventListener('online', onlineHandler);
                        console.log('Back online - refreshing now');
                        doReload();
                    };
                    window.addEventListener('online', onlineHandler);
                    return;
                }
                console.log('Auto-refreshing page...');
                doReload();
            }
        }, delay);
        state.lastRefreshScheduledAt = Date.now();
    }

    function startRefreshTimer() {
        state.errorRetryCount = 0; // Reset backoff on normal refresh cycle
        scheduleRefresh();
        startWatchdog();
    }

    function startWatchdog() {
        clearWatchdog();
        // Check every 60s that a refresh is still scheduled
        state.watchdogTimer = setInterval(() => {
            if (!state.refreshEnabled) return;

            // If no refresh is scheduled, restart it
            if (!state.refreshTimer) {
                console.log('🔧 Watchdog: refresh timer missing - restarting');
                scheduleRefresh();
                return;
            }

            // If it's been way too long since we scheduled a refresh, something is stuck
            const maxExpected = Math.max(state.refreshAmount * 1000, ERROR_RETRY_MAX) * 1.5;
            if (state.lastRefreshScheduledAt && (Date.now() - state.lastRefreshScheduledAt) > maxExpected) {
                console.log('🔧 Watchdog: refresh appears stuck - forcing reload');
                doReload();
            }
        }, 60000);
    }

    // --- Status Bar ---

    function formatDuration(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    }

    function saveMonitoringState() {
        chrome.storage.local.set({
            _cs_monitoringStartedAt: state.monitoringStartedAt,
            _cs_refreshCount: state.refreshCount
        });
    }

    function loadMonitoringState(callback) {
        chrome.storage.local.get(['_cs_monitoringStartedAt', '_cs_refreshCount'], (values) => {
            if (values._cs_monitoringStartedAt) {
                state.monitoringStartedAt = values._cs_monitoringStartedAt;
                state.refreshCount = values._cs_refreshCount || 0;
            }
            if (callback) callback();
        });
    }

    function clearMonitoringState() {
        state.monitoringStartedAt = null;
        state.refreshCount = 0;
        state.nextRefreshAt = null;
        chrome.storage.local.remove(['_cs_monitoringStartedAt', '_cs_refreshCount']);
        postToMonitor('monitoringStopped');
    }

    function startMonitoringSession() {
        if (!state.monitoringStartedAt) {
            state.monitoringStartedAt = Date.now();
        }
        state.refreshCount++;
        saveMonitoringState();
        postToMonitor('monitoringStarted');
    }

    function createStatusBar() {
        if (IN_MONITOR_FRAME) return; // Monitor page owns the status bar
        if (document.getElementById('classsnag-status-bar')) return;

        const bar = document.createElement('div');
        bar.id = 'classsnag-status-bar';
        bar.innerHTML = `
            <style>
                #classsnag-status-bar {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 38px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 16px;
                    z-index: 2147483647;
                    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.15);
                    user-select: none;
                }
                #classsnag-status-bar .cs-brand {
                    font-weight: 700;
                    font-size: 14px;
                    letter-spacing: -0.3px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    flex-shrink: 0;
                }
                #classsnag-status-bar .cs-status {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                    justify-content: center;
                    min-width: 0;
                }
                #classsnag-status-bar .cs-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }
                #classsnag-status-bar .cs-dot.monitoring {
                    background: #68d391;
                    animation: cs-pulse 2s ease-in-out infinite;
                }
                #classsnag-status-bar .cs-dot.error {
                    background: #fc8181;
                    animation: cs-pulse 1s ease-in-out infinite;
                }
                #classsnag-status-bar .cs-dot.success {
                    background: #68d391;
                }
                #classsnag-status-bar .cs-dot.stopped {
                    background: #a0aec0;
                }
                #classsnag-status-bar .cs-msg {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    opacity: 0.95;
                }
                #classsnag-status-bar .cs-stats {
                    display: flex;
                    gap: 16px;
                    flex-shrink: 0;
                    opacity: 0.9;
                    font-size: 12px;
                }
                #classsnag-status-bar .cs-stat-label {
                    opacity: 0.7;
                    margin-right: 4px;
                }
                @keyframes cs-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            </style>
            <div class="cs-brand">ClassSnag</div>
            <div class="cs-status">
                <span class="cs-dot stopped" id="cs-dot"></span>
                <span class="cs-msg" id="cs-msg">Initializing...</span>
            </div>
            <div class="cs-stats">
                <span><span class="cs-stat-label">Time:</span><span id="cs-elapsed">--</span></span>
                <span><span class="cs-stat-label">Refreshes:</span><span id="cs-refreshes">0</span></span>
                <span><span class="cs-stat-label">Next:</span><span id="cs-countdown">--</span></span>
            </div>
        `;

        document.body.appendChild(bar);
        // Push page content up so it's not hidden behind the bar
        document.body.style.paddingBottom = (parseFloat(getComputedStyle(document.body).paddingBottom) || 0) + 38 + 'px';

        startStatusBarUpdates();
    }

    function updateStatusBar(status, message) {
        state.currentStatus = status;
        state.statusMessage = message;

        postToMonitor('statusUpdate', { status, message });

        const dot = document.getElementById('cs-dot');
        const msg = document.getElementById('cs-msg');
        if (!dot || !msg) return;

        dot.className = 'cs-dot ' + status;
        msg.textContent = message;
    }

    function startStatusBarUpdates() {
        if (state.statusBarTimer) clearInterval(state.statusBarTimer);
        state.statusBarTimer = setInterval(() => {
            const elapsed = document.getElementById('cs-elapsed');
            const refreshes = document.getElementById('cs-refreshes');
            const countdown = document.getElementById('cs-countdown');
            if (!elapsed) return;

            if (state.monitoringStartedAt) {
                elapsed.textContent = formatDuration(Date.now() - state.monitoringStartedAt);
            }
            refreshes.textContent = state.refreshCount;

            if (state.nextRefreshAt && state.refreshEnabled) {
                const remaining = Math.max(0, state.nextRefreshAt - Date.now());
                countdown.textContent = remaining > 0 ? formatDuration(remaining) : 'now';
            } else {
                countdown.textContent = '--';
            }
        }, 1000);
    }

    function removeStatusBar() {
        const bar = document.getElementById('classsnag-status-bar');
        if (bar) bar.remove();
        if (state.statusBarTimer) {
            clearInterval(state.statusBarTimer);
            state.statusBarTimer = null;
        }
    }

    // --- End Status Bar ---

    function getClassName() {
        const $title = $('.event-title, .class-title, h1').first();
        return $title.length ? $title.text().trim() : 'Your fitness class';
    }

    function playBellSound() {
        const bellUrl = chrome.runtime.getURL('assets/bell.wav');
        const audio = new Audio(bellUrl);
        audio.play().catch(err => console.log('Could not play sound:', err));
    }

    function startTabFlash() {
        if (IN_MONITOR_FRAME) {
            // The monitor page owns the tab title — let it do the flashing
            postToMonitor('classBooked');
            return;
        }
        if (state.tabFlashTimer) return;

        const originalTitle = document.title;
        let flashOn = false;
        state.tabFlashTimer = setInterval(() => {
            flashOn = !flashOn;
            document.title = flashOn ? '🎉 CLASS SNAGGED! 🎉' : originalTitle;
        }, 800);

        const stopFlash = () => {
            if (!state.tabFlashTimer) return;
            clearInterval(state.tabFlashTimer);
            state.tabFlashTimer = null;
            document.title = originalTitle;
        };
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') stopFlash();
        });
        window.addEventListener('click', stopFlash);
    }

    function notifyBookingSuccess() {
        const className = getClassName();
        playBellSound();
        startTabFlash();
        chrome.runtime.sendMessage({ action: 'classBooked', className });
    }

    function getClassCapacity() {
        // Try to extract capacity information (e.g., "15 / 24")
        const $capacityIcon = $('.event-details-icon').filter(function() {
            return $(this).find('[title="Filled"]').length > 0;
        });

        if ($capacityIcon.length) {
            const capacityText = $capacityIcon.find('.icon-text').text().trim();
            return capacityText || null;
        }
        return null;
    }

    function clearBookingWait() {
        state.bookingPending = false;
        if (state.bookingObserver) state.bookingObserver.disconnect();
        clearTimeout(state.bookingResultTimer);
        clearInterval(state.bookingPollTimer);
        state.bookingObserver = null;
        state.bookingResultTimer = null;
        state.bookingPollTimer = null;
    }

    function clearButtonWait() {
        if (state.buttonObserver) state.buttonObserver.disconnect();
        clearInterval(state.buttonWaitTimer);
        state.buttonObserver = null;
        state.buttonWaitTimer = null;
    }

    function clearRefreshCountdown() {
        state.nextRefreshAt = null;
        postToMonitor('nextRefreshAt', { time: null });
    }

    function getFullClassDialog() {
        return $('.bootbox-alert:visible').filter(function () {
            return /could not make a reservation for the class\.\s*class is full\./i.test(
                $(this).find('.bootbox-body').text().replace(/\s+/g, ' ').trim()
            );
        }).first();
    }

    function retryFullClass($dialog) {
        clearBookingWait();
        // The book button and capacity underneath the alert can still be stale.
        // Wait for a fresh page before attempting another reservation.
        updateStatusBar('monitoring', 'Class filled before booking — watching for another opening');
        startRefreshTimer();
        $dialog.find('[data-bb-handler="ok"]').first().click();
    }

    function waitForBookingResult($bookButton) {
        clearRefreshTimer();
        clearWatchdog();
        clearRefreshCountdown();
        state.bookingPending = true;
        updateStatusBar('monitoring', 'Booking requested — waiting for confirmation');

        const checkResult = () => {
            if (!state.bookingPending || !state.refreshEnabled) return;
            const $fullDialog = getFullClassDialog();
            if ($fullDialog.length) {
                retryFullClass($fullDialog);
            } else if ($(`span:contains("${BOOKING_STATUS.ALREADY_BOOKED}")`).length) {
                clearBookingWait();
                state.monitoringStopped = true;
                clearMonitoringState();
                updateStatusBar('success', 'Booked! Reservation confirmed');
                notifyBookingSuccess();
            }
        };

        state.bookingObserver = new MutationObserver(checkResult);
        state.bookingObserver.observe(document.body, {
            childList: true, subtree: true, characterData: true, attributes: true
        });
        state.bookingPollTimer = setInterval(checkResult, 1000);
        state.bookingResultTimer = setTimeout(() => {
            checkResult();
            if (!state.bookingPending) return;
            clearBookingWait();
            updateStatusBar('monitoring', 'Booking unconfirmed — refreshing to check reservation');
            // Re-read the reservation state before deciding whether to book again.
            doReload();
        }, BOOKING_RESULT_TIMEOUT);
        $bookButton.click();
        checkResult();
    }

    function checkBookingStatus() {
        if (!state.refreshEnabled || state.bookingPending || state.monitoringStopped) return;
        const $fullDialog = getFullClassDialog();
        if ($fullDialog.length) {
            retryFullClass($fullDialog);
            return;
        }
        const $bookButton = $(BOOKING_STATUS.BOOK_BUTTON);
        const $waitingListButton = $(BOOKING_STATUS.WAITING_LIST_BUTTON);
        const $blockedButton = $(BOOKING_STATUS.BLOCKED_BUTTON_CLASS);

        const hasAlreadyBooked = $(`span:contains("${BOOKING_STATUS.ALREADY_BOOKED}")`).length > 0;
        const isFullyBooked = $(`span:contains("${BOOKING_STATUS.FULLY_BOOKED}")`).length > 0 || $waitingListButton.length > 0;
        const isTooEarly = $(`span:contains("${BOOKING_STATUS.TOO_EARLY}")`).length > 0;
        const isTooLate = $(`span:contains("${BOOKING_STATUS.TOO_LATE}")`).length > 0;
        const isBlocked = $blockedButton.length > 0;

        // Check if book button is actually available (blue button, not blocked)
        const isBookButtonAvailable = $bookButton.length === 1 &&
                                     $bookButton.is(':visible') &&
                                     !$bookButton.hasClass('event_button_blocked') &&
                                     !$bookButton.hasClass('disabled');

        const capacity = getClassCapacity();
        const capacityInfo = capacity ? ` (${capacity} spots)` : '';

        // Priority 1: Check if booking button is available and enabled
        if (isBookButtonAvailable && !hasAlreadyBooked) {
            if (state.addToBasketEnabled) {
                console.log(`✓ Booking available${capacityInfo} - clicking automatically!`);
                waitForBookingResult($bookButton);
            } else {
                console.log(`✓ Booking available${capacityInfo} - auto-book is disabled`);
                clearRefreshTimer();
                clearWatchdog();
                state.monitoringStopped = true;
                clearRefreshCountdown();
                updateStatusBar('success', `Spot available!${capacityInfo} — auto-book is off`);
            }
        }
        // Priority 2: Check if already booked
        else if (hasAlreadyBooked) {
            console.log('✓ Class already booked - stopping monitoring');
            clearRefreshTimer();
            clearWatchdog();
            state.monitoringStopped = true;
            clearRefreshCountdown();
            updateStatusBar('success', 'Class already booked');
            clearMonitoringState();
        }
        // Priority 3: Check if fully booked (via text or waiting list button)
        else if (isFullyBooked) {
            console.log(`⏳ Class is fully booked${capacityInfo} - monitoring for cancellations...`);
            updateStatusBar('monitoring', `Fully booked${capacityInfo} — watching for cancellations`);
            startRefreshTimer();
        }
        // Priority 4: Check if too early (via text or blocked button)
        else if (isTooEarly || (isBlocked && !isFullyBooked && !isTooLate)) {
            console.log('⏳ Too early to book - waiting for booking window to open...');
            updateStatusBar('monitoring', 'Too early to book — waiting for window to open');
            startRefreshTimer();
        }
        // Priority 5: Check if too late
        else if (isTooLate) {
            console.log('⛔ Too late to book - stopping monitoring');
            clearRefreshTimer();
            clearWatchdog();
            state.monitoringStopped = true;
            clearRefreshCountdown();
            updateStatusBar('stopped', 'Too late to book');
            clearMonitoringState();
        }
        // Fallback: Button not found yet, keep waiting
        else {
            console.log('⏸️  Waiting for page to load...');
            updateStatusBar('monitoring', 'Waiting for page to load...');
        }
    }

    function waitForBookingButtons() {
        clearButtonWait();
        const FALLBACK_INTERVAL = 1000;
        const MAX_WAIT_TIME = 5000; // Max time to wait for buttons before checking for errors
        const BUTTON_SELECTOR = '.event-actions button';
        const TARGET_SELECTOR = '.event-actions';

        let waitTime = 0;

        state.buttonWaitTimer = setInterval(() => {
            if ($(BUTTON_SELECTOR).length) {
                clearButtonWait();
                console.log('Buttons loaded (fallback)');
                checkBookingStatus();
                return;
            }

            waitTime += FALLBACK_INTERVAL;

            // After waiting long enough, check if this is an error page
            if (waitTime >= MAX_WAIT_TIME) {
                const errorType = checkForErrorPage();
                if (errorType) {
                    clearButtonWait();
                    handleErrorPage(errorType);
                    return;
                }
            }
        }, FALLBACK_INTERVAL);

        const targetNode = document.querySelector(TARGET_SELECTOR);
        if (targetNode) {
            state.buttonObserver = new MutationObserver((mutationsList, obs) => {
                for (const mutation of mutationsList) {
                    if ($(mutation.target).find('button').length) {
                        console.log('Buttons loaded (observer)');
                        clearButtonWait();
                        obs.disconnect();
                        checkBookingStatus();
                        break;
                    }
                }
            });

            state.buttonObserver.observe(targetNode, { childList: true, subtree: true });
        }
    }

    function openClassInGroupedTab(url) {
        chrome.runtime.sendMessage({ action: 'openTabInGroup', url });
    }

    function setupClassLinks() {
        $('.class:not(.class_available)').each(function () {
            const classId = $(this).attr('id');
            const currentOrigin = window.location.origin;
            const baseUrl = `${currentOrigin}/classes`;
            const classUrl = `${baseUrl}?load_event_id=${classId}`;

            $(this).css('cursor', 'pointer');
            $(this).off('click').on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                openClassInGroupedTab(classUrl);
            });
        });
    }

    function loadSettings() {
        const keys = Object.values(STORAGE_KEYS);

        chrome.storage.sync.get(keys, (values) => {
            state.refreshEnabled = values[STORAGE_KEYS.REFRESH_ENABLED] || false;
            state.refreshAmount = values[STORAGE_KEYS.REFRESH_AMOUNT] || 30;
            state.addToBasketEnabled = values[STORAGE_KEYS.ADD_TO_BASKET_ENABLED] || false;

            const url = window.location.href;
            const isEventPage = url.includes('?load_event_id=');

            if (state.refreshEnabled && isEventPage) {
                loadMonitoringState(() => {
                    startMonitoringSession();
                    createStatusBar();
                    updateStatusBar('monitoring', 'Starting up...');

                    const errorType = checkForErrorPage();
                    if (errorType) {
                        handleErrorPage(errorType);
                        return;
                    }
                    waitForBookingButtons();
                });
            } else {
                if (isEventPage) {
                    // Show bar even when not monitoring, so user knows extension is present
                    loadMonitoringState(() => {
                        createStatusBar();
                        updateStatusBar('stopped', 'Auto-refresh is off');
                    });
                }
                setupClassLinks();
            }
        });
    }

    function handleStorageChange(changes) {
        for (const key in changes) {
            const newValue = changes[key].newValue;

            switch (key) {
                case STORAGE_KEYS.REFRESH_ENABLED:
                    state.refreshEnabled = newValue;
                    if (newValue) {
                        state.monitoringStopped = false;
                        state.errorRetryCount = 0;
                        startMonitoringSession();
                        createStatusBar();
                        updateStatusBar('monitoring', 'Starting up...');
                        waitForBookingButtons();
                    } else {
                        clearBookingWait();
                        clearButtonWait();
                        clearRefreshCountdown();
                        clearRefreshTimer();
                        clearWatchdog();
                        clearMonitoringState();
                        updateStatusBar('stopped', 'Auto-refresh is off');
                    }
                    break;

                case STORAGE_KEYS.REFRESH_AMOUNT:
                    state.refreshAmount = newValue;
                    if (state.refreshTimer) {
                        startRefreshTimer();
                    }
                    break;

                case STORAGE_KEYS.ADD_TO_BASKET_ENABLED:
                    state.addToBasketEnabled = newValue;
                    break;
            }
        }
    }

    // Listen for keepalive pings from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'keepalive') {
            const isEventPage = window.location.href.includes('?load_event_id=');
            sendResponse({
                alive: true,
                refreshEnabled: state.refreshEnabled,
                hasTimer: !!state.refreshTimer || state.bookingPending || state.monitoringStopped,
                isEventPage
            });

            // If refresh should be running but timer is dead, restart it
            if (state.refreshEnabled && isEventPage && !state.refreshTimer &&
                !state.bookingPending && !state.monitoringStopped) {
                console.log('🔧 Keepalive: restarting missing refresh timer');
                scheduleRefresh();
                startWatchdog();
            }
        }

        if (message.action === 'forceRefresh' && state.refreshEnabled &&
            !state.bookingPending && !state.monitoringStopped) {
            console.log('🔧 Background forced refresh');
            doReload();
        }
    });

    document.addEventListener('DOMContentLoaded', loadSettings);
    chrome.storage.onChanged.addListener(handleStorageChange);

})();
