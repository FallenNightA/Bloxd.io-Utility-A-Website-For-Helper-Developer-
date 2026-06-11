import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { CodexMindPrompt, MindChatPrompt, AgentMindPrompt } from '@/lib/prompts';

export const maxDuration = 60; // Allow longer execution time if deployed

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, openAIApiKey, geminiApiKey, systemPrompt } = body;

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

    if (finalModel === 'gemini-1.5-pro' || finalModel === 'gemini-pro') finalModel = 'gemini-3.5-flash';
    if (finalModel === 'gemini-1.5-flash' || finalModel === 'gemini-flash' || finalModel === 'gemini-flash-latest') finalModel = 'gemini-3.5-flash';

    const isGemini = finalModel.startsWith('gemini');

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

      const responseStream = await ai.models.generateContentStream({
        model: finalModel,
        contents: chatMessages,
        config: { systemInstruction: systemMessage ? systemMessage : undefined }
      });

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of responseStream) {
              if (chunk.text) {
                // OpenAI compatible SSE format
                const data = JSON.stringify({ delta: chunk.text });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (error) {
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
