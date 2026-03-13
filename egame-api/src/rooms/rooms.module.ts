import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { CrawlerService } from './crawler.service';

@Module({
  controllers: [RoomsController],
  providers: [RoomsService, CrawlerService]
})
export class RoomsModule {}
