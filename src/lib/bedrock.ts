import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { fromIni } from '@aws-sdk/credential-providers';

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_PROFILE ? fromIni({ profile: process.env.AWS_PROFILE }) : undefined, // falls back to default chain (works on Render with IAM)
});

const MODEL_ID = 'us.anthropic.claude-sonnet-4-6';

interface ClaudeImageContent {
  type: 'image';
  source: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

interface ClaudeTextContent {
  type: 'text';
  text: string;
}

type ClaudeContent = ClaudeImageContent | ClaudeTextContent;

interface ClaudeMessage {
  role: 'user';
  content: ClaudeContent[];
}

interface ClaudeResponseBody {
  content: { text: string }[];
}

export async function invokeClaude(prompt: string, imageUrl?: string): Promise<string> {
  const content: ClaudeContent[] = [];

  if (imageUrl) {
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) {
      throw new Error(`Failed to fetch image: ${imgResponse.status} ${imgResponse.statusText}`);
    }
    const buffer = await imgResponse.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mediaType = imgResponse.headers.get('content-type') || 'image/jpeg';
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: base64 },
    });
  }

  content.push({ type: 'text', text: prompt });

  const messages: ClaudeMessage[] = [{ role: 'user', content }];

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2048,
      messages,
    }),
  });

  const result = await client.send(command);
  const body = JSON.parse(new TextDecoder().decode(result.body)) as ClaudeResponseBody;
  return body.content[0].text;
}
