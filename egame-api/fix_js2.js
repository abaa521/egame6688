const fs = require('fs');

const contents = \import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);
  private globalMeta: any = { totalPages: 1, totalTableCount: 0 };
  private globalTableCache: Record<number, any> = {};

  private readonly payloadPath = path.resolve(__dirname, "../../../initial_payload.json");

  constructor() {
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
       this.logger.log(\\\Upserted \ tables from payload.\\\);
       this.globalMeta.totalTableCount = Object.keys(this.globalTableCache).length;
    }
  }
  
  updateDetailState(payload: any) {
    const raw = payload.raw || payload;
    if (raw && raw.data && raw.data.detail) {
        const id = raw.data.roomId;
        if (id && this.globalTableCache[id]) {
            this.globalTableCache[id].detail = raw.data.detail;
        }
        if (id) {
             this.logger.log(\\\Updated detail for room \\\\);
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
        this.logger.error(\\\Error reading payload file: \\\\);
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
    const room = this.globalTableCache[roomId];
    if (!room) {
        const byNumber = Object.values(this.globalTableCache).find(t => t.number === roomId);
        if (byNumber) {
            return { success: true, room: this.calculateRates(byNumber) };
        }
        throw new NotFoundException(\\\Room with ID \ not found\\\);
    }
    return { success: true, room: this.calculateRates(room) };
  }

  async refreshData() {
    this.logger.log("Daemon running separately.");
    return { success: true, message: "Use python ws_capture_cdp.py." };
  }
}\;

fs.writeFileSync('C:/Code/egame6688/egame-api/src/rooms/rooms.service.ts', contents);
console.log("Written ok");
