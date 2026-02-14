# Binance Futures WebSocket Implementation

## Overview
Your market table now uses **real-time data** from Binance Futures WebSocket API instead of static data. This implementation provides live price updates for 14 trading pairs while maintaining all existing features.

## What Was Implemented

### ✅ Backend (Node.js + Express)

1. **WebSocket Service** (`backend/src/services/binanceWebSocket.js`)
   - Connects to Binance Futures mark price streams
   - Manages 14 trading pairs simultaneously
   - Handles automatic reconnection with exponential backoff
   - Broadcasts updates to all connected clients
   - Throttles updates (500ms minimum interval per symbol)
   - Singleton pattern for efficient resource usage

2. **WebSocket Server** (`backend/src/routes/websocket.js`)
   - WebSocket server at `/ws/market`
   - Handles client connections/disconnections
   - Keep-alive ping/pong mechanism (30s interval)
   - Sends initial snapshot when clients connect

3. **Server Update** (`backend/index.js`)
   - Upgraded from Express app to HTTP server
   - WebSocket integrated alongside REST API

### ✅ Frontend (Next.js + React + TypeScript)

1. **Custom Hook** (`frontend/src/hooks/useBinanceWebSocket.ts`)
   - Reusable WebSocket connection management
   - Auto-reconnect with exponential backoff
   - Connection status tracking
   - Type-safe price data handling
   - Handles disconnections gracefully

2. **Market Page** (`frontend/app/market/page.tsx`)
   - Replaced REST API calls with WebSocket hook
   - Added connection status indicator (Live/Connecting/Error)
   - Real-time price updates without page refresh
   - **TradingView integration preserved** ✓
   - Table structure and styling unchanged ✓

## Supported Trading Pairs (14)

| Symbol | Name | Binance Stream |
|--------|------|----------------|
| BTC | Bitcoin | btcusdt@markPrice@1s |
| ETH | Ethereum | ethusdt@markPrice@1s |
| BNB | BNB | bnbusdt@markPrice@1s |
| SOL | Solana | solusdt@markPrice@1s |
| XRP | XRP | xrpusdt@markPrice@1s |
| ADA | Cardano | adausdt@markPrice@1s |
| DOGE | Dogecoin | dogeusdt@markPrice@1s |
| TRX | TRON | trxusdt@markPrice@1s |
| MATIC | Polygon | maticusdt@markPrice@1s |
| LINK | Chainlink | linkusdt@markPrice@1s |
| LTC | Litecoin | ltcusdt@markPrice@1s |
| AVAX | Avalanche | avaxusdt@markPrice@1s |
| DOT | Polkadot | dotusdt@markPrice@1s |
| ATOM | Cosmos | atomusdt@markPrice@1s |

## How to Run

### 1. Start Backend Server
```bash
cd backend
npm run dev
```

Server runs on `http://localhost:4000`
WebSocket available at `ws://localhost:4000/ws/market`

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:3000`

### 3. View Market Table
Navigate to `http://localhost:3000/market`

You should see:
- Green "Live" indicator when connected
- Real-time price updates
- Price changes updating automatically
- Click any row to open TradingView chart

## Features Implemented

### ✅ Real-Time Updates
- Prices update automatically via WebSocket
- No page refresh needed
- Mark price from Binance Futures

### ✅ Connection Management
- **Auto-reconnect**: Automatically reconnects if connection drops
- **Exponential backoff**: 1s → 2s → 4s → 8s (max 30s)
- **Keep-alive**: Ping/pong every 30 seconds
- **24h protection**: Binance closes after 24h, auto-reconnects

### ✅ Connection Status Indicator
- 🟢 **Green "Live"**: Connected and receiving data
- 🟡 **Yellow "Connecting..."**: Attempting connection
- 🔴 **Red "Error"**: Connection error
- ⚫ **Gray "Disconnected"**: Not connected

### ✅ Performance Optimizations
- **Throttling**: Updates limited to 500ms per symbol
- **Efficient broadcasting**: Only sends to active clients
- **Auto-cleanup**: Closes Binance connection when no clients
- **Snapshot on connect**: New clients get current prices immediately

### ✅ TradingView Integration (Preserved)
- Click any coin row → Opens `/symbols/{coin.id}`
- TradingView chart integration still works
- All existing links intact

## Architecture

