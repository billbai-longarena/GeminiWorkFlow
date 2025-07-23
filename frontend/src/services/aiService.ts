import axios from 'axios'

const API_BASE = 'http://localhost:3000/api/ai'

export interface TTSRequest {
    text: string
    voice?: string
    speakers?: Array<{
        name: string
        voice: string
    }>
}

export interface TTSResponse {
    audioUrl: string
    filename: string
}

export interface ImagenRequest {
    prompt: string
    aspectRatio?: string
    sampleCount?: number
    personGeneration?: string
}

export interface ImagenResponse {
    images: Array<{
        url: string
        filename: string
    }>
}

export interface VeoRequest {
    prompt: string
    aspectRatio?: string
    durationSeconds?: number
}

export interface VeoResponse {
    operationName: string
    status: string
}

export interface WorkflowStep {
    id: string
    type: 'tts' | 'imagen' | 'veo'
    config: any
    dependsOn?: string[]
    outputKey?: string
}

export interface WorkflowRequest {
    id: string
    name: string
    description?: string
    steps: WorkflowStep[]
    parallel?: boolean
}

export interface WorkflowResponse {
    executionId: string
    status: string
}

export interface VideoFile {
    name: string;
    size: number;
    modified: string;
}

export interface AudioFile {
    name: string;
    size: number;
    modified: string;
}

export interface ImageFile {
    name: string;
    size: number;
    modified: string;
}


export const aiService = {
    // TTS 服务
    async generateTTS(request: TTSRequest): Promise<TTSResponse> {
        const response = await axios.post(`${API_BASE}/tts`, request, {
            responseType: 'blob'
        });

        const contentDisposition = response.headers['content-disposition'];
        let filename = 'tts_audio.wav';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
            if (filenameMatch && filenameMatch.length > 1) {
                filename = filenameMatch[1];
            }
        }

        const blob = new Blob([response.data], { type: response.headers['content-type'] });
        const audioUrl = window.URL.createObjectURL(blob);

        return { audioUrl, filename };
    },

    async getVoices(): Promise<string[]> {
        const response = await axios.get(`${API_BASE}/tts/voices`)
        return response.data.data
    },

    async getAudioFiles(): Promise<AudioFile[]> {
        const response = await axios.get(`${API_BASE}/tts/audios`);
        return response.data.data;
    },

    // Imagen 服务
    async generateImage(request: ImagenRequest): Promise<ImagenResponse> {
        const response = await axios.post(`${API_BASE}/imagen`, request)
        return response.data.data
    },

    async getImagenOptions(): Promise<any> {
        const response = await axios.get(`${API_BASE}/imagen/options`)
        return response.data.data
    },

    async getImageFiles(): Promise<ImageFile[]> {
        const response = await axios.get(`${API_BASE}/imagen/images`);
        return response.data.data;
    },

    // Veo 服务
    async generateVideo(request: VeoRequest): Promise<VeoResponse> {
        console.log('[Frontend] Starting video generation request', request);
        try {
            const response = await axios.post(`${API_BASE}/veo`, request);
            console.log('[Frontend] Video generation response received', response.data);
            return response.data.data;
        } catch (error: any) {
            console.error('[Frontend] Video generation failed', {
                error: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw new Error(error.response?.data?.error || error.message);
        }
    },

    async getVideoStatus(operationName: string): Promise<any> {
        console.log('[Frontend] Checking video status', { operationName });
        try {
            const response = await axios.get(`${API_BASE}/veo/status/${operationName}`);
            console.log('[Frontend] Status check response received', {
                status: response.status,
                statusText: response.statusText,
                data: response.data,
                headers: response.headers
            });
            return response.data.data;
        } catch (error: any) {
            console.error('[Frontend] Status check failed', {
                error: error.message,
                response: error.response?.data,
                status: error.response?.status,
                statusText: error.response?.statusText,
                headers: error.response?.headers
            });
            throw new Error(error.response?.data?.error || error.message);
        }
    },

    async getVeoOptions(): Promise<any> {
        const response = await axios.get(`${API_BASE}/veo/options`)
        return response.data.data
    },

    async getVideoFiles(): Promise<VideoFile[]> {
        const response = await axios.get(`${API_BASE}/veo/videos`);
        return response.data.data;
    },

    async downloadVideoFile(filename: string): Promise<void> {
        const response = await axios.get(`${API_BASE}/veo/videos/${filename}`, {
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // 工作流服务
    async executeWorkflow(request: WorkflowRequest): Promise<WorkflowResponse> {
        const response = await axios.post(`${API_BASE}/workflow`, request)
        return response.data.data
    },

    async getWorkflowTemplates(): Promise<any[]> {
        const response = await axios.get(`${API_BASE}/workflow/templates`)
        return response.data.data
    },

    async getWorkflowStatus(executionId: string): Promise<any> {
        const response = await axios.get(`${API_BASE}/workflow/${executionId}`)
        return response.data.data
    },

    // 文件下载
    async downloadFile(url: string, filename: string): Promise<void> {
        console.log('[Frontend] Starting file download', { url, filename });

        const link = document.createElement('a')
        link.href = url
        link.download = filename

        console.log('[Frontend] Created download link', {
            href: link.href,
            download: link.download
        });

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        console.log('[Frontend] Download initiated');
    }
}