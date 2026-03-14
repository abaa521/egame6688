# --------- Stage 1: Build NestJS ---------
FROM node:22-bookworm-slim AS builder
WORKDIR /usr/src/app/egame-api

# 避免在 build 階段下載 Playwright 的瀏覽器，節省時間與空間
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY egame-api/package.json ./
# 如果有 pnpm-lock.yaml 建議一併複製，確保版本一致性
# COPY egame-api/package.json egame-api/pnpm-lock.yaml ./ 
RUN npm install

COPY egame-api/ ./
RUN npm run build
RUN npm prune --omit=dev

# --------- Stage 2: Final Image (Python + Nodejs) ---------
FROM mcr.microsoft.com/playwright/python:v1.50.0-jammy

# Switch to root to install Node.js
USER root

# Install Node.js runtime (v22)
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python scraper script and necessary static files
COPY get_game_url.py ./

# Copy compiled NestJS app from builder stage
WORKDIR /usr/src/app/egame-api
COPY --from=builder /usr/src/app/egame-api/package.json ./
COPY --from=builder /usr/src/app/egame-api/node_modules ./node_modules
COPY --from=builder /usr/src/app/egame-api/dist ./dist

# NestJS listens on 3000 by default (as per our codes)
EXPOSE 3000

ENV PORT=3000
# IMPORTANT: 設定為 production 確保 Node 的 isDev 為 false，進而在 Docker 環境中自動啟用 headless 模式
ENV NODE_ENV=production

# (可選) 這裡可以定義預設的帳密，如果使用者在 docker run -e 沒有提供的話，至少有個保護機制或提醒
# ENV EGAME_ACCOUNT=your_account
# ENV EGAME_PASSWORD=your_password

# Start NestJS, which will in turn spawn the Python process
CMD ["node", "dist/main.js"]
