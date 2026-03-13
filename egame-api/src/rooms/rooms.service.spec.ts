import { Test, TestingModule } from '@nestjs/testing';
import { RoomsService } from './rooms.service';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';

jest.mock('fs');
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, options, callback) => {
    // Just mock to return success immediately
    callback(null, { stdout: 'Mocked Output', stderr: '' });
  }),
}));

describe('RoomsService', () => {
  let service: RoomsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomsService],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllRooms', () => {
    it('should return parsed tables if file exists', async () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
        platform: { tables: [{ roomId: 1 }, { roomId: 2 }] },
      }));

      const res = await service.getAllRooms();
      expect(res.success).toBe(true);
      expect(res.rooms).toHaveLength(2);
    });

    it('should return empty array if no memory and no file', async () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      const res = await service.getAllRooms();
      
      expect(res.rooms).toHaveLength(0);
    });
  });

  describe('getRoomById', () => {
    it('should return a specific room', async () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
        platform: { 
          tables: [{ roomId: 1, number: 100 }, { roomId: 2, number: 200 }],
          table: { roomId: 1, detail: { dayWin: 1000 } }
        },
      }));

      const res = await service.getRoomById(1);
      expect(res.success).toBe(true);
      expect(res.room.roomId).toBe(1);
      expect(res.room.detail.dayWin).toBe(1000);
    });

    it('should throw NotFoundException if room not found', async () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
        platform: { tables: [] },
      }));

      await expect(service.getRoomById(999)).rejects.toThrow(NotFoundException);
    });
  });
});

