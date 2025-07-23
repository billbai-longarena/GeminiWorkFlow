import { VeoService } from './backend/src/services/veo.service';
import fs from 'fs';
import path from 'path';

// 从环境变量中获取 API 密钥
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("错误：请设置 GEMINI_API_KEY 环境变量。");
    process.exit(1);
}

// 创建VeoService实例
const veoService = new VeoService({
    apiKey: apiKey
});

// 测试下载链接
const videoUri = 'https://generativelanguage.googleapis.com/v1beta/files/f08kszzsfgtr:download?alt=media';
const filename = 'test_video_optimized.mp4';

console.log(`开始测试优化后的下载功能: ${videoUri}`);

// 使用优化后的下载功能
veoService.downloadVideo(videoUri, filename)
    .then(filePath => {
        console.log('下载成功！', filePath);

        // 检查文件是否存在且大小大于0
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            console.log(`文件大小: ${stats.size} 字节`);

            if (stats.size > 0) {
                console.log('测试通过！');
            } else {
                console.log('下载的文件为空');
            }
        } else {
            console.log('视频文件不存在');
        }
    })
    .catch(error => {
        console.error('下载失败:', error);
    });