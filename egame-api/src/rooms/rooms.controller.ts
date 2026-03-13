import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody, ApiQuery } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import {
  AllRoomsResponseDto,
  RoomDetailResponseDto,
  SuccessResponseDto,
} from './dto';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all rooms with current statistics' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Optional page number to specifically retrieve' })
  @ApiQuery({ name: 'pageCount', required: false, type: Number, description: 'Optional number of items per page' })
  @ApiResponse({
    status: 200,
    description: 'List of all available rooms with win rates.',
    type: AllRoomsResponseDto,
  })
  async getAllRooms(
    @Query('page') page?: string,
    @Query('pageCount') pageCount?: string
  ): Promise<any> {
    const pageNum = page && !isNaN(parseInt(page, 10)) ? parseInt(page, 10) : undefined;
    const pageCountNum = pageCount && !isNaN(parseInt(pageCount, 10)) ? parseInt(pageCount, 10) : undefined;
    return this.roomsService.getAllRooms(pageNum, pageCountNum);
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get specific room information with statistics' })
  @ApiResponse({
    status: 200,
    description: 'Detailed information about the room.',
    type: RoomDetailResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Room not found.' })
  async getRoomById(
    @Param('roomId', ParseIntPipe) roomId: number,
  ): Promise<any> {
    const data = await this.roomsService.getRoomById(roomId);
    return data as any;
  }
}
