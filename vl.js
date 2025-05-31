import OpenAI from "openai";

const openai = new OpenAI(
    {
        // If environment variables are not configured, replace the following line with: apiKey: "sk-xxx",
        apiKey: "sk-fe2dd6170997401d9390c6b7298ee92b",
        baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    }
);

async function main() {
    const response = await openai.chat.completions.create({
        model: "qwen-vl-plus", // This example uses qwen-vl-plus. You can change the model name as needed. Model list: https://www.alibabacloud.com/help/zh/model-studio/getting-started/models
        messages: [{role: "user",content: [
            { type: "text", text: "What is this?" },
            { type: "image_url",image_url: {"url": "https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg"}}
        ]}]
    });
    console.log(JSON.stringify(response));
}

main();