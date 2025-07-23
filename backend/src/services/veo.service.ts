import axios from 'axios';
import { VeoRequest, VeoResponse, VeoConfig, VideoFile } from '../types/ai.types';
import fs from 'fs';
import path from 'path';

export class VeoService {
    private config: VeoConfig;

    constructor(config: VeoConfig) {
        this.config = {
            model: 'veo-3.0-generate-preview',
            aspectRatio: '16:9',
            personGeneration: 'allow_all',
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
            ...config
        };
    }

    async generateVideo(request: VeoRequest): Promise<VeoResponse> {
        const url = `${this.config.baseUrl}/models/${this.config.model}:predictLongRunning`;

        console.log('[VeoService] Starting video generation', {
            url,
            model: this.config.model,
            request: {
                prompt: request.prompt?.substring(0, 100) + '...',
                aspectRatio: request.aspectRatio,
                personGeneration: request.personGeneration
            }
        });

        const requestBody = {
            instances: [{
                prompt: request.prompt
            }],
            parameters: {
                aspectRatio: request.aspectRatio || this.config.aspectRatio,
                personGeneration: request.personGeneration || this.config.personGeneration
            }
        };

        console.log('[VeoService] Request body prepared', {
            instancesCount: requestBody.instances.length,
            parameters: requestBody.parameters
        });

        try {
            console.log('[VeoService] Sending request to Google API...');
            const response = await axios.post(url, requestBody, {
                headers: {
                    'x-goog-api-key': this.config.apiKey,
                    'Content-Type': 'application/json'
                },
                ...(this.config.proxyUrl && {
                    proxy: {
                        host: new URL(this.config.proxyUrl).hostname,
                        port: parseInt(new URL(this.config.proxyUrl).port)
                    }
                })
            });

            console.log('[VeoService] Google API response received', {
                status: response.status,
                statusText: response.statusText,
                hasData: !!response.data,
                dataKeys: response.data ? Object.keys(response.data) : []
            });

            const data = response.data as any;

            if (!data.name) {
                console.error('[VeoService] No operation name in response', { data });
                throw new Error('No operation name returned');
            }

            console.log('[VeoService] Video generation initiated successfully', {
                operationName: data.name,
                responseData: data
            });

            return {
                operationName: data.name,
                status: 'pending'
            };
        } catch (error) {
            console.error('[VeoService] Video generation failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                errorStack: error instanceof Error ? error.stack : undefined,
                request: {
                    promptLength: request.prompt?.length,
                    aspectRatio: request.aspectRatio
                }
            });

            // 检查是否为axios错误
            const axiosError = error as any;
            if (axiosError.isAxiosError || axiosError.response) {
                console.error('[VeoService] Axios error details', {
                    status: axiosError.response?.status,
                    statusText: axiosError.response?.statusText,
                    responseData: axiosError.response?.data,
                    requestUrl: axiosError.config?.url,
                    requestMethod: axiosError.config?.method
                });
            }

            throw new Error(`Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async checkVideoStatus(operationName: string): Promise<VeoResponse> {
        const url = `${this.config.baseUrl}/${operationName}`;

        console.log('[VeoService] Checking video status', {
            operationName,
            url
        });

        try {
            console.log('[VeoService] Sending status check request...');
            const response = await axios.get(url, {
                headers: {
                    'x-goog-api-key': this.config.apiKey
                },
                ...(this.config.proxyUrl && {
                    proxy: {
                        host: new URL(this.config.proxyUrl).hostname,
                        port: parseInt(new URL(this.config.proxyUrl).port)
                    }
                })
            });

            console.log('[VeoService] Status check response received', {
                status: response.status,
                statusText: response.statusText,
                hasData: !!response.data,
                dataKeys: response.data ? Object.keys(response.data) : []
            });

            const data = response.data as any;

            console.log('[VeoService] Response data structure', {
                done: data.done,
                hasError: !!data.error,
                hasResponse: !!data.response,
                responseKeys: data.response ? Object.keys(data.response) : []
            });

            if (!data.done) {
                console.log('[VeoService] Video still processing', { operationName });
                return {
                    operationName,
                    status: 'running'
                };
            }

            if (data.error) {
                console.error('[VeoService] Video generation failed', {
                    operationName,
                    error: data.error
                });
                return {
                    operationName,
                    status: 'failed',
                    error: data.error.message || 'Unknown error'
                };
            }

            // 解析视频URI
            let videoUri: string | undefined;

            console.log('[VeoService] Parsing video URI from response...');

            if (data.response?.generateVideoResponse?.generatedSamples) {
                const samples = data.response.generateVideoResponse.generatedSamples;
                console.log('[VeoService] Found generatedSamples', { sampleCount: samples.length });
                if (samples.length > 0) {
                    videoUri = samples[0].video?.uri || samples[0].videoUri || samples[0].uri;
                    console.log('[VeoService] Video URI from generatedSamples', { videoUri });
                }
            } else if (data.response?.predictions) {
                const predictions = data.response.predictions;
                console.log('[VeoService] Found predictions', { predictionCount: predictions.length });
                if (predictions.length > 0) {
                    videoUri = predictions[0].videoUri || predictions[0].uri || predictions[0].url;
                    console.log('[VeoService] Video URI from predictions', { videoUri });
                }
            }

            if (!videoUri) {
                console.error('[VeoService] No video URI found in response', {
                    response: data.response,
                    availableKeys: data.response ? Object.keys(data.response) : []
                });
                throw new Error('No video URI found in response');
            }

            console.log('[VeoService] Video generation completed', {
                operationName,
                videoUri
            });

            return {
                operationName,
                status: 'completed',
                videoUri
            };
        } catch (error) {
            console.error('[VeoService] Status check failed', {
                operationName,
                error: error instanceof Error ? error.message : 'Unknown error',
                errorStack: error instanceof Error ? error.stack : undefined
            });

            // 检查是否为axios错误
            const axiosError = error as any;
            if (axiosError.isAxiosError || axiosError.response) {
                console.error('[VeoService] Axios error details', {
                    status: axiosError.response?.status,
                    statusText: axiosError.response?.statusText,
                    responseData: axiosError.response?.data,
                    requestUrl: axiosError.config?.url,
                    requestMethod: axiosError.config?.method
                });
            }

            throw new Error(`Check video status failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async downloadVideo(videoUri: string, filename: string): Promise<string> {
        const fs = require('fs');
        const path = require('path');
        const outputDir = path.join(__dirname, '..', '..', 'videos');
        const { exec } = require('child_process');

        console.log('[VeoService] Starting downloadVideo method', {
            videoUri,
            filename,
            outputDir
        });

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const filePath = path.join(outputDir, filename);
        console.log('[VeoService] File path generated', { filePath });

        // 构建带API key的URL
        let downloadUrl = videoUri;
        if (!videoUri.includes('key=')) {
            downloadUrl = videoUri.includes('?')
                ? `${videoUri}&key=${this.config.apiKey}`
                : `${videoUri}?key=${this.config.apiKey}`;
        }
        console.log('[VeoService] Download URL constructed', { downloadUrl, originalUri: videoUri });

        // 使用curl下载视频，更好地处理重定向和网络问题
        const command = `curl -s -L -o "${filePath}" "${downloadUrl}"`;
        console.log('[VeoService] Download command prepared', { command });

        return new Promise((resolve, reject) => {
            const download = (retries: number = 3) => {
                console.log(`[VeoService] Starting download (retries left: ${retries})`, {
                    downloadUrl,
                    filePath,
                    filename
                });

                exec(command, { maxBuffer: 1024 * 1024 * 100 }, (error: any, stdout: any, stderr: any) => {
                    console.log('[VeoService] Download command executed', {
                        hasError: !!error,
                        hasStdout: !!stdout,
                        hasStderr: !!stderr
                    });

                    if (error) {
                        console.error(`[VeoService] Download failed: ${error.message}`, {
                            error: error.message,
                            code: error.code,
                            signal: error.signal
                        });
                        if (retries > 0) {
                            console.log(`[VeoService] Retrying download... (${retries} retries left)`);
                            // 删除失败的文件
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                            }
                            setTimeout(() => download(retries - 1), 2000);
                            return;
                        }
                        reject(new Error(`Download failed after retries: ${error.message}`));
                        return;
                    }

                    if (stderr) {
                        console.warn(`[VeoService] Download stderr: ${stderr}`);
                    }

                    // 检查文件是否存在且大小大于0
                    if (fs.existsSync(filePath)) {
                        const stats = fs.statSync(filePath);
                        console.log('[VeoService] File stats after download', {
                            filePath,
                            size: stats.size,
                            isFile: stats.isFile()
                        });

                        if (stats.size > 0) {
                            console.log(`[VeoService] Video downloaded successfully to: ${filePath}, size: ${stats.size} bytes`);
                            resolve(filePath);
                        } else {
                            console.error(`[VeoService] Downloaded file is empty`, { filePath, size: stats.size });
                            if (retries > 0) {
                                console.log(`[VeoService] Retrying download... (${retries} retries left)`);
                                // 删除空文件
                                if (fs.existsSync(filePath)) {
                                    fs.unlinkSync(filePath);
                                }
                                setTimeout(() => download(retries - 1), 2000);
                                return;
                            }
                            reject(new Error('Downloaded file is empty'));
                        }
                    } else {
                        console.error(`[VeoService] Video file not found after download`, { filePath });
                        if (retries > 0) {
                            console.log(`[VeoService] Retrying download... (${retries} retries left)`);
                            setTimeout(() => download(retries - 1), 2000);
                            return;
                        }
                        reject(new Error('Video file not found after download'));
                    }
                });
            };

            // 开始下载
            download();
        });
    }

    async waitForCompletion(operationName: string, checkInterval: number = 5000): Promise<VeoResponse> {
        return new Promise((resolve, reject) => {
            const checkStatus = async () => {
                try {
                    const result = await this.checkVideoStatus(operationName);

                    if (result.status === 'completed') {
                        resolve(result);
                    } else if (result.status === 'failed') {
                        reject(new Error(result.error || 'Video generation failed'));
                    } else {
                        setTimeout(checkStatus, checkInterval);
                    }
                } catch (error) {
                    reject(error);
                }
            };

            checkStatus();
        });
    }

    getAvailableAspectRatios(): string[] {
        return [
            '16:9',     // 横屏
            '9:16',     // 竖屏
            '1:1',      // 正方形
            '4:3',      // 标准
            '3:4',      // 竖版标准
            '21:9',     // 宽屏
            '9:21'      // 竖宽屏
        ];
    }

    getDurationOptions(): number[] {
        return [2, 3, 4, 5, 6, 7, 8];
    }

    getPersonGenerationOptions(): string[] {
        return [
            'dont_allow',
            'allow_adult',
            'allow_all'
        ];
    }
    async listVideoFiles(): Promise<VideoFile[]> {
        const videosDir = path.join(__dirname, '..', '..', 'videos');
        console.log(`[VeoService] Listing video files from: ${videosDir}`);
        if (!fs.existsSync(videosDir)) {
            console.log(`[VeoService] Videos directory does not exist: ${videosDir}`);
            return [];
        }

        const files = fs.readdirSync(videosDir);
        const videoFiles = files
            .filter(file => file.endsWith('.mp4'))
            .map(file => {
                const filePath = path.join(videosDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    size: stats.size,
                    modified: stats.mtime.toISOString(),
                };
            });

        return videoFiles;
    }
}