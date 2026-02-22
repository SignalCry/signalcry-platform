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
[WebSocket] 📋 First item structure: {symbol: "btcusdt", price: 42850.25, ...}
[WebSocket] ✅ Snapshot processed. Keys: ["btcusdt", "ethusdt", ...]
```

And for each price update:

```
[WebSocket] 💹 PRICE UPDATE: {
  symbol: "btcusdt",
  price: 42850.25,
  priceChange: 620.15,
  priceChangePercent: 1.47,
  allFields: {...} // ← This shows ALL available fields
}
```

#### In Backend Terminal

You'll see logs like:

```
[Binance WS] 📨 SAMPLE MESSAGE STRUCTURE: {
  "stream": "btcusdt@ticker",
  "data": {
    "e": "24hrTicker",
    "E": 1707868800000,
    "s": "BTCUSDT",
    "c": "42850.25",
    "p": "620.15",
    "P": "1.47",
    "v": "12345.678",
    "q": "528901234.56",
    "h": "43200.00",
    "l": "42100.00",
    "o": "42230.10",
    "w": "42650.00",
    "n": 98765
  }
}
```

And for each symbol:

```
[Binance WS] 📊 RAW DATA FROM BINANCE FOR BTCUSDT:
{
  "e": "24hrTicker",
  "E": 1707868800000,
  "s": "BTCUSDT",
  "c": "42850.25",
  "p": "620.15",
  "P": "1.47",
  "v": "12345.678",
  "q": "528901234.56",
  "h": "43200.00",
  "l": "42100.00",
  "o": "42230.10",
  "w": "42650.00",
  "n": 98765
}
[Binance WS] 📋 Available fields for BTCUSDT: ["e", "E", "s", "c", "p", "P", "v", "q", "h", "l", "o", "w", "n"]
```

## Understanding Binance Ticker Stream Fields

Based on Binance Futures API documentation, the `@ticker` stream provides:

| Field | Name | Description | Example |
|-------|------|-------------|---------|
| `e` | Event type | Always "24hrTicker" | "24hrTicker" |
| `E` | Event time | Timestamp in milliseconds | 1707868800000 |
| `s` | Symbol | Trading pair symbol | "BTCUSDT" |
| `c` | Close price | Current (last) price | "42850.25" |
| `p` | Price change | 24h absolute price change | "620.15" |
| `P` | Price change % | 24h price change percent | "1.47" |
| `v` | Base volume | 24h base asset volume (e.g., BTC qty) | "12345.678" |
| `q` | Quote volume | 24h quote asset volume (e.g., USDT value) | "528901234.56" |
| `h` | High price | 24h highest price | "43200.00" |
| `l` | Low price | 24h lowest price | "42100.00" |
| `o` | Open price | 24h open price | "42230.10" |
| `w` | Weighted avg | Weighted average price | "42650.00" |
| `n` | Trade count | Number of trades in 24h | 98765 |

## What Columns Can You Add?

Based on the Ticker stream, you can add these columns to your table:

### Currently Used:
- ✅ **Price** (`c`) - Current close price, displayed as "Price"
- ✅ **Price Change** (`p`) - 24h absolute price change
- ✅ **Price Change %** (`P`) - 24h price change percent
- ✅ **Base Volume** (`v`) - 24h base asset volume
- ✅ **Quote Volume** (`q`) - 24h quote asset volume
- ✅ **High Price** (`h`) - 24h high
- ✅ **Low Price** (`l`) - 24h low
- ✅ **Open Price** (`o`) - 24h open

### Available to Add:
- 💡 **Weighted Avg Price** (`w`) - Average price weighted by trade volume
- 💡 **Trade Count** (`n`) - Number of trades executed in the last 24h

## How to Add More Columns

### Step 1: Update Backend Service
In `backend/src/services/binanceWebSocket.js`, add the new fields to `priceUpdate`:

```javascript
const priceUpdate = {
  symbol,
  price,
  priceChange,
  priceChangePercent,
  volume,
  quoteVolume,
  highPrice,
  lowPrice,
  openPrice,
  weightedAvgPrice: parseFloat(data.w), // Add weighted average price
  tradeCount: data.n,                    // Add number of trades
  timestamp,
};
```

### Step 2: Update Frontend Type
In `frontend/src/hooks/useBinanceWebSocket.ts`:

```typescript
export type PriceUpdate = {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  highPrice: number;
  lowPrice: number;
  openPrice: number;
  weightedAvgPrice?: number; // Add this
  tradeCount?: number;       // Add this
  timestamp: number;
};
```

### Step 3: Update Table UI
In `frontend/app/market/page.tsx`:

Add new column header:
```tsx
<th className="px-5 py-5 font-bold">Trades (24h)</th>
```

Add new cell:
```tsx
<td className="px-5 py-1.5 font-medium">
  {coin.tradeCount?.toLocaleString() ?? "—"}
</td>
```

### Step 4: Update Coin Transform
Also in `market/page.tsx`:

```typescript
result.push({
  id: metadata.id,
  name: metadata.name,
  symbol: metadata.symbol,
  price: priceData.price,
  priceChange: priceData.priceChange,
  priceChangePercent: priceData.priceChangePercent,
  weightedAvgPrice: priceData.weightedAvgPrice, // Add this
  tradeCount: priceData.tradeCount,             // Add this
  trend: priceData.priceChange >= 0 ? "up" : "down",
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
