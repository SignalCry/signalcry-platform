/**
 * Utility functions for formatting cryptocurrency prices, changes, and volumes
 * Centralized to maintain consistency across the application
 */

/**
 * Format cryptocurrency prices dynamically
 * Shows decimals progressively until meaningful digits appear
 * @param price - The price value to format
 * @returns Formatted price string
 */
export function formatPrice(price: number): string {
  if (price === 0) return "0.00";
  
  const absPrice = Math.abs(price);
  
  // For prices >= $1, check if we need extra decimals
  if (absPrice >= 1) {
    const decimalLevels = [2, 3, 4];
    for (const decimals of decimalLevels) {
      const formatted = new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: decimals,
      }).format(price);
      if (!formatted.match(/\.0+$/)) return formatted;
    }
  }
  
  // For prices < $1, progressively try more decimals
  const decimalLevels = [4, 6, 8, 10];
  for (const decimals of decimalLevels) {
    const formatted = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    }).format(price);
    const value = Math.abs(parseFloat(formatted));
    if (value >= 0.00001) return formatted;
  }
  
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 10,
  }).format(price);
}

/**
 * Format 24h price change dynamically
 * Shows decimals progressively until meaningful digits appear
 * @param change - The change value to format
 * @returns Formatted change string
 */
export function formatChange(change: number): string {
  if (change === 0) return "0.00";
  
  // Try progressively more decimals until we see meaningful digits
  const decimalLevels = [2, 4, 6, 8, 10];
  
  for (const decimals of decimalLevels) {
    const formatted = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    }).format(change);
    
    // If we can see meaningful digits (at least shows ±0.01), use this
    const value = Math.abs(parseFloat(formatted));
    if (value >= 0.005) return formatted;
  }
  
  // Fallback: show 10 decimals
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 10,
  }).format(change);
}

/**
 * Format percentage with 2 decimal places
 * @param percent - The percentage value to format
 * @returns Formatted percentage string
 */
export function formatPercent(percent: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percent);
}

/**
 * Format volume with abbreviations (K, M, B)
 * @param volume - The volume value to format
 * @returns Formatted volume string with suffix
 */
export function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) {
    return (volume / 1_000_000_000).toFixed(2) + "B";
  } else if (volume >= 1_000_000) {
    return (volume / 1_000_000).toFixed(2) + "M";
  } else if (volume >= 1_000) {
    return (volume / 1_000).toFixed(2) + "K";
  } else {
    return volume.toFixed(2);
  }
}
