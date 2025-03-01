document.addEventListener('DOMContentLoaded', function() {
  // Check if this is the first time opening the extension
  chrome.storage.local.get(['hasSeenGuide', 'isConversionActive'], function(data) {
    const toggleButton = document.getElementById('toggleButton');
    const sliderElement = document.getElementById('sliderElement');
    const onboardingOverlay = document.getElementById('onboardingOverlay');
    const spotlight = document.querySelector('.spotlight');
    const closeGuideBtn = document.getElementById('closeGuideBtn');
    
    toggleButton.checked = data.isConversionActive || false;
    
    // First time user experience
    if (!data.hasSeenGuide) {
      // Position the spotlight on the slider
      positionSpotlight();
      
      // Show onboarding overlay
      onboardingOverlay.style.opacity = "1";
      
      // Make the overlay clickable but allow interaction with the toggle
      onboardingOverlay.style.pointerEvents = "auto";
      spotlight.style.pointerEvents = "none";
      sliderElement.style.zIndex = "1005"; // Ensure slider is above overlay
      
      // Add highlight animation to slider
      sliderElement.classList.add('slider-highlight');
      
      // Close button event listener
      closeGuideBtn.addEventListener('click', function() {
        closeOnboarding();
        // Mark that the user has seen the guide
        chrome.storage.local.set({'hasSeenGuide': true});
      });
      
      // Also close the guide when user interacts with the toggle
      toggleButton.addEventListener('change', function onToggleChange() {
        closeOnboarding();
        // Mark that the user has seen the guide
        chrome.storage.local.set({'hasSeenGuide': true});
        // Remove this listener after first use
        toggleButton.removeEventListener('change', onToggleChange);
      }, { once: true });
      
      // Close after 8 seconds if user doesn't click the button
      setTimeout(function() {
        if (onboardingOverlay.style.opacity !== "0") {
          closeOnboarding();
          // Mark that the user has seen the guide
          chrome.storage.local.set({'hasSeenGuide': true});
        }
      }, 8000);
      
      // Handle window resize for spotlight positioning
      window.addEventListener('resize', positionSpotlight);
    } else {
      // Hide onboarding for returning users
      onboardingOverlay.style.display = "none";
    }
    
    // Position the spotlight correctly on the slider
    function positionSpotlight() {
      const sliderRect = sliderElement.getBoundingClientRect();
      
      // Position the spotlight directly on the slider
      spotlight.style.top = (sliderRect.top - 5) + 'px';
      spotlight.style.left = (sliderRect.left - 5) + 'px';
      spotlight.style.width = (sliderRect.width + 10) + 'px';
      spotlight.style.height = (sliderRect.height + 10) + 'px';
      
      // Make sure the guide message is below the slider
      const guideMessage = document.querySelector('.guide-message');
      guideMessage.style.top = (sliderRect.bottom + 15) + 'px';
    }
    
    // Close the onboarding overlay
    function closeOnboarding() {
      onboardingOverlay.style.opacity = "0";
      onboardingOverlay.style.pointerEvents = "none";
      sliderElement.classList.remove('slider-highlight');
      sliderElement.style.zIndex = ""; // Reset z-index
      
      // Remove from DOM after fade out
      setTimeout(function() {
        onboardingOverlay.style.display = "none";
      }, 300);
    }
    
    // Durum bilgisini güncelle
    updateStatusUI(toggleButton.checked);
  });
});

document.getElementById('toggleButton').addEventListener('change', function() {
  const isConversionActive = this.checked;
  
  // Durum bilgisini güncelle
  updateStatusUI(isConversionActive);

  // Yeni durumu yerel depolamada sakla
  chrome.storage.local.set({'isConversionActive': isConversionActive});

  // Arka plan scriptine toggle durumunu gönder
  chrome.runtime.sendMessage({action: "toggleConversion", convert: isConversionActive});
  
  // Aktif sekmeye mesaj gönder
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "convertPrices", convert: isConversionActive});
    }
  });
});

/**
 * Durum metni ve bayrakların görünümünü ayarlar
 * @param {boolean} isActive - Dönüşümün aktif olup olmadığı
 */
function updateStatusUI(isActive) {
  const statusText = document.getElementById('statusText');
  const statusTextContent = document.getElementById('statusTextContent');
  const locationInfo = document.getElementById('locationInfo');
  const usdFlag = document.getElementById('usd-flag');
  const tryFlag = document.getElementById('try-flag');
  const separator = document.getElementById('separator');
  
  if (isActive) {
    statusTextContent.textContent = 'Yerel kurda gösteriliyor';
    locationInfo.textContent = 'TL, Türkiye';
    statusText.classList.add('active');
    separator.classList.add('active');
    usdFlag.style.display = 'none';
    tryFlag.style.display = 'flex';
  } else {
    statusTextContent.textContent = 'Orijinal kurda gösteriliyor';
    locationInfo.textContent = 'USD, Amerika Birleşik Devletleri';
    statusText.classList.remove('active');
    separator.classList.remove('active');
    usdFlag.style.display = 'flex';
    tryFlag.style.display = 'none';
  }
}
