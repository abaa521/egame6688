import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);
  private memoryCache: any = null;
  private tablesByPage: Record<number, any[]> = {};
  private globalMeta: any = { totalPages: 7, totalTableCount: 3500 };
  private globalTableCache: any = {};

  private readonly payloadPath = path.resolve(__dirname, "../../../initial_payload.json");

  updateMemoryState(data: any) {
    this.logger.log("Received data update from Python scraper");
    this.memoryCache = data;

    const platform = data?.platform;
    if (platform) {
      if (platform.tableMeta) {
        this.globalMeta = { ...this.globalMeta, ...platform.tableMeta };
        const currentPage = platform.tableMeta.currentPage;
        if (currentPage && platform.tables) {
          this.tablesByPage[currentPage] = platform.tables;
        }
      } else if (platform.tables && typeof platform.tables === "object") {
         this.tablesByPage[1] = platform.tables;
      }
      
      if (platform.table) {
         this.globalTableCache[platform.table.roomId || platform.table.number] = platform.table;
      }
    }

    fs.writeFile(this.payloadPath, JSON.stringify(data, null, 2), (err) => {
      if (err) this.logger.error("Failed to backup payload:", err);
    });
  }

  async getPayloadData(): Promise<any> {
    if (Object.keys(this.tablesByPage).length > 0) return { memory: true };
    if (fs.existsSync(this.payloadPath)) {
      try {
        const data = fs.readFileSync(this.payloadPath, "utf-8");
        const parsed = JSON.parse(data);
        this.updateMemoryState(parsed);
        return parsed;
      } catch (error) {
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

  async getAllRooms(page?: number) {
    await this.getPayloadData();
    if (page) {
       const tables = this.tablesByPage[page] || [];
       const meta = { ...this.globalMeta, currentPage: page };
       if (!tables.length && Object.keys(this.tablesByPage).length > 0) {
           throw new NotFoundException(`No data for page ${page} yet`);
       }
       return { success: true, meta, rooms: tables.map((t: any) => this.calculateRates(t)) };
    } else {
       const allRooms = [];
       for (const p in this.tablesByPage) allRooms.push(...this.tablesByPage[p]);
       return { success: true, meta: this.globalMeta, rooms: allRooms.map((t: any) => this.calculateRates(t)) };
    }
  }

  async getRoomById(roomId: number) {
    await this.getPayloadData();
    let room = null;
    for (const p in this.tablesByPage) {
        const found = this.tablesByPage[p].find((t: any) => t.roomId === roomId || t.number === roomId);
        if (found) { room = found; break; }
    }
    if (!room) throw new NotFoundException(`Room with ID or Number ${roomId} not found`);

    const currentTable = this.globalTableCache[roomId];
    let detail = {};
    if (currentTable) {
      detail = { detail: currentTable.detail, lock: currentTable.lock };
    }
    return { success: true, room: { ...this.calculateRates(room), ...detail } };
  }

  async refreshData() {
    this.logger.log("Daemon running separately.");
    return { success: true, message: "Use python ws_capture_cdp.py." };
  }
}
