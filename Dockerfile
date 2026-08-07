# Dockerfile
# Phase F：deployment flow
# 以 Node.js 執行 client server（正式 UI + 遊戲 API）。
# 建置：
#   docker build -t fpw-client .
# 執行：
#   docker run -p 4000:4000 fpw-client

FROM node:20-alpine

WORKDIR /app

# 先複製 package.json 以善用 layer cache
COPY package.json package-lock.json ./

RUN npm install --omit=dev

# 複製專案原始碼
COPY . .

# 建置 generated data（CSV → JSON）
RUN node scripts/build-data.js

# 執行正式 UI server
EXPOSE 4000

ENV PORT=4000

CMD ["node", "client/server.js"]
