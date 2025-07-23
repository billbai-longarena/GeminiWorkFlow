const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const port = 3015;

// 从环境变量中获取 API 密钥
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("错误：请设置 GEMINI_API_KEY 环境变量。");
    process.exit(1);
}

app.use(express.json());
app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/videos', express.static(path.join(__dirname, 'videos')));


// 确保 images 和 videos 文件夹存在
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
}

const videosDir = path.join(__dirname, 'videos');
if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir);
}

// 解析带 $random{} 的提示词模板
function parsePromptTemplate(template) {
    const randomRegex = /\$random\{([^}]+)\}/g;
    const matches = [...template.matchAll(randomRegex)];

    if (matches.length === 0) {
        return [template];
    }

    const options = matches.map(match => match[1].split(/,|，/).map(s => s.trim()));

    function getCombinations(optionsArray) {
        if (optionsArray.length === 0) {
            return [[]];
        }
        const firstOption = optionsArray[0];
        const restOfOptions = optionsArray.slice(1);
        const restCombinations = getCombinations(restOfOptions);
        const combinations = [];
        for (const option of firstOption) {
            for (const combination of restCombinations) {
                combinations.push([option, ...combination]);
            }
        }
        return combinations;
    }

    const combinations = getCombinations(options);
    let prompts = combinations.map(combo => {
        let i = 0;
        return template.replace(randomRegex, () => combo[i++]);
    });

    // Fisher-Yates (aka Knuth) Shuffle
    for (let i = prompts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [prompts[i], prompts[j]] = [prompts[j], prompts[i]];
    }

    return prompts;
}

// 使用 curl 调用 Imagen API 的函数
function generateImageWithCurl(prompt, callback) {
    // const model = 'imagen-4.0-generate-preview-06-06';
    const model = 'imagen-3.0-generate-002';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`;

    const requestBody = JSON.stringify({
        instances: [{ prompt: prompt }],
        parameters: { sampleCount: 1 }
    });

    const command = `curl -s -X POST "${url}" \
        -H "x-goog-api-key: ${apiKey}" \
        -H "Content-Type: application/json" \
        -x http://localhost:6152 \
        -d '${requestBody}'`;

    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return callback(error, null);
        }
        if (stderr) {
            if (stderr.toLowerCase().includes('error')) {
                console.error(`stderr: ${stderr}`);
            }
        }
        try {
            const result = JSON.parse(stdout);
            callback(null, result);
        } catch (e) {
            console.error('无法解析 JSON 输出:', stdout);
            console.error('stderr for context:', stderr);
            callback(e, null);
        }
    });
}

// 使用 curl 调用 Veo API 生成视频的函数
function generateVideoWithCurl(prompt, aspectRatio, personGeneration, callback) {
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    const url = `${baseUrl}/models/veo-3.0-generate-preview:predictLongRunning`;

    const requestBody = JSON.stringify({
        instances: [{
            prompt: prompt
        }],
        parameters: {
            aspectRatio: aspectRatio,
            personGeneration: personGeneration
        }
    });

    const command = `curl -s -X POST "${url}" \
        -H "x-goog-api-key: ${apiKey}" \
        -H "Content-Type: application/json" \
        -x http://localhost:6152 \
        -d '${requestBody}'`;

    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return callback(error, null);
        }
        if (stderr) {
            if (stderr.toLowerCase().includes('error')) {
                console.error(`stderr: ${stderr}`);
            }
        }
        try {
            const result = JSON.parse(stdout);
            callback(null, result);
        } catch (e) {
            console.error('无法解析 JSON 输出:', stdout);
            console.error('stderr for context:', stderr);
            callback(e, null);
        }
    });
}

// 检查视频生成状态的函数
function checkVideoStatus(operationName, callback) {
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    const url = `${baseUrl}/${operationName}`;

    const command = `curl -s -H "x-goog-api-key: ${apiKey}" "${url}" -x http://localhost:6152`;

    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return callback(error, null);
        }
        if (stderr) {
            if (stderr.toLowerCase().includes('error')) {
                console.error(`stderr: ${stderr}`);
            }
        }
        try {
            const result = JSON.parse(stdout);
            callback(null, result);
        } catch (e) {
            console.error('无法解析 JSON 输出:', stdout);
            console.error('stderr for context:', stderr);
            callback(e, null);
        }
    });
}

