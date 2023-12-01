let dövizKuru;
let isConversionActive = false;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "convertPrices") {
    isConversionActive = request.convert;
    if (isConversionActive) {
      fetchDövizKuruVeFiyatlarıDönüştür();
    } else {
      revertPricesToOriginal();
    }
  }
});

function fetchDövizKuruVeFiyatlarıDönüştür() {
  if (dövizKuru && isConversionActive) {
    dönüştürFiyatları();
    return;
  }

  fetch('https://api.exchangerate-api.com/v4/latest/USD')
    .then(response => response.json())
    .then(data => {
      dövizKuru = data.rates.TRY;
      if (isConversionActive) {
        dönüştürFiyatları();
      }
    })
    .catch(error => {
      console.error('Döviz kuru alınırken hata oluştu:', error);
    });
}

// Orijinal fiyatları saklamak için bir Map
const originalPrices = new Map();

function dönüştürFiyatları() {
  // Belirli sınıflarla başlayan tüm elementleri seç
  const fiyatlar = document.querySelectorAll('.discount_final_price, .discount_original_price, .game_purchase_price');
  const ekstraFiyatlar = document.querySelectorAll('[class^="salepreviewwidgets_StoreSalePriceBox"], [class^="salepreviewwidgets_StoreOriginalPrice"]');

  fiyatlar.forEach(fiyatElementi => işlemFiyatElementi(fiyatElementi));
  ekstraFiyatlar.forEach(fiyatElementi => işlemFiyatElementi(fiyatElementi));
}

function işlemFiyatElementi(fiyatElementi) {
  const fiyatText = fiyatElementi.innerText;
  if (fiyatText.includes('$')) {
    // Orijinal fiyatı sakla
    if (!originalPrices.has(fiyatElementi)) {
      originalPrices.set(fiyatElementi, fiyatText);
    }
    // TRY'ye dönüştür
    const usdFiyat = parseFloat(fiyatText.replace('$', '').replace(' USD', ''));
    if (!isNaN(usdFiyat)) {
      const tryFiyat = (usdFiyat * dövizKuru).toFixed(2);
      fiyatElementi.innerText = `${tryFiyat} TRY`;
    }
  }
}

function revertPricesToOriginal() {
  originalPrices.forEach((originalPrice, fiyatElementi) => {
    fiyatElementi.innerText = originalPrice;
  });
  originalPrices.clear(); // Map'i temizle
}

// Sürekli dönüşüm için bir MutationObserver ekleyin
const observer = new MutationObserver(() => {
  if (isConversionActive) {
    fetchDövizKuruVeFiyatlarıDönüştür();
  }
});
observer.observe(document.body, { childList: true, subtree: true });
