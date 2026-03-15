import { CrawlerService } from './crawler.service';
import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);
  private globalMeta: any = { totalPages: 1, totalTableCount: 0 };
  private globalTableCache: Record<number, any> = {};

  // Store raw payloads for fast retrieval bypassing cache formatting
  private detailPayloads: Record<number, { timestamp: number; payload: any }> =
    {};

  private readonly payloadPath = path.resolve(
    __dirname,
    '../../../initial_payload.json',
  );

  constructor(
    @Inject(forwardRef(() => CrawlerService))
    private crawlerService: CrawlerService,
  ) {
    this.getPayloadData();
  }

  updateMemoryState(payload: any) {
    const raw = payload.raw || payload;
    if (raw && raw.data && Array.isArray(raw.data.tables)) {
      raw.data.tables.forEach((t: any) => {
        const id = t.roomId || t.number;
        if (id) {
          this.globalTableCache[id] = { ...this.globalTableCache[id], ...t };
        }
      });
      this.logger.log(
        `Upserted ${raw.data.tables.length} tables from payload.`,
      );
      this.globalMeta.totalTableCount = Object.keys(
        this.globalTableCache,
      ).length;
    }
  }

  updateDetailState(payload: any) {
    const raw = payload;
    if (raw && raw.data && raw.data.detail) {
      const id = raw.data.roomId;
      if (id) {
        // Update global cache as well just in case
        if (this.globalTableCache[id]) {
          this.globalTableCache[id].detail = raw.data.detail;
          this.globalTableCache[id]._last_detail_update = Date.now();
          this.globalTableCache[id].lock = raw.data.lock;
        }

        // Store the exactly received raw payload for direct return
        this.detailPayloads[id] = {
          timestamp: Date.now(),
          payload: raw,
        };
        this.logger.log(`Updated detail for room ${id}`);
      }
    }
  }

  async getPayloadData(): Promise<any> {
    if (Object.keys(this.globalTableCache).length > 0) return { memory: true };
    if (fs.existsSync(this.payloadPath)) {
      try {
        const data = fs.readFileSync(this.payloadPath, 'utf-8');
        const parsed = JSON.parse(data);
        this.updateMemoryState(parsed);
      } catch (error: any) {
        this.logger.error(`Error reading payload file: ${error.message}`);
      }
    }
    return {};
  }

  private calculateRates(t: any) {
    const bet = t.bet || 0;
    const win = t.win || 0;
    const todayBet = t.today?.bet || 0;
    const todayWin = t.today?.win || 0;
    
    // 從回傳物件中剔除前端不需要的敏感或詳細欄位
    const { detail, win: _, bet: __, today, winRate, todayWinRate, ...rest } = t;

    return {
      ...rest,
    };
  }

  async getAllRooms(page: number = 1, pageCount: number = 20) {
    const allRooms = Object.values(this.globalTableCache);
    allRooms.sort((a, b) => (a.number || 0) - (b.number || 0));

    const totalTableCount = allRooms.length;
    let totalPages = Math.ceil(totalTableCount / pageCount) || 1;
    if (totalTableCount === 0) totalPages = 1;

    let safePage = page;
    if (safePage < 1) safePage = 1;

    const startIndex = (safePage - 1) * pageCount;
    const endIndex = startIndex + pageCount;
    const paginatedRooms = allRooms.slice(startIndex, endIndex);

    const meta = {
      ...this.globalMeta,
      totalPages,
      currentPage: safePage,
      tablePerPage: pageCount,
      totalTableCount,
    };
    return {
      success: true,
      meta,
      rooms: paginatedRooms.map((t: any) => this.calculateRates(t)),
    };
  }

  async getRoomByNumber(roomNumber: number) {
    const allRooms = Object.values(this.globalTableCache);
    const room = allRooms.find((r: any) => Number(r.number) === roomNumber);
    if (!room || !room.roomId) {
      return {
        status: 404,
        message: 'Room not found in cache or missing roomId',
      };
    }
    return this.getRoomById(room.roomId);
  }

  async getRoomById(roomId: number) {
    const requestTime = Date.now();

    if (this.crawlerService) {
      await this.crawlerService.fetchTableDetailByRoomId(roomId);
    }

    // Wait up to 5 seconds for Playwright to intercept the detail WebSocket frame
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const stored = this.detailPayloads[roomId];
      // Ensure we only return a fresh payload that arrived AFTER our request
      if (stored && stored.timestamp >= requestTime) {
        return stored.payload;
      }
    }

    return {
      status: 404,
      message: 'Room not found or no response from server',
    };
  }
}
