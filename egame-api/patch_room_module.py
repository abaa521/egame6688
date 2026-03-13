import os

fp = 'C:/Code/egame6688/egame-api/src/rooms/rooms.module.ts'
c = open(fp, 'r', encoding='utf-8').read()

if 'CrawlerService' not in c:
    c = c.replace("import { RoomsService } from './rooms.service';", "import { RoomsService } from './rooms.service';\nimport { CrawlerService } from './crawler.service';")
    c = c.replace("providers: [RoomsService]", "providers: [RoomsService, CrawlerService]")
    open(fp, 'w', encoding='utf-8').write(c)
    print("Patched rooms.module.ts")
else:
    print("Already patched")
