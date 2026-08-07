# DEPLOYMENT.md
# Phase F：部署流程

本文件說明 Fist Palm and Weapons 的本地執行與部署流程。

## 1. 本地執行

### 1.1 建置資料
```bash
npm run build:data
```

### 1.2 執行測試
```bash
npm run test:rules        # rules 單元測試
npm run test:ai           # AI 單元 + e2e 測試
npm run test:all          # 全部測試
```

### 1.3 啟動正式 UI server
```bash
npm run client
```
開啟瀏覽器前往 `http://localhost:4000/`。

### 1.4 執行 AI 對戰（CLI）
```bash
npm run ai:match                    # 預設 AI vs AI
npm run ai:match:10                 # 最多 10 回合
npm run ai:match:3p                 # 3P AI 對戰
```

### 1.5 一鍵本地驗證
```bash
npm run verify:local
```
執行 build-data + 3 個 debug scenario + rules 測試 + AI 測試。

## 2. Docker 部署

### 2.1 建置映像
```bash
docker build -t fpw-client .
```

### 2.2 執行容器
```bash
docker run -p 4000:4000 fpw-client
```

### 2.3 使用 docker-compose（推薦）
```bash
docker compose up --build
docker compose down
```

容器啟動後，瀏覽器前往 `http://localhost:4000/`。

## 3. 部署流程（CI / CD 建議）

1. **建置**：`npm run build:data`（CSV → generated JSON）
2. **測試**：`npm run test:all`（rules + AI + debug）
3. **映像**：`docker build -t fpw-client .`
4. **發佈**：推送映像至 registry，再於目標主機 `docker compose up -d`
5. **驗證**：`GET /api/health` 應回傳 `{ ok: true }`

## 4. 環境變數

| 變數 | 預設 | 說明 |
|---|---|---|
| `PORT` | `4000` | client server 監聽埠 |

## 5. 回滾方案

- 若新版本有問題，可重新部署上一版映像。
- 本專案無持久化資料庫，狀態保存在 server 記憶體，重啟即重置，回滾風險低。
