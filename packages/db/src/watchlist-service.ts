import { securityOptionSchema, watchlistEntrySchema, watchlistWriteSchema } from '@portfolio-pilot/contracts';
import type { PrismaClient } from './generated/prisma/client.js';
import { requireOwner, type AuthenticatedOwner } from './repositories.js';
import { PortfolioError } from './portfolio-service.js';

export function watchlistService(db: PrismaClient, owner: AuthenticatedOwner) {
  const ownerId = requireOwner(owner);
  const include = { security: true } as const;
  const dto = (row: { id: string; security: unknown; createdAt: Date; updatedAt: Date }) => watchlistEntrySchema.parse({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  async function security(input: unknown) {
    const { securityId } = watchlistWriteSchema.parse(input);
    if (!await db.security.findFirst({ where: { id: securityId, currency: 'USD', assetType: 'STOCK' } })) throw new PortfolioError(400, 'Unknown USD stock identity.');
    return securityId;
  }
  return {
    securities: async () => (await db.security.findMany({ where: { currency: 'USD', assetType: 'STOCK' }, orderBy: [{ symbol: 'asc' }, { exchangeMic: 'asc' }] })).map(row => securityOptionSchema.parse(row)),
    list: async () => (await db.watchlistEntry.findMany({ where: { ownerId }, include, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })).map(dto),
    add: async (input: unknown) => { const securityId = await security(input); return dto(await db.watchlistEntry.upsert({ where: { ownerId_securityId: { ownerId, securityId } }, create: { ownerId, securityId }, update: {}, include })); },
    edit: async (id: string, input: unknown) => {
      const securityId = await security(input);
      const result = await db.watchlistEntry.updateMany({ where: { id, ownerId }, data: { securityId } });
      if (!result.count) throw new PortfolioError(404, 'Resource not found.');
      const row = await db.watchlistEntry.findFirst({ where: { id, ownerId }, include });
      if (!row) throw new PortfolioError(404, 'Resource not found.');
      return dto(row);
    },
    remove: async (id: string) => {
      if (!(await db.watchlistEntry.deleteMany({ where: { id, ownerId } })).count) throw new PortfolioError(404, 'Resource not found.');
      return { removed: true };
    }
  };
}
