import Groq from "groq-sdk";
import axios from 'axios';
import * as cheerio from 'cheerio';
import jwt from "jsonwebtoken";
import YahooFinance from 'yahoo-finance2';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const yf = new YahooFinance();

async function getDeepContent(url){
  try{
    const response = await axios.get(url,{
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });

    const $ = cheerio.load(response.data);

    $('script, style, nav, footer, header, ads, .sidebar, .comments').remove();

    const text = $('p, h1, h2, h3')
      .map((i, el) => $(el).text())
      .get()
      .join('\n')
      .replace(/\s+/g, ' ')  // Collapse extra whitespace
      .substring(0,2500); // Limit to first 2500 characters
      return `--- SOURCE ${url} ---\n${text}\n`
  } catch (error) {
    console.error(`failed to scrape ${url}:`, error.message);
    return ""; // Return empty so it doesn't break the whole process
  }
}

async function extractTickers(userQuery) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile", // Fast model for intent detection
    messages: [
      { 
        role: "system", 
        content: "Extract stock ticker symbols from the user query. Return ONLY a comma-separated list of tickers (e.g. TSLA, AAPL). If no stocks are mentioned, return 'NONE'." 
      },
      { role: "user", content: userQuery }
    ],
    temperature: 0, // Keep it strictly factual
  });

  const response = completion.choices[0].message.content.trim();
  if (response === "NONE") return [];
  
  // Clean up the string and turn it into an array
  return response.split(',').map(t => t.trim().toUpperCase());
}

export default async (req, context) => {
  const body = await req.json();
  const {messages} = body;
  const query = body.query || (messages && messages[messages.length-1].content);

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.split(" ")[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return new Response(JSON.stringify({ error: "Unauthorized access" }), { status: 401 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // 1. DYNAMIC DATE (Forces AI to recognize it is 2026)
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // 2. REPLACING THE SEARCH LOGIC
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const searchRes = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://duckduckgo.com/",
        "DNT": "1"
      }
    });

    const html = await searchRes.text();

    const $search = cheerio.load(html);

    let links = [];

    // 2. Select all result title links specifically
    // .result__a is the class DDG uses for the main clickable title
    $search('.result__a').each((i, el) => {
      let href = $search(el).attr('href');
      if (href && links.length < 5) {
        // Decode DDG redirect if present
        if (href.includes('uddg=')) {
          href = decodeURIComponent(href.split('uddg=')[1].split('&')[0]);
        }
        
        // FILTER: Only add if it's a real website and NOT a DuckDuckGo internal link/ad
        if ((href.startsWith('http') || href.startsWith('https')) && !href.includes('duckduckgo.com')) {
          links.push(href);
        }
      }
    });

    console.log("Verified Links found:", links);

    // 2. MANUALLY VISIT THE LINKS
    // We use Promise.all to scrape multiple pages at the same time (faster)
    const deepResults = await Promise.all(links.map(url => getDeepContent(url)));
    const searchContext = deepResults.join("\n\n") || "No deep data found.";

    // 2.1 FINANCIAL DATA FECTHING
    const tickers = await extractTickers(query);
    let inputContext = searchContext;
    let stockContext = "";
    if (tickers.length > 0) {
      try{
        const quotes = await yf.quote(tickers);
        // Ensure we always have an array for formatting
        const quotesArray = Array.isArray(quotes) ? quotes : [quotes];
        stockContext = `--- STOCK DATA ---\n:${JSON.stringify(quotesArray, null, 2)}\n`;
        inputContext += "\n\n"+stockContext;


      } catch (error){
        console.error("Yahoo Finance fetch error:", error.message);
      }
    }

    // 3. THE GROQ CALL
    const stream = await groq.chat.completions.create({
      model: "qwen/qwen3-32b",
      messages: [
        { 
          role: "system", 
          content: `You are a real-time web-connected AI. 
          Today is ${today}. 
          Answer the user's question using the search context below. 
          If context is old, prioritize the fact today is ${today}.
          Context: ${inputContext}` 
        },
        { role: "user", content: query },
        ...messages.slice(-5) 
      ],
      temperature: 0.2, // Lower temp for more factual stability
      reasoning_format: "raw", 
      stream: true,
    });

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const contextPayload = `<context>${inputContext}</context>`;
        controller.enqueue(encoder.encode(contextPayload));
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) controller.enqueue(encoder.encode(content));
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (error) {
    console.error("\n\nfunction error", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};