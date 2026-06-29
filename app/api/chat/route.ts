import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { CodexMindPrompt, MindChatPrompt, AgentMindPrompt } from '@/lib/prompts';

export const maxDuration = 60; // Allow longer execution time if deployed

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, openAIApiKey, geminiApiKey, claudeApiKey, mistralApiKey, systemPrompt } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    let finalModel = model;
    let customSystemPrompt = systemPrompt || '';

    if (finalModel === 'CodexMind') {
      finalModel = 'gemini-3.1-pro-preview';
      customSystemPrompt = CodexMindPrompt + (customSystemPrompt ? `\n\n${customSystemPrompt}` : '');
    } else if (finalModel === 'MindChat') {
      finalModel = 'gemini-3.5-flash';
      customSystemPrompt = MindChatPrompt + (customSystemPrompt ? `\n\n${customSystemPrompt}` : '');
    } else if (finalModel === 'AgentMind') {
      finalModel = 'gemini-3.5-flash';
      customSystemPrompt = AgentMindPrompt + (customSystemPrompt ? `\n\n${customSystemPrompt}` : '');
    }

    const fileOpsInstruction = `\n\n[SYSTEM CAPABILITY - FILE MANIPULATION]:
You are empowered to perform file operations in the user's workspace. If the user requests creating, updating, renaming, or deleting any file or folder (or cleaning up "trash", "testing", or "redundant" files), you must use these exact XML commands:
1. Create or Update a file:
<command type="create_file" name="filepath">file contents</command>
2. Rename a file:
<command type="rename_file" name="old_filepath" new_name="new_filepath"></command>
3. Delete a file:
<command type="delete_file" name="filepath"></command>

Example: If user asks "delete target.html as it is raw trash", respond with:
I have deleted target.html for you!
<command type="delete_file" name="target.html"></command>

Example: If user asks "make custom.js", respond with:
I've created custom.js!
<command type="create_file" name="custom.js">...</command>

Always output these command structures for any file operations so the container executes them immediately.`;

    customSystemPrompt = `${customSystemPrompt}${fileOpsInstruction}`;

    // Process system prompt
    let formattedMessages = [...messages];
    if (customSystemPrompt && formattedMessages[0]?.role !== 'system') {
       formattedMessages = [{ role: 'system', content: customSystemPrompt }, ...formattedMessages];
    } else if (customSystemPrompt && formattedMessages[0]?.role === 'system') {
       formattedMessages[0].content = `${customSystemPrompt}\n\n${formattedMessages[0].content}`;
    }

    const isGemini = finalModel.startsWith('gemini') || finalModel === 'CodexMind' || finalModel === 'MindChat' || finalModel === 'AgentMind';

    if (isGemini) {
      if (!geminiApiKey && !process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: 'Gemini API key is required' }, { status: 400 });
      }

      const ai = new GoogleGenAI({ apiKey: geminiApiKey || process.env.GEMINI_API_KEY });
      
      // Format messages for Gemini (it uses 'user' and 'model')
      const systemMessage = formattedMessages.find(m => m.role === 'system')?.content || '';
      const chatMessages = formattedMessages.filter(m => m.role !== 'system').map(m => ({
         role: m.role === 'assistant' ? 'model' : 'user',
         parts: [{ text: m.content }]
      }));

      // Build an ordered list of fallback models to bypass temporary demand spikes / 503s
      const modelList = [finalModel];
      if (finalModel === 'gemini-3.5-flash') {
        modelList.push('gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite');
      } else {
        modelList.push('gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3.1-flash-lite');
      }

      // Helper function to test initiation of stream and find a working model instantly
      const getRobustGeminiStream = async (modelNames: string[]) => {
        for (const modelName of modelNames) {
          try {
            console.log(`[MindChat] Attempting content stream with model: ${modelName}`);
            const responseStream = await ai.models.generateContentStream({
              model: modelName,
              contents: chatMessages,
              config: { systemInstruction: systemMessage ? systemMessage : undefined }
            });
            
            // Proactively request the first chunk to verify model availability (to catch 503/403/400 early)
            const iterator = responseStream[Symbol.asyncIterator]();
            const firstResult = await iterator.next();
            
            console.log(`[MindChat] Successfully established stream on model: ${modelName}`);
            return {
              firstChunk: firstResult.done ? null : firstResult.value,
              iterator: iterator,
              modelName: modelName
            };
          } catch (err: any) {
            console.warn(`[MindChat] Model ${modelName} call failed, trying next fallback. Error:`, err?.message || err);
          }
        }
        throw new Error('All available Gemini models are currently experiencing high demand. Please try again in a few moments.');
      };

      let activeStream;
      try {
        activeStream = await getRobustGeminiStream(modelList);
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Gemini Service Unavailable' }, { status: 503 });
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Write the validated first chunk if it exists
            if (activeStream.firstChunk && activeStream.firstChunk.text) {
              const data = JSON.stringify({ delta: activeStream.firstChunk.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
            
            // Loop through the rest of the stream
            let nextVal = await activeStream.iterator.next();
            while (!nextVal.done) {
              const chunk = nextVal.value;
              if (chunk && chunk.text) {
                const data = JSON.stringify({ delta: chunk.text });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
              nextVal = await activeStream.iterator.next();
            }
            
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (error: any) {
            console.error('Gemini Stream Error:', error);
            controller.error(error);
          }
        }
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

    } else if (finalModel.startsWith('claude-')) {
      // Claude (Anthropic)
      const apiKey = claudeApiKey || process.env.CLAUDE_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'Claude API key is required' }, { status: 400 });
      }

      const systemMessage = formattedMessages.find(m => m.role === 'system')?.content || '';
      const anthropicMessages = formattedMessages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: finalModel,
          messages: anthropicMessages,
          system: systemMessage || undefined,
          max_tokens: 4096,
          stream: true
        })
      });

      if (!response.ok) {
        const errMsg = await response.text();
        return NextResponse.json({ error: `Anthropic API error: ${errMsg}` }, { status: response.status });
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const reader = response.body?.getReader();
            if (!reader) {
              controller.close();
              return;
            }
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                  const dataStr = trimmed.slice(6);
                  if (dataStr) {
                    try {
                      const parsed = JSON.parse(dataStr);
                      if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                        const outData = JSON.stringify({ delta: parsed.delta.text });
                        controller.enqueue(encoder.encode(`data: ${outData}\n\n`));
                      }
                    } catch (e) {
                      // ignore parse error
                    }
                  }
                }
              }
            }
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (error) {
            console.error('Claude Stream Error:', error);
            controller.error(error);
          }
        }
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

    } else if (finalModel.startsWith('mistral-') || finalModel.includes('mixtral')) {
      // Mistral
      const apiKey = mistralApiKey || process.env.MISTRAL_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'Mistral API key is required' }, { status: 400 });
      }

      const mistralOpenai = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.mistral.ai/v1'
      });

      const responseStream = await mistralOpenai.chat.completions.create({
        model: finalModel,
        messages: formattedMessages,
        stream: true,
      });

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of responseStream) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                const data = JSON.stringify({ delta: content });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (error) {
            console.error('Mistral Stream Error:', error);
            controller.error(error);
          }
        }
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

    } else {
      // OpenAI
      if (!openAIApiKey) {
        return NextResponse.json({ error: 'OpenAI API key is required' }, { status: 400 });
      }

      const openai = new OpenAI({ apiKey: openAIApiKey });
      
      const responseStream = await openai.chat.completions.create({
        model: finalModel,
        messages: formattedMessages,
        stream: true,
      });

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of responseStream) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                const data = JSON.stringify({ delta: content });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (error) {
            console.error('OpenAI Stream Error:', error);
            controller.error(error);
          }
        }
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
