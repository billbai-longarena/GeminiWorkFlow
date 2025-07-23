// AI服务类型定义

export interface AIServiceConfig {
    apiKey: string;
    baseUrl?: string;
    proxyUrl?: string;
}

export interface TTSConfig extends AIServiceConfig {
    model?: string;
    voice?: string;
    responseModalities?: string[];
    ffmpegPath?: string;
}

export interface ImagenConfig extends AIServiceConfig {
    model?: string;
    sampleCount?: number;
    aspectRatio?: string;
    personGeneration?: string;
}

export interface VeoConfig extends AIServiceConfig {
    model?: string;
    aspectRatio?: string;
    personGeneration?: string;
    durationSeconds?: number;
}

// TTS相关类型
export interface TTSRequest {
    text: string;
    voice?: string;
    model?: string;
    speakers?: SpeakerConfig[];
}

export interface SpeakerConfig {
    name: string;
    voice: string;
}

export interface TTSResponse {
    audioData: Buffer;
    contentType: string;
    duration?: number;
}

// Imagen相关类型
export interface ImagenRequest {
    prompt: string;
    sampleCount?: number;
    aspectRatio?: string;
    personGeneration?: string;
    negativePrompt?: string;
    seed?: number;
}

export interface ImagenResponse {
    images: Array<{
        bytesBase64Encoded: string;
        mimeType: string;
        safetyAttributes?: any;
    }>;
    prompt: string;
}

// Veo相关类型
export interface VeoRequest {
    prompt: string;
    aspectRatio?: string;
    personGeneration?: string;
    durationSeconds?: number;
}

export interface VeoResponse {
    operationName: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    videoUri?: string;
    error?: string;
}

// 工作流配置类型
export interface WorkflowStep {
    id: string;
    type: 'tts' | 'imagen' | 'veo';
    config: TTSRequest | ImagenRequest | VeoRequest;
    dependsOn?: string[];
    outputKey?: string;
}

export interface WorkflowConfig {
    id: string;
    name: string;
    description?: string;
    steps: WorkflowStep[];
    parallel?: boolean;
}

export interface WorkflowExecution {
    id: string;
    configId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    results: Record<string, any>;
    startTime: Date;
    endTime?: Date;
    error?: string;
}

// API响应类型
export interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// 文件存储类型
export interface FileStorage {
    filename: string;
    path: string;
    size: number;
    mimeType: string;
    createdAt: Date;
}

export interface VideoFile {
    name: string;
    size: number;
    modified: string;
}
export interface ImageFile {
    name: string;
    size: number;
    modified: string;
}
export interface AudioFile {
    name: string;
    size: number;
    modified: string;
}