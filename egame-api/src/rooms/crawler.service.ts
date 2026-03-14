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
  private context!: BrowserContext;
  private page!: Page;
  private cdpSession!: CDPSession;
  private currentToken: string = '';
  private currentAckId: number = 1;
  private currentSalt: string = '';
  private dynamicTotalPages: number = 7;
  private isWsConnected: boolean = false;
  private isRebooting: boolean = false;
  private isCrawlerReady: boolean = false;
  private currentRunId: number = 0;
  private wsQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue: boolean = false;
  private responseResolver: (() => void) | null = null;

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
    const runId = Date.now();
    this.currentRunId = runId;

    this.logger.log(
      'Starting Python get_game_url.py to handle login and OCR...',
    );

    let gameUrl = '';
    try {
      const scriptPath = path.resolve(__dirname, '../../../get_game_url.py');
      // 確保將當前 NestJS 的環境變數 (包含 .env 讀取到的) 傳遞給 Python
      const output = execSync('python "' + scriptPath + '"', {
        encoding: 'utf-8',
        env: { ...process.env } // 將環境變數往下傳
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

    if (!this.browser) {
      const isDev = process.env.NODE_ENV !== 'production';
      this.browser = await chromium.launch({
        headless: !isDev,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
      });
    }
    if (!this.context) {
      this.context = await this.browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
      });
    }
    this.page = await this.context.newPage();

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
    this.page.on('request', (req) => {
      const url = req.url();
      if (url.includes('token=') || url.includes('/api/')) {
        this.logger.debug(`[HTTP Request] ${req.method()} ${url}`);
      }
    });
    this.cdpSession = await this.context.newCDPSession(this.page);
    await this.cdpSession.send('Network.enable');

    this.cdpSession.on('Network.webSocketCreated', (event) => {
      this.logger.log('WebSocket Created: ' + event.url);
    });

    this.cdpSession.on('Network.webSocketFrameReceived', (event) => {
      const resp = event.response;
      let shouldResolveQueue = false;

      if (resp.opcode === 2) {
        // ... (binary payload decrypt)
        let raw = Buffer.from(resp.payloadData, 'base64');
        if (raw[0] === 4) raw = raw.slice(1);
        try {
          const dec = this.decryptPayload(
            this.currentSalt,
            this.currentToken,
            raw,
          );
          if (dec) {
            if (dec.encryption?.salt) {
              this.currentSalt = dec.encryption.salt;
            }
            if (dec.token) {
              shouldResolveQueue = true; // ONLY resolve queue when we definitely got a new token
              this.logger.log(
                `[Token Debug] Binary payload returned new token: ${dec.token} replacing ${this.currentToken}`,
              );
              this.currentToken = dec.token;
            }
            if (dec.eventName === 'getSlotTables') {
              this.logger.log(
                `Received binary tables from WS, totalPages: ${dec.data?.tableMeta?.totalPages}`,
              );
              this.roomsService.updateMemoryState({ data: dec.data });
              if (dec.data?.tableMeta?.totalPages) {
                this.dynamicTotalPages = parseInt(
                  dec.data.tableMeta.totalPages,
                );
              }
            } else if (dec.eventName === 'getSlotTableDetail') {
              this.logger.log(
                `Received binary detail for room ${dec.data?.roomId}`,
              );
              this.roomsService.updateDetailState({ data: dec.data });
            }
          }
        } catch (e) {
          this.logger.error('Binary Decryption Error: ' + e);
        }
      } else {
        this.handleWsPayload(resp.payloadData);
      }

      if (shouldResolveQueue) {
        this.resolveWsQueue();
      }
    });

    this.cdpSession.on('Network.webSocketFrameSent', (event) => {
      const payload = event.response.payloadData;
      const opcode = event.response.opcode;
      
      if (opcode === 2) {
        this.logger.debug(`[WS SENT BINARY] base64 length: ${payload.length}`);
      } else if (typeof payload === 'string') {
        // debug all sent events briefly to understand timeline
        this.logger.debug(`[WS SENT] ${payload.substring(0, 100)}`);

        const ackMatch = payload.match(/^42(\d+)\[/);
        if (ackMatch) {
          const sentAckId = parseInt(ackMatch[1], 10);
          if (sentAckId >= this.currentAckId) {
            this.currentAckId = sentAckId + 1;
          }
        }
        
        if (payload.includes('"token"')) {
          try {
            const arrStr = payload.substring(payload.indexOf('['));
            if (arrStr) {
              const data = JSON.parse(arrStr);
              if (data && data[1] && data[1].token) {
                this.logger.log(
                  `[Token Debug] Client sent ${data[0]} (AckId: ${ackMatch ? ackMatch[1] : 'none'}) payloadToken: ${data[1].token} (current internal token: ${this.currentToken})`,
                );
                // Only initial needs to update this.currentToken from sent, others just use it
                if (data[0] === 'initial') {
                  this.currentToken = data[1].token;
                }
              }
            }
          } catch (e) {
            // ignore parse errors for partial matches
          }
        }
      }
    });

    this.logger.log('Navigating to Game UI...');
    await this.page.goto(gameUrl, { referer: 'https://egame6688.com/' });

    let hasSentInitial = false;
    this.cdpSession.on('Network.webSocketFrameSent', (event) => {
      const payload = event.response.payloadData;
      if (typeof payload === 'string' && payload.includes('"initial"')) {
        hasSentInitial = true;
      }
    });

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      if (hasSentInitial) {
        // Wait an extra moment after initial to ensure response is processed
        await new Promise((r) => setTimeout(r, 2000));
        break;
      }
    }

    if (!hasSentInitial) {
      this.logger.error('Failed to capture initial WebSocket frame!');
      return;
    }

    this.logger.log(
      'Initial sequence complete! Starting background polling loop.',
    );
    this.isCrawlerReady = true;
    this.startBackgroundLoop(runId);
  }

  private async restartCrawler() {
    if (this.isRebooting) return;
    this.isRebooting = true;
    this.logger.warn('Restarting crawler due to websocket 401 Token error...');

    this.currentRunId = Date.now(); // Instantly invalidate any running loops
    this.wsQueue = [];
    this.isProcessingQueue = false;
    this.resolveWsQueue(); // ensure any pending resolver is released

    try {
      if (this.page) {
        await this.page.close();
      }
    } catch (e) {}

    this.currentToken = '';
      this.currentAckId = 1;
      this.isWsConnected = false;      
      this.isCrawlerReady = false;
    // Small delay, then restart
    setTimeout(() => {
      this.startCrawler().finally(() => {
        this.isRebooting = false;
      });
    }, 2000);
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
      const payloadObj = arr.length > 1 ? arr[1] : arr[0];

      // Token expired check
      if (
        dec?.status === 401 ||
        dec?.code === 'verify-login-132' ||
        payloadObj?.status === 401 ||
        payloadObj?.code === 'verify-login-132'
      ) {
        this.logger.error(
          `Received WebSocket 401 Unauthorized: ${JSON.stringify(dec)}`,
        );
        this.restartCrawler();
        return;
      }

      // Sometimes initial payload fallback to text format "430[{...}]"
      if (payloadObj && payloadObj.token) {
        this.logger.log(
          `[Token Debug] Text payload returned new token: ${payloadObj.token} replacing ${this.currentToken}`,
        );
        this.currentToken = payloadObj.token;
        this.resolveWsQueue(); // unlock queue if it was waiting
      }
    } catch (e) {}
  }

  private async startBackgroundLoop(runId: number) {
    let currentPageIdx = 1;
    while (true) {
      if (this.currentRunId !== runId) {
        this.logger.warn(`Old background loop detected. Terminating loop ${runId}`);
        break;
      }

      if (!this.isCrawlerReady || !this.currentToken || !this.page) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }

      this.fetchPage(currentPageIdx);

      // 加快背景輪詢速度，每 1 秒抓一頁，保持前端列表即時性
      await new Promise((r) => setTimeout(r, 1000));

      currentPageIdx++;
      if (currentPageIdx > this.dynamicTotalPages) {
        currentPageIdx = 1;
      }
    }
  }

  private async fetchPage(pageIdx: number) {
    this.enqueueWsCommand(() => {
      this.logger.log(`Requested Background Page: ${pageIdx}/${this.dynamicTotalPages}`);
      const ackId = this.currentAckId++;
      return `var ws = window.getGameWs(); if (ws) { ws.send('42${ackId}["getSlotTables",{"page":${pageIdx},"token":"${this.currentToken}","locale":"zh-tw"}]'); } else { throw new Error("WebSocket not ready yet"); }`;
    });
  }

  public async fetchTableDetailByRoomId(roomId: number) {
    if (!this.page || !this.currentToken) return;
    this.logger.log('Fetch triggered via API for roomId: ' + roomId);
    this.enqueueWsCommand(() => {
      const ackId = this.currentAckId++;
      return `var ws = window.getGameWs(); if (ws) { ws.send('42${ackId}["getSlotTableDetail",{"roomId":${roomId},"token":"${this.currentToken}","locale":"zh-tw"}]'); }`;
    });
  }

  private resolveWsQueue() {
    if (this.responseResolver) {
      const res = this.responseResolver;
      this.responseResolver = null;
      res();
    }
  }

  private async processWsQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;
    const initialRunId = this.currentRunId;

    while (this.wsQueue.length > 0) {
      if (this.currentRunId !== initialRunId) {
        this.logger.warn(`Old wsQueue processor detected. Terminating loop ${initialRunId}`);
        break;
      }
      const task = this.wsQueue.shift();
      if (task) {
        await task();
        // Wait for up to 3 seconds for the server to reply and give a new token
        await new Promise<void>((resolve) => {
          this.responseResolver = resolve;
          setTimeout(() => {
            if (this.responseResolver === resolve) {
              this.responseResolver = null;
              resolve();
            }
          }, 3000);
        });
      }
    }

    this.isProcessingQueue = false;
  }

  private enqueueWsCommand(commandBuilder: () => string) {
    const runId = this.currentRunId;
    this.wsQueue.push(async () => {
      if (this.currentRunId !== runId) return;
      if (!this.page || !this.currentToken) return;
      const jsCmd = commandBuilder();
      try {
        await this.page.evaluate(jsCmd);
      } catch (e: any) {
        if (
          !e.message.includes('WebSocket not ready yet') &&
          !e.message.includes('Target page, context or browser has been closed') &&
          !e.message.includes('Execution context was destroyed')
        ) {
          this.logger.error('WS Queue Playwright error: ' + e?.message);
        }
      }
    });
    this.processWsQueue();
  }
}

