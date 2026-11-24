import { Injectable } from '@nestjs/common';
import { ConflictError, ErrorCode, ValidationError } from '../../common/errors/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { RigMaskMap, RigSpecies, RigTweakDto, RigTweakMap } from './dto/rig-tweak.dto.js';

const PNG = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
const ID = /^[a-z0-9_]{1,64}$/;

@Injectable()
export class RigTweaksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every tweak, grouped by species and bone. */
  async all(): Promise<RigTweakMap> {
    const rows = await this.prisma.rigTweak.findMany({ orderBy: [{ species: 'asc' }, { bone: 'asc' }] });
    const out: RigTweakMap = {};
    for (const r of rows) (out[r.species] ??= {})[r.bone] = { dx: r.dx, dy: r.dy, rot: r.rot, scale: r.scale, flipX: r.flipX };
    return out;
  }

  /** Replace a species' tweaks with `tweaks` (all-zero ones are just dropped). */
  async replace(species: string, tweaks: RigTweakDto[]) {
    const kept = tweaks.filter(t => t.dx || t.dy || t.rot || t.scale !== 1 || t.flipX);
    // the client itself, not prisma.db: that getter hands back the client without its model delegates
    await this.prisma.$transaction([
      this.prisma.rigTweak.deleteMany({ where: { species } }),
      this.prisma.rigTweak.createMany({ data: kept.map(t => ({ species, ...t, flipX: !!t.flipX })) }),
    ]);
    return (await this.all())[species] ?? {};
  }

  /** Every eraser mask, grouped by species and bone. */
  async masks(): Promise<RigMaskMap> {
    const rows = await this.prisma.rigMask.findMany();
    const out: RigMaskMap = {};
    for (const r of rows) (out[r.species] ??= {})[r.bone] = r.png;
    return out;
  }

  /** Set (png) or remove (null) a piece's eraser mask. */
  async setMask(species: string, bone: string, png: string | null) {
    if (png === null) await this.prisma.rigMask.deleteMany({ where: { species, bone } });
    else await this.prisma.rigMask.upsert({ where: { species_bone: { species, bone } }, create: { species, bone, png }, update: { png } });
    return { species, bone, erased: png !== null };
  }

  /** One species: its tweaks, its masks and its version (the latest save, '' if never saved). */
  async species(species: string): Promise<RigSpecies> {
    const [rows, maskRows] = await Promise.all([
      this.prisma.rigTweak.findMany({ where: { species } }),
      this.prisma.rigMask.findMany({ where: { species } }),
    ]);
    const tweaks: RigSpecies['tweaks'] = {}, masks: RigSpecies['masks'] = {};
    for (const r of rows) tweaks[r.bone] = { dx: r.dx, dy: r.dy, rot: r.rot, scale: r.scale, flipX: r.flipX };
    for (const r of maskRows) masks[r.bone] = r.png;
    const times = [...rows, ...maskRows].map(r => r.updatedAt.getTime());
    return { tweaks, masks, version: times.length ? new Date(Math.max(...times)).toISOString() : '' };
  }

  /** The rig editor's save, all or nothing: the species' tweaks replaced, the masks given set (or removed when null).
   *  Refused if `baseVersion` is given and the species was saved since it (someone else's save would be lost). */
  async saveSpecies(species: string, tweaks: RigTweakDto[], masks: Record<string, string | null> = {}, baseVersion?: string | null) {
    for (const [bone, png] of Object.entries(masks)) {
      if (!ID.test(bone.replace(/__paint$/, '')) || (png !== null && (typeof png !== 'string' || png.length > 4_000_000 || !PNG.test(png)))) {
        throw new ValidationError([{ field: `masks.${bone}`, messages: ['a PNG data URL (under 4 MB) or null'] }]);
      }
    }
    const kept = tweaks.filter(t => t.dx || t.dy || t.rot || t.scale !== 1 || t.flipX);
    const now = new Date();
    await this.prisma.$transaction(async tx => {
      if (baseVersion !== undefined && baseVersion !== null) {
        const [a, b] = await Promise.all([
          tx.rigTweak.aggregate({ where: { species }, _max: { updatedAt: true } }),
          tx.rigMask.aggregate({ where: { species }, _max: { updatedAt: true } }),
        ]);
        const times = [a._max.updatedAt, b._max.updatedAt].filter((d): d is Date => !!d).map(d => d.getTime());
        const current = times.length ? new Date(Math.max(...times)).toISOString() : '';
        if (current !== baseVersion) {
          throw new ConflictError('This dragon was saved since you loaded it', ErrorCode.RIG_TWEAKS_OUTDATED, { details: { current } });
        }
      }
      await tx.rigTweak.deleteMany({ where: { species } });
      if (kept.length) await tx.rigTweak.createMany({ data: kept.map(t => ({ species, ...t, flipX: !!t.flipX, updatedAt: now })) });
      for (const [bone, png] of Object.entries(masks)) {
        if (png === null) await tx.rigMask.deleteMany({ where: { species, bone } });
        else await tx.rigMask.upsert({ where: { species_bone: { species, bone } }, create: { species, bone, png, updatedAt: now }, update: { png, updatedAt: now } });
      }
    }, { timeout: 30_000 });
    return this.species(species);
  }
}
