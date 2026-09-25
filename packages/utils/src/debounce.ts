/**
 * Creates a debounced function that delays invoking `func` until after `wait` milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * Returns a Promise that resolves with the result of `func`.
 *
 * @param func - The function to debounce.
 * @param wait - The number of milliseconds to delay (default: 300).
 * @returns A debounced function returning a Promise.
 */
export function debounce<F extends (...args: any[]) => any>(
  func: F,
  wait = 300,
) {
  let timeout: ReturnType<typeof setTimeout> | NodeJS.Timeout | undefined;

  return (...args: Parameters<F>): Promise<Awaited<ReturnType<F>>> => {
    if (timeout) {
      clearTimeout(timeout as any);
    }

    return new Promise<Awaited<ReturnType<F>>>((resolve) => {
      timeout = setTimeout(async () => {
        const result = await func(...args);
        resolve(result as Awaited<ReturnType<F>>);
      }, wait);
    });
  };
}
