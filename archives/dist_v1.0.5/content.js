let cachedExchangeRate = null;
let lastFetchTime = 0;
let selectedCurrency = "USD"; // Default currency
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

async function getExchangeRate() {
  const now = Date.now();

  // Get the selected currency from storage
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["exchangeRate", "lastUpdateTime", "selectedCurrency"],
      async function (result) {
        // Update the selected currency
        if (result.selectedCurrency) {
          selectedCurrency = result.selectedCurrency;
        }

        // Use cached rate if it's still fresh
        if (
          result.exchangeRate &&
          result.lastUpdateTime &&
          now - result.lastUpdateTime < CACHE_DURATION
        ) {
          cachedExchangeRate = result.exchangeRate;
          lastFetchTime = result.lastUpdateTime;
          resolve(cachedExchangeRate);
          return;
        }

        try {
          const response = await fetch(
            `https://api.exchangerate-api.com/v4/latest/${selectedCurrency}`
          );
          const data = await response.json();
          cachedExchangeRate = data.rates.TRY;
          lastFetchTime = now;

          // Store the exchange rate and last update time in Chrome storage
          chrome.storage.local.set({
            exchangeRate: cachedExchangeRate,
            lastUpdateTime: now,
            lastUpdateDate: new Date(now).toLocaleString(),
          });

          resolve(cachedExchangeRate);
        } catch (error) {
          console.error("Failed to fetch exchange rate:", error);
          // Return cached rate if available, otherwise a fallback rate
          resolve(cachedExchangeRate || 1);
        }
      }
    );
  });
}

async function convertPrices() {
  const tryToUsdRate = await getExchangeRate();

  const priceContainers = document.querySelectorAll(
    ".classified-price-container"
  );

  priceContainers.forEach((container) => {
    // Skip if already converted (has USD display)
    if (container.querySelector(".usd-price")) {
      return;
    }

    const priceText = container.innerText;
    const turkishLira = parseFloat(
      priceText.replace(/[^0-9,-]+/g, "").replace(",", ".")
    );

    if (!isNaN(turkishLira)) {
      const foreignPrice = (turkishLira / tryToUsdRate).toFixed(2);
      const usdSpan = document.createElement("span");
      usdSpan.className = "usd-price";
      usdSpan.style.display = "block";
      usdSpan.style.color = "#007bff";
      usdSpan.style.fontSize = "0.9em";
      usdSpan.textContent = `${foreignPrice} ${selectedCurrency}`;
      container.appendChild(usdSpan);
    }
  });
}

// Function to handle DOM mutations
function handleMutations(mutations) {
  let shouldConvert = false;

  mutations.forEach((mutation) => {
    // Check if new nodes were added
    if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach((node) => {
        // Check if the added node contains price containers
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (
            node.classList &&
            node.classList.contains("classified-price-container")
          ) {
            shouldConvert = true;
          } else if (
            node.querySelector &&
            node.querySelector(".classified-price-container")
          ) {
            shouldConvert = true;
          }
        }
      });
    }
  });

  if (shouldConvert) {
    // Debounce the conversion to avoid too frequent calls
    clearTimeout(handleMutations.timeoutId);
    handleMutations.timeoutId = setTimeout(convertPrices, 500);
  }
}

// Set up mutation observer
const observer = new MutationObserver(handleMutations);

// Start observing
function startObserving() {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Initialize the extension
function initialize() {
  // Load any previously stored exchange rate
  chrome.storage.local.get(
    ["exchangeRate", "lastUpdateTime", "selectedCurrency"],
    function (result) {
      if (result.exchangeRate && result.lastUpdateTime) {
        cachedExchangeRate = result.exchangeRate;
        lastFetchTime = result.lastUpdateTime;
      }

      if (result.selectedCurrency) {
        selectedCurrency = result.selectedCurrency;
      }

      // Convert existing prices
      convertPrices();

      // Start observing for changes
      startObserving();
    }
  );
}

// Run when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
