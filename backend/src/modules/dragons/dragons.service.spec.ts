// Unit test: the service with an in-memory fake repository (no database, no Nest container).
import type { Dragon } from '../../generated/prisma/client.js';
import { BusinessRuleError, ErrorCode, NotFoundError } from '../../common/errors/index.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { DragonsRepository } from './dragons.repository.js';
import { DragonsService } from './dragons.service.js';

const NOW = new Date('2026-10-25T12:00:00Z');
const dragon = (over: Partial<Dragon> = {}): Dragon => ({
  id: 'd1', ownerId: 'u1', species: 'fire_dragon', nickname: null, stars: 3, level: 1, exp: 0,
  hunger: 100, hungerAt: NOW, createdAt: NOW, updatedAt: NOW, ...over,
});

function setup(rows: Dragon[]) {
  const repo = {
    findOwned: vi.fn(async (id: string, ownerId: string) => rows.find(d => d.id === id && d.ownerId === ownerId) ?? null),
    update: vi.fn(async (id: string, data: Partial<Dragon>) => ({ ...rows.find(d => d.id === id)!, ...data })),
  };
  const service = new DragonsService(repo as unknown as DragonsRepository, {} as PrismaService);
  return { service, repo };
}

describe('DragonsService', () => {
  it("hides other players' dragons", async () => {
    const { service } = setup([dragon({ ownerId: 'someone-else' })]);
    await expect(service.getMine('d1', 'u1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('refuses to feed a dragon that is not hungry', async () => {
    const { service, repo } = setup([dragon({ hunger: 80, hungerAt: NOW })]);
    await expect(service.feed('d1', 'u1', NOW)).rejects.toMatchObject({ code: ErrorCode.DRAGON_NOT_HUNGRY });
    await expect(service.feed('d1', 'u1', NOW)).rejects.toBeInstanceOf(BusinessRuleError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('feeds a dragon that got hungry over time', async () => {
    // 100 at 11:00, 1.5 per minute -> 10 an hour later; one meal -> 50
    const { service, repo } = setup([dragon({ hunger: 100, hungerAt: new Date('2026-10-25T11:00:00Z') })]);
    const fed = await service.feed('d1', 'u1', NOW);
    expect(repo.update).toHaveBeenCalledWith('d1', { hunger: 50, hungerAt: NOW });
    expect(fed.hunger).toBe(50);
  });
});
