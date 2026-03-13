import { CrawlerService } from './crawler.service';
import { Injectable, Logger, NotFoundException, Inject, forwardRef } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);
  private globalMeta: any = { totalPages: 1, totalTableCount: 0 };
  private globalTableCache: Record<number, any> = {};

  private readonly payloadPath = path.resolve(__dirname, "../../../initial_payload.json");

  constructor(@Inject(forwardRef(() => CrawlerService)) private crawlerService: CrawlerService) {
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
       this.logger.log(`Upserted ${raw.data.tables.length} tables from payload.`);
       this.globalMeta.totalTableCount = Object.keys(this.globalTableCache).length;
    }
  }
  
  updateDetailState(payload: any) {
    const raw = payload.raw || payload;
    if (raw && raw.data && raw.data.detail) {
        const id = raw.data.roomId;
        if (id && this.globalTableCache[id]) {
            this.globalTableCache[id].detail = raw.data.detail;
            this.globalTableCache[id]._last_detail_update = Date.now();
            this.globalTableCache[id].lock = raw.data.lock;
        }
        if (id) {
             this.logger.log(`Updated detail for room ${id}`);
        }
    }
  }

  async getPayloadData(): Promise<any> {
    if (Object.keys(this.globalTableCache).length > 0) return { memory: true };
    if (fs.existsSync(this.payloadPath)) {
      try {
        const data = fs.readFileSync(this.payloadPath, "utf-8");
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
    return {
      ...t,
      winRate: bet > 0 ? Number(((win / bet) * 100).toFixed(2)) : 0,
      todayWinRate: todayBet > 0 ? Number(((todayWin / todayBet) * 100).toFixed(2)) : 0
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
        totalTableCount
    };
    return { success: true, meta, rooms: paginatedRooms.map((t: any) => this.calculateRates(t)) };
  }

    async getRoomById(roomId: number) {
    if (this.crawlerService) {
        await this.crawlerService.fetchTableDetailByRoomId(roomId);
    }

    // Wait up to 3 seconds for Playwright to intercept the detail WebSocket frame
    for(let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 100));
        const r = this.globalTableCache[roomId] || Object.values(this.globalTableCache).find((t: any) => t.number === roomId);
        if (r && r._last_detail_update && r._last_detail_update > (Date.now() - 5000)) {
             break;
        }
    }

    let room = this.globalTableCache[roomId];
    if (!room) {
        const byNumber = Object.values(this.globalTableCache).find((t:any) => t.number === roomId);
        if (byNumber) {
            return { success: true, room: { ...this.calculateRates(byNumber), detail: byNumber.detail || {}, lock: byNumber.lock || {} } };
        }
        return { success: false, error: 'Room not found' };
    }
    return { success: true, room: { ...this.calculateRates(room), detail: room.detail || {}, lock: room.lock || {} } };
  }
}
