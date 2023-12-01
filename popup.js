document.addEventListener('DOMContentLoaded', function() {
  // Popup açıldığında toggle butonunun mevcut durumunu yükle
  chrome.storage.local.get('isConversionActive', function(data) {
    const toggleButton = document.getElementById('toggleButton');
    toggleButton.checked = data.isConversionActive || false;
    updateStatusText(toggleButton.checked);
  });
});

document.getElementById('toggleButton').addEventListener('change', function() {
  const isConversionActive = this.checked;
  updateStatusText(isConversionActive);

  // Yeni durumu yerel depolamada sakla
  chrome.storage.local.set({'isConversionActive': isConversionActive});

  // Arka plan scriptine toggle durumunu gönder
  chrome.runtime.sendMessage({action: "toggleConversion", convert: isConversionActive});
  
  // Aktif sekmeye mesaj gönder
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: "convertPrices", convert: isConversionActive});
  });
});

// Durum metnini güncelleme işlevi
function updateStatusText(isConversionActive) {
  if (isConversionActive) {
    document.getElementById('statusText').innerText = 'Fiyatlar Türk lirası cinsinden gösteriliyor.';
  } else {
    document.getElementById('statusText').innerText = 'Fiyatlar Dolar bazlı gösteriliyor.';
  }
}
