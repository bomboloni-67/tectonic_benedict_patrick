exports.handler = async (event) => {
  const { query } = JSON.parse(event.body);
  
  // 1. Fetch search snippets (Simplified for no-key use)
  const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const searchRes = await fetch(searchUrl);
  const html = await searchRes.text();
  const context = html.split('result__snippet').slice(1, 4).join('\n');

  // 2. Call Hugging Face
  const response = await fetch("https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct", {
    headers: { Authorization: `Bearer ${process.env.HF_TOKEN}` },
    method: "POST",
    body: JSON.stringify({ inputs: `Context: ${context}\n\nQuestion: ${query}` }),
  });

  const data = await response.json();
  return {
    statusCode: 200,
    body: JSON.stringify({ answer: data[0].generated_text }),
  };
};