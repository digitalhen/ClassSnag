"use strict";

var refreshTimer;

(function () {

    function beginRefresh() {
        if ($('#book_btn').length === 1) {
            if (window.addToBasketEnabled) {
                clearInterval(refreshTimer);
                $('#book_btn').click();
            }
        } else if ($('span:contains("Cancel booking")').length === 1) {
            console.log('You already have a booking!');
            clearInterval(refreshTimer);
        } else {
            console.log("inside else");
            console.log("first button text " + $('.event-actions button:first .text').text());

            if ($("span:contains('Fully booked')").length) {
                console.log('inside fully booked');
                clearInterval(refreshTimer);
                refreshTimer = setInterval(function () {
                    if (window.refreshEnabled) {
                        location.reload();
                    }
                }, window.refreshAmount * 1000);
            } else if ($("span:contains('Too early to book')").length) {
                console.log('inside too early to book');
                clearInterval(refreshTimer);
                refreshTimer = setInterval(function () {
                    if (window.refreshEnabled) {
                        location.reload();
                    }
                }, window.refreshAmount * 1000);
            } else if ($("span:contains('Too late to book')").length) {
                console.log('too late to book');
                clearInterval(refreshTimer);
            }
        }
    }

    function onPageLoad(e) {
        chrome.storage.sync.get(['refreshEnabled', 'refreshAmount', 'smsEnabled', 'smsNumber', 'addToBasketEnabled'], function (values) {
            window.refreshEnabled = values.refreshEnabled;
            window.refreshAmount = values.refreshAmount;
            window.smsEnabled = values.smsEnabled;
            window.smsNumber = values.smsNumber;
            window.addToBasketEnabled = values.addToBasketEnabled;

            var url = window.location.href;

            if (window.refreshEnabled && url.indexOf('?load_event_id=') !== -1) {
                waitForButtonsThenRefresh();
            } else {
                $('.class:not(.class_available)').each(function (i, obj) {
                    var classId = $(this).attr('id');
                    $(this).attr("onclick", "window.open('https://coney-island-ymca.virtuagym.com/classes?load_event_id=" + classId + "', '_blank');");
                });
            }
        });
    }

    function waitForButtonsThenRefresh() {
        const fallback = setInterval(() => {
            if ($('.event-actions button').length) {
                clearInterval(fallback);
                console.log("Fallback: Buttons loaded.");
                beginRefresh();
            }
        }, 1000);

        const targetNode = document.querySelector('.event-actions');
        if (targetNode) {
            const observer = new MutationObserver((mutationsList, observer) => {
                for (let mutation of mutationsList) {
                    if ($(mutation.target).find('button').length) {
                        console.log("Observer: Buttons loaded.");
                        clearInterval(fallback);
                        observer.disconnect();
                        beginRefresh();
                        break;
                    }
                }
            });

            observer.observe(targetNode, { childList: true, subtree: true });
        }
    }

    document.addEventListener('DOMContentLoaded', function (e) {
        onPageLoad(e);
    });

    chrome.storage.onChanged.addListener(function (changes, namespace) {
        for (let key in changes) {
            if (key === "smsEnabled") {
                window.smsEnabled = changes[key].newValue;
            }
            if (key === "smsNumber") {
                window.smsNumber = changes[key].newValue;
            }
            if (key === "addToBasketEnabled") {
                window.addToBasketEnabled = changes[key].newValue;
            }
            if (key === "refreshAmount") {
                window.refreshAmount = changes[key].newValue;
            }
            if (key === "refreshEnabled") {
                window.refreshEnabled = changes[key].newValue;
                if (window.refreshEnabled) {
                    waitForButtonsThenRefresh();
                }
            }
        }
    });

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request && request.status === 'refreshEnabled') {
            // Add logic here if needed
        }
    });

})();
