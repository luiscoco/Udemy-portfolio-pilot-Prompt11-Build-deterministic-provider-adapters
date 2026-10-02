import { z } from 'zod';

export const correlationIdSchema = z.uuid();
export const ERROR_CODES = ['BAD_REQUEST', 'CONFLICT', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'INTERNAL_ERROR', 'CONFIGURATION_ERROR'] as const;
export const errorCodeSchema = z.enum(ERROR_CODES);
export const errorEnvelopeSchema = z.object({
  error: z.object({ code: errorCodeSchema, message: z.string().min(1), requestId: correlationIdSchema })
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
export const REQUEST_ID_HEADER = 'x-request-id' as const;
export const HEALTH_STATUS = 'ok' as const;
export const healthResponseSchema = z.object({ status: z.literal(HEALTH_STATUS), requestId: correlationIdSchema });
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export const demoAskRequestSchema = z.object({ question: z.string().trim().min(1).max(500) }).strict();
export const demoAskResponseSchema = z.object({ answer: z.string().min(1), mode: z.enum(['mock', 'claude']), requestId: correlationIdSchema });
export type DemoAskRequest = z.infer<typeof demoAskRequestSchema>;
export type DemoAskResponse = z.infer<typeof demoAskResponseSchema>;

// Browser-safe read models. Financial values stay decimal strings; the server will
// calculate them when portfolio APIs arrive in later milestones.
export const holdingDtoSchema = z.object({
  symbol: z.string(), name: z.string(), sector: z.string(), shares: z.string(),
  price: z.string(), marketValue: z.string(), dayChangePercent: z.string(),
  allocationPercent: z.string(), trend: z.enum(['up', 'down', 'flat'])
});
export type HoldingDto = z.infer<typeof holdingDtoSchema>;
export const portfolioDtoSchema = z.object({
  id: z.string(), name: z.string(), accountLabel: z.string(),
  totalValue: z.string(), dayChange: z.string(), dayChangePercent: z.string(),
  totalReturn: z.string(), totalReturnPercent: z.string(), cashBalance: z.string(),
  holdings: z.array(holdingDtoSchema), asOf: z.string(), isDemo: z.boolean()
});
export type PortfolioDto = z.infer<typeof portfolioDtoSchema>;
export const newsItemDtoSchema = z.object({
  id: z.string(), category: z.string(), title: z.string(), summary: z.string(),
  source: z.string(), publishedAt: z.string(), symbols: z.array(z.string()),
  url: z.url(), isDemo: z.boolean()
});
export type NewsItemDto = z.infer<typeof newsItemDtoSchema>;
export const watchlistItemDtoSchema = z.object({
  symbol: z.string(), name: z.string(), price: z.string(),
  dayChangePercent: z.string(), trend: z.enum(['up', 'down', 'flat'])
});
export type WatchlistItemDto = z.infer<typeof watchlistItemDtoSchema>;

// Persisted ledger DTOs: fixed-point values cross JSON only as decimal strings.
export const decimalStringSchema = z.string().regex(/^-?\d+(\.\d+)?$/);
export const securityIdentitySchema = z.object({
  symbol: z.string().min(1).max(32), exchangeMic: z.string().regex(/^[A-Z0-9]{4}$/), currency: z.literal('USD')
});
export const portfolioTransactionDtoSchema = z.object({
  id: z.string(), portfolioId: z.string(), securityId: z.string(),
  side: z.enum(['BUY', 'SELL']), quantity: decimalStringSchema,
  price: decimalStringSchema, fees: decimalStringSchema, amount: decimalStringSchema,
  occurredAt: z.iso.datetime(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
  security: securityIdentitySchema
});
export type PortfolioTransactionDto = z.infer<typeof portfolioTransactionDtoSchema>;

const summaryPositionSchema = z.object({
  securityId: z.string(), security: securityIdentitySchema,
  remainingQuantity: decimalStringSchema, weightedAverageAcquisitionCost: decimalStringSchema.nullable(),
  remainingCostBasis: decimalStringSchema, soldCostBasis: decimalStringSchema, realizedGainLoss: decimalStringSchema,
  marketValue: decimalStringSchema.nullable(), unrealizedGainLoss: decimalStringSchema.nullable(),
  allocationWeight: decimalStringSchema.nullable(),
  quoteStatus: z.enum(['fresh', 'stale', 'missing', 'invalid', 'not_required']),
  quote: z.object({ securityId: z.string(), price: z.string(), currency: z.string(), asOf: z.iso.datetime(), provider: z.string(), isSynthetic: z.boolean() }).nullable()
});
export const portfolioSummarySchema = z.object({
  portfolioId: z.string(), name: z.string(), currency: z.literal('USD'), asOf: z.iso.datetime(), staleAfterMs: z.number().int().nonnegative(),
  valuationComplete: z.boolean(), remainingCostBasis: decimalStringSchema, soldCostBasis: decimalStringSchema, realizedGainLoss: decimalStringSchema,
  marketValue: decimalStringSchema.nullable(), unrealizedGainLoss: decimalStringSchema.nullable(), positions: z.array(summaryPositionSchema)
});
export type PortfolioSummary = z.infer<typeof portfolioSummarySchema>;

// Match numeric(28,10) without allowing implicit database rounding or exponent syntax.
const tradeDecimalSchema = z.string().regex(/^(0|[1-9]\d{0,17})(\.\d{1,10})?$/);
const positiveTradeDecimalSchema = tradeDecimalSchema.refine(value => /[1-9]/.test(value), 'Must be positive');
export const portfolioCreateSchema = z.object({ name: z.string().trim().min(1).max(100), currency: z.literal('USD').default('USD') }).strict();
export const portfolioEditSchema = z.object({ name: z.string().trim().min(1).max(100) }).strict();
export const transactionCreateSchema = z.object({
  security: securityIdentitySchema.extend({ symbol: z.string().regex(/^[A-Z0-9][A-Z0-9.-]{0,31}$/) }).strict(),
  side: z.enum(['BUY', 'SELL']), quantity: positiveTradeDecimalSchema,
  price: positiveTradeDecimalSchema, fees: tradeDecimalSchema.default('0'),
  occurredAt: z.iso.datetime({ precision: 3 }).refine(value => Number.isFinite(Date.parse(value)), 'Invalid date')
}).strict();
export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9._:-]{1,128}$/);
export const transactionPageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(1000000).default(0)
}).strict();
export type TransactionCreate = z.infer<typeof transactionCreateSchema>;

