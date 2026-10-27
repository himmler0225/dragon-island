// Controllers stay thin: read the request, call the service, shape the result. No rules here.
import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { DragonsService } from './dragons.service.js';
import { ListDragonsQueryDto, RenameDragonDto, toDragonView } from './dto/dragon.dto.js';

@Controller('dragons')
export class DragonsController {
  constructor(private readonly dragons: DragonsService) {}

  /** GET /api/dragons -> { data: DragonView[], meta } */
  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() q: ListDragonsQueryDto) {
    return (await this.dragons.listMine(user.id, q)).map(d => toDragonView(d));
  }

  /** GET /api/dragons/:id */
  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return toDragonView(await this.dragons.getMine(id, user.id));
  }

  /** PATCH /api/dragons/:id  { nickname } */
  @Patch(':id')
  async rename(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RenameDragonDto) {
    return toDragonView(await this.dragons.rename(id, user.id, dto.nickname));
  }

  /** POST /api/dragons/:id/feed  -> 422 DRAGON_NOT_HUNGRY when it is not hungry */
  @Post(':id/feed')
  @HttpCode(HttpStatus.OK)
  async feed(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return toDragonView(await this.dragons.feed(id, user.id));
  }
}
