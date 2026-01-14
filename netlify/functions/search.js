import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export default async (req, context) => {
  // 1. Only allow POST
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { query } = await req.json();

    // 2. SEARCH STEP (Anonymous DuckDuckGo)
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const html = await searchRes.text();
    const snippets = html.split('result__snippet').slice(1, 5)
      .map(s => s.split('>')[1].split('</')[0].replace(/<[^>]*>/g, '').trim());
    const searchContext = snippets.join("\n\n") || "No search results found.";

    // 3. GROQ STREAMING CALL
    const stream = await groq.chat.completions.create({
      model: "qwen/qwen3-32b", 
      messages: [
        { 
          role: "system", 
          content: `You are a reasoning assistant. Use this web context: ${searchContext}` 
        },
        { role: "user", content: query }
      ],
      temperature: 0.6,
      max_completion_tokens: 4096,
      top_p: 0.95,
      reasoning_effort: "default",
      stream: true,
    });

    // 4. CONVERT GROQ STREAM TO NETLIFY RESPONSE STREAM
    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });

  } catch (error) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};