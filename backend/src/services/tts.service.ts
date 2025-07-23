import axios from 'axios';
import { TTSRequest, TTSResponse, TTSConfig, SpeakerConfig, AudioFile } from '../types/ai.types';

export class TTSService {
    private config: TTSConfig;

    constructor(config: TTSConfig) {
        this.config = {
            model: 'gemini-2.5-flash-preview-tts',
            voice: 'Kore',
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
            ...config
        };
    }

    async generateSpeech(request: TTSRequest): Promise<TTSResponse> {
        const url = `${this.config.baseUrl}/models/${request.model || this.config.model}:generateContent`;

        const requestBody = this.buildRequestBody(request);
        console.log('TTS Request:', {
            url,
            text: request.text,
            voice: request.voice || this.config.voice,
            model: request.model || this.config.model
        });

        try {
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

            const data = response.data as any;
            console.log('TTS Response structure:', {
                hasCandidates: !!data.candidates,
                candidatesCount: data.candidates?.length,
                firstCandidate: data.candidates?.[0],
                mimeType: data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType
            });

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                throw new Error('Invalid response structure from TTS API');
            }

            const audioData = data.candidates[0].content.parts[0].inlineData.data;
            const buffer = Buffer.from(audioData, 'base64');
            const contentType = data.candidates[0].content.parts[0].inlineData.mimeType || 'audio/pcm';

            console.log('Audio data info:', {
                bufferLength: buffer.length,
                contentType,
                base64Length: audioData.length
            });

            return {
                audioData: buffer,
                contentType,
                duration: this.estimateDuration(request.text)
            };
        } catch (error) {
            console.error('TTS generation error:', error);
            throw new Error(`TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private buildRequestBody(request: TTSRequest): any {
        const speechConfig: any = {};

        if (request.speakers && request.speakers.length > 0) {
            // 多讲者配置
            speechConfig.multiSpeakerVoiceConfig = {
                speakerVoiceConfigs: request.speakers.map(speaker => ({
                    speaker: speaker.name,
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: speaker.voice
                        }
                    }
                }))
            };
        } else {
            // 单讲者配置
            speechConfig.voiceConfig = {
                prebuiltVoiceConfig: {
                    voiceName: request.voice || this.config.voice
                }
            };
        }

        const baseBody = {
            contents: [{
                parts: [{
                    text: request.text
                }]
            }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig
            },
            model: request.model || this.config.model
        };

        return baseBody;
    }

    private estimateDuration(text: string): number {
        // 粗略估计：英文平均每秒3个词，中文平均每秒2个字
        const englishWords = text.split(/\s+/).length;
        const chineseChars = text.replace(/[a-zA-Z0-9\s]/g, '').length;

        return Math.ceil((englishWords / 3) + (chineseChars / 2));
    }

    async saveAudio(audioData: Buffer, filename: string, outputDir: string = './audio'): Promise<string> {
        const fs = require('fs');
        const path = require('path');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 确保文件名有正确的扩展名
        let cleanFilename = filename;
        if (filename.includes(';')) {
            // 如果文件名包含MIME类型参数，清理它
            cleanFilename = filename.split(';')[0];
        }

        // 确保有合适的音频扩展名
        if (!cleanFilename.match(/\.(wav|mp3|pcm|aac|flac)$/i)) {
            cleanFilename += '.wav';
        }

        const filePath = path.join(outputDir, cleanFilename);
        fs.writeFileSync(filePath, audioData);

        console.log('Audio saved:', {
            filePath,
            fileSize: fs.statSync(filePath).size,
            outputDir,
            originalFilename: filename,
            cleanFilename
        });

        return filePath;
    }

    private parseContentType(contentType: string): { sampleRate: number; encoding: string } {
        const sampleRateMatch = contentType.match(/rate=(\d+)/);
        const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000; // Default to 24000 if not found

        // We can extend this to parse other parameters like encoding if needed
        // For now, we assume s16le based on the API docs for L16
        const encoding = 's16le';

        return { sampleRate, encoding };
    }

    async convertToWav(pcmData: Buffer, outputPath: string, contentType: string): Promise<string> {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        const path = require('path');
        const fs = require('fs');

        // 确保输出目录存在
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const pcmFilename = `temp_${Date.now()}.pcm`;
        const pcmPath = path.join(outputDir, pcmFilename);

        // 保存PCM数据
        fs.writeFileSync(pcmPath, pcmData);
        console.log('PCM file saved for conversion:', pcmPath);

        // 查找ffmpeg路径
        let ffmpegPath = this.config.ffmpegPath || 'ffmpeg';
        if (!this.config.ffmpegPath) {
            try {
                const { stdout } = await execAsync('which ffmpeg');
                ffmpegPath = stdout.trim();
                console.log('Found ffmpeg in PATH at:', ffmpegPath);
            } catch (error) {
                console.warn('Could not find ffmpeg in PATH. Using default "ffmpeg" command. Please ensure ffmpeg is installed and in your PATH, or set FFMPEG_PATH in your .env file.');
                ffmpegPath = 'ffmpeg';
            }
        } else {
            console.log('Using ffmpeg path from config:', ffmpegPath);
        }

        // 使用ffmpeg转换为WAV
        try {
            const { sampleRate, encoding } = this.parseContentType(contentType);
            const ffmpegCmd = `"${ffmpegPath}" -f ${encoding} -ar ${sampleRate} -ac 1 -i "${pcmPath}" "${outputPath}"`;
            console.log('Executing FFmpeg command:', ffmpegCmd);

            const { stdout, stderr } = await execAsync(ffmpegCmd);
            console.log('FFmpeg stdout:', stdout);
            console.log('FFmpeg stderr:', stderr);

            // 检查输出文件
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                console.log('WAV file created:', {
                    path: outputPath,
                    size: stats.size,
                    exists: true
                });
            } else {
                console.error('WAV file was not created:', outputPath);
            }

            // 删除临时PCM文件
            if (fs.existsSync(pcmPath)) {
                fs.unlinkSync(pcmPath);
                console.log('Temporary PCM file deleted:', pcmPath);
            }

            return outputPath;
        } catch (error) {
            console.error('FFmpeg conversion error:', error);
            // 清理临时文件
            if (fs.existsSync(pcmPath)) {
                fs.unlinkSync(pcmPath);
            }

            // 如果转换失败，直接保存为原始PCM文件但使用.wav扩展名
            console.warn('FFmpeg conversion failed, saving as PCM with WAV extension');
            fs.writeFileSync(outputPath, pcmData);
            return outputPath;
        }
    }

    getAvailableVoices(): string[] {
        return [
            'Kore',      // 韩语女声
            'Puck',      // 英语男声
            'Charon',    // 英语女声
            'Fenrir',    // 英语男声
            'Aoede',     // 英语女声
            'Juno',      // 英语女声
            'Leda',      // 英语女声
            'Seda',      // 英语女声
            'Rei',       // 日语女声
            'Ayla'       // 英语女声
        ];
    }

    async listAudioFiles(): Promise<AudioFile[]> {
        const fs = require('fs');
        const path = require('path');
        const audioDir = path.join(__dirname, '..', '..', 'audio');
        console.log(`[TTSService] Listing audio files from: ${audioDir}`);
        if (!fs.existsSync(audioDir)) {
            console.log(`[TTSService] Audio directory does not exist: ${audioDir}`);
            return [];
        }

        const files = fs.readdirSync(audioDir);
        const audioFiles = files
            .filter((file: string) => /\.(wav|mp3|aac|flac)$/i.test(file))
            .map((file: string) => {
                const filePath = path.join(audioDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    size: stats.size,
                    modified: stats.mtime.toISOString(),
                };
            });

        return audioFiles;
    }
}