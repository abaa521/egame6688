import re

fp = 'C:/Code/egame6688/egame-api/src/rooms/rooms.service.ts'
c = open(fp, 'r', encoding='utf-8').read()

# Replace the corrupted tail
corrupted_tail = '''    return { success: true, room: { ...this.calculateRates(room), detail: room.detail || {}, lock: room.lock || {} } };                                           }, lock: byNumber.lock || {} } };
        }
        throw new NotFoundException(Room with ID  not found);        
    }
    return { success: true, room: { ...this.calculateRates(room), detail: room.detail || {}, lock: room.lock || {} } };                                           }'''

fixed_tail = '''    return { success: true, room: { ...this.calculateRates(room), detail: room.detail || {}, lock: room.lock || {} } };
  }'''

if corrupted_tail in c:
    c = c.replace(corrupted_tail, fixed_tail)
else:
    # Try more aggressive regex
    c = re.sub(r'    return \{ success: true, room: \{ \.\.\.this\.calculateRates\(room\), detail: room\.detail \|\| \{\}, lock: room\.lock \|\| \{\} \} \};.*', fixed_tail, c, flags=re.DOTALL)
    c = c + "\n\n  async refreshData() {\n    return { success: true };\n  }\n}\n"

open(fp, 'w', encoding='utf-8').write(c)
print("fixed")

