'use strict';

(function () {
    const STORAGE_KEYS = {
        REFRESH_ENABLED: 'refreshEnabled',
        REFRESH_AMOUNT: 'refreshAmount',
        ADD_TO_BASKET_ENABLED: 'addToBasketEnabled'
    };

    const BOOKING_STATUS = {
        BOOK_BUTTON: '#book_btn',
        ALREADY_BOOKED: 'Cancel booking',
        FULLY_BOOKED: 'Fully booked',
        TOO_EARLY: 'Too early to book',
        TOO_LATE: 'Too late to book'
    };

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

    function startRefreshTimer() {
        clearRefreshTimer();
        state.refreshTimer = setInterval(() => {
            if (state.refreshEnabled) {
                console.log('Auto-refreshing page...');
                location.reload();
            }
        }, state.refreshAmount * 1000);
    }

    function checkBookingStatus() {
        const $bookButton = $(BOOKING_STATUS.BOOK_BUTTON);
        const hasAlreadyBooked = $(`span:contains("${BOOKING_STATUS.ALREADY_BOOKED}")`).length > 0;
        const isFullyBooked = $(`span:contains("${BOOKING_STATUS.FULLY_BOOKED}")`).length > 0;
        const isTooEarly = $(`span:contains("${BOOKING_STATUS.TOO_EARLY}")`).length > 0;
        const isTooLate = $(`span:contains("${BOOKING_STATUS.TOO_LATE}")`).length > 0;

        if ($bookButton.length === 1 && state.addToBasketEnabled) {
            console.log('Booking button found - clicking automatically');
            clearRefreshTimer();
            $bookButton.click();
        } else if (hasAlreadyBooked) {
            console.log('Class already booked');
            clearRefreshTimer();
        } else if (isFullyBooked) {
            console.log('Class is fully booked - setting up auto-refresh');
            startRefreshTimer();
        } else if (isTooEarly) {
            console.log('Too early to book - setting up auto-refresh');
            startRefreshTimer();
        } else if (isTooLate) {
            console.log('Too late to book - stopping monitoring');
            clearRefreshTimer();
        }
    }

    function waitForBookingButtons() {
        const FALLBACK_INTERVAL = 1000;
        const BUTTON_SELECTOR = '.event-actions button';
        const TARGET_SELECTOR = '.event-actions';

        const fallbackTimer = setInterval(() => {
            if ($(BUTTON_SELECTOR).length) {
                clearInterval(fallbackTimer);
                console.log('Buttons loaded (fallback)');
                checkBookingStatus();
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

    function setupClassLinks() {
        $('.class:not(.class_available)').each(function () {
            const classId = $(this).attr('id');
            const currentOrigin = window.location.origin;
            const baseUrl = `${currentOrigin}/classes`;
            $(this).attr('onclick', `window.open('${baseUrl}?load_event_id=${classId}', '_blank');`);
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
