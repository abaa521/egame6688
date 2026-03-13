import os
import re

fp = 'C:/Code/egame6688/egame-api/src/rooms/crawler.service.ts'
c = open(fp, 'r', encoding='utf-8').read()

c = re.sub(r'this\.logger\.log\(\[WS Sent\].*?\);', 'this.logger.log([WS Sent] );', c)

open(fp, 'w', encoding='utf-8').write(c)
