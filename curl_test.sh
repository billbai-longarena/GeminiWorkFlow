#!/bin/bash
# 测试Veo API调用的正确方式
API_KEY="AIzaSyChMStr5J2PcdDqS_CP9YVNOLDN6i8AI9Q"  # 从backend/.env中获取
MODEL="veo-3.0-generate-preview"
URL="https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predictLongRunning"

# 请求体不包含durationSeconds参数
REQUEST_BODY='{
  "instances": [
    {
      "prompt": "clouds"
    }
  ],
  "parameters": {
    "aspectRatio": "16:9",
    "personGeneration": "allow_all"
  }
}'

echo "发送视频生成请求..."
curl -X POST "$URL" \
  -H "x-goog-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$REQUEST_BODY" | jq '.'

echo -e "\n如果上面的请求成功，会返回一个操作名称，例如: 'operations/1234567890'"
echo "然后可以使用以下命令检查操作状态："
echo "curl -H 'x-goog-api-key: $API_KEY' 'https://generativelanguage.googleapis.com/v1beta/operations/1234567890'"