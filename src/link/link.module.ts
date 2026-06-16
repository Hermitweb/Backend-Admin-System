import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LinkService } from './link.service';
import { LinkController } from './link.controller';
import { LinkRule } from '../entity/link-rule.entity';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [TypeOrmModule.forFeature([LinkRule]), ProjectModule],
  providers: [LinkService],
  controllers: [LinkController],
  exports: [LinkService],
})
export class LinkModule {}