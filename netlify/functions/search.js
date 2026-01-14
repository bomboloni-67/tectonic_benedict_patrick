import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export default async (req, context) => {
  // 1. Only allow POST requests
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { query } = await req.json();

    // 2. SEARCH STEP (Anonymous DuckDuckGo)
    // We fetch search results to provide "context" to the LLM (RAG)
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    
    const html = await searchRes.text();
    // Simple parsing logic to grab text snippets from DDG HTML
    const snippets = html.split('result__snippet').slice(1, 6)
      .map(s => s.split('>')[1].split('</')[0].replace(/<[^>]*>/g, '').trim());
    const searchContext = snippets.join("\n\n") || "No search results found.";

    // 3. GROQ STREAMING CALL
    const stream = await groq.chat.completions.create({
      model: "qwen/qwen3-32b",
      messages: [
        { 
          role: "system", 
          content: `You are a helpful AI assistant with access to the web. 
          Use the following search results to answer the user's query accurately. 
          Context: ${searchContext}` 
        },
        { role: "user", content: query }
      ],
      temperature: 0.6,
      max_completion_tokens: 4096,
      top_p: 0.95,
      reasoning_effort: "default",
      reasoning_format: "raw", 
      stream: true,
    });

    // 4. CREATE A READABLE STREAM FOR NETLIFY
    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            // Qwen reasoning models send content in the 'delta'
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    // 5. RETURN THE STREAM
    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });

  } catch (error) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};