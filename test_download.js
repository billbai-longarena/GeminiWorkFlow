const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 从环境变量中获取 API 密钥
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("错误：请设置 GEMINI_API_KEY 环境变量。");
    process.exit(1);
}

// 测试下载链接
const videoUri = 'https://generativelanguage.googleapis.com/v1beta/files/f08kszzsfgtr:download?alt=media';
const filename = 'test_video.mp4';
const videoPath = path.join(__dirname, 'videos', filename);

// 确保 videos 文件夹存在
const videosDir = path.join(__dirname, 'videos');
if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir);
}

// 构建带API key的URL
let downloadUrl = videoUri;
if (!videoUri.includes('key=')) {
    downloadUrl = videoUri.includes('?')
        ? `${videoUri}&key=${apiKey}`
        : `${videoUri}?key=${apiKey}`;
}

console.log(`下载URL: ${downloadUrl}`);

// 使用 curl 下载视频
const command = `curl -v -L -o "${videoPath}" "${downloadUrl}"`;

console.log(`执行命令: ${command}`);

exec(command, { maxBuffer: 1024 * 1024 * 100 }, (error, stdout, stderr) => {
    if (error) {
        console.error(`下载视频时出错: ${error}`);
        return;
    }

    console.log('stdout:', stdout);
    console.log('stderr:', stderr);

    // 检查文件是否存在且大小大于0
    if (fs.existsSync(videoPath)) {
        const stats = fs.statSync(videoPath);
        console.log(`视频已保存到: ${videoPath}，文件大小: ${stats.size} 字节`);

        if (stats.size > 0) {
            console.log('下载成功！');
        } else {
            console.log('下载的文件为空');
        }
    } else {
        console.log('视频文件下载失败');
    }
});