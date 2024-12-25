function saveChanges(e) {
  let refreshEnabled = document.getElementById('refreshEnabled').checked;
  let refreshAmount = document.getElementById('refreshAmount').value;

  let smsEnabled = document.getElementById('smsEnabled').checked;
  let smsNumber = document.getElementById('smsNumber').value;
  let addToBasketEnabled = document.getElementById('addToBasketEnabled').checked;


  
  // Update UI
  document.getElementById('refreshAmountText').innerText = refreshAmount;

  // Save settings
  chrome.storage.sync.set({'refreshEnabled': refreshEnabled, 'refreshAmount': refreshAmount, 'smsEnabled': smsEnabled, 'smsNumber': smsNumber, 'addToBasketEnabled': addToBasketEnabled}, function() {
    //message('Settings saved');
  });

  // let the main content.js know that we've saved settings
  //sendMessage('refreshEnabled');
}

function sendMessage(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, { status: message }, response => {});
  });
}

document.addEventListener('DOMContentLoaded', function () {
  let refreshEnabled = document.getElementById('refreshEnabled');
  let refreshAmount = document.getElementById('refreshAmount');
  let smsEnabled = document.getElementById('smsEnabled');
  let smsNumber = document.getElementById('smsNumber');
  let addToBasketEnabled = document.getElementById('addToBasketEnabled');

  refreshEnabled.addEventListener("click", saveChanges, false);
  refreshAmount.addEventListener("input", saveChanges, false);
  smsEnabled.addEventListener("click", saveChanges, false);
  smsNumber.addEventListener("input", saveChanges, false);
  addToBasketEnabled.addEventListener("click", saveChanges, false);

  chrome.storage.sync.get(['refreshEnabled', 'refreshAmount', 'smsEnabled', 'smsNumber', 'addToBasketEnabled'], function(values){
    refreshEnabled.checked = values.refreshEnabled;
    refreshAmount.value = values.refreshAmount || 30;
    refreshAmountText.innerText = values.refreshAmount || 30;
    smsEnabled.checked = values.smsEnabled;
    smsNumber.value = values.smsNumber;
    addToBasketEnabled.checked = values.addToBasketEnabled;
  });
});