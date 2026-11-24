import { Module } from '@nestjs/common';
import { DragonsModule } from '../dragons/dragons.module.js';
import { TeamsController } from './teams.controller.js';
import { TeamsService } from './teams.service.js';

@Module({
  imports: [DragonsModule],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}
