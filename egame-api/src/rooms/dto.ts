import { ApiProperty } from '@nestjs/swagger';

export class RoomDto {
  @ApiProperty({ example: 1, description: 'The unique ID of the room' })
  roomId: number;

  @ApiProperty({ example: 123, description: 'The room number' })
  number: number;

  @ApiProperty({ example: 50000, description: 'Total bet amount' })
  bet: number;

  @ApiProperty({ example: 45000, description: 'Total win amount' })
  win: number;

  @ApiProperty({ example: 90.0, description: 'Total win rate percentage' })
  winRate: number;

  @ApiProperty({ example: 5000, description: 'Today bet amount' })
  todayBet?: number;

  @ApiProperty({ example: 4500, description: 'Today win amount' })
  todayWin?: number;

  @ApiProperty({ example: 90.0, description: 'Today win rate percentage' })     
  todayWinRate: number;
}

export class AllRoomsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ 
    example: { total: 3500 }, 
    description: 'Metadata about the rooms' 
  })
  meta: any;

  @ApiProperty({ type: [RoomDto], description: 'List of rooms with computed win rates' })
  rooms: RoomDto[];
}

export class RoomDetailResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: RoomDto, description: 'The detailed room data' })
  room: RoomDto;
}

export class SuccessResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
}

