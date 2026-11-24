import { Module } from '@nestjs/common';
import { RigTweaksController } from './rig-tweaks.controller.js';
import { RigTweaksService } from './rig-tweaks.service.js';

@Module({
  controllers: [RigTweaksController],
  providers: [RigTweaksService],
})
export class RigTweaksModule {}
