import axios from 'axios';
import { ImagenRequest, ImagenResponse, ImagenConfig, ImageFile } from '../types/ai.types';

export class ImagenService {
    private config: ImagenConfig;

    constructor(config: ImagenConfig) {
        this.config = {
            model: 'imagen-3.0-generate-002',
            sampleCount: 1,
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
            ...config
        };
    }

    async generateImage(request: ImagenRequest): Promise<ImagenResponse> {
        const url = `${this.config.baseUrl}/models/${this.config.model}:predict`;

        const requestBody = {
            instances: [{
                prompt: request.prompt
            }],
            parameters: {
                sampleCount: request.sampleCount || this.config.sampleCount,
                aspectRatio: request.aspectRatio,
                personGeneration: request.personGeneration,
                negativePrompt: request.negativePrompt,
                seed: request.seed
            }
        };

        console.log('[ImagenService] Starting image generation with request:', {
            prompt: request.prompt.substring(0, 100) + '...',
            aspectRatio: request.aspectRatio,
            sampleCount: request.sampleCount || this.config.sampleCount,
            personGeneration: request.personGeneration,
            model: this.config.model,
            proxyEnabled: !!this.config.proxyUrl,
            proxyUrl: this.config.proxyUrl ? 'configured' : 'none'
        });

        try {
            console.log('[ImagenService] Sending request to:', url);
            console.log('[ImagenService] Request headers:', {
                'Content-Type': 'application/json',
                'x-goog-api-key': this.config.apiKey ? '***' : 'MISSING'
            });

            // 构建请求配置
            const axiosConfig: any = {
                headers: {
                    'x-goog-api-key': this.config.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 60000, // 60秒超时
                validateStatus: (status: number) => status < 500 // 允许4xx错误通过
            };

            // 处理代理配置
            if (this.config.proxyUrl) {
                try {
                    const proxyUrl = new URL(this.config.proxyUrl);
                    if (proxyUrl.hostname && proxyUrl.port) {
                        axiosConfig.proxy = {
                            host: proxyUrl.hostname,
                            port: parseInt(proxyUrl.port)
                        };
                        console.log('[ImagenService] Using proxy:', proxyUrl.hostname, proxyUrl.port);
                    } else {
                        console.warn('[ImagenService] Invalid proxy URL format, skipping proxy');
                    }
                } catch (proxyError) {
                    console.warn('[ImagenService] Proxy URL parsing failed, skipping proxy:', proxyError);
                }
            } else {
                console.log('[ImagenService] No proxy configured, using direct connection');
            }

            const response = await axios.post(url, requestBody, axiosConfig);

            console.log('[ImagenService] Response received:', {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                dataKeys: response.data ? Object.keys(response.data) : []
            });

            // 处理4xx错误
            if (response.status >= 400) {
                console.error('[ImagenService] API Error Response:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: response.data
                });

                const errorData = response.data as any;

                if (response.status === 429) {
                    throw new Error(`API限流错误 (429): ${errorData?.error?.message || '请求过于频繁，请稍后重试'}`);
                } else if (response.status === 400) {
                    throw new Error(`请求参数错误 (400): ${errorData?.error?.message || '请检查请求参数'}`);
                } else if (response.status === 401) {
                    throw new Error(`认证错误 (401): ${errorData?.error?.message || 'API密钥无效或缺失'}`);
                } else if (response.status === 403) {
                    throw new Error(`权限错误 (403): ${errorData?.error?.message || '无权限访问此服务'}`);
                } else {
                    throw new Error(`API错误 (${response.status}): ${errorData?.error?.message || response.statusText}`);
                }
            }

            const data = response.data as any;

            if (!data.predictions || data.predictions.length === 0) {
                console.warn('[ImagenService] No predictions found in response:', data);
                throw new Error('No images generated');
            }

            console.log('[ImagenService] Successfully generated', data.predictions.length, 'images');

            return {
                images: data.predictions.map((pred: any) => ({
                    bytesBase64Encoded: pred.bytesBase64Encoded,
                    mimeType: 'image/png',
                    safetyAttributes: pred.safetyAttributes
                })),
                prompt: request.prompt
            };
        } catch (error) {
            console.error('[ImagenService] Image generation failed:', {
                error: error instanceof Error ? error.message : error,
                stack: error instanceof Error ? error.stack : undefined,
                request: {
                    prompt: request.prompt.substring(0, 50) + '...',
                    aspectRatio: request.aspectRatio
                }
            });

            // 检查是否为Axios错误
            const axiosError = error as any;
            if (axiosError.isAxiosError || axiosError.code) {
                console.error('[ImagenService] Network/HTTP error details:', {
                    code: axiosError.code,
                    message: axiosError.message,
                    status: axiosError.response?.status,
                    statusText: axiosError.response?.statusText,
                    headers: axiosError.response?.headers,
                    data: axiosError.response?.data,
                    config: {
                        url: axiosError.config?.url,
                        method: axiosError.config?.method,
                        timeout: axiosError.config?.timeout
                    }
                });

                // 网络连接错误
                if (axiosError.code === 'ECONNRESET' || axiosError.code === 'ETIMEDOUT') {
                    throw new Error(`网络连接失败 (${axiosError.code}): 请检查网络连接或代理设置`);
                }

                // 代理错误
                if (axiosError.code === 'ENOTFOUND' && this.config.proxyUrl) {
                    throw new Error(`代理服务器连接失败: 请检查代理地址 ${this.config.proxyUrl}`);
                }
            }

            throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async saveImage(imageData: string, filename: string, outputDir: string = './images'): Promise<string> {
        const fs = require('fs');
        const path = require('path');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const buffer = Buffer.from(imageData, 'base64');
        const filePath = path.join(outputDir, filename);
        fs.writeFileSync(filePath, buffer);

        return filePath;
    }

    async listImageFiles(): Promise<ImageFile[]> {
        const fs = require('fs');
        const path = require('path');
        const imagesDir = path.join(__dirname, '..', '..', 'images');
        console.log(`[ImagenService] Listing image files from: ${imagesDir}`);
        if (!fs.existsSync(imagesDir)) {
            console.log(`[ImagenService] Images directory does not exist: ${imagesDir}`);
            return [];
        }

        const files = fs.readdirSync(imagesDir);
        const imageFiles = files
            .filter((file: string) => /\.(png|jpg|jpeg|gif|webp)$/i.test(file))
            .map((file: string) => {
                const filePath = path.join(imagesDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    size: stats.size,
                    modified: stats.mtime.toISOString(),
                };
            });

        return imageFiles;
    }

    getAvailableAspectRatios(): string[] {
        return [
            '1:1',      // 正方形
            '9:16',     // 竖屏
            '16:9',     // 横屏
            '4:3',      // 标准
            '3:4',      // 竖版标准
            '3:2',      // 横向
            '2:3'       // 竖向
        ];
    }

    getPersonGenerationOptions(): string[] {
        return [
            'dont_allow',      // 不允许生成人物
            'allow_adult',     // 仅允许成人
            'allow_all'        // 允许所有人物
        ];
    }
}