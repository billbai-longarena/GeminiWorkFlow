const axios = require('axios');

async function testTTS() {
    try {
        console.log('Testing TTS fix...');

        const response = await axios.post('http://localhost:3000/api/ai/tts', {
            text: "This is a test to check if audio files are saved correctly.",
            voice: "Kore"
        });

        console.log('TTS Response:', response.data);

        if (response.data.success) {
            console.log('✅ Audio file generated:', response.data.data.filePath);
            console.log('📁 File type:', response.data.data.contentType);
            console.log('⏱️ Estimated duration:', response.data.data.duration, 'seconds');
        } else {
            console.error('❌ TTS generation failed:', response.data.error);
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

// If run directly
if (require.main === module) {
    testTTS();
}

module.exports = { testTTS };