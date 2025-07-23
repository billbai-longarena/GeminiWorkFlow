#!/bin/bash

# 后端启动脚本 - 确保在3000端口运行

echo "🚀 正在启动后端服务..."

# 检查3000端口是否被占用
PORT=3000
PID=$(lsof -t -i:$PORT)

if [ -n "$PID" ]; then
    echo "⚠️  端口 $PORT 被占用，进程ID: $PID"
    echo "🛑 正在终止占用进程..."
    kill -9 $PID
    sleep 2
    echo "✅ 端口 $PORT 已释放"
fi

# 检查后端目录是否存在
if [ ! -d "backend" ]; then
    echo "❌ 未找到 backend 目录"
    exit 1
fi

# 进入后端目录
cd backend

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装后端依赖..."
    npm install
fi

# 启动后端开发服务器
echo "🎯 正在启动后端开发服务器 (端口: $PORT)..."
npm run dev