// DOM elements
const currentRateElement = document.getElementById("current-rate");
const lastUpdateElement = document.getElementById("last-update");
const refreshButton = document.getElementById("refresh-rate");
const statusElement = document.getElementById("status");
const currencySelect = document.getElementById("currency-select");

// Default currency
const DEFAULT_CURRENCY = "USD";

// Load the stored exchange rate, last update time, and selected currency
function loadStoredData() {
  chrome.storage.local.get(
    ["exchangeRate", "lastUpdateDate", "selectedCurrency"],
    function (result) {
      const currency = result.selectedCurrency || DEFAULT_CURRENCY;

      // Set the dropdown to the saved currency
      currencySelect.value = currency;

      if (result.exchangeRate) {
        currentRateElement.textContent = `1 ${currency} = ${result.exchangeRate} TRY`;
      } else {
        currentRateElement.textContent = "Not available";
      }

      if (result.lastUpdateDate) {
        lastUpdateElement.textContent = result.lastUpdateDate;
      } else {
        lastUpdateElement.textContent = "Never";
      }
    }
  );
}

// Update currency and fetch new exchange rate
function updateCurrency() {
  const selectedCurrency = currencySelect.value;
  statusElement.textContent = `Updating to ${selectedCurrency}...`;

  // First save the selected currency
  chrome.storage.local.set({ selectedCurrency }, function () {
    // Then fetch the new exchange rate
    fetchExchangeRate();
  });
}

// Fetch a new exchange rate
async function fetchExchangeRate() {
  statusElement.textContent = "Fetching latest exchange rate...";

  // Get the selected currency
  chrome.storage.local.get(["selectedCurrency"], async function (result) {
    const currency = result.selectedCurrency || DEFAULT_CURRENCY;

    try {
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${currency}`
      );
      const data = await response.json();
      const exchangeRate = data.rates.TRY;
      const now = Date.now();
      const updateDate = new Date(now).toLocaleString();

      // Store the new data
      chrome.storage.local.set(
        {
          exchangeRate: exchangeRate,
          lastUpdateTime: now,
          lastUpdateDate: updateDate,
          selectedCurrency: currency,
        },
        function () {
          // Update the UI
          currentRateElement.textContent = `1 ${currency} = ${exchangeRate} TRY`;
          lastUpdateElement.textContent = updateDate;
          statusElement.textContent = "Exchange rate updated successfully!";

          // Clear the status message after 3 seconds
          setTimeout(() => {
            statusElement.textContent = "";
          }, 3000);
        }
      );
    } catch (error) {
      statusElement.textContent =
        "Error fetching exchange rate. Please try again later.";
      console.error("Failed to fetch exchange rate:", error);
    }
  });
}

// Event listeners
document.addEventListener("DOMContentLoaded", loadStoredData);
refreshButton.addEventListener("click", fetchExchangeRate);
currencySelect.addEventListener("change", updateCurrency);
