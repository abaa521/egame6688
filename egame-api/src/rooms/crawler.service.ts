import {
  Injectable,
  Logger,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  chromium,
  Browser,
  BrowserContext,
  Page,
  CDPSession,
} from 'playwright';
import { execSync } from 'child_process';
import { RoomsService } from './rooms.service';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';

@Injectable()
export class CrawlerService implements OnModuleInit {
  private readonly logger = new Logger(CrawlerService.name);
  private browser!: Browser;
  private page!: Page;
  private cdpSession!: CDPSession;
  private currentToken: string = '';
  private currentSalt: string = '';
  private dynamicTotalPages: number = 7;

  constructor(
    @Inject(forwardRef(() => RoomsService))
    private roomsService: RoomsService,
  ) {}

  async onModuleInit() {
    this.startCrawler().catch((e) =>
      this.logger.error('Crawler initialization failed: ' + e),
    );
  }

  private async startCrawler() {
    this.logger.log(
      'Starting Python get_game_url.py to handle login and OCR...',
    );

    let gameUrl = '';
    try {
      const scriptPath = path.resolve(__dirname, '../../../get_game_url.py');
      // Execute python and grab purely the URL from stdout
      const output = execSync('python "' + scriptPath + '"', {
        encoding: 'utf-8',
      });
      gameUrl = output.trim();
    } catch (error) {
      this.logger.error(
        'Python script failed to get Game URL. Is ddddocr / python installed correctly?',
        error,
      );
      return;
    }

    if (!gameUrl) {
      this.logger.error('Empty URL returned from python.');
      return;
    }

    this.logger.log('Successfully got Game URL: ' + gameUrl);

    try {
      const parsedUrl = new URL(gameUrl);
      this.currentToken = parsedUrl.searchParams.get('t') || '';
      this.logger.log('Initial URL token: ' + this.currentToken);
    } catch (e) {
      this.logger.error('Failed to parse URL ' + e);
    }

    this.browser = await chromium.launch({
      headless: true, // We should run headless, wait, headless: false ?
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });
    this.page = await context.newPage();

    // Stealth bypass
    await this.page.addInitScript(`
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    `);

    // WS Hook for manual pagination/detail queries
    await this.page.addInitScript(`
      window.all_ws = [];
      const NativeWebSocket = window.WebSocket;
      const WSProxy = new Proxy(NativeWebSocket, {
          construct(target, args) {
              const ws = new target(...args);
              window.all_ws.push(ws);
              return ws;
          }
      });
      window.WebSocket = WSProxy;
      
      window.getGameWs = function() {
          // Find the latest open socket.io websocket
          return window.all_ws.reverse().find(w => w.readyState === 1 && w.url.includes('socket.io'));
      };
    `);

    this.logger.log('Binding CDP Session to intercept WebSocket...');
    this.cdpSession = await context.newCDPSession(this.page);
    await this.cdpSession.send('Network.enable');

    this.cdpSession.on('Network.webSocketCreated', (event) => {
      this.logger.log('WebSocket Created: ' + event.url);
    });

    this.cdpSession.on('Network.webSocketFrameReceived', (event) => {
      const resp = event.response;
      if (resp.opcode === 2) {
        let raw = Buffer.from(resp.payloadData, 'base64');
        if (raw[0] === 4) raw = raw.slice(1);
        try {
          const dec = this.decryptPayload(this.currentSalt, this.currentToken, raw);
          if (dec) {
            if (dec.encryption?.salt) {
              this.currentSalt = dec.encryption.salt;
            }
            if (dec.token) {
              this.currentToken = dec.token;
            }
            if (dec.data?.tables) {
              this.logger.log(`Received ${dec.data.tables.length} tables, tableMeta: ${JSON.stringify(dec.tableMeta)}`);
              this.roomsService.updateMemoryState({ data: dec.data });
              if (dec.tableMeta?.totalPages) {
                this.dynamicTotalPages = parseInt(dec.tableMeta.totalPages);
              }
            } else if (dec.data?.detail) {
              this.roomsService.updateDetailState({ data: dec.data });
            }
          }
        } catch (e) {
          this.logger.error('Binary Decryption Error: ' + e);
        }
      } else {
        this.handleWsPayload(resp.payloadData);
      }
    });

    this.cdpSession.on('Network.webSocketFrameSent', (event) => {
      const payload = event.response.payloadData;
      // console.log('--- SENT PAYLOAD DATA ---', payload.substring(0, 150));
      if (payload.includes('"initial"') || payload.includes('"token"')) {
        try {
          const arrStr = payload.substring(payload.indexOf('['));
          const data = JSON.parse(arrStr);
          if (data[0] === 'initial' || data[1]?.token) {
            this.currentToken = data[1].token;
            console.log('!!! CAPTURED GAME TOKEN !!! : ' + this.currentToken);
            this.logger.log('Captured game token: ' + this.currentToken);
          }
        } catch (e) {
          console.error('Parse token error on payload: ' + payload + ' | Error: ' + e);
        }
      }
    });

    this.logger.log('Navigating to Game UI...');
    await this.page.goto(gameUrl, { referer: 'https://egame6688.com/' });

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      if (this.currentToken) break;
    }

