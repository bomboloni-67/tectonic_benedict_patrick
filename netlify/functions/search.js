exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { query } = JSON.parse(event.body);
    
    // 1. ANONYMOUS WEB SEARCH
    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0" } // Helps avoid being blocked
    });
    const html = await searchRes.text();
    
    // Extracting snippets (Basic parsing)
    const snippets = html.split('result__snippet').slice(1, 5).map(s => s.split('>')[1].split('<')[0]);
    const context = snippets.join("\n\n");

    // 2. GROQ API CALL
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: `You are a helpful assistant. Use the following web search results to answer the user's question accurately. 
            Context: ${context}` 
          },
          { role: "user", content: query }
        ],
        temperature: 0.5,
        max_tokens: 1024
      }),
    });

    const data = await groqResponse.json();
    
    if (!groqResponse.ok) {
      throw new Error(data.error?.message || "Groq API error");
    }

    const aiAnswer = data.choices[0].message.content;

    return {
      statusCode: 200,
      body: JSON.stringify({ answer: aiAnswer }),
    };
  } catch (error) {
    console.error("Backend Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};