// 下载视频文件的函数
function downloadVideo(videoUrl, filename, callback) {
    const videoPath = path.join(__dirname, 'videos', filename);

    // 根据URL格式决定如何添加API key
    let downloadUrl;
    if (videoUrl.includes('?')) {
        downloadUrl = `${videoUrl}&key=${apiKey}`;
    } else {
        downloadUrl = `${videoUrl}?key=${apiKey}`;
    }

    console.log(`下载URL: ${downloadUrl}`);

    // 移除重复的API key header，添加-L参数跟随重定向
    const command = `curl -s -L -o "${videoPath}" "${downloadUrl}" -x http://localhost:6152`;

    exec(command, { maxBuffer: 1024 * 1024 * 100 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`下载视频时出错: ${error}`);
            return callback(error, null);
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }

        // 检查文件是否存在且大小大于0
        if (fs.existsSync(videoPath)) {
            const stats = fs.statSync(videoPath);
            if (stats.size > 1000) { // 至少1KB，避免错误响应
                console.log(`视频已保存到: ${videoPath}，文件大小: ${stats.size} 字节`);
                callback(null, videoPath);
            } else {
                // 如果文件很小，可能是错误响应，读取内容查看
                const content = fs.readFileSync(videoPath, 'utf8');
                console.error(`下载的文件太小 (${stats.size} 字节)，内容: ${content}`);
                callback(new Error(`下载的视频文件太小或包含错误: ${content}`), null);
            }
        } else {
            callback(new Error('视频文件下载失败'), null);
        }
    });
}

// 新的 SSE 端点
app.get('/generate-stream-get', (req, res) => {
    const { prompt_template, iterations = 1 } = req.query;

    if (!prompt_template) {
        // 对于流式端点，我们直接关闭连接而不是发送JSON错误
        return res.end();
    }

    // 设置 SSE 头部
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const allPrompts = parsePromptTemplate(prompt_template);
    const totalPrompts = [];
    for (let i = 0; i < iterations; i++) {
        totalPrompts.push(...allPrompts);
    }

    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    (async () => {
        const startMessage = `准备生成 ${totalPrompts.length} 张图片...`;
        console.log(startMessage);
        sendEvent({ type: 'info', message: startMessage });

        for (let i = 0; i < totalPrompts.length; i++) {
            const prompt = totalPrompts[i];
            const progressMessage = `[${i + 1}/${totalPrompts.length}] 正在处理: ${prompt}`;
            console.log(progressMessage);
            sendEvent({ type: 'info', message: progressMessage });

            try {
                const response = await new Promise((resolve, reject) => {
                    generateImageWithCurl(prompt, (err, result) => {
                        if (err) return reject(err);
                        if (result && result.error) return reject(new Error(JSON.stringify(result.error)));
                        resolve(result);
                    });
                });

                if (response && response.predictions && response.predictions.length > 0) {
                    const imgBytes = response.predictions[0].bytesBase64Encoded;
                    const buffer = Buffer.from(imgBytes, "base64");
                    const timestamp = Date.now();
                    const imageName = `image_${timestamp}_${i}.png`;
                    const imagePath = path.join('images', imageName);
                    fs.writeFileSync(path.join(__dirname, imagePath), buffer);
                    console.log(`图片已保存到: ${imagePath}`);
                    sendEvent({ type: 'image', path: imagePath });
                } else {
                    const warnMsg = `提示词 "${prompt}" 未能生成图片。`;
                    console.warn(warnMsg);
                    sendEvent({ type: 'warn', message: warnMsg });
                }
                // 在每个请求后增加一个延迟来避免速率限制
                await new Promise(resolve => setTimeout(resolve, 1200)); // 延迟1.2秒
            } catch (error) {
                let errorData;
                let isJson = true;
                try {
                    errorData = JSON.parse(error.message);
                } catch (e) {
                    isJson = false;
                }

                if (isJson && errorData.code === 429) {
                    const delay = 30; // 默认重试延迟
                    console.warn(`遇到速率限制 (429)。将在 ${delay} 秒后重试...`);
                    console.warn('详细错误信息:', JSON.stringify(errorData, null, 2));
                    sendEvent({ type: 'warn', message: `遇到速率限制。将在 ${delay} 秒后重试...` });
                    await new Promise(resolve => setTimeout(resolve, delay * 1000));
                    // 将索引减一，以便下一次循环重试当前失败的 prompt
                    i--;
                } else {
                    const errorMsg = `处理 "${prompt}" 时出错: ${error.message}`;
                    console.error(errorMsg);
                    sendEvent({ type: 'error', message: errorMsg });
                }
            }
        }

        const doneMessage = '所有任务处理完毕！';
        console.log(doneMessage);
        sendEvent({ type: 'done', message: doneMessage });
        res.end();
    })();

    req.on('close', () => {
        console.log('客户端断开连接');
        res.end();
    });
});

// Veo 视频生成路由
app.get('/veo', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'veo.html'));
});

