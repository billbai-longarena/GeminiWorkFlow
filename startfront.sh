#!/bin/bash

# 前端启动脚本 - 确保在5173端口运行

echo "🚀 正在启动前端服务..."

# 检查5173端口是否被占用
PORT=5173
PID=$(lsof -t -i:$PORT)

if [ -n "$PID" ]; then
    echo "⚠️  端口 $PORT 被占用，进程ID: $PID"
    echo "🛑 正在终止占用进程..."
    kill -9 $PID
    sleep 2
    echo "✅ 端口 $PORT 已释放"
fi

# 检查前端目录是否存在
if [ ! -d "frontend" ]; then
    echo "❌ 未找到 frontend 目录"
    exit 1
fi

# 进入前端目录
cd frontend

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装前端依赖..."
    npm install
fi

# 启动前端开发服务器
echo "🎯 正在启动前端开发服务器 (端口: $PORT)..."
npm run dev -- --port $PORT