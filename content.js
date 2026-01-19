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

    const ERROR_RETRY_DELAY = 10000; // 10 seconds

    let state = {
        refreshEnabled: false,
        refreshAmount: 30,
        addToBasketEnabled: false,
        refreshTimer: null
    };

    function clearRefreshTimer() {
        if (state.refreshTimer) {
            clearInterval(state.refreshTimer);
            state.refreshTimer = null;
        }
    }

    function checkForErrorPage() {
        const pageText = document.body ? document.body.innerText.toLowerCase() : '';
        const pageTitle = document.title.toLowerCase();
        const combinedText = pageText + ' ' + pageTitle;

        for (const indicator of ERROR_INDICATORS) {
            if (combinedText.includes(indicator.toLowerCase())) {
                return indicator;
            }
        }
        return null;
    }

    function handleErrorPage(errorType) {
        console.log(`⚠️ Server error detected (${errorType}) - retrying in 10 seconds...`);
        clearRefreshTimer();
        state.refreshTimer = setTimeout(() => {
            if (state.refreshEnabled) {
                console.log('Retrying after error...');
                location.reload();
            }
        }, ERROR_RETRY_DELAY);
    }

    function startRefreshTimer() {
        clearRefreshTimer();
        state.refreshTimer = setInterval(() => {
            if (state.refreshEnabled) {
                console.log('Auto-refreshing page...');
                location.reload();
            }
        }, state.refreshAmount * 1000);
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

    function checkBookingStatus() {
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
        if (isBookButtonAvailable) {
            if (state.addToBasketEnabled) {
                console.log(`✓ Booking available${capacityInfo} - clicking automatically!`);
                clearRefreshTimer();
                $bookButton.click();
            } else {
                console.log(`✓ Booking available${capacityInfo} - auto-book is disabled`);
                clearRefreshTimer();
            }
        }
        // Priority 2: Check if already booked
        else if (hasAlreadyBooked) {
            console.log('✓ Class already booked - stopping monitoring');
            clearRefreshTimer();
        }
        // Priority 3: Check if fully booked (via text or waiting list button)
        else if (isFullyBooked) {
            console.log(`⏳ Class is fully booked${capacityInfo} - monitoring for cancellations...`);
            startRefreshTimer();
        }
        // Priority 4: Check if too early (via text or blocked button)
        else if (isTooEarly || (isBlocked && !isFullyBooked && !isTooLate)) {
            console.log('⏳ Too early to book - waiting for booking window to open...');
            startRefreshTimer();
        }
        // Priority 5: Check if too late
        else if (isTooLate) {
            console.log('⛔ Too late to book - stopping monitoring');
            clearRefreshTimer();
        }
        // Fallback: Button not found yet, keep waiting
        else {
            console.log('⏸️  Waiting for page to load...');
        }
    }

    function waitForBookingButtons() {
        const FALLBACK_INTERVAL = 1000;
        const MAX_WAIT_TIME = 5000; // Max time to wait for buttons before checking for errors
        const BUTTON_SELECTOR = '.event-actions button';
        const TARGET_SELECTOR = '.event-actions';

        let waitTime = 0;

        const fallbackTimer = setInterval(() => {
            if ($(BUTTON_SELECTOR).length) {
                clearInterval(fallbackTimer);
                console.log('Buttons loaded (fallback)');
                checkBookingStatus();
                return;
            }

            waitTime += FALLBACK_INTERVAL;

            // After waiting long enough, check if this is an error page
            if (waitTime >= MAX_WAIT_TIME) {
                const errorType = checkForErrorPage();
                if (errorType) {
                    clearInterval(fallbackTimer);
                    handleErrorPage(errorType);
                    return;
                }
            }
        }, FALLBACK_INTERVAL);

        const targetNode = document.querySelector(TARGET_SELECTOR);
        if (targetNode) {
            const observer = new MutationObserver((mutationsList, obs) => {
                for (const mutation of mutationsList) {
                    if ($(mutation.target).find('button').length) {
                        console.log('Buttons loaded (observer)');
                        clearInterval(fallbackTimer);
                        obs.disconnect();
                        checkBookingStatus();
                        break;
                    }
                }
            });

            observer.observe(targetNode, { childList: true, subtree: true });
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
                // Check for error page immediately
                const errorType = checkForErrorPage();
                if (errorType) {
                    handleErrorPage(errorType);
                    return;
                }
                waitForBookingButtons();
            } else {
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
                        waitForBookingButtons();
                    } else {
                        clearRefreshTimer();
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

    document.addEventListener('DOMContentLoaded', loadSettings);
    chrome.storage.onChanged.addListener(handleStorageChange);

})();
