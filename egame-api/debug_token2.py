import os

fp = 'C:/Code/egame6688/egame-api/src/rooms/crawler.service.ts'
c = open(fp, 'r', encoding='utf-8').read()
new_c = []
for line in c.split('\n'):
    if 'this.logger.log([WS Sent]' in line:
        continue
    new_c.append(line)

open(fp, 'w', encoding='utf-8').write('\n'.join(new_c))