    if (!this.currentToken) {
      this.logger.error('Failed to capture initial WebSocket token!');
      return;
    }

    this.logger.log(
      'Initial sequence complete! Starting background polling loop.',
    );
    this.startBackgroundLoop();
  }

  private decryptPayload(salt: string, token: string, payloadBuf: Buffer): any {
    const keyMaterial = Buffer.from(token + salt, 'utf-8');
    const key = crypto.createHash('sha256').update(keyMaterial).digest();

    const iv = payloadBuf.slice(0, 12);
    const tag = payloadBuf.slice(12, 28);
    const ciphertext = payloadBuf.slice(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    let decryptedCompressed: Buffer;
    try {
      decryptedCompressed = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
    } catch (e) {
      return null;
    }

    let jsonStr: Buffer | undefined;
    try {
      jsonStr = zlib.inflateSync(decryptedCompressed);
    } catch {
      try {
        jsonStr = zlib.inflateRawSync(decryptedCompressed);
      } catch (e) {
        return null;
      }
    }

    if (jsonStr) {
      return JSON.parse(jsonStr.toString('utf-8'));
    }
    return null;
  }

  private handleWsPayload(payload: string) {
    const match = payload.match(/^\d+(\[.*\])$/);
    if (!match) return;

    try {
      const arr = JSON.parse(match[1]);
      const dec = arr[0];

      const totalPagesMap = payload.match(/"totalPages":(\d+)/);
      if (totalPagesMap && totalPagesMap[1]) {
        const parsedPages = parseInt(totalPagesMap[1]);
        if (parsedPages > 0) this.dynamicTotalPages = parsedPages;
      }

      if (dec?.data?.tables) {
        this.roomsService.updateMemoryState({ data: dec.data });
      } else if (dec?.data?.detail) {
        this.roomsService.updateDetailState({ data: dec.data });
      }
    } catch (e) {}
  }

  private async startBackgroundLoop() {
    let currentPageIdx = 1;
    while (true) {
      if (!this.currentToken || !this.page) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }

      this.fetchPage(currentPageIdx);

      // We wait shorter to cycle through all 7 pages quickly!
      await new Promise((r) => setTimeout(r, 2500));
      
      currentPageIdx++;
      if (currentPageIdx > this.dynamicTotalPages) {
        currentPageIdx = 1;
      }
    }
  }

  private async fetchPage(pageIdx: number) {
    const jsCmd =
      'var ws = window.getGameWs(); if (ws) { ws.send(\'421["getSlotTables",{"page":' +
      pageIdx +
      ',"token":"' +
      this.currentToken +
      '","locale":"zh-tw"}]\'); } else { throw new Error("WebSocket not ready yet"); }';
    try {
      await this.page.evaluate(jsCmd);
      this.logger.log(
        'Requested Background Page: ' +
          pageIdx +
          '/' +
          this.dynamicTotalPages,
      );
    } catch (e: any) {
      if (!e.message.includes('WebSocket not ready yet')) {
        this.logger.error('Paginator emit error', e);
      }
    }
  }

  public async fetchTableDetailByRoomId(roomId: number) {
    if (!this.page || !this.currentToken) return;
    this.logger.log('Fetch triggered via API for roomId: ' + roomId);
    const jsCmd =
      'var ws = window.getGameWs(); if (ws) { ws.send(\'423["getSlotTableDetail",{"roomId":' +
      roomId +
      ',"token":"' +
      this.currentToken +
      '","locale":"zh-tw"}]\'); }';
    try {
      await this.page.evaluate(jsCmd);
    } catch (e) {}
  }
}
