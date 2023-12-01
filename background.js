let isConversionActive = false;

// Popup'tan gelen mesajları dinle
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "toggleConversion") {
    isConversionActive = request.convert;
  }
});

// Sekme güncellendiğinde çalışacak fonksiyon
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (tab.url.includes("store.steampowered.com") && changeInfo.status === "complete") {
      // Yerel depolamadan dönüşüm durumunu al
      chrome.storage.local.get('isConversionActive', function(data) {
        const isConversionActive = data.isConversionActive || false;
  
        // Eğer dönüşüm aktifse, içerik scriptine mesaj gönder
        if (isConversionActive) {
          chrome.tabs.sendMessage(tabId, { action: "convertPrices", convert: true }, function(response) {
            if (chrome.runtime.lastError) {
              // Hata varsa burada işleyebilirsiniz
              console.error("Hata: ", chrome.runtime.lastError.message);
            }
          });
        } else {
          // Dönüşüm pasifse, fiyatları orijinal hallerine döndür
          chrome.tabs.sendMessage(tabId, { action: "convertPrices", convert: false }, function(response) {
            if (chrome.runtime.lastError) {
              // Hata varsa burada işleyebilirsiniz
              console.error("Hata: ", chrome.runtime.lastError.message);
            }
          });
        }
      });
    }
  });
  