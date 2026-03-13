import os

fp = 'C:/Code/egame6688/egame-api/src/rooms/rooms.service.ts'
c = open(fp, 'r', encoding='utf-8').read()

if 'import { CrawlerService }' not in c:
    c = c.replace("import { Injectable, Logger } from '@nestjs/common';", "import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';\nimport { CrawlerService } from './crawler.service';")

if 'constructor(' in c and 'private crawlerService: CrawlerService' not in c:
    c = c.replace("constructor() {}", "constructor(@Inject(forwardRef(() => CrawlerService)) private crawlerService: CrawlerService) {}")

# Re-write getRoomById
import re

old_get_room = '''  async getRoomById(roomId: number) {
    // Write roomId to a queue file for Python to fetch
    const queuePath = path.resolve(__dirname, "../../../fetch_queue.txt");
    try {
        fs.appendFileSync(queuePath, roomId.toString() + "\\n", 'utf8');
        this.logger.log(Wrote roomId  to fetch_queue.txt);
    } catch(e) {
        this.logger.error("Failed to write to fetch_queue.txt", e);
    }
    
    // Clear old detail timestamp if any, so we know when a new one arrives
    if (this.globalTableCache[roomId]) {
        this.globalTableCache[roomId]._detail_fetch_ts = Date.now();
    }

    // Wait up to 3 seconds for Python to fetch detail
    for(let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 100)); // wait 100ms
        const r = this.globalTableCache[roomId] || Object.values(this.globalTableCache).find((t: any) => t.number === roomId);
        if (r && r._last_detail_update && r._last_detail_update > (Date.now() - 5000)) {
             // details updated within the last 5 seconds!
             break;
        }
    }

    let room = this.globalTableCache[roomId];
    if (!room) {
        const byNumber = Object.values(this.globalTableCache).find((t:any) => t.number === roomId);
        if (byNumber) {
            return { success: true, room: { ...this.calculateRates(byNumber), detail: byNumber.detail || {}, lock: byNumber.lock || {} } };
        }
        throw new NotFoundException(Room with ID  not found);
    }
    return { success: true, room: { ...this.calculateRates(room), detail: room.detail || {}, lock: room.lock || {} } };
  }'''

new_get_room = '''  async getRoomById(roomId: number) {
    // Call the internal Crawler Service instead of writing to a file!
    await this.crawlerService.fetchTableDetailByRoomId(roomId);

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
        // throw new NotFoundException(Room with ID  not found);
        return { success: false, error: 'Room not found' };
    }
    return { success: true, room: { ...this.calculateRates(room), detail: room.detail || {}, lock: room.lock || {} } };
  }'''

if old_get_room in c:
    c = c.replace(old_get_room, new_get_room)
    open(fp, 'w', encoding='utf-8').write(c)
    print("Patched getRoomById!")
else:
    print("WARNING: Could not find old getRoomById logic.")

