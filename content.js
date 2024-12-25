"use strict";

var refreshTimer;

(function(){


	/*
	chrome.storage.sync.get(['blurOnDefault', 'blurAmount'], function(values){
		window.imageBlurOpacityAmount = values.blurAmount || 6;
	}); */

	function beginRefresh() {

		if($('#book_btn').length == 1) {
			//alert('item in stock');
			// stop refresh

			// should we click through? this should be the last time
			if(window.addToBasketEnabled) {
				$('#book_btn').click();
			}
		} else if($('span:contains("Cancel booking")').length == 1) { 
			// we already have the booking, so stop
			console.log('You already have a booking!');
			clearInterval(refreshTimer);
		} else {
			//alert('Going to refresh the page');
			
			
			clearInterval(refreshTimer);
			refreshTimer = setInterval(function() {
				/*
				chrome.tabs.executeScript(tab.id, {
					code: "location.reload()"
				}); */

				location.reload();
			}, window.refreshAmount * 1000);
		}
	}

	/*
	function blur(image) {
		if (image.id != window.cloneImageId) {
		  image.style.filter = `blur(${window.imageBlurOpacityAmount}px) opacity(1)`;
	  }
	}

	function show(image) {
		if (image.id != window.cloneImageId) {
		  image.style.filter = "opacity(1)";
	  }
	}

	function blurAll() {
		const images = document.querySelectorAll('img');
		for (const image of images) {
			  blur(image);
	  }
	  window.imageBlurState = "blurred";
	}

	function revealAll() {
		const images = document.querySelectorAll('img');
		for (const image of images) {
	    	show(image);
	  }
	  window.imageBlurState = "revealed";
	} 

	function reveal(e) {
		if (window.imageBlurState === "blurred") {
		    if (e.shiftKey && e.altKey) {
				e.preventDefault();
				e.stopPropagation();
		        show(e.target);

				} else if (e.altKey) {
					e.preventDefault();
					e.stopPropagation();
					revealSome(e);
				}
		}
	}

	function unreveal(e) {
		if (window.imageBlurState === "blurred") {
			blur(e.target);
		}
	}

	function initialBlurAll() {
		const images = document.querySelectorAll('img');
		for (const image of images) {
			if (image.dataset.imageBlurOnLoadUpdateOccured != "true"
		     && image.id != window.cloneImageId) {
				blur(image);
				image.addEventListener('click', reveal);
				image.addEventListener('mouseout', unreveal);
				image.dataset.imageBlurOnLoadUpdateOccured = true;
			}
	  	}
	  	window.imageBlurState = "blurred";
	}

	function removeBGImages() {
		const everything = document.querySelectorAll("*");
		for (item of everything) {
			if (item.style && image.id != window.cloneImageId) {
				item.style.backgroundImage = "none";
			}
		}
	}

	function initialLoadRevealAll() {
		const images = document.querySelectorAll('img');
		for (const image of images) {
			if (image.dataset.imageBlurOnLoadUpdateOccured != "true"
		      && image.id != window.cloneImageId) {
	    		show(image);
	    		image.addEventListener('click', reveal);
				image.addEventListener('mouseout', unreveal);
	    		image.dataset.imageBlurOnLoadUpdateOccured = true;
	    	}
	  	}
	  	window.imageBlurState = "revealed";
	}
 */

	function onPageLoad(e) {
		chrome.storage.sync.get(['refreshEnabled', 'refreshAmount', 'smsEnabled', 'smsNumber', 'addToBasketEnabled'], function(values){
			// TODO: handle what to do if page is refresh enabled at the start

			// Save values to the window
			window.refreshEnabled = values.refreshEnabled;
			window.refreshAmount = values.refreshAmount;
			window.smsEnabled = values.smsEnabled;
			window.smsNumber = values.smsNumber;
			window.addToBasketEnabled = values.addToBasketEnabled;

			var url = window.location.href;

			// checks refresh and checks we're at a load_event page
			if(window.refreshEnabled && url.indexOf('?' + 'load_event_id' + '=') != -1) {
				beginRefresh();
			}
			// update the classes to be clickable
			else {
				$('.class:not(.class_available)').each(function(i, obj) {
					var classId = $(this).attr('id');
					$(this).attr("onclick","window.open('https://coney-island-ymca.virtuagym.com/classes?load_event_id=" + classId + "', '_blank');");
				});
			}
			
			


			/*
			if (values.blurOnDefault) {
				initialBlurAll();
			} else {
				initialLoadRevealAll();
			}
			window.imageBlurOpacityAmount = values.blurAmount || 6; */
		});

		
	}

	function onDomLoad(e) {
		

		
	}

	/*
	function repositionMask(e) {
		const img = e.target;
    const ir = img.getBoundingClientRect();
		 img.style["webkitMaskPosition"] = (e.clientX - ir.left) + "px " +
		   (e.clientY - ir.top) + "px";
	}

	function revealSome(e) {
		const img = e.target;
		const div = document.getElementById(window.maskDivId);
		window.cloneImageId = "imageBlur-copy";
		const masked = document.getElementById(window.cloneImageId);
		if (masked) {
			masked.remove();
		}
		const ir = img.getBoundingClientRect();
		div.style.left =   (ir.left + window.pageXOffset) + "px";
		div.style.top = 	(ir.top + window.pageYOffset) + "px";
		div.style.display = "inline-block";
		div.style["zIndex"] = "100";

		const clone = img.cloneNode(true);
    clone.id = window.cloneImageId; // avoid duplicate id in clone
		clone.style.cursor = "crosshair";
		clone.style.webkitMaskRepeat = "no-repeat";
		const maskUrl = chrome.extension.getURL("assets/mask.png")
		clone.style.webkitMaskImage = "url('" + maskUrl + "')";
		clone.style.filter = "none";
		clone.addEventListener("mousemove", repositionMask);
		clone.addEventListener("click", stopRevealingSome);
		div.appendChild(clone);
		repositionMask(e);
	}

	function stopRevealingSome(img) {
		const div = document.getElementById(window.maskDivId);
		div.style.display = "none";
		if (img.id == window.cloneImageId) {
			img.style.display = "none";
		  img.remove();
	  }
	}

	function addMaskDivToPage(){
		window.maskDivId = "imageBlur-mask-div";
		const maskDiv = document.createElement("div");
		maskDiv.style = "position:absolute;";
		maskDiv.id = window.maskDivId;
		document.body.appendChild(maskDiv);
	} */

	document.addEventListener('DOMContentLoaded', function(e) {
		//addMaskDivToPage();
		onPageLoad(e);
		onDomLoad(e);
		
		const targetNode = $('body')[0];
		const config = { attributes: false, childList: true, subtree: false };

		// Create an observer instance linked to the callback function
		const observer = new MutationObserver(onPageLoad);
		observer.observe(targetNode, config);



		//document.addEventListener('DOMNodeInserted', onPageLoad);
	});

	function getElementByXpath(path) {
		return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
	  }

	chrome.storage.onChanged.addListener(function(changes, namespace) {
		for (key in changes) {
			/* if (key === "blurAmount") {
				window.imageBlurOpacityAmount = changes[key].newValue;
			} */

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

				if(window.refreshEnabled) {
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
						// TODO we don't really need this if we can detect config changes
						//beginRefresh();
						break;
				}
			}
		}
	);
})()
