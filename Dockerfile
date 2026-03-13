# --------- Stage 1: Build NestJS ---------
FROM node:22-alpine AS builder
WORKDIR /usr/src/app/egame-api

COPY egame-api/package.json ./
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
COPY ws_capture_cdp.py main.py ./

# Copy compiled NestJS app from builder stage
WORKDIR /usr/src/app/egame-api
COPY --from=builder /usr/src/app/egame-api/package.json ./
COPY --from=builder /usr/src/app/egame-api/node_modules ./node_modules
COPY --from=builder /usr/src/app/egame-api/dist ./dist

# NestJS listens on 3000 by default (as per our codes)
EXPOSE 3000

ENV PORT=3000

# Start NestJS, which will in turn spawn the Python process
CMD ["node", "dist/main.js"]
