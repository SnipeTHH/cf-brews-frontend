/**
 * This file contains shared utilities for making API calls.
 */

/**
 * Fetches a URL with automatic retries on specific errors.
 * @param {string} url The URL to fetch.
 * @param {object} options The options object for fetch (e.g., method, headers, body).
 * @param {number} retries Number of retries.
 * @param {number} delay Initial delay in ms.
 */
export const fetchWithRetry = async (url, options = {}, retries = 3, delay = 1500) => {
  for (let i = 0; i < retries; i++) {
    let response;
    try {
      response = await fetch(url, options);
    } catch (networkError) {
      console.warn(`Attempt ${i + 1}: Network error: ${networkError.message}. Retrying in ${delay}ms...`);
      if (i === retries - 1) {
        window.dispatchEvent(new Event('api-offline'));
        throw new Error(networkError.message || 'Service failed to respond after several retries.');
      }
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
      continue;
    }

    if (response.ok) {
      return response.json();
    }

    if (response.status === 503) {
      console.warn(`Attempt ${i + 1}: Service unavailable (503). Retrying in ${delay}ms...`);
      if (i === retries - 1) {
        window.dispatchEvent(new Event('api-offline'));
        throw new Error(`Service unavailable (503) after ${retries} attempts.`);
      }
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
    } else {
      // For other HTTP errors (e.g., 400, 401, 403, 404, 500)
      // We fail fast: do not retry, do not broadcast offline, just throw the error immediately
      let errorData = await response.json().catch(() => ({}));
      const err = new Error(errorData.message || `Request failed with status ${response.status}`);
      err.data = errorData;
      throw err;
    }
  }
};