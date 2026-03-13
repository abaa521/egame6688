import os
import re

fp = 'C:/Code/egame6688/egame-api/src/rooms/rooms.service.ts'
c = open(fp, 'r', encoding='utf-8').read()

old_get_room_fallback = '''  async getRoomById(roomId: number) {
    const room = this.globalTableCache[roomId];
    if (!room) {
        const byNumber = Object.values(this.globalTableCache).find((t:any) => t.number === roomId);
        if (byNumber) {
            return { success: true, room: { ...this.calculateRates(byNumber), detail: byNumber.detail || {}, lock: byNumber.lock || {} } };
        }
        throw new NotFoundException(Room with ID  not found);
    }
    return { success: true, room: { ...this.calculateRates(room), detail: room.detail || {}, lock: room.lock || {} } };
  }'''

# try generic regex
new_get_room = '''  async getRoomById(roomId: number) {
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
  }'''

c = re.sub(r'async getRoomById\(roomId: number\) \{[\s\S]*?\}', new_get_room, c)

if "private crawlerService" not in c:
    c = c.replace("constructor() {", "constructor(@Inject(forwardRef(() => CrawlerService)) private crawlerService: CrawlerService) {")

open(fp, 'w', encoding='utf-8').write(c)
print("Patched generic")
