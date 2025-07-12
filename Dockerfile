# 使用官方Node.js作為建置前端的基礎映像
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY video-management-system/package*.json ./
COPY video-management-system/vite.config.js ./
COPY video-management-system/ ./
RUN npm install
COPY video-management-system/ ./
RUN npm run build

# 使用官方Python作為後端服務的基礎映像
FROM python:3.11-slim-buster

WORKDIR /app/backend

# 複製前端建置好的靜態檔案到後端
COPY --from=frontend-builder /app/frontend/dist /app/backend/src/static

COPY video-api-server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY video-api-server/ ./

# 暴露Flask應用程式的埠
EXPOSE 5000

# 啟動Flask應用程式
CMD ["python", "src/main.py"]