export const portfolioRecordSchema = z.object({ id: z.string(), name: z.string(), currency: z.literal('USD'), archivedAt: z.iso.datetime().nullable(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() });
export const portfolioListSchema = z.object({ portfolios: z.array(portfolioRecordSchema) });
export const portfolioResultSchema = z.object({ portfolio: portfolioRecordSchema });
export const transactionHistorySchema = z.object({ transactions: z.array(portfolioTransactionDtoSchema), nextOffset: z.number().int().nullable() });
export const transactionResultSchema = z.object({ transaction: portfolioTransactionDtoSchema, replayed: z.boolean() });
export const securityOptionSchema = securityIdentitySchema.extend({ id: z.string(), name: z.string() });
export const securityListSchema = z.object({ securities: z.array(securityOptionSchema) });
export const watchlistWriteSchema = z.object({ securityId: z.string().min(1) }).strict();
export const watchlistEntrySchema = z.object({ id: z.string(), security: securityOptionSchema, createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() });
export const watchlistListSchema = z.object({ entries: z.array(watchlistEntrySchema) });
export const watchlistResultSchema = z.object({ entry: watchlistEntrySchema });
export type PortfolioRecord = z.infer<typeof portfolioRecordSchema>;
export const portfolioSummaryResultSchema = z.object({ summary: portfolioSummarySchema });
export const watchlistRemovalSchema = z.object({ removed: z.literal(true) });

// Normalized market snapshots only; raw provider payloads remain server-side.
export const marketProvenanceSchema = z.object({
  sourceId: z.string().min(1), sourceRecordId: z.string().min(1), providerAt: z.iso.datetime(), ingestedAt: z.iso.datetime(),
  isDelayed: z.boolean(), delayMs: z.number().int().nonnegative(), isSynthetic: z.boolean()
});
export const marketQuoteSchema = marketProvenanceSchema.extend({ security: z.object({ symbol: z.string(), exchangeMic: z.string() }), price: decimalStringSchema, currency: z.string() });
export const marketArticleSchema = marketProvenanceSchema.extend({ canonicalUrl: z.url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol)), publishedAt: z.iso.datetime(), revision: z.number().int().positive(), title: z.string(), summary: z.string(), category: z.string(), symbols: z.array(z.string()) });
export const marketSnapshotSchema = z.object({
  mode: z.enum(['mock', 'live']), status: z.enum(['fresh', 'stale', 'unavailable']), asOf: z.iso.datetime(),
  fetchedAt: z.iso.datetime().nullable(), staleAfterMs: z.number().int().positive(), intervalMs: z.number().int().positive(),
  error: z.enum(['rate_limit', 'outage', 'not_configured']).nullable(), retryAt: z.iso.datetime().nullable(),
  providers: z.array(z.object({ sourceId: z.string(), kind: z.enum(['quotes', 'news']), delivery: z.enum(['polling', 'push']), timeliness: z.enum(['delayed', 'real-time']), delayMs: z.number().int().nonnegative() })),
  quotes: z.array(marketQuoteSchema), missing: z.array(z.object({ symbol: z.string(), exchangeMic: z.string() })), articles: z.array(marketArticleSchema)
});
export type MarketSnapshot = z.infer<typeof marketSnapshotSchema>;
