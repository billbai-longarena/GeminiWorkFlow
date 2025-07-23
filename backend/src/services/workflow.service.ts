import { TTSService } from './tts.service';
import { ImagenService } from './imagen.service';
import { VeoService } from './veo.service';
import {
    WorkflowConfig,
    WorkflowExecution,
    WorkflowStep,
    TTSRequest,
    ImagenRequest,
    VeoRequest,
    APIResponse
} from '../types/ai.types';

export class WorkflowService {
    private ttsService: TTSService;
    private imagenService: ImagenService;
    private veoService: VeoService;
    private executions: Map<string, WorkflowExecution> = new Map();

    constructor(
        ttsService: TTSService,
        imagenService: ImagenService,
        veoService: VeoService
    ) {
        this.ttsService = ttsService;
        this.imagenService = imagenService;
        this.veoService = veoService;
    }

    async executeWorkflow(config: WorkflowConfig): Promise<string> {
        const executionId = this.generateId();
        const execution: WorkflowExecution = {
            id: executionId,
            configId: config.id,
            status: 'pending',
            results: {},
            startTime: new Date()
        };

        this.executions.set(executionId, execution);

        // 异步执行工作流
        this.executeWorkflowAsync(executionId, config).catch(error => {
            const exec = this.executions.get(executionId);
            if (exec) {
                exec.status = 'failed';
                exec.error = error.message;
                exec.endTime = new Date();
            }
        });

        return executionId;
    }

    private async executeWorkflowAsync(executionId: string, config: WorkflowConfig) {
        const execution = this.executions.get(executionId);
        if (!execution) return;

        execution.status = 'running';

        try {
            if (config.parallel) {
                // 并行执行所有步骤
                const promises = config.steps.map(step => this.executeStep(step, execution.results));
                await Promise.all(promises);
            } else {
                // 顺序执行步骤，处理依赖关系
                const executedSteps = new Set<string>();

                for (const step of config.steps) {
                    await this.executeStepWithDependencies(step, execution.results, executedSteps);
                    executedSteps.add(step.id);
                }
            }

            execution.status = 'completed';
            execution.endTime = new Date();
        } catch (error) {
            execution.status = 'failed';
            execution.error = error instanceof Error ? error.message : 'Unknown error';
            execution.endTime = new Date();
        }
    }

    private async executeStepWithDependencies(
        step: WorkflowStep,
        results: Record<string, any>,
        executedSteps: Set<string>
    ) {
        // 检查依赖是否已执行
        if (step.dependsOn) {
            for (const depId of step.dependsOn) {
                if (!executedSteps.has(depId)) {
                    throw new Error(`Dependency ${depId} not executed for step ${step.id}`);
                }
            }
        }

        return this.executeStep(step, results);
    }

    private async executeStep(step: WorkflowStep, results: Record<string, any>) {
        let result: any;

        switch (step.type) {
            case 'tts':
                result = await this.executeTTS(step.config as TTSRequest);
                break;
            case 'imagen':
                result = await this.executeImagen(step.config as ImagenRequest);
                break;
            case 'veo':
                result = await this.executeVeo(step.config as VeoRequest);
                break;
            default:
                throw new Error(`Unknown step type: ${step.type}`);
        }

        if (step.outputKey) {
            results[step.outputKey] = result;
        }
        results[step.id] = result;

        return result;
    }

    private async executeTTS(request: TTSRequest) {
        const audioData = await this.ttsService.generateSpeech(request);
        const filename = `tts_${Date.now()}.wav`;
        const filePath = await this.ttsService.saveAudio(audioData.audioData, filename);

        return {
            filePath,
            duration: audioData.duration,
            type: 'audio'
        };
    }

    private async executeImagen(request: ImagenRequest) {
        const response = await this.imagenService.generateImage(request);
        const filename = `imagen_${Date.now()}.png`;
        const filePath = await this.imagenService.saveImage(response.images[0].bytesBase64Encoded, filename);

        return {
            filePath,
            prompt: response.prompt,
            type: 'image'
        };
    }

    private async executeVeo(request: VeoRequest) {
        const response = await this.veoService.generateVideo(request);

        // 等待视频生成完成
        const completedResponse = await this.veoService.waitForCompletion(response.operationName);

        if (!completedResponse.videoUri) {
            throw new Error('Video generation failed: no video URI');
        }

        const filename = `veo_${Date.now()}.mp4`;
        const filePath = await this.veoService.downloadVideo(completedResponse.videoUri, filename);

        return {
            filePath,
            operationName: completedResponse.operationName,
            type: 'video'
        };
    }

    getExecutionStatus(executionId: string): WorkflowExecution | undefined {
        return this.executions.get(executionId);
    }

    getAllExecutions(): WorkflowExecution[] {
        return Array.from(this.executions.values());
    }

    private generateId(): string {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 创建示例工作流配置
    createSampleWorkflows(): WorkflowConfig[] {
        return [
            {
                id: 'simple_tts',
                name: '简单文本转语音',
                description: '将文本转换为语音',
                steps: [
                    {
                        id: 'tts_step',
                        type: 'tts',
                        config: {
                            text: 'Hello, this is a test of the text-to-speech system.',
                            voice: 'Kore'
                        } as TTSRequest,
                        outputKey: 'audio'
                    }
                ]
            },
            {
                id: 'image_generation',
                name: '图像生成',
                description: '根据提示词生成图像',
                steps: [
                    {
                        id: 'imagen_step',
                        type: 'imagen',
                        config: {
                            prompt: 'A beautiful sunset over a mountain lake',
                            sampleCount: 1,
                            aspectRatio: '16:9'
                        } as ImagenRequest,
                        outputKey: 'image'
                    }
                ]
            },
            {
                id: 'video_generation',
                name: '视频生成',
                description: '根据提示词生成视频',
                steps: [
                    {
                        id: 'veo_step',
                        type: 'veo',
                        config: {
                            prompt: 'A cat playing with a ball of yarn',
                            aspectRatio: '16:9',
                            durationSeconds: 5
                        } as VeoRequest,
                        outputKey: 'video'
                    }
                ]
            },
            {
                id: 'complex_workflow',
                name: '复杂工作流',
                description: '生成图像然后为其创建语音描述',
                steps: [
                    {
                        id: 'generate_image',
                        type: 'imagen',
                        config: {
                            prompt: 'A futuristic city with flying cars',
                            aspectRatio: '16:9'
                        } as ImagenRequest,
                        outputKey: 'generated_image'
                    },
                    {
                        id: 'describe_image',
                        type: 'tts',
                        config: {
                            text: 'This is a futuristic city with flying cars and neon lights.',
                            voice: 'Kore'
                        } as TTSRequest,
                        dependsOn: ['generate_image'],
                        outputKey: 'description_audio'
                    }
                ]
            }
        ];
    }
}