
import { Injectable, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);
  private memoryCache: any = null;
  private readonly payloadPath = path.resolve(__dirname, "../../../initial_payload.json");
  private readonly scriptPath = path.resolve(__dirname, "../../../ws_capture_cdp.py");

  updateMemoryState(data: any) {
    this.logger.log("Received data update from Python scraper");
    this.memoryCache = data;
    
    // Save to file as backup
    fs.writeFile(this.payloadPath, JSON.stringify(data, null, 2), (err) => {
      if (err) this.logger.error("Failed to backup payload:", err);
    });
  }

  async getPayloadData(): Promise<any> {
    if (this.memoryCache) {
      return this.memoryCache;
    }
    
    // Fallback to file if memory is empty
    if (fs.existsSync(this.payloadPath)) {
      try {
        const data = fs.readFileSync(this.payloadPath, "utf-8");
        this.memoryCache = JSON.parse(data);
        return this.memoryCache;
      } catch (error) {
        this.logger.error(`Error reading payload file: ${error.message}`);
      }
    }
    
    // If no data is available at all
    this.logger.warn("No data in memory or file. Returning empty.");
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

  async getAllRooms() {
    const data = await this.getPayloadData();
    const platform = data?.platform || {};
    const tables = platform.tables || [];
    const meta = platform.tableMeta || {};

    const enrichedTables = tables.map((t: any) => this.calculateRates(t));

    return {
      success: true,
      meta,
      rooms: enrichedTables,
    };
  }

  async getRoomById(roomId: number) {
    const data = await this.getPayloadData();
    const tables = data?.platform?.tables || [];

    const room = tables.find((t: any) => t.roomId === roomId || t.number === roomId);
    if (!room) {
      throw new NotFoundException(`Room with ID or Number ${roomId} not found`);
    }

    const currentTable = data?.platform?.table;
    let detail = {};
    if (currentTable && (currentTable.roomId === roomId || currentTable.number === roomId)) {
      detail = {
        detail: currentTable.detail,
        lock: currentTable.lock
      };
    }

    return {
      success: true,
      room: {
        ...this.calculateRates(room),
        ...detail
      }
    };
  }

  async refreshData() {
    this.logger.log("Please make sure the long-running Python script is started separately.");
    return { success: true, message: "Use `python ws_capture_cdp.py` to start the long-running daemon." };
  }
}

