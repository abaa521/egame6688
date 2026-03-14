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

export class RoomDetailDataDetailDto {
  @ApiProperty({ example: [5, 13, 183], description: 'Counts array' })
  mgCounts: number[];

  @ApiProperty({ example: 64100855.59, description: 'Day Win' })
  dayWin: number;

  @ApiProperty({ example: 69233916.80, description: 'Day Bet' })
  dayBet: number;

  @ApiProperty({ example: 715788.35, description: 'Hour Win' })
  hourWin: number;

  @ApiProperty({ example: 833071.60, description: 'Hour Bet' })
  hourBet: number;

  @ApiProperty({ example: 154895.54, description: 'Today Win' })
  todayWin: number;

  @ApiProperty({ example: 158816, description: 'Today Bet' })
  todayBet: number;
}

export class RoomDetailDataLockDto {
  @ApiProperty({ example: 3600 })
  expiredDef: number;

  @ApiProperty({ example: 86400 })
  resetDef: number;

  @ApiProperty({ example: 1773423307740 })
  time: number;

  @ApiProperty({ example: 1 })
  count: number;

  @ApiProperty({ example: 1537897 })
  roomId: number;
}

export class RoomDetailDataDto {
  @ApiProperty({ example: 1535107, description: 'Room ID' })
  roomId: number;

  @ApiProperty({ type: RoomDetailDataDetailDto })
  detail: RoomDetailDataDetailDto;

  @ApiProperty({ type: RoomDetailDataLockDto })
  lock: RoomDetailDataLockDto;
}

export class RoomDetailResponseDto {
  @ApiProperty({ example: 200 })
  status: number;

  @ApiProperty({ example: 'ok' })
  message: string;

  @ApiProperty({ type: RoomDetailDataDto })
  data: RoomDetailDataDto;

  @ApiProperty({ example: '4764d8dc30444fa79c59004bcbfff3a0' })
  token: string;

  @ApiProperty({ example: 'getSlotTableDetail' })
  eventName: string;
}

export class SuccessResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
}

