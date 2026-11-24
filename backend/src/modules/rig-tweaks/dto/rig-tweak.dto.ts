import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, Length, Matches, MaxLength, Max, Min, ValidateNested, IsArray, ArrayMaxSize } from 'class-validator';

/** One piece's tweak (rig px / radians). */
export class RigTweakDto {
  @IsString() @Length(1, 64)
  bone: string;

  @IsNumber() @Min(-2000) @Max(2000)
  dx: number;

  @IsNumber() @Min(-2000) @Max(2000)
  dy: number;

  @IsNumber() @Min(-Math.PI * 4) @Max(Math.PI * 4)
  rot: number;

  @IsNumber() @Min(0.1) @Max(5)
  scale: number;

  @IsOptional() @IsBoolean()
  flipX?: boolean;
}

/** PUT /rig-tweaks/:species/masks/:bone: the eraser mask, a PNG data URL. */
export class PutRigMaskDto {
  @IsString() @MaxLength(4_000_000) @Matches(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/)
  png: string;
}

/** PUT /rig-tweaks/:species: every tweak of the species (the ones left out are removed). */
export class PutRigTweaksDto {
  @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => RigTweakDto)
  tweaks: RigTweakDto[];
}

/** What GET returns: species -> bone -> tweak. */
export type RigTweakMap = Record<string, Record<string, { dx: number; dy: number; rot: number; scale: number; flipX: boolean }>>;

/** What GET /rig-tweaks/masks returns: species -> bone -> PNG data URL. */
export type RigMaskMap = Record<string, Record<string, string>>;

/** PUT /rig-tweaks/:species/all: the rig editor's save - every tweak of the species, and the eraser / paint masks it
 *  changed (png data URL, or null to remove), in one go. `baseVersion`: the version the editor loaded (GET); if the
 *  species was saved since, the save is refused (409 RIG_TWEAKS_OUTDATED) unless it is left out (overwrite). */
export class PutRigSpeciesDto {
  @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => RigTweakDto)
  tweaks: RigTweakDto[];

  @IsOptional() @IsObject()
  masks?: Record<string, string | null>;

  @IsOptional() @IsString()
  baseVersion?: string | null;
}

/** One species as the rig editor loads it. version: when it was last saved ('' if never). */
export interface RigSpecies {
  tweaks: Record<string, { dx: number; dy: number; rot: number; scale: number; flipX: boolean }>;
  masks: Record<string, string>;
  version: string;
}
