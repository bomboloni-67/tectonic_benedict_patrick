import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

const ChatMessage = ({ msg }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContext, setShowContext] = useState(false);
  // Helper to split the text into 'thinking' and 'answer'
  const parseContent = (text) => {
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
    const thinking = thinkMatch ? thinkMatch[1] : "";
    


    const contextMatch = text.match(/<context>([\s\S]*?)<\/context>/);
    const context = contextMatch ? contextMatch[1] : "";
    

    const answer = text
    .replace(/<context>[\s\S]*?<\/context>/, "")
      .replace(/<think>[\s\S]*?<\/think>/, "")
      .trim();

    return { 
      context,
      thinking,
      answer
    };
  };

  const { context, thinking, answer } = parseContent(msg.response);

  return (
    <div className="message-container">
      <div className="user-query" style={{ border: '5px solid #fdb46a' }}>
        <strong>Query</strong>
        <p style={{ color: '#fff', fontSize: '1.1rem', textTransform: 'none', marginTop: '5px' }}>{msg.query}</p>
      </div>

      <div className="expandable-actions">
        {/* Toggle for Search Results */}
        {context && (
          <button onClick={() => setShowContext(!showContext)} className="btn-toggle">
            {showContext ? "📂 Hide Sources" : "🔍 View Sources"}
          </button>
        )}

        {/* Toggle for AI Thinking */}
        {thinking && (
          <button onClick={() => setIsExpanded(!isExpanded)} className="btn-toggle">
            {isExpanded ? "🔽 Hide Reasoning" : "🧠 View Reasoning"}
          </button>
        )}
      </div>

      {showContext && (
        <div className="source-box">
          <small>Raw snippets from DuckDuckGo:</small>
          <pre>{context}</pre>
        </div>
      )}

      {isExpanded && (
        <div className="thinking-box italic">
          {thinking}
        </div>
      )}

      {answer && (
        <div className="ai-answer">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkMath]} 
            rehypePlugins={[rehypeKatex]}
            components={{
                code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                    <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                    >
                    {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                ) : (
                    <code className={className} {...props}>
                    {children}
                    </code>
                );
                }
            }}
          >
            {answer}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;