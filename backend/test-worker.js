require("dotenv").config();
const { processPendingArticles } = require("./src/services/signalWorker");

processPendingArticles({ batchSize: 3, delayMs: 1500 })
  .then(r => { console.log("Result:", r); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });