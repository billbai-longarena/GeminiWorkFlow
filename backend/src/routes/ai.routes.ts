import { Router } from 'express';
import path from 'path';
import { TTSService } from '../services/tts.service';
import { ImagenService } from '../services/imagen.service';
import { VeoService } from '../services/veo.service';
import { WorkflowService } from '../services/workflow.service';
import { TTSRequest, ImagenRequest, VeoRequest, WorkflowConfig } from '../types/ai.types';

const router = Router();

// 初始化服务
const apiKey = process.env.GEMINI_API_KEY || '';
const proxyUrl = process.env.PROXY_URL;
const ffmpegPath = process.env.FFMPEG_PATH || undefined;

const ttsService = new TTSService({ apiKey, ffmpegPath });
const imagenService = new ImagenService({ apiKey });
const veoService = new VeoService({ apiKey });
const workflowService = new WorkflowService(ttsService, imagenService, veoService);

/**
 * @swagger
 * /api/ai/tts:
 *   post:
 *     summary: 文本转语音
 *     description: 将文本转换为语音，支持单讲者和多讲者模式
 *     tags: [TTS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TTSRequest'
 *           examples:
 *             singleSpeaker:
 *               summary: 单讲者示例
 *               value:
 *                 text: "Hello, this is a test of the text-to-speech system."
 *                 voice: "Kore"
 *             multiSpeaker:
 *               summary: 多讲者示例
 *               value:
 *                 text: "Joe: How is it going today Jane? Jane: Not too bad, how about you?"
 *                 speakers:
 *                   - name: "Joe"
 *                     voice: "Kore"
 *                   - name: "Jane"
 *                     voice: "Puck"
 *     responses:
 *       200:
 *         description: 语音生成成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TTSResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/tts', async (req, res) => {
    try {
        const request: TTSRequest = req.body;

        if (!request.text) {
            return res.status(400).json({
                success: false,
                error: 'Text is required'
            });
        }

        console.log('TTS request received:', request);

        const speechResponse = await ttsService.generateSpeech(request);
        console.log('Audio generated, content type:', speechResponse.contentType);

        const isL16Format = speechResponse.contentType && speechResponse.contentType.includes('L16');
        const isPcmFormat = speechResponse.contentType === 'audio/pcm';

        let finalAudioBuffer: Buffer;
        let finalContentType = 'audio/wav';
        const filename = `tts_${Date.now()}.wav`;

        if (isL16Format || isPcmFormat) {
            console.log('L16/PCM format detected, converting to WAV...');
            const audioDir = path.join(__dirname, '..', '..', 'audio');
            if (!require('fs').existsSync(audioDir)) {
                require('fs').mkdirSync(audioDir, { recursive: true });
            }
            const filePath = path.join(audioDir, filename);

            await ttsService.convertToWav(speechResponse.audioData, filePath, speechResponse.contentType);

            finalAudioBuffer = require('fs').readFileSync(filePath);
            console.log(`Conversion to WAV successful, saved to ${filePath}`);
        } else {
            finalAudioBuffer = speechResponse.audioData;
            finalContentType = speechResponse.contentType || 'audio/mpeg'; // Default to mpeg if not WAV
            // Also save non-wav files if needed
            const audioDir = path.join(__dirname, '..', '..', 'audio');
            if (!require('fs').existsSync(audioDir)) {
                require('fs').mkdirSync(audioDir, { recursive: true });
            }
            const nonWavFilename = `tts_${Date.now()}.mp3`; // Assume mp3 for now
            const filePath = path.join(audioDir, nonWavFilename);
            require('fs').writeFileSync(filePath, finalAudioBuffer);
            console.log(`Audio saved to ${filePath}`);
        }

        res.setHeader('Content-Type', finalContentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(finalAudioBuffer);

    } catch (error) {
        console.error('TTS route error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * @swagger
 * /api/ai/tts/voices:
 *   get:
 *     summary: 获取可用语音列表
 *     description: 获取所有可用的TTS语音类型
 *     tags: [TTS]
 *     responses:
 *       200:
 *         description: 语音列表获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/VoiceListResponse'
 */
router.get('/tts/voices', (req, res) => {
    res.json({
        success: true,
        data: ttsService.getAvailableVoices()
    });
});

/**
 * @swagger
 * /api/ai/tts/audios:
 *   get:
 *     summary: 获取已生成的音频文件列表
 *     description: 返回存储在服务器上的所有音频文件的列表
 *     tags: [TTS]
 *     responses:
 *       200:
 *         description: 音频文件列表获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AudioFile'
 */
router.get('/tts/audios', async (req, res) => {
    try {
        const files = await ttsService.listAudioFiles();
        res.json({ success: true, data: files });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, error: errorMessage });
    }
});

/**
 * @swagger
 * /api/ai/imagen:
 *   post:
 *     summary: 图像生成
 *     description: 使用Imagen模型根据提示词生成图像
 *     tags: [Imagen]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ImagenRequest'
 *           example:
 *             prompt: "A beautiful sunset over a mountain lake"
 *             aspectRatio: "16:9"
 *             sampleCount: 1
 *     responses:
 *       200:
 *         description: 图像生成成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ImagenResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/imagen', async (req, res) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);

    console.log(`[ImagenRoute] [${requestId}] Starting image generation request`, {
        body: req.body,
        timestamp: new Date().toISOString()
    });

    try {
        const request: ImagenRequest = req.body;

        if (!request.prompt) {
            console.warn(`[ImagenRoute] [${requestId}] Missing prompt in request`);
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        console.log(`[ImagenRoute] [${requestId}] Valid request received`, {
            prompt: request.prompt.substring(0, 100) + '...',
            aspectRatio: request.aspectRatio,
            sampleCount: request.sampleCount,
            personGeneration: request.personGeneration
        });

        const response = await imagenService.generateImage(request);
        console.log(`[ImagenRoute] [${requestId}] Image generated successfully`, {
            imageCount: response.images.length,
            generationTime: Date.now() - startTime
        });

        const filename = `imagen_${Date.now()}.png`;
        const filePath = await imagenService.saveImage(response.images[0].bytesBase64Encoded, filename);

        console.log(`[ImagenRoute] [${requestId}] Image saved to: ${filePath}`);

        res.json({
            success: true,
            data: {
                filePath,
                prompt: response.prompt,
                imageCount: response.images.length
            }
        });

        console.log(`[ImagenRoute] [${requestId}] Request completed successfully in ${Date.now() - startTime}ms`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[ImagenRoute] [${requestId}] Image generation failed:`, {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            request: {
                prompt: req.body?.prompt?.substring(0, 50) + '...',
                aspectRatio: req.body?.aspectRatio
            },
            duration: Date.now() - startTime
        });

        // 检查是否为限流错误
        if (errorMessage.includes('429') || errorMessage.includes('限流')) {
            res.status(429).json({
                success: false,
                error: errorMessage,
                code: 'RATE_LIMITED'
            });
        } else if (errorMessage.includes('401') || errorMessage.includes('认证')) {
            res.status(401).json({
                success: false,
                error: errorMessage,
                code: 'AUTH_ERROR'
            });
        } else if (errorMessage.includes('400') || errorMessage.includes('参数')) {
            res.status(400).json({
                success: false,
                error: errorMessage,
                code: 'INVALID_REQUEST'
            });
        } else {
            res.status(500).json({
                success: false,
                error: errorMessage,
                code: 'INTERNAL_ERROR'
            });
        }
    }
});

/**
 * @swagger
 * /api/ai/imagen/options:
 *   get:
 *     summary: 获取图像生成配置选项
 *     description: 获取Imagen服务的可用配置选项
 *     tags: [Imagen]
 *     responses:
 *       200:
 *         description: 配置选项获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ImagenOptions'
 */
router.get('/imagen/options', (req, res) => {
    res.json({
        success: true,
        data: {
            aspectRatios: imagenService.getAvailableAspectRatios(),
            personGenerationOptions: imagenService.getPersonGenerationOptions()
        }
    });
});

/**
 * @swagger
 * /api/ai/imagen/images:
 *   get:
 *     summary: 获取已生成的图片文件列表
 *     description: 返回存储在服务器上的所有图片文件的列表
 *     tags: [Imagen]
 *     responses:
 *       200:
 *         description: 图片文件列表获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ImageFile'
 */
router.get('/imagen/images', async (req, res) => {
    try {
        const files = await imagenService.listImageFiles();
        res.json({ success: true, data: files });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, error: errorMessage });
    }
});

/**
 * @swagger
 * /api/ai/veo:
 *   post:
 *     summary: 视频生成
 *     description: 使用Veo模型根据提示词生成视频
 *     tags: [Veo]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VeoRequest'
 *           example:
 *             prompt: "A cat playing with a ball of yarn"
 *             aspectRatio: "16:9"
 *             durationSeconds: 5
 *     responses:
 *       200:
 *         description: 视频生成任务已启动
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/VeoResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/veo', async (req, res) => {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();

    console.log(`[VeoRoute] [${requestId}] Starting video generation request`, {
        body: req.body,
        headers: req.headers,
        timestamp: new Date().toISOString()
    });

    try {
        const request: VeoRequest = req.body;

        // 详细的请求验证
        console.log(`[VeoRoute] [${requestId}] Validating request`, {
            hasPrompt: !!request.prompt,
            promptLength: request.prompt?.length,
            aspectRatio: request.aspectRatio,
            personGeneration: request.personGeneration
        });

        if (!request.prompt) {
            console.warn(`[VeoRoute] [${requestId}] Missing prompt in request`);
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        if (typeof request.prompt !== 'string') {
            console.warn(`[VeoRoute] [${requestId}] Invalid prompt type`, { type: typeof request.prompt });
            return res.status(400).json({
                success: false,
                error: 'Prompt must be a string'
            });
        }

        if (request.prompt.trim().length === 0) {
            console.warn(`[VeoRoute] [${requestId}] Empty prompt provided`);
            return res.status(400).json({
                success: false,
                error: 'Prompt cannot be empty'
            });
        }

        console.log(`[VeoRoute] [${requestId}] Valid request received`, {
            prompt: request.prompt.substring(0, 100) + '...',
            aspectRatio: request.aspectRatio || '16:9 (default)',
            personGeneration: request.personGeneration || 'allow_all (default)'
        });

        const response = await veoService.generateVideo(request);

        console.log(`[VeoRoute] [${requestId}] Video generation initiated successfully`, {
            operationName: response.operationName,
            status: response.status,
            duration: Date.now() - startTime
        });

        res.json({
            success: true,
            data: {
                operationName: response.operationName,
                status: response.status
            }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[VeoRoute] [${requestId}] Video generation failed:`, {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            request: {
                prompt: req.body?.prompt?.substring(0, 50) + '...',
                aspectRatio: req.body?.aspectRatio
            },
            duration: Date.now() - startTime
        });

        // 根据错误类型返回不同的状态码
        if (errorMessage.includes('400') || errorMessage.includes('参数')) {
            res.status(400).json({
                success: false,
                error: errorMessage,
                code: 'INVALID_REQUEST'
            });
        } else if (errorMessage.includes('401') || errorMessage.includes('认证') || errorMessage.includes('API key')) {
            res.status(401).json({
                success: false,
                error: errorMessage,
                code: 'AUTH_ERROR'
            });
        } else if (errorMessage.includes('429') || errorMessage.includes('限流')) {
            res.status(429).json({
                success: false,
                error: errorMessage,
                code: 'RATE_LIMITED'
            });
        } else {
            res.status(500).json({
                success: false,
                error: errorMessage,
                code: 'INTERNAL_ERROR'
            });
        }
    }
});

/**
 * @swagger
 * /api/ai/veo/status/{operationName}:
 *   get:
 *     summary: 检查视频生成状态
 *     description: 检查Veo视频生成任务的状态
 *     tags: [Veo]
 *     parameters:
 *       - in: path
 *         name: operationName
 *         required: true
 *         schema:
 *           type: string
 *         description: 操作名称
 *     responses:
 *       200:
 *         description: 状态检查成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/VeoStatusResponse'
 *       404:
 *         description: 操作未找到
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/veo/status/*', async (req, res) => {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();

    const operationName = (req.params as any)['0'];

    console.log(`[VeoStatusRoute] [${requestId}] Checking video status`, {
        operationName,
        timestamp: new Date().toISOString()
    });

    try {
        if (!operationName || operationName.trim().length === 0) {
            console.warn(`[VeoStatusRoute] [${requestId}] Invalid operation name`, { operationName });
            return res.status(400).json({
                success: false,
                error: 'Operation name is required'
            });
        }

        console.log(`[VeoStatusRoute] [${requestId}] Checking status for operation`, { operationName });

        const response = await veoService.checkVideoStatus(operationName);

        console.log(`[VeoStatusRoute] [${requestId}] Status check completed`, {
            operationName,
            status: response.status,
            hasVideoUri: !!response.videoUri,
            duration: Date.now() - startTime
        });

        if (response.status === 'completed' && response.videoUri) {
            console.log(`[VeoStatusRoute] [${requestId}] Video ready, checking if already downloaded...`, {
                videoUri: response.videoUri
            });

            // 检查是否已经下载过该视频
            const fs = require('fs');
            const path = require('path');
            const videosDir = path.join(__dirname, '..', '..', 'videos');
            console.log(`[VeoStatusRoute] [${requestId}] Videos directory path`, {
                videosDir,
                cwd: process.cwd()
            });

            const operationId = operationName.split('/').pop(); // 提取操作ID
            console.log(`[VeoStatusRoute] [${requestId}] Operation ID extracted`, { operationId });

            let existingVideoFile = null;

            if (fs.existsSync(videosDir)) {
                const files = fs.readdirSync(videosDir);
                console.log(`[VeoStatusRoute] [${requestId}] Files in videos directory`, { files });

                // 查找包含操作ID的已下载视频文件
                existingVideoFile = files.find((file: string) =>
                    file.includes(operationId) && file.endsWith('.mp4')
                );
                console.log(`[VeoStatusRoute] [${requestId}] Existing video file search result`, { existingVideoFile });
            }

            let filePath: string;
            if (existingVideoFile) {
                // 视频已存在，使用现有文件
                filePath = path.join(videosDir, existingVideoFile);
                console.log(`[VeoStatusRoute] [${requestId}] Video already downloaded`, {
                    filePath,
                    basename: path.basename(filePath)
                });
            } else {
                // 视频尚未下载，执行下载
                console.log(`[VeoStatusRoute] [${requestId}] Downloading video...`, {
                    videoUri: response.videoUri
                });

                // 使用操作ID作为文件名的一部分，以便后续检查
                const filename = `veo_${operationId}_${Date.now()}.mp4`;
                console.log(`[VeoStatusRoute] [${requestId}] Starting video download`, {
                    filename,
                    videoUri: response.videoUri
                });

                filePath = await veoService.downloadVideo(response.videoUri, filename);

                console.log(`[VeoStatusRoute] [${requestId}] Video downloaded successfully`, {
                    filePath,
                    basename: path.basename(filePath),
                    duration: Date.now() - startTime
                });
            }

            // 生成返回给前端的videoUrl
            const videoUrl = `/videos/${path.basename(filePath)}`;
            console.log(`[VeoStatusRoute] [${requestId}] Video URL for frontend`, {
                videoUrl,
                filePath,
                basename: path.basename(filePath)
            });

            res.json({
                success: true,
                data: {
                    ...response,
                    filePath,
                    videoUrl  // 添加videoUrl字段供前端使用
                }
            });
        } else {
            console.log(`[VeoStatusRoute] [${requestId}] Video not ready or no URI`, {
                status: response.status,
                hasVideoUri: !!response.videoUri,
                error: response.error
            });

            res.json({
                success: true,
                data: response
            });
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[VeoStatusRoute] [${requestId}] Status check failed:`, {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            operationName,
            duration: Date.now() - startTime
        });

        // 根据错误类型返回不同的状态码
        if (errorMessage.includes('404') || errorMessage.includes('not found')) {
            res.status(404).json({
                success: false,
                error: errorMessage,
                code: 'OPERATION_NOT_FOUND'
            });
        } else if (errorMessage.includes('401') || errorMessage.includes('认证') || errorMessage.includes('API key')) {
            res.status(401).json({
                success: false,
                error: errorMessage,
                code: 'AUTH_ERROR'
            });
        } else {
            res.status(500).json({
                success: false,
                error: errorMessage,
                code: 'INTERNAL_ERROR'
            });
        }
    }
});

/**
 * @swagger
 * /api/ai/veo/options:
 *   get:
 *     summary: 获取视频生成配置选项
 *     description: 获取Veo服务的可用配置选项
 *     tags: [Veo]
 *     responses:
 *       200:
 *         description: 配置选项获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/VeoOptions'
 */
router.get('/veo/options', (req, res) => {
    res.json({
        success: true,
        data: {
            aspectRatios: veoService.getAvailableAspectRatios(),
            durationOptions: veoService.getDurationOptions(),
            personGenerationOptions: veoService.getPersonGenerationOptions()
        }
    });
});

/**
 * @swagger
 * /api/ai/veo/videos:
 *   get:
 *     summary: 获取已生成的视频文件列表
 *     description: 返回存储在服务器上的所有视频文件的列表
 *     tags: [Veo]
 *     responses:
 *       200:
 *         description: 视频文件列表获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VideoFile'
 */
router.get('/veo/videos', async (req, res) => {
    try {
        const files = await veoService.listVideoFiles();
        res.json({ success: true, data: files });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, error: errorMessage });
    }
});

/**
 * @swagger
 * /api/ai/veo/videos/{filename}:
 *   get:
 *     summary: 下载指定的视频文件
 *     description: 下载服务器上存储的特定视频文件
 *     tags: [Veo]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: 要下载的视频文件名
 *     responses:
 *       200:
 *         description: 视频文件下载成功
 *         content:
 *           video/mp4:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: 文件未找到
 */
router.get('/veo/videos/:filename', (req, res) => {
    const { filename } = req.params;
    const videosDir = path.join(__dirname, '..', '..', 'videos');
    const filePath = path.join(videosDir, filename);

    if (require('fs').existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('File not found');
    }
});

