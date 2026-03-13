import { Controller, Get, Param, ParseIntPipe, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { AllRoomsResponseDto, RoomDetailResponseDto, SuccessResponseDto } from './dto';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all rooms with current statistics' })
  @ApiResponse({ status: 200, description: 'List of all available rooms with win rates.', type: AllRoomsResponseDto })
  async getAllRooms(): Promise<AllRoomsResponseDto> {
    return this.roomsService.getAllRooms();
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Trigger a background refresh of room data via Python scraper' })
  @ApiResponse({ status: 200, description: 'Refresh triggered successfully.', type: SuccessResponseDto })
  async refreshRooms(): Promise<any> {
    return this.roomsService.refreshData();
  }

  @Post('internal/update')
  @ApiOperation({ summary: 'Internal API for Python scraper to push realtime data' })
  @ApiBody({ description: 'The decrypted JSON payload from the WebSocket', type: Object })
  @ApiResponse({ status: 200, description: 'Data successfully received and cached in memory.', type: SuccessResponseDto })
  async updateRoomData(@Body() payload: any) {
    this.roomsService.updateMemoryState(payload);
    return { success: true };
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get specific room information with statistics' })
  @ApiResponse({ status: 200, description: 'Detailed information about the room.', type: RoomDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Room not found.' })
  async getRoomById(@Param('roomId', ParseIntPipe) roomId: number): Promise<RoomDetailResponseDto> {
    const data = await this.roomsService.getRoomById(roomId);
    return data as any;
  }
}

