import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppService.name);
  private pythonProcess: ChildProcess | null = null;
  private isShuttingDown = false;

  onModuleInit() {
    this.logger.log('Initializing Python Process Manager...');
    this.startPythonProcess();
  }

  onModuleDestroy() {
    this.isShuttingDown = true;
    if (this.pythonProcess) {
      this.logger.log('Shutting down API, killing Python daemon...');
      this.pythonProcess.kill();
    }
  }

  private startPythonProcess() {
    if (this.isShuttingDown) return;

    // 目錄對應: 啟動目錄為 egame-api 時，往上一層尋找 ws_capture_cdp.py
    const scriptPath = path.resolve(process.cwd(), '../ws_capture_cdp.py');
    
    this.logger.log(`Starting Python daemon: python -u ${scriptPath}`);
    
    // 使用 -u 避免 Python stdout buffer 導致 NestJS 無法即時看到 log
    this.pythonProcess = spawn('python', ['-u', scriptPath]);

    this.pythonProcess.stdout?.on('data', (data) => {
      this.logger.log(`[Python] ${data.toString().trim()}`);
    });

    this.pythonProcess.stderr?.on('data', (data) => {
      this.logger.error(`[Python] ${data.toString().trim()}`);
    });

    this.pythonProcess.on('close', (code) => {
      this.logger.warn(`Python daemon exited with code ${code}`);
      this.pythonProcess = null;
      
      if (!this.isShuttingDown) {
        this.logger.log('Restarting Python daemon in 5 seconds...');
        setTimeout(() => this.startPythonProcess(), 5000);
      }
    });
  }

  getHello(): string {
    return 'Hello World!';
  }
}
