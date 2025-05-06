import pRetry from 'p-retry';

// Utility to retry a promise-returning function with exponential backoff using p-retry
export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 500,
  factor = 2,
  logger?: { warn: (msg: string) => void },
): Promise<T> {
  return pRetry(fn, {
    retries: maxRetries,
    factor,
    minTimeout: initialDelayMs,
    onFailedAttempt: (error) => {
      if (logger) {
        logger.warn(`Retry attempt #${error.attemptNumber} after failure: ${error.message}`);
      }
    },
  });
}
