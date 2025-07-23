const fs = require('fs');
const path = require('path');

// 模拟TTS服务的文件保存逻辑
function testFileExtensionFix() {
    console.log('Testing file extension fix...');

    // 模拟音频数据
    const mockAudioData = Buffer.from('mock audio data for testing');

    // 测试不同的内容类型
    const testCases = [
        { contentType: 'audio/L16;codec=pcm;rate=24000', expectedExt: 'wav' },
        { contentType: 'audio/pcm', expectedExt: 'wav' },
        { contentType: 'audio/mp3', expectedExt: 'mp3' },
        { contentType: 'audio/wav', expectedExt: 'wav' }
    ];

    const testDir = path.join(__dirname, 'test-audio');

    // 确保测试目录存在
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }

    testCases.forEach(({ contentType, expectedExt }, index) => {
        console.log(`\nTest ${index + 1}: ${contentType}`);

        // 模拟路由中的扩展名处理（修复后的版本）
        let extension = 'wav';

        if (contentType === 'audio/pcm' || (contentType && contentType.includes('L16'))) {
            extension = 'wav'; // 强制转换为wav
        } else if (contentType && contentType.includes('/')) {
            const parts = contentType.split('/');
            if (parts.length > 1) {
                extension = parts[1].split(';')[0] || 'wav';
                extension = extension.replace(/[^a-zA-Z0-9]/g, '');
            }
        }

        // 对于PCM相关格式强制使用wav
        if (['pcm', 'l16', 'raw'].includes(extension.toLowerCase())) {
            extension = 'wav';
        }

        const filename = `test_${Date.now()}.${extension}`;
        const filePath = path.join(testDir, filename);

        // 保存文件
        fs.writeFileSync(filePath, mockAudioData);

        console.log(`   Generated filename: ${filename}`);
        console.log(`   Expected extension: .${expectedExt}`);
        console.log(`   Actual extension: .${extension}`);
        console.log(`   ✅ Extension is correct: ${extension === expectedExt}`);
    });

    console.log('\n📁 All test files created in:', testDir);
}

// Run test
testFileExtensionFix();