/**
 * @swagger
 * /api/ai/workflow:
 *   post:
 *     summary: 执行工作流
 *     description: 执行配置的AI工作流
 *     tags: [Workflow]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WorkflowConfig'
 *           example:
 *             id: "custom_workflow"
 *             name: "教学视频制作"
 *             description: "生成教学图像并添加语音讲解"
 *             steps:
 *               - id: "generate_screenshot"
 *                 type: "imagen"
 *                 config:
 *                   prompt: "A clean programming code screenshot with syntax highlighting"
 *                   aspectRatio: "16:9"
 *                 outputKey: "screenshot"
 *               - id: "create_narration"
 *                 type: "tts"
 *                 config:
 *                   text: "Welcome to our programming tutorial. Today we will learn about TypeScript interfaces."
 *                   voice: "Kore"
 *                 dependsOn: ["generate_screenshot"]
 *                 outputKey: "narration"
 *     responses:
 *       200:
 *         description: 工作流执行已启动
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/WorkflowExecution'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/workflow', async (req, res) => {
    try {
        const config: WorkflowConfig = req.body;

        if (!config.steps || config.steps.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Workflow must have at least one step'
            });
        }

        const executionId = await workflowService.executeWorkflow(config);

        res.json({
            success: true,
            data: {
                executionId,
                message: 'Workflow execution started'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * @swagger
 * /api/ai/workflow/templates:
 *   get:
 *     summary: 获取示例工作流
 *     description: 获取预定义的工作流模板
 *     tags: [Workflow]
 *     responses:
 *       200:
 *         description: 模板获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/WorkflowTemplates'
 */
router.get('/workflow/templates', (req, res) => {
    try {
        const templates = workflowService.createSampleWorkflows();

        res.json({
            success: true,
            data: templates
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * @swagger
 * /api/ai/workflow:
 *   get:
 *     summary: 获取所有工作流执行
 *     description: 获取所有工作流的执行状态
 *     tags: [Workflow]
 *     responses:
 *       200:
 *         description: 执行列表获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WorkflowStatus'
 */
router.get('/workflow', (req, res) => {
    try {
        const executions = workflowService.getAllExecutions();

        res.json({
            success: true,
            data: executions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * @swagger
 * /api/ai/workflow/{executionId}:
 *   get:
 *     summary: 获取工作流执行状态
 *     description: 获取指定工作流执行的详细状态
 *     tags: [Workflow]
 *     parameters:
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *         description: 执行ID
 *     responses:
 *       200:
 *         description: 状态获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/WorkflowStatus'
 *       404:
 *         description: 执行未找到
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/workflow/:executionId', (req, res) => {
    try {
        const { executionId } = req.params;

        const execution = workflowService.getExecutionStatus(executionId);

        if (!execution) {
            return res.status(404).json({
                success: false,
                error: 'Execution not found'
            });
        }

        res.json({
            success: true,
            data: execution
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;