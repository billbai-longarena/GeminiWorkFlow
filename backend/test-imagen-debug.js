#!/usr/bin/env node

/**
 * Imagen API调试工具
 * 用于测试API连接和查看详细的错误信息
 */

const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const PROXY_URL = process.env.PROXY_URL;

console.log('=== Imagen API 调试工具 ===');
console.log('时间:', new Date().toISOString());
console.log('API密钥:', API_KEY ? '已配置' : '未配置');
console.log('代理:', PROXY_URL || '无');
console.log('');

async function testImagenAPI() {
    if (!API_KEY) {
        console.error('❌ 错误: GEMINI_API_KEY 环境变量未设置');
        console.log('请检查 backend/.env 文件是否包含:');
        console.log('GEMINI_API_KEY=your_api_key_here');
        process.exit(1);
    }

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict';

    const requestBody = {
        instances: [{
            prompt: "A simple test image of a red apple on a white background"
        }],
        parameters: {
            sampleCount: 1,
            aspectRatio: "1:1"
        }
    };

    console.log('📤 发送测试请求...');
    console.log('URL:', url);
    console.log('请求体:', JSON.stringify(requestBody, null, 2));
    console.log('');

    const config = {
        headers: {
            'x-goog-api-key': API_KEY,
            'Content-Type': 'application/json'
        },
        timeout: 30000,
        validateStatus: (status) => true // 允许所有状态码
    };

    if (PROXY_URL) {
        try {
            const proxyUrl = new URL(PROXY_URL);
            config.proxy = {
                host: proxyUrl.hostname,
                port: parseInt(proxyUrl.port)
            };
            console.log('🌐 使用代理:', PROXY_URL);
        } catch (e) {
            console.warn('⚠️ 代理URL格式无效:', PROXY_URL);
        }
    }

    try {
        console.log('⏳ 等待API响应...');
        const response = await axios.post(url, requestBody, config);

        console.log('✅ 收到响应!');
        console.log('状态码:', response.status);
        console.log('状态文本:', response.statusText);
        console.log('响应头:', response.headers);
        console.log('');

        if (response.status === 200) {
            console.log('🎉 成功生成图像!');
            console.log('响应数据:', JSON.stringify(response.data, null, 2));

            if (response.data.predictions && response.data.predictions.length > 0) {
                console.log(`📊 生成了 ${response.data.predictions.length} 张图像`);
                const image = response.data.predictions[0];
                console.log('图像大小:', image.bytesBase64Encoded ? `${Math.round(image.bytesBase64Encoded.length * 0.75 / 1024)}KB` : '未知');
            }
        } else {
            console.error('❌ API返回错误:');
            console.error('状态码:', response.status);
            console.error('错误信息:', response.data);

            // 分析常见错误
            switch (response.status) {
                case 400:
                    console.error('💡 可能原因: 请求参数错误或提示词不符合规范');
                    break;
                case 401:
                    console.error('💡 可能原因: API密钥无效或未启用Imagen API');
                    break;
                case 403:
                    console.error('💡 可能原因: 没有权限使用Imagen API或项目未启用');
                    break;
                case 429:
                    console.error('💡 可能原因: 请求频率过高，需要降低请求频率');
                    break;
                case 500:
                    console.error('💡 可能原因: Google服务器内部错误，请稍后重试');
                    break;
                default:
                    console.error('💡 请检查API文档或联系支持');
            }
        }
    } catch (error) {
        console.error('❌ 请求失败:');
        console.error('错误类型:', error.constructor.name);
        console.error('错误信息:', error.message);

        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        } else if (error.request) {
            console.error('请求已发送但没有收到响应');
            console.error('请求配置:', error.config);
        } else {
            console.error('请求配置错误:', error.config);
        }

        console.error('完整错误对象:', error);
    }
}

// 运行测试
testImagenAPI().catch(console.error);