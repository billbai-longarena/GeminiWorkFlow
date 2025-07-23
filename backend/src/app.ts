import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { swaggerSpec, swaggerUi } from './config/swagger.config';
import aiRoutes from './routes/ai.routes';
import './types/swagger.types'; // 导入Swagger类型定义


const app = express();
const PORT = process.env.PORT || 3000;

// 确保必要的目录存在
const directories = ['audio', 'images', 'videos'];
directories.forEach(dir => {
    const fullPath = path.join(__dirname, '..', '..', dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

// 中间件
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
}));
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Range', 'Authorization'],
    exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges']
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/audio', express.static(path.join(__dirname, '..', 'audio')));
app.use('/images', express.static(path.join(__dirname, '..', 'images')));

// 视频文件服务 - 添加CORS头
const videosPath = path.join(__dirname, '..', 'videos');
console.log(`[Express] Serving static video files from: ${videosPath}`);
app.use('/videos', (req, res, next) => {
    // 设置CORS头，允许跨域访问视频文件
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }

    next();
}, express.static(videosPath));

// Swagger文档
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'AI内容生成服务 API文档',
}));

// 健康检查路由
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API根路由
app.get('/api', (req, res) => {
    res.json({
        message: 'AI Services API',
        version: '1.0.0',
        documentation: '/api-docs',
        endpoints: {
            tts: '/api/ai/tts',
            imagen: '/api/ai/imagen',
            veo: '/api/ai/veo',
            workflow: '/api/ai/workflow'
        }
    });
});

// AI服务路由
app.use('/api/ai', aiRoutes);

// 404处理
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

// 错误处理中间件
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error occurred:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        body: req.body,
        timestamp: new Date().toISOString()
    });

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            details: err.message
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }

    // Multer errors
    if (err.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            error: 'File upload error',
            details: err.message
        });
    }

    // Syntax errors
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
            success: false,
            error: 'Invalid JSON format',
            details: err.message
        });
    }

    // Default error
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
    });
});

export default app;