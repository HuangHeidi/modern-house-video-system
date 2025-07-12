# 使用官方 Node.js 作為建置前端的基礎映像
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY video-management-system/package*.json ./
COPY video-management-system/vite.config.js ./
COPY video-management-system/ ./
RUN npm install
RUN npm run build

# 使用官方 Python 作為後端服務的基礎映像
FROM python:3.11-slim-buster

# 設定正確工作目錄為 /app/backend/src
WORKDIR /app/backend/src

# 複製前端建置好的靜態檔案到 Flask 專案的 static 資料夾
COPY --from=frontend-builder /app/frontend/dist ./static

# 複製 requirements.txt 並安裝依賴
COPY video-api-server/requirements.txt ../
RUN pip install --no-cache-dir -r ../requirements.txt

# 複製整個後端專案進入正確位置
COPY video-api-server/ ../

# 暴露 Flask 埠口
EXPOSE 5000

# 啟動 Flask 應用程式
CMD ["python", "main.py"]
