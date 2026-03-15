# egame6688 自動化爬蟲 API 部署教學

這份文件將引導您如何在全新的 VPS (虛擬專屬主機) 或雲端伺服器上，從零開始部署 `egame6688` 的後端與自動化爬蟲服務。

---

## 1. 系統硬體需求建議（重要）

由於系統會啟動 Google Chromium 無頭瀏覽器並結合 Python 進行圖片驗證碼辨識 (ddddocr)，瞬間資源消耗較大，強烈建議伺服器至少符合以下規格：

*   **作業系統：** Ubuntu 22.04 LTS 或 24.04 LTS (推薦)
*   **處理器 (CPU)：** 至少 **2 核心 (2 vCPU)**，推薦 **4 核心**。(若僅有單核，會導致驗證碼解析過慢而造成 WebSocket 連線超時斷開)
*   **記憶體 (RAM)：** 至少 **2 GB**，推薦 **4 GB**。(實測運行期間基本佔用為 1.4 GB 左右，1GB 以下的機器會發生 OOM 記憶體不足崩潰)

---

## 2. 登入伺服器與基礎環境安裝

首先，請使用 SSH 登入您的伺服器：
```bash
ssh root@您的伺服器IP
```

登入後，一次性複製並貼上以下指令來安裝 Git 與 Docker 核心套件：
```bash
# 更新系統套件庫並安裝必備軟體
apt-get update -y
apt-get install -y git docker.io docker-compose htop

# 啟動 Docker 服務並設定開機自動啟動
systemctl start docker
systemctl enable docker
```

---

## 3. 下載專案與環境變數設定

### 3.1 下載專案程式碼
```bash
cd /root
# 移除剛好同名的舊資料夾 (若有的話)
rm -rf egame6688 
# 下載原始碼
git clone https://github.com/abaa521/egame6688.git
cd egame6688
```

### 3.2 設定環境變數 (.env)
系統需要透過環境變數登入遊戲。請使用編輯器配置您的帳號密碼：
```bash
# 進入 api 目錄建立或編輯 .env 檔案
nano egame-api/.env
```
在文件中寫入您的帳號與密碼，格式如下：
```ini
GAME_ACCOUNT=您的遊戲帳號
GAME_PASSWORD=您的遊戲密碼
```
*(輸入完畢後，按 `Ctrl + O` 存檔，按 `Enter` 確認，再按 `Ctrl + X` 退出 nano 編輯器)*

---

## 4. 封裝與啟動服務

當準備好 `.env` 檔案後，回到專案根目錄，開始封裝 Docker 映像檔並啟動：

```bash
# 確保人在專案根目錄中
cd /root/egame6688

# 1. 建立 Docker Image (過程約需 3~5 分鐘)
docker build -t egame-backend .

# 2. 啟動為背景容器
docker run -d \
  --name egame-api \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file egame-api/.env \
  egame-backend
```

若您的伺服器有防火牆 (ufw)，請記得開放 3000 Port：
```bash
ufw allow 3000/tcp || true
```

部署完成！請打開瀏覽器訪問：
👉 `http://伺服器IP:3000/rooms`

*(註：剛啟動的頭一分鐘爬蟲正在自動登入並索取遊戲 WebSocket 資料，一開始可能是空陣列 `[]`，稍等片刻後重新整理即可看到機台狀態。)*

---

## 5. 常用的維護與除錯指令

未來如果您需要對爬蟲進行維護，以下指令會非常實用：

### 查看即時日誌 (最常用)
可以看到 NestJS 的啟動狀態以及 Python 爬蟲登入、攔截 Token 的詳細流程。
```bash
docker logs -f egame-api
```
*(退出觀看請按 `Ctrl + C`)*

### 重啟伺服器
如果您修改了設定，或想強制讓系統重新啟動爬蟲框架：
```bash
docker restart egame-api
```

### 停止服務
需要暫停服務並釋放伺服器記憶體：
```bash
docker stop egame-api
```

### 更新程式碼並重新部署
如果在本地端寫好了新功能並推送到 GitHub，要在 VPS 上做更新，請執行：
```bash
cd /root/egame6688
git pull
docker rm -f egame-api
docker build -t egame-backend .
docker run -d --name egame-api --restart unless-stopped -p 3000:3000 --env-file egame-api/.env egame-backend
```

### 監控系統負載
用來確認記憶體與 CPU 是不是不夠了：
```bash
# 看各個容器使用的資源 (CPU/Memory)
docker stats

# 看整台主機的資源與處理程序 (按 F10 退出)
htop 
```