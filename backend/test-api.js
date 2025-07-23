// API 测试脚本
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/ai';

// 测试配置
const config = {
    tts: {
        text: "Hello, this is a test of the text-to-speech system.",
        voice: "Kore"
    },
    imagen: {
        prompt: "A beautiful sunset over a mountain lake",
        aspectRatio: "16:9",
        sampleCount: 1
    },
    veo: {
        prompt: "A cat playing with a ball of yarn",
        aspectRatio: "16:9",
        durationSeconds: 3
    }
};

// 工具函数
async function testEndpoint(name, method, url, data = null) {
    console.log(`\n=== Testing ${name} ===`);
    try {
        const response = await axios({
            method,
            url: `${BASE_URL}${url}`,
            data,
            headers: { 'Content-Type': 'application/json' }
        });

        console.log(`✅ ${name}: Success`);
        if (response.data.data) {
            console.log('Response:', JSON.stringify(response.data.data, null, 2));
        }
        return response.data;
    } catch (error) {
        console.error(`❌ ${name}: Failed`);
        console.error('Error:', error.response?.data || error.message);
        return null;
    }
}

// 测试函数
async function testTTS() {
    console.log('\n🎤 Testing TTS Service...');

    // 测试可用声音
    await testEndpoint('TTS Voices', 'GET', '/tts/voices');

    // 测试文本转语音
    const result = await testEndpoint('TTS Generate', 'POST', '/tts', config.tts);
    return result;
}

async function testImagen() {
    console.log('\n🖼️ Testing Imagen Service...');

    // 测试配置选项
    await testEndpoint('Imagen Options', 'GET', '/imagen/options');

    // 测试图像生成
    const result = await testEndpoint('Imagen Generate', 'POST', '/imagen', config.imagen);
    return result;
}

async function testVeo() {
    console.log('\n🎬 Testing Veo Service...');

    // 测试配置选项
    await testEndpoint('Veo Options', 'GET', '/veo/options');

    // 测试视频生成
    const result = await testEndpoint('Veo Generate', 'POST', '/veo', config.veo);

    if (result && result.data) {
        console.log('\n⏳ Waiting for video generation...');
        const operationName = result.data.operationName;

        // 等待并检查状态
        let status = null;
        let attempts = 0;
        const maxAttempts = 20;

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            status = await testEndpoint('Veo Status', 'GET', `/veo/status/${operationName}`);

            if (status && status.data && status.data.status === 'completed') {
                console.log('✅ Video generation completed!');
                break;
            }

            attempts++;
            console.log(`⏳ Attempt ${attempts}/${maxAttempts}...`);
        }

        if (attempts >= maxAttempts) {
            console.log('⚠️ Video generation timeout');
        }
    }

    return result;
}

async function testWorkflow() {
    console.log('\n🔄 Testing Workflow Service...');

    // 获取示例工作流
    const templates = await testEndpoint('Workflow Templates', 'GET', '/workflow/templates');

    if (templates && templates.data) {
        // 执行简单工作流
        const simpleWorkflow = templates.data[0]; // 简单TTS工作流
        const result = await testEndpoint('Workflow Execute', 'POST', '/workflow', simpleWorkflow);

        if (result && result.data) {
            const executionId = result.data.executionId;

            // 等待工作流完成
            console.log('\n⏳ Waiting for workflow completion...');
            let status = null;
            let attempts = 0;
            const maxAttempts = 10;

            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                status = await testEndpoint('Workflow Status', 'GET', `/workflow/${executionId}`);

                if (status && status.data && status.data.status === 'completed') {
                    console.log('✅ Workflow completed!');
                    break;
                } else if (status && status.data && status.data.status === 'failed') {
                    console.log('❌ Workflow failed!');
                    break;
                }

                attempts++;
                console.log(`⏳ Workflow attempt ${attempts}/${maxAttempts}...`);
            }
        }
    }
}

// 主测试函数
async function runAllTests() {
    console.log('🚀 Starting API Tests...\n');

    try {
        // 检查服务是否运行
        await axios.get('http://localhost:3000/health');
        console.log('✅ Service is running');
    } catch (error) {
        console.error('❌ Service is not running. Please start the backend server first.');
        console.error('Run: cd backend && npm run dev');
        process.exit(1);
    }

    // 运行测试
    await testTTS();
    await testImagen();
    await testVeo();
    await testWorkflow();

    console.log('\n🎉 All tests completed!');
}

// 运行测试
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { runAllTests };