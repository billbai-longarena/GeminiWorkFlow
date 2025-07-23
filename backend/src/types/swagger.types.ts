/**
 * @swagger
 * components:
 *   schemas:
 *     APIResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: 请求是否成功
 *         data:
 *           type: object
 *           description: 响应数据
 *         error:
 *           type: string
 *           description: 错误信息
 *         message:
 *           type: string
 *           description: 提示信息
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           description: 错误详情
 *     
 *     TTSRequest:
 *       type: object
 *       required:
 *         - text
 *       properties:
 *         text:
 *           type: string
 *           description: 要转换为语音的文本
 *           example: "Hello, this is a test of the text-to-speech system."
 *         voice:
 *           type: string
 *           description: 语音类型
 *           example: "Kore"
 *           default: "Kore"
 *         model:
 *           type: string
 *           description: TTS模型
 *           example: "gemini-2.0-flash-exp"
 *         speakers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SpeakerConfig'
 *           description: 多讲者配置
 *     
 *     SpeakerConfig:
 *       type: object
 *       required:
 *         - name
 *         - voice
 *       properties:
 *         name:
 *           type: string
 *           description: 讲者名称
 *           example: "Joe"
 *         voice:
 *           type: string
 *           description: 语音类型
 *           example: "Kore"
 *     
 *     TTSResponse:
 *       type: object
 *       properties:
 *         filePath:
 *           type: string
 *           description: 生成的音频文件路径
 *           example: "/audio/tts_1234567890.wav"
 *         duration:
 *           type: number
 *           description: 音频时长（秒）
 *           example: 3.5
 *         voice:
 *           type: string
 *           description: 使用的语音类型
 *           example: "Kore"
 *     
 *     VoiceListResponse:
 *       type: array
 *       items:
 *         type: object
 *         properties:
 *           name:
 *             type: string
 *             description: 语音名称
 *           description:
 *             type: string
 *             description: 语音描述
 *     
 *     ImagenRequest:
 *       type: object
 *       required:
 *         - prompt
 *       properties:
 *         prompt:
 *           type: string
 *           description: 图像生成提示词
 *           example: "A beautiful sunset over a mountain lake"
 *         sampleCount:
 *           type: number
 *           description: 生成图像数量
 *           example: 1
 *           default: 1
 *         aspectRatio:
 *           type: string
 *           description: 宽高比
 *           example: "16:9"
 *           enum: ["1:1", "9:16", "16:9", "3:4", "4:3"]
 *         personGeneration:
 *           type: string
 *           description: 人物生成选项
 *           example: "dont_allow"
 *           enum: ["dont_allow", "allow_adult", "allow_all"]
 *         negativePrompt:
 *           type: string
 *           description: 负面提示词
 *           example: "blurry, low quality"
 *         seed:
 *           type: number
 *           description: 随机种子
 *           example: 12345
 *     
 *     ImagenResponse:
 *       type: object
 *       properties:
 *         filePath:
 *           type: string
 *           description: 生成的图像文件路径
 *           example: "/images/imagen_1234567890.png"
 *         prompt:
 *           type: string
 *           description: 使用的提示词
 *         imageCount:
 *           type: number
 *           description: 生成的图像数量
 *           example: 1
 *     
 *     ImagenOptions:
 *       type: object
 *       properties:
 *         aspectRatios:
 *           type: array
 *           items:
 *             type: string
 *           example: ["1:1", "9:16", "16:9", "3:4", "4:3"]
 *         personGenerationOptions:
 *           type: array
 *           items:
 *             type: string
 *           example: ["dont_allow", "allow_adult", "allow_all"]
 *     
 *     VeoRequest:
 *       type: object
 *       required:
 *         - prompt
 *       properties:
 *         prompt:
 *           type: string
 *           description: 视频生成提示词
 *           example: "A cat playing with a ball of yarn"
 *         aspectRatio:
 *           type: string
 *           description: 宽高比
 *           example: "16:9"
 *           enum: ["16:9", "9:16", "1:1", "4:3", "3:4"]
 *         personGeneration:
 *           type: string
 *           description: 人物生成选项
 *           example: "dont_allow"
 *           enum: ["dont_allow", "allow_adult", "allow_all"]
 *         durationSeconds:
 *           type: number
 *           description: 视频时长（秒）
 *           example: 5
 *           minimum: 3
 *           maximum: 60
 *     
 *     VeoResponse:
 *       type: object
 *       properties:
 *         operationName:
 *           type: string
 *           description: 操作名称
 *           example: "veo-operation-12345"
 *         status:
 *           type: string
 *           description: 操作状态
 *           enum: ["pending", "running", "completed", "failed"]
 *     
 *     VeoStatusResponse:
 *       type: object
 *       properties:
 *         operationName:
 *           type: string
 *         status:
 *           type: string
 *           enum: ["pending", "running", "completed", "failed"]
 *         videoUri:
 *           type: string
 *           description: 视频文件URL
 *         filePath:
 *           type: string
 *           description: 本地文件路径
 *         error:
 *           type: string
 *           description: 错误信息
 *     
 *     VeoOptions:
 *       type: object
 *       properties:
 *         aspectRatios:
 *           type: array
 *           items:
 *             type: string
 *         durationOptions:
 *           type: array
 *           items:
 *             type: number
 *         personGenerationOptions:
 *           type: array
 *           items:
 *             type: string
 *     
 *     WorkflowStep:
 *       type: object
 *       required:
 *         - id
 *         - type
 *         - config
 *       properties:
 *         id:
 *           type: string
 *           description: 步骤唯一标识
 *         type:
 *           type: string
 *           enum: ["tts", "imagen", "veo"]
 *           description: 步骤类型
 *         config:
 *           oneOf:
 *             - $ref: '#/components/schemas/TTSRequest'
 *             - $ref: '#/components/schemas/ImagenRequest'
 *             - $ref: '#/components/schemas/VeoRequest'
 *         dependsOn:
 *           type: array
 *           items:
 *             type: string
 *           description: 依赖的步骤ID
 *         outputKey:
 *           type: string
 *           description: 输出结果的键名
 *     
 *     WorkflowConfig:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - steps
 *       properties:
 *         id:
 *           type: string
 *           description: 工作流唯一标识
 *         name:
 *           type: string
 *           description: 工作流名称
 *         description:
 *           type: string
 *           description: 工作流描述
 *         steps:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/WorkflowStep'
 *         parallel:
 *           type: boolean
 *           description: 是否并行执行
 *           default: false
 *     
 *     WorkflowExecution:
 *       type: object
 *       properties:
 *         executionId:
 *           type: string
 *           description: 执行ID
 *         message:
 *           type: string
 *           description: 执行状态消息
 *     
 *     WorkflowStatus:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         configId:
 *           type: string
 *         status:
 *           type: string
 *           enum: ["pending", "running", "completed", "failed"]
 *         results:
 *           type: object
 *           description: 各步骤的执行结果
 *         startTime:
 *           type: string
 *           format: date-time
 *         endTime:
 *           type: string
 *           format: date-time
 *         error:
 *           type: string
 *     
 *     WorkflowTemplates:
 *       type: array
 *       items:
 *         $ref: '#/components/schemas/WorkflowConfig'
 */