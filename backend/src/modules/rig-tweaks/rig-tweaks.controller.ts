// Rig tweaks: read by the game (public), written by the frontend's rig editor - in development only.
import { Body, Controller, Delete, ForbiddenException, Get, Param, Put } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { AppConfig } from '../../config/app-config.service.js';
import { PutRigMaskDto, PutRigSpeciesDto, PutRigTweaksDto } from './dto/rig-tweak.dto.js';
import { RigTweaksService } from './rig-tweaks.service.js';

@Controller('rig-tweaks')
export class RigTweaksController {
  constructor(private readonly tweaks: RigTweaksService, private readonly config: AppConfig) {}

  /** GET /api/rig-tweaks -> { data: { [species]: { [bone]: { dx, dy, rot, scale } } } } */
  @Public()
  @Get()
  all() {
    return this.tweaks.all();
  }

  /** GET /api/rig-tweaks/masks -> { data: { [species]: { [bone]: png data URL } } } */
  @Public()
  @Get('masks')
  masks() {
    return this.tweaks.masks();
  }

  /** GET /api/rig-tweaks/:species/all -> { tweaks, masks, version }: one species as the rig editor loads it */
  @Public()
  @Get(':species/all')
  species(@Param('species') species: string) {
    this.guard(species, 'x', false);
    return this.tweaks.species(species);
  }

  /** PUT /api/rig-tweaks/:species/all  { tweaks, masks?, baseVersion? } -> { tweaks, masks, version }: the editor's
   *  save, all in one transaction; 409 RIG_TWEAKS_OUTDATED if saved elsewhere since baseVersion. Not in production. */
  @Public()
  @Put(':species/all')
  saveSpecies(@Param('species') species: string, @Body() dto: PutRigSpeciesDto) {
    this.guard(species);
    return this.tweaks.saveSpecies(species, dto.tweaks, dto.masks ?? {}, dto.baseVersion);
  }

  /** PUT /api/rig-tweaks/:species/masks/:bone  { png } - a piece's eraser mask. Not in production. */
  @Public()
  @Put(':species/masks/:bone')
  putMask(@Param('species') species: string, @Param('bone') bone: string, @Body() dto: PutRigMaskDto) {
    this.guard(species, bone);
    return this.tweaks.setMask(species, bone, dto.png);
  }

  /** DELETE /api/rig-tweaks/:species/masks/:bone - the piece back as built. Not in production. */
  @Public()
  @Delete(':species/masks/:bone')
  deleteMask(@Param('species') species: string, @Param('bone') bone: string) {
    this.guard(species, bone);
    return this.tweaks.setMask(species, bone, null);
  }

  /** PUT /api/rig-tweaks/:species  { tweaks: [{ bone, dx, dy, rot, scale }] } -> that species' tweaks. Not in production. */
  @Public()
  @Put(':species')
  put(@Param('species') species: string, @Body() dto: PutRigTweaksDto) {
    this.guard(species);
    return this.tweaks.replace(species, dto.tweaks);
  }

  /** Writes only in development, to well-formed ids. */
  private guard(species: string, bone = 'x', write = true) {
    if (write && this.config.get('NODE_ENV') === 'production') throw new ForbiddenException('The rig editor only saves in development');
    if (!/^[a-z0-9_]{1,64}$/.test(species) || !/^[a-z0-9_]{1,64}$/.test(bone)) throw new ForbiddenException('Bad species or bone id');
  }
}