// 视频生成 API 端点
app.post('/generate-video', (req, res) => {
    const { prompt, aspectRatio = '16:9', personGeneration = 'allow_all' } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: '请提供视频提示词' });
    }

    console.log(`开始生成视频: ${prompt}`);

    generateVideoWithCurl(prompt, aspectRatio, personGeneration, (error, result) => {
        if (error) {
            console.error('视频生成请求失败:', error);
            return res.status(500).json({ error: '视频生成请求失败', details: error.message });
        }

        if (result && result.name) {
            const operationId = result.name.split('/').pop();
            console.log(`视频生成任务已提交，操作ID: ${operationId}`);
            res.json({
                success: true,
                operationId: operationId,
                operationName: result.name,
                message: '视频生成任务已提交，正在处理中...'
            });
        } else {
            console.error('API 响应格式异常:', result);
            res.status(500).json({ error: 'API 响应格式异常', details: result });
        }
    });
});

// 检查视频生成状态
app.get('/check-video-status/:operationName', (req, res) => {
    const operationName = req.params.operationName;

    console.log(`检查视频状态: ${operationName}`);

    checkVideoStatus(operationName, (error, result) => {
        if (error) {
            console.error('检查视频状态失败:', error);
            return res.status(500).json({ error: '检查视频状态失败', details: error.message });
        }

        if (result && result.done) {
            // 添加详细日志来调试响应结构
            console.log('完整的API响应:', JSON.stringify(result, null, 2));

            // 处理新的 Veo API 响应格式
            if (result.response && result.response.generateVideoResponse && result.response.generateVideoResponse.generatedSamples) {
                const samples = result.response.generateVideoResponse.generatedSamples;
                console.log('找到 generatedSamples:', JSON.stringify(samples, null, 2));

                if (samples.length > 0) {
                    const sample = samples[0];
                    console.log('第一个样本:', JSON.stringify(sample, null, 2));

                    // 检查不同可能的字段名，包括嵌套的video对象
                    let videoUri = sample.videoUri || sample.uri || sample.url || sample.downloadUri;

                    // 检查嵌套的video对象
                    if (!videoUri && sample.video) {
                        videoUri = sample.video.uri || sample.video.url || sample.video.downloadUri;
                    }

                    if (videoUri) {
                        console.log('视频生成完成:', videoUri);
                        res.json({
                            done: true,
                            success: true,
                            videoUri: videoUri,
                            message: '视频生成完成！'
                        });
                    } else {
                        console.log('样本中没有找到视频URI，样本内容:', sample);
                        res.json({
                            done: true,
                            success: false,
                            error: '视频生成完成但没有视频URI',
                            details: sample
                        });
                    }
                } else {
                    console.log('generatedSamples 数组为空');
                    res.json({
                        done: true,
                        success: false,
                        error: 'generatedSamples 数组为空',
                        details: samples
                    });
                }
            } else if (result.response && result.response.predictions && result.response.predictions.length > 0) {
                // 兼容旧格式
                const prediction = result.response.predictions[0];
                console.log('使用旧格式，prediction:', JSON.stringify(prediction, null, 2));

                let videoUri = prediction.videoUri || prediction.uri || prediction.url || prediction.downloadUri;

                if (videoUri) {
                    console.log('视频生成完成:', videoUri);
                    res.json({
                        done: true,
                        success: true,
                        videoUri: videoUri,
                        message: '视频生成完成！'
                    });
                } else {
                    console.log('prediction中没有找到视频URI，prediction内容:', prediction);
                    res.json({
                        done: true,
                        success: false,
                        error: '视频生成完成但没有视频URI',
                        details: prediction
                    });
                }
            } else if (result.error) {
                console.error('视频生成失败:', result.error);
                res.json({
                    done: true,
                    success: false,
                    error: '视频生成失败',
                    details: result.error
                });
            } else {
                console.error('未知的完成状态，完整结果:', JSON.stringify(result, null, 2));
                res.json({
                    done: true,
                    success: false,
                    error: '未知的完成状态',
                    details: result
                });
            }
        } else {
            console.log('视频仍在生成中...');
            res.json({
                done: false,
                message: '视频仍在生成中，请稍候...'
            });
        }
    });
});

// 下载视频
app.post('/download-video', (req, res) => {
    const { videoUri, operationId } = req.body;

    if (!videoUri || !operationId) {
        return res.status(400).json({ error: '缺少必要参数' });
    }

    const timestamp = Date.now();
    const filename = `video_${timestamp}_${operationId}.mp4`;

    console.log(`开始下载视频: ${videoUri}`);

    downloadVideo(videoUri, filename, (error, videoPath) => {
        if (error) {
            console.error('下载视频失败:', error);
            return res.status(500).json({ error: '下载视频失败', details: error.message });
        }

        const relativePath = path.join('videos', filename);
        console.log(`视频下载完成: ${relativePath}`);

        res.json({
            success: true,
            videoPath: relativePath,
            filename: filename,
            message: '视频下载完成！'
        });
    });
});

app.listen(port, () => {
    console.log(`服务器正在 http://localhost:${port} 上运行`);
});
