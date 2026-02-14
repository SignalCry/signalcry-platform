# WebSocket Debug Guide

## How to See Available Fields from Binance

### Step 1: Restart Your Backend Server

```bash
cd backend
npm run dev
```

### Step 2: Open Frontend and Check Console

```bash
cd frontend
npm run dev
```

Then:
1. Open `http://localhost:3000/market` in your browser
2. Open **Browser DevTools** (F12 or Right-click → Inspect)
3. Go to **Console** tab

### Step 3: Look for Debug Logs

#### In Browser Console (Frontend)

You'll see logs like:

```
[WebSocket] 📨 RAW MESSAGE: {type: 'snapshot', data: Array(14)}
[WebSocket] 📊 SNAPSHOT received with 14 items
[WebSocket] 📋 First item structure: {symbol: "btcusdt", markPrice: 42850.25, ...}
[WebSocket] ✅ Snapshot processed. Keys: ["btcusdt", "ethusdt", ...]
```

And for each price update:

```
[WebSocket] 💹 PRICE UPDATE: {
  symbol: "btcusdt",
  markPrice: 42850.25,
  change: 620.15,
  changePercent: 1.47,
  allFields: {...} // ← This shows ALL available fields
}
```

#### In Backend Terminal

You'll see logs like:

```
[Binance WS] 📨 SAMPLE MESSAGE STRUCTURE: {
  "stream": "btcusdt@markPrice@1s",
  "data": {
    "e": "markPriceUpdate",
    "E": 1707868800000,
    "s": "BTCUSDT",
    "p": "42850.25",
    "i": "42845.50",
    "P": "42855.00",
    "r": "0.00010000",
    "T": 1707868800000
  }
}
```

And for each symbol:

```
[Binance WS] 📊 RAW DATA FROM BINANCE FOR BTCUSDT:
{
  "e": "markPriceUpdate",
  "E": 1707868800000,
  "s": "BTCUSDT",
  "p": "42850.25",
  "i": "42845.50",
  "P": "42855.00",
  "r": "0.00010000",
  "T": 1707868800000
}
[Binance WS] 📋 Available fields for BTCUSDT: ["e", "E", "s", "p", "i", "P", "r", "T"]
```

## Understanding Binance Mark Price Stream Fields

Based on Binance Futures API documentation, the `@markPrice` stream provides:

| Field | Name | Description | Example |
|-------|------|-------------|---------|
| `e` | Event type | Always "markPriceUpdate" | "markPriceUpdate" |
| `E` | Event time | Timestamp in milliseconds | 1707868800000 |
| `s` | Symbol | Trading pair symbol | "BTCUSDT" |
| `p` | Mark price | Current mark price | "42850.25" |
| `i` | Index price | Current index price | "42845.50" |
| `P` | Estimated settle price | Estimated settlement price | "42855.00" |
| `r` | Funding rate | Current funding rate | "0.00010000" |
| `T` | Next funding time | Next funding time timestamp | 1707868800000 |

## What Columns Can You Add?

Based on the Mark Price stream, you can add these columns to your table:

### Currently Used:
- ✅ **Mark Price** (`p`) - Currently displayed as "Price"
- ✅ **Price Change** (calculated)
- ✅ **Change Percent** (calculated)

### Available to Add:
- 💡 **Index Price** (`i`) - The underlying index price
- 💡 **Funding Rate** (`r`) - Current funding rate (important for futures traders)
- 💡 **Next Funding Time** (`T`) - When next funding occurs

### If You Want More Data (Switch to Different Stream)

To get **24h statistics** (volume, high, low, etc.), you need to change to the `@ticker` stream:

**Change backend to use:**
```javascript
`${pair}@ticker` // instead of `${pair}@markPrice@1s`
```

Then you'd get these additional fields:

| Field | Description |
|-------|-------------|
| `c` | Last price |
| `o` | Open price (24h) |
| `h` | High price (24h) |
| `l` | Low price (24h) |
| `v` | Base asset volume |
| `q` | Quote asset volume |
| `p` | Price change |
| `P` | Price change percent |
| `w` | Weighted average price |
| `n` | Number of trades |

## How to Add More Columns

### Step 1: Update Backend Type
In `backend/src/services/binanceWebSocket.js`:

```javascript
// Update price data to include new fields
const priceUpdate = {
  symbol,
  markPrice,
  indexPrice: parseFloat(data.i),      // Add index price
  fundingRate: parseFloat(data.r),      // Add funding rate
  nextFundingTime: data.T,              // Add funding time
  change,
  changePercent,
  timestamp,
};
```

### Step 2: Update Frontend Type
In `frontend/src/hooks/useBinanceWebSocket.ts`:

```typescript
export type PriceUpdate = {
  symbol: string;
  markPrice: number;
  indexPrice?: number;      // Add this
  fundingRate?: number;     // Add this
  nextFundingTime?: number; // Add this
  change: number;
  changePercent: number;
  timestamp: number;
};
```

### Step 3: Update Table UI
In `frontend/app/market/page.tsx`:

Add new column header:
```tsx
<th className="px-5 py-5 font-bold">Funding Rate</th>
```

Add new cell:
```tsx
<td className="px-5 py-1.5 font-medium">
  {(coin.fundingRate * 100).toFixed(4)}%
</td>
```

### Step 4: Update Coin Transform
Also in `market/page.tsx`:

```typescript
result.push({
  id: metadata.id,
  name: metadata.name,
  symbol: metadata.symbol,
  price: priceData.markPrice,
  indexPrice: priceData.indexPrice,      // Add this
  fundingRate: priceData.fundingRate,    // Add this
  nextFundingTime: priceData.nextFundingTime, // Add this
  change: priceData.change,
  changePercent: priceData.changePercent,
  trend: priceData.change >= 0 ? "up" : "down",
});
```

## Quick Test

After making changes above:
1. Restart backend
2. Refresh frontend
3. Check browser console for the new fields in logs
4. Verify table shows new columns

## Remove Debug Logs Later

Once you know what fields are available, remove or comment out the debug logs for production:

### Frontend (`useBinanceWebSocket.ts`):
Comment out lines with `console.log("[WebSocket] 📨` etc.

### Backend (`binanceWebSocket.js`):
Comment out the debug logging in `handleBinanceMessage`

---

**Note:** The logs are verbose for debugging only. Once you identify the fields you need, clean them up for production!
