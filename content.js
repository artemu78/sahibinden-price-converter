let cachedExchangeRate = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

async function getExchangeRate() {
  const now = Date.now();

  // Use cached rate if it's still fresh
  if (cachedExchangeRate && now - lastFetchTime < CACHE_DURATION) {
    return cachedExchangeRate;
  }

  try {
    const response = await fetch(
      "https://api.exchangerate-api.com/v4/latest/TRY"
    );
    const data = await response.json();
    cachedExchangeRate = data.rates.USD;
    lastFetchTime = now;
    return cachedExchangeRate;
  } catch (error) {
    console.error("Failed to fetch exchange rate:", error);
    // Return cached rate if available, otherwise a fallback rate
    return cachedExchangeRate || 1;
  }
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
      const usdPrice = (turkishLira * tryToUsdRate).toFixed(2);
      const usdSpan = document.createElement("span");
      usdSpan.className = "usd-price";
      usdSpan.style.display = "block";
      usdSpan.style.color = "#007bff";
      usdSpan.style.fontSize = "0.9em";
      usdSpan.textContent = `$${usdPrice} USD`;
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
  // Convert existing prices
  convertPrices();

  // Start observing for changes
  startObserving();
}

// Run when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
