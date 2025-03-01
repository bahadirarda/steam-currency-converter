let dövizKuru;
let isConversionActive = false;

// Sayfa yüklendiğinde dönüşüm durumunu kontrol et
chrome.storage.local.get('isConversionActive', function(data) {
  isConversionActive = data.isConversionActive || false;
  if (isConversionActive) {
    fetchDövizKuruVeFiyatlarıDönüştür();
  }
});

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
  
  // Sepet kısmındaki fiyat elementleri
  const sepetFiyatları = document.querySelectorAll('.pk-LoKoNmmPK4GBiC9DR8, ._3-o3G9jt3lqcvbRXt8epsn, .StoreOriginalPrice');
  
  // Yeni eklenen oyun listesi ve indirim bölümü elementleri
  const yeniOyunFiyatları = document.querySelectorAll('._3fFFsvII7Y2KXNLDk_krOW, ._3j4dI1yA7cRfCvK8h406OB, ._2WLaY5TxjBGVyuWe_6KS3N');
  
  // Diğer olası sepet elementleri - daha genel bir seçici ile
  const genelSepetFiyatları = document.querySelectorAll('[class*="Price"], [class*="price"]');

  fiyatlar.forEach(fiyatElementi => işlemFiyatElementi(fiyatElementi));
  ekstraFiyatlar.forEach(fiyatElementi => işlemFiyatElementi(fiyatElementi));
  sepetFiyatları.forEach(fiyatElementi => işlemFiyatElementi(fiyatElementi));
  yeniOyunFiyatları.forEach(fiyatElementi => işlemFiyatElementi(fiyatElementi));
  
  // Genel seçiciden gelen elementleri kontrol ederek sadece $ işareti içerenleri dönüştür
  genelSepetFiyatları.forEach(element => {
    if (element.innerText && element.innerText.includes('$')) {
      işlemFiyatElementi(element);
    }
  });
}

function işlemFiyatElementi(fiyatElementi) {
  const fiyatText = fiyatElementi.innerText;
  if (fiyatText.includes('$')) {
    // Orijinal fiyatı sakla
    if (!originalPrices.has(fiyatElementi)) {
      originalPrices.set(fiyatElementi, fiyatText);
    }
    
    // TRY'ye dönüştür
    // $ işaretini ve USD gibi ek metinleri kaldır, sadece sayısal değeri al
    const priceRegex = /\$\s*([\d,\.]+)/;
    const match = fiyatText.match(priceRegex);
    
    if (match && match[1]) {
      // Binlik ayırıcıları kaldır, nokta olan ondalık ayırıcıyı koru
      const cleanPrice = match[1].replace(/,/g, '');
      const usdFiyat = parseFloat(cleanPrice);
      
      if (!isNaN(usdFiyat)) {
        // Türk Lirası formatında göster (binlik ayırıcı olarak nokta, ondalık ayırıcı olarak virgül)
        const tryFiyat = (usdFiyat * dövizKuru).toFixed(2);
        const formattedPrice = tryFiyat.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        
        fiyatElementi.innerText = `${formattedPrice} TRY`;
      }
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
const observer = new MutationObserver((mutations) => {
  if (!isConversionActive) return;
  
  let shouldUpdate = false;
  
  // Sadece ilgili değişiklikleri kontrol et
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      // Yeni eklenen elementleri kontrol et
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Fiyat içerebilecek elementleri kontrol et
          const hasPriceElements = 
            node.querySelector('.discount_final_price, .discount_original_price, .game_purchase_price, ' +
            '.pk-LoKoNmmPK4GBiC9DR8, ._3-o3G9jt3lqcvbRXt8epsn, .StoreOriginalPrice, ' +
            '._3fFFsvII7Y2KXNLDk_krOW, ._3j4dI1yA7cRfCvK8h406OB, ._2WLaY5TxjBGVyuWe_6KS3N, ' +
            '[class*="Price"], [class*="price"]');
          
          if (hasPriceElements || node.innerText.includes('$')) {
            shouldUpdate = true;
            break;
          }
        }
      }
    }
    if (shouldUpdate) break;
  }
  
  if (shouldUpdate) {
    // Yeni fiyat elementleri bulundu, dönüşüm yap
    dönüştürFiyatları();
  }
});

// Dokümanın ana içeriğini gözlemle
observer.observe(document.body, { childList: true, subtree: true });

// İlk yükleme ve sayfa değişimlerini izlemek için
function setupPageChangeDetection() {
  // URL değişimlerini izle (History API kullanıldığında)
  let lastUrl = location.href;
  
  // Her 1 saniyede bir URL kontrolü yap
  setInterval(() => {
    if (lastUrl !== location.href) {
      lastUrl = location.href;
      console.log('URL değişti, fiyatları güncelleme...');
      
      // Sayfanın yüklenmesi için kısa bir gecikme ekle
      setTimeout(() => {
        if (isConversionActive) {
          fetchDövizKuruVeFiyatlarıDönüştür();
        }
      }, 1000);
    }
  }, 1000);
  
  // XHR isteklerini izle (AJAX)
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function() {
    this.addEventListener('load', function() {
      // AJAX isteği tamamlandıktan sonra fiyatları güncelle
      if (isConversionActive) {
        setTimeout(() => fetchDövizKuruVeFiyatlarıDönüştür(), 500);
      }
    });
    originalXHROpen.apply(this, arguments);
  };
  
  // Fetch API isteklerini izle
  const originalFetch = window.fetch;
  window.fetch = function() {
    return originalFetch.apply(this, arguments).then(response => {
      // Fetch isteği tamamlandıktan sonra fiyatları güncelle
      if (isConversionActive) {
        setTimeout(() => fetchDövizKuruVeFiyatlarıDönüştür(), 500);
      }
      return response;
    });
  };
}

// Sayfa tam olarak yüklendikten sonra bir kez daha dönüşüm yap (AJAX ile gelen içerik için)
window.addEventListener('load', () => {
  if (isConversionActive) {
    setTimeout(() => fetchDövizKuruVeFiyatlarıDönüştür(), 1000);
  }
  
  // Sayfa değişim izlemesini başlat
  setupPageChangeDetection();
});