```
┌─────────────────┐
│  Binance Futures │
│   WebSocket API  │
└────────┬─────────┘
         │ wss://fstream.binance.com/stream
         │ (14 mark price streams)
         │
         ▼
┌─────────────────────────────┐
│  Backend (Node.js)          │
│  ┌───────────────────────┐  │
│  │ BinanceWebSocketService│  │
│  │ - Receives updates    │  │
│  │ - Calculates changes  │  │
│  │ - Throttles messages  │  │
│  └───────────┬───────────┘  │
│              │              │
│  ┌───────────▼───────────┐  │
│  │  WebSocket Server     │  │
│  │  /ws/market           │  │
│  └───────────┬───────────┘  │
└──────────────┼──────────────┘
               │ ws://localhost:4000/ws/market
               │
        ┌──────▼───────┐
        │              │
    ┌───▼───┐     ┌───▼───┐
    │Client1│     │Client2│  (Multiple frontend clients)
    └───────┘     └───────┘
         │             │
         │             │
    ┌────▼─────────────▼────┐
    │  Frontend (Next.js)   │
    │  ┌──────────────────┐ │
    │  │useBinanceWebSocket│ │
    │  │  Custom Hook     │ │
    │  └────────┬─────────┘ │
    │           │           │
    │  ┌────────▼─────────┐ │
    │  │  Market Table    │ │
    │  │  Real-time UI    │ │
    │  └──────────────────┘ │
    └───────────────────────┘
```

## Message Protocol

### Client → Server
No messages required (read-only stream)

### Server → Client

#### 1. Initial Snapshot
Sent when client first connects:
```json
{
  "type": "snapshot",
  "data": [
    {
      "symbol": "btcusdt",
      "markPrice": 42850.25,
      "change": 620.15,
      "changePercent": 1.47,
      "timestamp": 1707868800000
    },
    ...
  ]
}
```

#### 2. Price Update
Real-time updates:
```json
{
  "type": "price_update",
  "data": {
    "symbol": "btcusdt",
    "markPrice": 42875.50,
    "change": 645.40,
    "changePercent": 1.53,
    "timestamp": 1707868801000
  }
}
```

#### 3. Status Update
Connection status changes:
```json
{
  "type": "status",
  "data": {
    "status": "connected" // or "disconnected", "error"
  }
}
```

## Error Handling

### Backend
- Logs all errors to console
- Auto-reconnects to Binance on disconnect
- Handles malformed messages gracefully
- Cleans up resources on shutdown

### Frontend
- Shows error state in UI
- Auto-reconnects with exponential backoff
- Maintains last known data during reconnection
- User-friendly status indicators

## Adding More Trading Pairs

To add more pairs:

1. **Backend** (`backend/src/services/binanceWebSocket.js`):
```javascript
this.tradingPairs = [
  "btcusdt",
  "ethusdt",
  // ... existing pairs
  "newcoinusdt", // Add here
];
```

2. **Frontend** (`frontend/app/market/page.tsx`):
```typescript
const COIN_METADATA = {
  // ... existing metadata
  newcoinusdt: { id: "newcoin", name: "New Coin", symbol: "NEWCOIN" },
};
```

3. Restart both servers

## Comparison: Before vs After

| Feature | Before (REST API) | After (WebSocket) |
|---------|------------------|-------------------|
| Data Source | Static JSON file | Binance Futures live |
| Update Method | Manual page refresh | Real-time automatic |
| Latency | N/A (static) | <100ms |
| Server Load | Low | Low (optimized) |
| Bandwidth | Per request | Efficient (streaming) |
| TradingView | ✓ Works | ✓ Still works |
| Reconnection | N/A | ✓ Automatic |
| Status Indicator | ✗ None | ✓ Live/Error/Connecting |

## Testing

### Test Scenarios

1. **Normal Operation**
   - Open `/market` page
   - See green "Live" indicator
   - Watch prices update in real-time

2. **Reconnection**
   - Stop backend server
   - See "Disconnected" indicator
   - Restart backend
   - See automatic reconnection

3. **Multiple Clients**
   - Open `/market` in multiple tabs
   - All should receive same updates
   - Check backend console for client count

4. **TradingView Integration**
   - Click any coin row
   - Verify TradingView chart opens
   - Verify correct symbol is shown

## Troubleshooting

### WebSocket not connecting
- Check backend is running on port 4000
- Check console for errors
- Verify URL: `ws://localhost:4000/ws/market`

### Prices not updating
- Check Binance connection in backend logs
- Look for `[Binance WS] Connected successfully`
- Check browser console for errors

### Connection keeps dropping
- Check internet connection
- Check firewall settings
- Verify Binance API is accessible

### Performance issues
- Reduce throttle interval in `binanceWebSocket.js`
- Check number of connected clients
- Monitor browser memory usage

## Production Considerations

Before deploying to production:

1. **Environment Variables**
   - Move WebSocket URL to `.env`
   - Use secure WebSocket (wss://) in production

2. **Security**
   - Add rate limiting
   - Implement authentication if needed
   - Use CORS properly

3. **Monitoring**
   - Add logging service
   - Monitor connection count
   - Track error rates

4. **Scaling**
   - Consider Redis for multi-server setup
   - Use load balancer with sticky sessions
   - Monitor Binance API rate limits

## License
Part of SignalCry Platform

---

**Implementation Date**: February 14, 2026  
**Binance API**: Futures WebSocket (Mark Price Stream)  
**Tech Stack**: Node.js + Express + ws + Next.js + React + TypeScript
