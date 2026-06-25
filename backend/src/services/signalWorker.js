/**
 * Signal worker — background job that finds unprocessed news articles,
 * runs AI analysis on each, and persists the results.
 *
 * Processes articles one at a time (sequential) to respect free-tier rate
 * limits, with a delay between each. One bad article never stops the batch.
 */

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { processArticle } = require("./signalEngine");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Find pending (unprocessed) articles, analyze them, and save the results.
 * @param {{ batchSize?: number, delayMs?: number }} [options]
 * @returns {Promise<{ processed: number, failed: number }>}
 */
async function processPendingArticles(options = {}) {
  const { batchSize = 10, delayMs = 1500 } = options;

  const articles = await prisma.news.findMany({
    where: {
      aiProcessed: false,
      publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { publishedAt: "desc" },
    take: batchSize,
  });

  if (articles.length === 0) {
    console.log("[signalWorker] No pending articles");
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];

    try {
      const result = await processArticle(article);

      await prisma.news.update({
        where: { id: article.id },
        data: {
          aiSummary: result.aiSummary,
          aiSentiment: result.aiSentiment,
          aiImpactScore: result.aiImpactScore,
          aiAssets: result.aiAssets,
          aiProcessed: true,
        },
      });

      processed++;
    } catch (err) {
      console.error(
        `[signalWorker] Failed article ${article.id}: ${err.message}`
      );

      // Mark as processed anyway so we don't retry a broken article forever.
      await prisma.news.update({
        where: { id: article.id },
        data: { aiProcessed: true },
      });

      failed++;
    }

    // Throttle between articles (skip the wait after the last one).
    if (i < articles.length - 1) {
      await sleep(delayMs);
    }
  }

  console.log(`[signalWorker] Done: ${processed} processed, ${failed} failed`);
  return { processed, failed };
}

module.exports = { processPendingArticles };
