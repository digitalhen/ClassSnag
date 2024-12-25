"use strict";

var refreshTimer;

(function() {

	// Extract class date and time from the HTML
	function getClassDetails() {
		const classDateElement = document.querySelector('#class_details .title_item + .value');
		const classTimeElement = classDateElement.nextElementSibling;

		// Get the class date and time from the elements
		const classDateString = classDateElement.textContent.trim(); // Friday December 27
		const classTimeString = classTimeElement.textContent.trim(); // 03:05 pm - 03:50 pm

		return { classDateString, classTimeString };
	}

	// Convert the class date and time into Date objects
	function getClassDateTime() {
		const { classDateString, classTimeString } = getClassDetails();

		// Parse the class date and time into Date objects
		const classDate = new Date(`${classDateString}, 2024 ${classTimeString.split(" ")[0]}`);
		const classTimeParts = classTimeString.split(" - ");
		const classStartTime = new Date(`${classDateString}, 2024 ${classTimeParts[0]}`);

		return { classDate, classStartTime };
	}

	// Check if the booking is within the allowed 48-hour window
	function isBookingAllowed() {
		const { classStartTime } = getClassDateTime();
		const now = new Date();
		const twoDaysAhead = new Date(classStartTime.getTime() - (48 * 60 * 60 * 1000) - (5 * 1000));

		return now >= twoDaysAhead; // plus 5 minutes
	}

	// Refresh logic and booking checking integration
	function beginRefresh() {
		// Only refresh if the booking button is not found
		if ($('#book_btn').length === 1) {
			// Stop the refresh cycle if booking button is found
			if (window.addToBasketEnabled) {
				$('#book_btn').click();
			}
		} else if ($('span:contains("Cancel booking")').length === 1) {
			// Stop refreshing if booking already exists
			console.log('You already have a booking!');
			clearInterval(refreshTimer);
		} else {
			// Check if it's within the 48-hour window to book
			if (isBookingAllowed()) {
				// Stop refreshing and attempt to book
				if (window.addToBasketEnabled) {
					$('#book_btn').click();
				}
			} else {
				// Only refresh if it's not yet time to book
				console.log("It's too early to book. Refreshing in 1 minute...");
				clearInterval(refreshTimer);
				refreshTimer = setInterval(function() {
					// Reload page periodically if it's necessary (time-based refresh)
					if (window.refreshEnabled) {
						location.reload();
					}
				}, 60000); // wait 1 minute
			}
		}
	}

	function onPageLoad(e) {
		chrome.storage.sync.get(['refreshEnabled', 'refreshAmount', 'smsEnabled', 'smsNumber', 'addToBasketEnabled'], function(values) {
			// Store values to the window object for easy access
			window.refreshEnabled = values.refreshEnabled;
			window.refreshAmount = values.refreshAmount;
			window.smsEnabled = values.smsEnabled;
			window.smsNumber = values.smsNumber;
			window.addToBasketEnabled = values.addToBasketEnabled;

			var url = window.location.href;

			// Start refreshing if necessary and on the correct page
			if (window.refreshEnabled && url.indexOf('?' + 'load_event_id' + '=') !== -1) {
				beginRefresh();
			} else {
				// Update clickable classes only once
				$('.class:not(.class_available)').each(function(i, obj) {
					var classId = $(this).attr('id');
					$(this).attr("onclick", "window.open('https://coney-island-ymca.virtuagym.com/classes?load_event_id=" + classId + "', '_blank');");
				});
			}
		});
	}

	document.addEventListener('DOMContentLoaded', function(e) {
		onPageLoad(e);

		// Observe changes to only relevant parts of the page
		const targetNode = $('body')[0];
		const config = { attributes: false, childList: true, subtree: false };

		// Create an observer instance and observe only when necessary
		const observer = new MutationObserver(onPageLoad);
		observer.observe(targetNode, config);
	});

	// Function to manage the storage changes efficiently
	chrome.storage.onChanged.addListener(function(changes, namespace) {
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
					beginRefresh();
				}
			}
		}
	});

	chrome.runtime.onMessage.addListener(
		function(request, sender, sendResponse) {
			if (request) {
				switch (request.status) {
					case 'refreshEnabled':
						// Handle status update if needed
						break;
				}
			}
		}
	);
})();
