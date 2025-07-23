import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'AI内容生成服务 API',
            version: '1.0.0',
            description: '基于TypeScript的AI内容生成服务，支持文本转语音(TTS)、图像生成(Imagen)和视频生成(Veo3)，并提供复杂工作流配置功能',
            contact: {
                name: 'AI内容生成服务',
                url: 'https://github.com/your-repo',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: '本地开发服务器',
            },
        ],
        tags: [
            {
                name: 'TTS',
                description: '文本转语音服务',
            },
            {
                name: 'Imagen',
                description: '图像生成服务',
            },
            {
                name: 'Veo',
                description: '视频生成服务',
            },
            {
                name: 'Workflow',
                description: '工作流配置服务',
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/types/*.ts'], // 扫描路由和类型定义文件
};

const swaggerSpec = swaggerJSDoc(options);

export { swaggerSpec, swaggerUi };