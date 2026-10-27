import { Module } from '@nestjs/common';
import { DragonsController } from './dragons.controller.js';
import { DragonsRepository } from './dragons.repository.js';
import { DragonsService } from './dragons.service.js';

@Module({
  controllers: [DragonsController],
  providers: [DragonsRepository, DragonsService],
  exports: [DragonsService],
})
export class DragonsModule {}
