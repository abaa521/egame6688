import { Test, TestingModule } from '@nestjs/testing';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

describe('RoomsController', () => {
  let controller: RoomsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [{
        provide: RoomsService,
        useValue: {
          getAllRooms: jest.fn().mockResolvedValue({ rooms: [] }),
          getRoomById: jest.fn().mockResolvedValue({ room: {} }),
          refreshData: jest.fn().mockResolvedValue({}),
        }
      }],
    }).compile();

    controller = module.get<RoomsController>(RoomsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
