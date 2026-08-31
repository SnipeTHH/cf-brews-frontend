import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, User, Sparkles, BookOpen, AlertTriangle, 
  Wrench, Search, Zap, Network, Terminal, Copy, Check, Loader2, RotateCcw
} from 'lucide-react';
import { fetchWithRetry } from '../apiUtils';

const generateUUID = () => crypto.randomUUID();

const parseFollowUpQuestions = (text) => {
  if (!text) return { cleanedText: '', questions: [] };
  const sections = text.split(/###\s*Follow-up\s*questions/i);
  if (sections.length < 2) return { cleanedText: text, questions: [] };

  const cleanedText = sections[0].trim();
  const rawQuestionsBlock = sections[1];

  const questions = [];
  const lines = rawQuestionsBlock.split('\n');
  for (let line of lines) {
    const match = line.match(/^\d+\.\s*(.*)$/);
    if (match) {
      questions.push(match[1].trim());
    }
  }

  return { cleanedText, questions };
};

const formatBoldText = (text) => {
  return text.split('**').map((part, i) => 
    i % 2 === 1 ? <strong key={i} className="text-indigo-300 font-bold">{part}</strong> : part
  );
};

const formatMessageText = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    if (line.trim().startsWith('###')) {
      const headerText = line.replace('###', '').trim();
      return (
        <h4 key={idx} className="text-xs font-bold text-white mt-4 mb-2 first:mt-0 font-sans border-b border-gray-750 pb-1">
          {formatBoldText(headerText)}
        </h4>
      );
    }
    if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
      const itemText = line.trim().substring(1).trim();
      return (
        <div key={idx} className="flex items-start space-x-2 my-1 pl-2 font-sans text-gray-300">
          <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
          <span className="flex-1">{formatBoldText(itemText)}</span>
        </div>
      );
    }
    return (
      <p key={idx} className="my-1 font-sans text-gray-250 leading-relaxed">
        {formatBoldText(line)}
      </p>
    );
  });
};

// Helper Component to render dynamic chart visualizations from Conversational Analytics
const MiniChart = ({ chartData }) => {
  if (!chartData) return null;

  let processedChart = chartData;

  // Check if it's a raw Vega-Lite spec from Google Cloud
  if (chartData.mark && chartData.encoding && chartData.data && chartData.data.values) {
    const markType = typeof chartData.mark === 'object' ? chartData.mark.type : chartData.mark;
    
    // Detect which axis is quantitative (numeric values) and which holds the labels (nominal/temporal)
    let valueField = '';
    let categoryField = '';
    let isTemporal = false;
    let valueAxisKey = 'y';
    
    const xType = chartData.encoding.x ? chartData.encoding.x.type : '';
    const yType = chartData.encoding.y ? chartData.encoding.y.type : '';

    if (xType === 'quantitative') {
      valueField = chartData.encoding.x.field;
      categoryField = chartData.encoding.y.field;
      isTemporal = (yType === 'temporal');
      valueAxisKey = 'x';
    } else {
      valueField = chartData.encoding.y.field;
      categoryField = chartData.encoding.x.field;
      isTemporal = (xType === 'temporal');
      valueAxisKey = 'y';
    }

    const labels = chartData.data.values.map(val => {
      const rawVal = val[categoryField];
      if (isTemporal && rawVal) {
        const d = new Date(rawVal);
        return isNaN(d.getTime()) ? rawVal : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return rawVal;
    });

    const datasetLabel = chartData.encoding[valueAxisKey].title || valueField;
    const dataValues = chartData.data.values.map(val => parseFloat(val[valueField]) || 0);

    processedChart = {
      type: markType,
      labels: labels,
      datasets: [
        {
          label: datasetLabel,
          data: dataValues
        }
      ]
    };
  }

  if (processedChart.type === 'bar') {
    const dataValues = processedChart.datasets[0].data;
    const maxVal = Math.max(...dataValues, 1);
    
    return (
      <div className="mt-4 p-4 rounded-lg bg-gray-900/40 border border-gray-750">
        <h5 className="text-xs font-semibold text-gray-455 mb-3 uppercase tracking-wider">
          {processedChart.datasets[0].label}
        </h5>
        <div className="space-y-3">
          {processedChart.labels.map((label, idx) => {
            const val = dataValues[idx];
            const pct = (val / maxVal) * 100;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-gray-300">{label}</span>
                  <span className="text-indigo-400 font-mono">{val}</span>
                </div>
                <div className="w-full bg-gray-805 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-550 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }  if (processedChart.type === 'line') {
    const dataValues = processedChart.datasets[0].data;
    const maxVal = Math.max(...dataValues, 1);
    const minVal = Math.min(...dataValues, 0);
    const range = maxVal - minVal || 1;

    const width = 500;
    const height = 150;
    const points = dataValues.map((val, idx) => {
      const x = (idx / (dataValues.length - 1)) * (width - 30) + 15;
      const y = height - ((val - minVal) / range) * (height - 30) - 15;
      return `${x},${y}`;
    }).join(' ');

    const hasManyPoints = dataValues.length > 15;

    return (
      <div className="mt-4 p-5 rounded-lg bg-gray-905/30 border border-gray-700/60 shadow-inner">
        <h5 className="text-[10px] font-bold text-gray-400 mb-4 uppercase tracking-wider font-sans border-b border-gray-750 pb-1.5 flex justify-between">
          <span>{processedChart.datasets[0].label}</span>
          <span className="text-indigo-400 font-mono">({dataValues.length} readings)</span>
        </h5>
        
        <div className="flex flex-col sm:flex-row items-stretch gap-6">
          <div className="flex-1 flex flex-col justify-between">
            <svg className="w-full h-auto max-h-[140px]" viewBox={`0 0 ${width} ${height}`}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(99, 102, 241, 0.25)" />
                  <stop offset="100%" stopColor="rgba(99, 102, 241, 0.0)" />
                </linearGradient>
              </defs>
              <path
                d={`M 15,${height - 15} L ${points} L ${width - 15},${height - 15} Z`}
                fill="url(#lineGrad)"
              />
              <polyline
                fill="none"
                stroke="rgba(129, 140, 248, 1)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
              {dataValues.map((val, idx) => {
                const x = (idx / (dataValues.length - 1)) * (width - 30) + 15;
                const y = height - ((val - minVal) / range) * (height - 30) - 15;
                const isLast = idx === dataValues.length - 1;
                
                if (hasManyPoints && !isLast) return null;
                
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r={isLast ? "5" : "3.5"}
                    fill={isLast ? "rgba(129, 140, 248, 1)" : "#fff"}
                    stroke="rgba(99, 102, 241, 1)"
                    strokeWidth={isLast ? "1.5" : "2"}
                  />
                );
              })}
            </svg>
            
            <div className="flex justify-between text-[10px] text-gray-400 mt-2 px-3 font-mono font-medium">
              <span>{processedChart.labels[0]}</span>
              {processedChart.labels.length > 2 && (
                <span>{processedChart.labels[Math.floor(processedChart.labels.length / 2)]}</span>
              )}
              <span>{processedChart.labels[processedChart.labels.length - 1]}</span>
            </div>
          </div>
          
          <div className="flex sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-2 px-4 py-3 bg-gray-900/40 border border-gray-800 rounded-lg min-w-[120px] shadow-sm">
            <div className="text-left sm:text-right">
              <span className="block text-[9px] text-gray-550 uppercase font-bold tracking-wider font-sans">Current Max</span>
              <span className="block text-xl font-extrabold text-indigo-400 font-mono leading-none mt-1">{maxVal}</span>
            </div>
            <div className="text-right sm:mt-2">
              <span className="block text-[9px] text-gray-550 uppercase font-bold tracking-wider font-sans">Current Min</span>
              <span className="block text-xl font-extrabold text-indigo-300/80 font-mono leading-none mt-1">{minVal}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

function BreweryAssistant({ apiStatus, activeTab, setActiveTab }) {
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text: "Hello! I'm BrewMaster AI. I can help you check batch risks, plan future brews based on inventory, or look up our standard operating procedures.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => generateUUID());
  const [copied, setCopied] = useState(false);

  // --- Native MCP Agent States ---
  const [mcpMessages, setMcpMessages] = useState([
    {
      from: 'bot',
      text: "Hello! I am the Native MCP Agent. I execute tools locally on the ColdFusion server using functions defined inside BrewMasterTools.cfc. Ask me about recipes, batch risk, or ingredient stock!",
    },
  ]);
  const [mcpInput, setMcpInput] = useState('');
  const [isMcpLoading, setIsMcpLoading] = useState(false);
  const [mcpTrace, setMcpTrace] = useState(null);
  const [copiedMcpCode, setCopiedMcpCode] = useState(false);

  // --- AlloyDB QueryData (NL-to-SQL) States ---
  const [opsMessages, setOpsMessages] = useState([
    {
      from: 'bot',
      text: "Hello! I am your Database Operations Assistant. You can ask me operational questions in plain English (e.g., 'Show me active batches' or 'Are there any temp readings above 74 degrees?'). I will translate your query into secure SQL and execute it against our secure database views.",
    },
  ]);
  const [opsInput, setOpsInput] = useState('');
  const [isOpsLoading, setIsOpsLoading] = useState(false);
  const [generatedSql, setGeneratedSql] = useState('');
  const [queryData, setQueryData] = useState([]);
  const [opsSummary, setOpsSummary] = useState('');
  const [opsError, setOpsError] = useState(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedPsvSql, setCopiedPsvSql] = useState(false);

  // --- Conversational Analytics (GCP Preview) States ---
  const [caMessages, setCaMessages] = useState([
    {
      from: 'bot',
      text: "Welcome to the AlloyDB Conversational Analytics Agent! I am a fully-managed GCP Data Agent. Unlike custom orchestrators, I run directly inside Google's secure cloud plane. You can ask me high-level operational questions, and I will execute queries, reason across your schemas, and synthesize visualizations automatically.",
    },
  ]);
  const [caInput, setCaInput] = useState('');
  const [isCaLoading, setIsCaLoading] = useState(false);
  const [caReasoning, setCaReasoning] = useState([]);
  const [caSql, setCaSql] = useState('');
  const [caData, setCaData] = useState([]);
  const [caChart, setCaChart] = useState(null);
  const [caNotice, setCaNotice] = useState('');
  const [caFollowUps, setCaFollowUps] = useState([]);
  const [copiedCaCode, setCopiedCaCode] = useState(false);
  
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  const resetBreweryChat = () => {
    setMessages([
      {
        from: 'bot',
        text: "Hello! I'm BrewMaster AI. I can help you check batch risks, plan future brews based on inventory, or look up our standard operating procedures.",
      },
    ]);
    setSessionId(generateUUID());
  };

  const resetOpsChat = () => {
    setOpsMessages([
      {
        from: 'bot',
        text: "Hello! I am your Database Operations Assistant. You can ask me operational questions in plain English (e.g., 'Show me active batches' or 'Are there any temp readings above 74 degrees?'). I will translate your query into secure SQL and execute it against our secure database views.",
      },
    ]);
    setGeneratedSql('');
    setQueryData([]);
    setOpsSummary('');
    setOpsError(null);
  };

  const resetMcpChat = () => {
    setMcpMessages([
      {
        from: 'bot',
        text: "Hello! I am the Native MCP Agent. I execute tools locally on the ColdFusion server using functions defined inside BrewMasterTools.cfc. Ask me about recipes, batch risk, or ingredient stock!",
      },
    ]);
    setMcpTrace(null);
  };

  const resetCaChat = () => {
    setCaMessages([
      {
        from: 'bot',
        text: "Welcome to the AlloyDB Conversational Analytics Agent! I am a fully-managed GCP Data Agent. Unlike custom orchestrators, I run directly inside Google's secure cloud plane. You can ask me high-level operational questions, and I will execute queries, reason across your schemas, and synthesize visualizations automatically.",
      },
    ]);
    setCaReasoning([]);
    setCaSql('');
    setCaData([]);
    setCaChart(null);
    setCaNotice('');
    setCaFollowUps([]);
  };

  useEffect(() => {
    if (messages.length > 1 && chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  useEffect(() => {
    if (mcpMessages.length > 1 && chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [mcpMessages]);

  // --- Prime the conversation on mount ---
  useEffect(() => {
      const primeAgent = async () => {
          try {
              await fetchWithRetry('/api/v1/agent/chat.cfm', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                      prompt: "hello", 
                      sessionId: sessionId 
                  }),
              });
              console.log("Agent session primed silently.");
          } catch (e) {
              console.warn("Failed to prime agent session", e);
          }
      };
      
      if (apiStatus === 'online') {
          primeAgent();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiStatus]);



  const handleSend = async (textToSend) => {
    const messageText = textToSend || input;
    if (!messageText.trim()) return;

    setMessages((prev) => [...prev, { from: 'user', text: messageText }]);
    setInput('');
    setIsLoading(true);

    try {
      const payload = { 
          prompt: messageText,
          sessionId: sessionId 
      };

      const data = await fetchWithRetry('/api/v1/agent/chat.cfm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (data.success) {
        setMessages((prev) => [...prev, { from: 'bot', text: data.text }]);
      } else {
        throw new Error(data.error || 'Agent failed to respond.');
      }
    } catch (e) {
      console.error("Agent Error:", e);
      setMessages((prev) => [...prev, { 
        from: 'bot', 
        text: "⚠️ **System Error:** I lost connection to the brewery network. Please try again later." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  const handleMcpSend = async (textToSend) => {
    const messageText = textToSend || mcpInput;
    if (!messageText.trim()) return;

    setMcpMessages((prev) => [...prev, { from: 'user', text: messageText }]);
    setMcpInput('');
    setIsMcpLoading(true);
    setMcpTrace(null);

    try {
      const payload = { prompt: messageText };
      const data = await fetchWithRetry('/api/v1/agent/mcp-chat.cfm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (data.success) {
        setMcpMessages((prev) => [...prev, { from: 'bot', text: data.text }]);
        if (data.tool_used) {
          setMcpTrace({
            tool: data.tool_used,
            arguments: data.tool_arguments,
            result: data.tool_result
          });
        }
      } else {
        throw new Error(data.error || 'Agent failed to respond.');
      }
    } catch (e) {
      console.error("MCP Agent Error:", e);
      setMcpMessages((prev) => [...prev, { 
        from: 'bot', 
        text: `⚠️ **Agent Error:** ${e.message}` 
      }]);
    } finally {
      setIsMcpLoading(false);
    }
  };

  const handleOpsSend = async (textToSend) => {
    const messageText = textToSend || opsInput;
    if (!messageText.trim()) return;

    setOpsMessages((prev) => [...prev, { from: 'user', text: messageText }]);
    setOpsInput('');
    setIsOpsLoading(true);
    setOpsError(null);
    setOpsSummary('');

    try {
      const payload = { prompt: messageText };
      const data = await fetchWithRetry('/api/v1/ops/natural-query.cfm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (data.success) {
        setGeneratedSql(data.query);
        setQueryData(data.data);
        setOpsSummary(data.summary || '');
        
        const isSecurityTest = messageText.toLowerCase().includes("brews.vatsensorreadings") || 
                              messageText.toLowerCase().includes("brews.batches") || 
                              messageText.toLowerCase().includes("brews.vats");
        
        let bubbleText = "";
        if (isSecurityTest) {
          bubbleText = `🔒 **Security Intercept:** For security and compliance reasons, your request for raw database tables was securely routed through a Parameterized Secure View (PSV), which limits the data to Vats 1 and 2 within your authorized scope.`;
        } else {
          bubbleText = `I successfully executed the query! Found **${data.data.length}** matching records in the database.`;
        }
        
        setOpsMessages((prev) => [...prev, { 
          from: 'bot', 
          text: bubbleText
        }]);
      } else {
        throw new Error(data.message || 'Query failed');
      }
    } catch (e) {
      console.error("QueryData Error:", e);
      const queryVal = (e.data && e.data.query) ? e.data.query : (e.message.includes("blocked") ? "BLOCKED" : "");
      setGeneratedSql(queryVal);
      setQueryData([]);
      setOpsSummary('');
      setOpsMessages((prev) => [...prev, { 
        from: 'bot', 
        text: `⚠️ **Access Denied:** ${e.message}`
      }]);
    } finally {
      setIsOpsLoading(false);
    }
  };

  const onOpsSubmit = (e) => {
    e.preventDefault();
    handleOpsSend();
  };

  const handleCaSend = async (textToSend) => {
    const messageText = textToSend || caInput;
    if (!messageText.trim()) return;

    setCaMessages((prev) => [...prev, { from: 'user', text: messageText }]);
    setCaInput('');
    setIsCaLoading(true);
    setCaNotice('');
    setCaReasoning([]);
    setCaSql('');
    setCaData([]);
    setCaChart(null);
    setCaFollowUps([]);
    try {
      const payload = { 
        prompt: messageText
      };
      
      const data = await fetchWithRetry('/api/v1/ops/query-data-agent.cfm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (data.success) {
        const parsed = parseFollowUpQuestions(data.answer);
        setCaMessages((prev) => [...prev, { 
          from: 'bot', 
          text: parsed.cleanedText,
          chart: data.chart_data || null 
        }]);
        setCaFollowUps(parsed.questions);
        setCaReasoning(data.reasoning_steps || []);
        setCaSql(data.query || '');
        setCaData(data.data || []);
        setCaChart(data.chart_data || null);
        if (data.message) {
          setCaNotice(data.message);
        }
      } else {
        throw new Error(data.message || 'Data Agent failed to respond.');
      }
    } catch (e) {
      console.error("Conversational Analytics Error:", e);
      setCaMessages((prev) => [...prev, { 
        from: 'bot', 
        text: `⚠️ **API Error:** ${e.message}` 
      }]);
    } finally {
      setIsCaLoading(false);
    }
  };

  const onCaSubmit = (e) => {
    e.preventDefault();
    handleCaSend();
  };

  // Helper Component to render dynamic SQL results dynamically
  const DynamicDataGrid = ({ data }) => {
    if (!data || data.length === 0) return null;
    
    const columns = Object.keys(data[0]);
    
    return (
      <div className="overflow-x-auto border border-gray-700 rounded-md max-h-[250px] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-950 sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  {col.replace('_', ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700 bg-gray-850">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-gray-750 transition-colors">
                {columns.map((col) => (
                  <td key={col} className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-300 font-mono">
                    {row[col] !== null ? String(row[col]) : 'NULL'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const copyAgentYaml = () => {
    const code = `paths:
  /api/v1/graph/recommendations.cfm:
    get:
      summary: Retrieves peer-based collaborative recommendations for a customer.
      operationId: getCustomerRecommendations
      parameters:
        - name: name
          in: query
          description: The name of the active taproom customer (e.g., Aaron, Bob).
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successfully retrieved graph network links.`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <h1 className="text-3xl font-bold text-white">BrewMaster AI Agent</h1>
      <p className="mt-1 text-gray-400">
        Your operational assistant that reasons across SQL data, IoT streams, and static documents.
      </p>

      {/* --- Sleek Tab Switcher --- */}
      <div className="border-b border-gray-800 mb-8 mt-4">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('chat')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
              activeTab === 'chat'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            🗣️ Conversational Agent (BrewMaster)
          </button>
          <button
            onClick={() => setActiveTab('mcp')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
              activeTab === 'mcp'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            🔗 Native Agent (CF Function-Calling)
          </button>
          <button
            onClick={() => setActiveTab('operations')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
              activeTab === 'operations'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            🗄️ Operations Assistant (NL-to-SQL)
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
              activeTab === 'analytics'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            🔮 Conversational Analytics (GCP Preview)
          </button>
        </nav>
      </div>

      {/* ========================================== */}
      {/* TAB 1: CONVERSATIONAL RECOMMENDATIONS      */}
      {/* ========================================== */}
      {activeTab === 'chat' && (
        <>
          {/* --- The Demo Box --- */}
          <div className="mt-4 rounded-md border-l-4 border-cyan-400 bg-cyan-900/30 p-5 shadow-lg mb-6">
            <h4 className="flex items-center font-bold text-cyan-300 mb-2">
               <Sparkles className="mr-2 h-5 w-5" />
               The Demo: Agentic Reasoning
            </h4>
            <p className="mt-2 text-sm text-cyan-100">
              This isn't just a chatbot. It's an <strong>Agent</strong> where <strong>ColdFusion serves as the cognitive orchestrator</strong>.
            </p>
            <ul className="mt-3 list-disc list-inside text-sm text-cyan-100 space-y-2 ml-2 leading-relaxed">
              <li><strong>Data Binding:</strong> ColdFusion fetches context from AlloyDB (SQL) and vector stores (RAG) <em>before</em> calling the LLM.</li>
              <li><strong>Tool Use:</strong> The agent can decide to run "Tools" (like checking live inventory), which are simply ColdFusion functions exposed to the model.</li>
              <li><strong>Seamless logic:</strong> It combines business logic (CFML) with generative reasoning (Gemini Enterprise Agent Platform).</li>
            </ul>
          </div>

          {/* --- ColdFusion Orchestration Differentiator (Full Width) --- */}
          <div className="rounded-lg bg-orange-950/20 border border-orange-900/30 p-5 shadow-md mt-4 mb-8">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">ColdFusion Orchestration Differentiator</span>
            <p className="text-sm text-gray-300 mt-2 leading-relaxed">
              ColdFusion acts as the complete cognitive "hands and eyes" of the GenAI model. By exposing secure database queries, real-time inventory calculators, and recipe retrieval tables inside standard, lightweight REST webhooks, the LLM can natively invoke these functions to resolve complex, multi-step operational problems in real-time.
            </p>
          </div>

          {/* --- Chat Interface (Full Width) --- */}
          <div className="flex flex-col overflow-hidden rounded-lg bg-gray-800 shadow border border-gray-700 h-[850px] w-full">
            <div className="bg-gray-900/50 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center">
                <Bot className="h-6 w-6 text-orange-500 mr-2" />
                <h3 className="text-md font-semibold text-white">Agent Chat Session</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={resetBreweryChat}
                  className="text-xs text-gray-400 hover:text-white bg-gray-900/50 hover:bg-gray-900 border border-gray-700 px-2.5 py-1.5 rounded transition-all flex items-center gap-1.5 font-medium"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Chat
                </button>
                {apiStatus === 'offline' && (
                  <span className="text-xs text-red-400 bg-red-900/50 px-2 py-1 rounded-full">Offline</span>
                )}
              </div>
            </div>

            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/30">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[80%] rounded-lg px-4 py-3 shadow ${msg.from === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                    <div className="mr-3 mt-1 flex-shrink-0">
                      {msg.from === 'bot' ? <Sparkles className="h-5 w-5 text-orange-400" /> : <User className="h-5 w-5 text-blue-200" />}
                    </div>
                    <div className="whitespace-pre-wrap text-sm font-medium">
                        {msg.text.split('**').map((part, i) => 
                            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                        )}
                    </div>
                  </div>
                </div>
              ))}

              {messages.length === 1 && (
                <div className="p-4 bg-orange-950/20 border border-orange-900/30 rounded-lg space-y-3 mt-4">
                  <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Suggested Starter Queries:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* === RISK ASSESSMENT === */}
                    <button 
                      onClick={() => handleSend("Give me a full health report on all active fermenters.")}
                      disabled={isLoading || apiStatus === 'offline'}
                      className="text-left p-3 rounded bg-gray-900/60 hover:bg-orange-950/30 border border-gray-700/60 hover:border-orange-500/50 transition-all font-sans disabled:opacity-50 flex items-start gap-3"
                    >
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="block text-xs text-orange-100 font-medium">Full health report on all fermenters</span>
                        <span className="block text-[10px] text-orange-300/60 mt-0.5">AlloyDB SQL Lateral Join</span>
                      </div>
                    </button>

                    <button 
                      onClick={() => handleSend("Are any active lager batches at risk right now?")}
                      disabled={isLoading || apiStatus === 'offline'}
                      className="text-left p-3 rounded bg-gray-900/60 hover:bg-orange-950/30 border border-gray-700/60 hover:border-orange-500/50 transition-all font-sans disabled:opacity-50 flex items-start gap-3"
                    >
                      <Sparkles className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="block text-xs text-orange-100 font-medium">Are any active lagers at risk?</span>
                        <span className="block text-[10px] text-orange-300/60 mt-0.5">Context-filtered SQL query</span>
                      </div>
                    </button>

                    {/* === INVENTORY === */}
                    <button 
                      onClick={() => handleSend("Can we brew 50 gallons of 'Hazy Nebula' next week?")}
                      disabled={isLoading || apiStatus === 'offline'}
                      className="text-left p-3 rounded bg-gray-900/60 hover:bg-orange-950/30 border border-gray-700/60 hover:border-orange-500/50 transition-all font-sans disabled:opacity-50 flex items-start gap-3"
                    >
                      <Bot className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="block text-xs text-blue-100 font-medium">Can we brew 50gal of 'Hazy Nebula'?</span>
                        <span className="block text-[10px] text-blue-300/60 mt-0.5">Multi-step SQL recipe matching</span>
                      </div>
                    </button>

                    <button 
                      onClick={() => handleSend("We need to brew 800 gallons of 'Citra Sunset IPA'. Do we have enough ingredients?")}
                      disabled={isLoading || apiStatus === 'offline'}
                      className="text-left p-3 rounded bg-gray-900/60 hover:bg-orange-950/30 border border-gray-700/60 hover:border-orange-500/50 transition-all font-sans disabled:opacity-50 flex items-start gap-3"
                    >
                      <Bot className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="block text-xs text-blue-100 font-medium">Can we brew 800gal of Citra Sunset?</span>
                        <span className="block text-[10px] text-blue-300/60 mt-0.5">Failure path ingredient check</span>
                      </div>
                    </button>

                    {/* === KNOWLEDGE === */}
                    <button 
                      onClick={() => handleSend("Vat 2 pressure is spiking above 15 PSI, what should I do?")}
                      disabled={isLoading || apiStatus === 'offline'}
                      className="text-left p-3 rounded bg-gray-900/60 hover:bg-orange-950/30 border border-gray-700/60 hover:border-orange-500/50 transition-all font-sans disabled:opacity-50 flex items-start gap-3"
                    >
                      <BookOpen className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="block text-xs text-green-100 font-medium">Vat 2 pressure is spiking!</span>
                        <span className="block text-[10px] text-green-300/60 mt-0.5">Semantic search of PDF SOPs</span>
                      </div>
                    </button>

                    <button 
                      onClick={() => handleSend("I'm getting Error E-41 on the glycol chiller, what should I do?")}
                      disabled={isLoading || apiStatus === 'offline'}
                      className="text-left p-3 rounded bg-gray-900/60 hover:bg-orange-950/30 border border-gray-700/60 hover:border-orange-500/50 transition-all font-sans disabled:opacity-50 flex items-start gap-3"
                    >
                      <Wrench className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="block text-xs text-green-100 font-medium">Glycol Chiller Error E-41?</span>
                        <span className="block text-[10px] text-green-300/60 mt-0.5">Lookup in technical manuals</span>
                      </div>
                    </button>

                    {/* === DISCOVERY === */}
                    <button 
                      onClick={() => handleSend("What's an IPA that isn't too bitter?")}
                      disabled={isLoading || apiStatus === 'offline'}
                      className="text-left p-3 rounded bg-gray-900/60 hover:bg-orange-950/30 border border-gray-700/60 hover:border-orange-500/50 transition-all font-sans disabled:opacity-50 flex items-start gap-3"
                    >
                      <Search className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="block text-xs text-purple-100 font-medium">IPA not too bitter?</span>
                        <span className="block text-[10px] text-purple-300/60 mt-0.5">Hybrid SQL + Vector Similarity</span>
                      </div>
                    </button>

                    <button 
                      onClick={() => handleSend("Show me something dark with strong chocolate notes.")}
                      disabled={isLoading || apiStatus === 'offline'}
                      className="text-left p-3 rounded bg-gray-900/60 hover:bg-orange-950/30 border border-gray-700/60 hover:border-orange-500/50 transition-all font-sans disabled:opacity-50 flex items-start gap-3"
                    >
                      <Zap className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="block text-xs text-purple-100 font-medium">Dark with chocolate notes?</span>
                        <span className="block text-[10px] text-purple-300/60 mt-0.5">Pure semantic description search</span>
                      </div>
                    </button>

                    {/* === RELATIONSHIPS === */}
                    <button 
                      onClick={() => handleSend("My friend Bob is in the taproom, what beers should I recommend he try next?")}
                      disabled={isLoading || apiStatus === 'offline'}
                      className="text-left p-3 rounded bg-gray-900/60 hover:bg-orange-950/30 border border-gray-700/60 hover:border-orange-500/50 transition-all font-sans disabled:opacity-50 flex items-start gap-3"
                    >
                      <Network className="h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="block text-xs text-pink-100 font-medium">Bob is here, what to recommend?</span>
                        <span className="block text-[10px] text-pink-300/60 mt-0.5">Property graph recommendation</span>
                      </div>
                    </button>

                    <button 
                      onClick={() => handleSend("Aaron left a negative review about flat beer. Does this tie to any fermentation vat anomalies?")}
                      disabled={isLoading || apiStatus === 'offline'}
                      className="text-left p-3 rounded bg-gray-900/60 hover:bg-orange-950/30 border border-gray-700/60 hover:border-orange-500/50 transition-all font-sans disabled:opacity-50 flex items-start gap-3"
                    >
                      <Network className="h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="block text-xs text-pink-100 font-medium">Flat beer review anomaly check</span>
                        <span className="block text-[10px] text-pink-300/60 mt-0.5">Cross-check feedback with IoT logs</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {isLoading && (
                 <div className="flex justify-start">
                   <div className="bg-gray-700 text-gray-400 rounded-lg px-4 py-2 text-sm flex items-center">
                      <Bot className="h-4 w-4 mr-2 animate-pulse" />
                      Thinking...
                   </div>
                 </div>
              )}
            </div>

            <form onSubmit={onSubmit} className="bg-gray-800 p-4 border-t border-gray-700">
              <div className="flex items-center space-x-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={apiStatus === 'offline' ? "Agent is offline..." : "Ask BrewMaster AI..."}
                  disabled={isLoading || apiStatus === 'offline'}
                  className="flex-1 rounded-md border border-gray-600 bg-gray-900 px-4 py-2 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim() || apiStatus === 'offline'}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-600 text-white hover:bg-orange-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>

          {/* --- Educational Section Box (The "Demo Pattern") --- */}
          <div className="mt-8 rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-6">
              <Terminal className="h-6 w-6 text-purple-500" />
              <div>
                <h3 className="text-xl font-bold text-white">Educational Sandbox: GenAI Agent Tool-Use & Function Calling</h3>
                <p className="text-sm text-gray-400">Analyzing how conversational LLMs dynamically trigger ColdFusion APIs to inspect live databases and execute business logic.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Comparison Box */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Static LLMs vs. ColdFusion-Powered Agents</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Standard LLM setups can only answer general questions statically based on historical training data. To solve real-world operational tasks, we must equip the agent with "Tools" (APIs) so that it can interact with live systems dynamically.
                </p>
                
                <div className="space-y-3">
                  <div className="rounded bg-gray-950 p-3 border border-red-950/30">
                    <span className="text-[10px] font-bold text-red-400 uppercase block">Static Conversational LLM</span>
                    <p className="text-[10px] text-gray-500 leading-normal">
                      User: "Do we have enough inventory to brew Citra Sunset IPA?"<br/>
                      AI: "I cannot access live systems or query your database. I recommend checking with your warehouse manager."
                    </p>
                  </div>

                  <div className="rounded bg-gray-950 p-3 border border-green-950/30">
                    <span className="text-[10px] font-bold text-green-400 uppercase block">Agentic Tool-Use (Powered by ColdFusion APIs)</span>
                    <p className="text-[10px] text-gray-400 leading-normal">
                      User: "Do we have enough inventory to brew Citra Sunset IPA?"<br/>
                      AI: *LLM identifies tool intent, triggers `checkInventoryForBrew` tool. ColdFusion API executes standard SQL math. LLM compiles contextual response:*<br/>
                      AI: "Yes! We have enough Citra Hops and 2-Row Malt. You are good to brew!"
                    </p>
                  </div>
                </div>
              </div>

              {/* Code Display Panel */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between bg-gray-950 px-4 py-2 rounded-t border-t border-x border-gray-800">
                  <span className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-purple-400" />
                    OpenAPI Tool Schema (YAML)
                  </span>
                  <button
                    onClick={copyAgentYaml}
                    className="text-gray-400 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-400" />
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Schema</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-gray-950 border border-gray-800 rounded-b p-4 flex-1 overflow-x-auto font-mono text-xs text-gray-300 leading-relaxed">
                  <pre>{`paths:
  /api/v1/graph/recommendations.cfm:
    get:
      summary: Retrieves peer-based collaborative recommendations for a customer.
      operationId: getCustomerRecommendations
      parameters:
        - name: name
          in: query
          description: The name of the active taproom customer (e.g., Aaron, Bob).
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successfully retrieved graph network links.`}</pre>
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {/* ========================================== */}
      {/* TAB 3: NATIVE MCP AGENT WITH LOCAL TOOLS   */}
      {/* ========================================== */}
      {activeTab === 'mcp' && (
        <>
          {/* --- The Demo Box --- */}
          <div className="mt-4 rounded-md border-l-4 border-blue-400 bg-blue-900/30 p-5 shadow-lg mb-6">
            <h4 className="flex items-center font-bold text-blue-300 mb-2">
               <Sparkles className="mr-2 h-5 w-5" />
               The Demo: Native Tool-Use & Function Calling (MCP Server)
            </h4>
            <p className="mt-2 text-sm text-blue-100 leading-relaxed">
              This tab showcases how <strong>ColdFusion acts natively as a Model Context Protocol (MCP) server</strong>. Instead of routing requests through complex web proxies, OpenAPI schemas, and Dialogflow CX, MCP allows you to expose CFML functions directly as tools to any compatible LLM client.
            </p>
            <ul className="mt-3 list-disc list-inside text-sm text-blue-100 space-y-2 ml-2 leading-relaxed">
              <li><strong>Local Execution:</strong> Instead of configuring web hooks, the LLM tells your code to run a function. The function is executed locally inside ColdFusion.</li>
              <li><strong>Function Annotations:</strong> ColdFusion's CFC methods are annotated with <code>@tool</code>, <code>@name</code>, and <code>@description</code>. ColdFusion compiles these automatically into Model Context Protocol schemas.</li>
              <li><strong>Zero Middleware:</strong> Eliminates the need for external web APIs or OpenAPI configurations.</li>
            </ul>
          </div>

          {/* --- Chat Interface (Full Width) --- */}
          <div className="flex flex-col overflow-hidden rounded-lg bg-gray-800 shadow border border-gray-700 h-[600px] w-full">
            <div className="bg-gray-900/50 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center">
                <Bot className="h-6 w-6 text-blue-500 mr-2" />
                <h3 className="text-md font-semibold text-white">Native MCP Agent Chat</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={resetMcpChat}
                  className="text-xs text-gray-400 hover:text-white bg-gray-900/50 hover:bg-gray-900 border border-gray-700 px-2.5 py-1.5 rounded transition-all flex items-center gap-1.5 font-medium"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Chat
                </button>
                {apiStatus === 'offline' && (
                  <span className="text-xs text-red-400 bg-red-900/50 px-2 py-1 rounded-full">Offline</span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/30">
              {mcpMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[80%] rounded-lg px-4 py-3 shadow ${msg.from === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                    <div className="mr-3 mt-1 flex-shrink-0">
                      {msg.from === 'bot' ? <Sparkles className="h-5 w-5 text-blue-400" /> : <User className="h-5 w-5 text-blue-200" />}
                    </div>
                    <div className="whitespace-pre-wrap text-sm font-medium font-sans">
                        {msg.text.split('**').map((part, i) => 
                            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                        )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isMcpLoading && (
                 <div className="flex justify-start">
                   <div className="bg-gray-700 text-gray-400 rounded-lg px-4 py-2 text-sm flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-500" />
                      Determining tool routing and executing CF function...
                   </div>
                 </div>
              )}

              {!isMcpLoading && (
                <div className="p-4 bg-blue-950/20 border border-blue-900/30 rounded-lg space-y-3 mt-4">
                  <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Suggested Starter Queries:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <button 
                      onClick={() => handleMcpSend("Do we have enough inventory to brew 80 gallons of Citra Sunset IPA?")}
                      disabled={isMcpLoading || apiStatus === 'offline'}
                      className="text-left p-3 rounded bg-gray-900/60 hover:bg-blue-950/30 border border-gray-700/60 hover:border-blue-500/50 transition-all font-sans disabled:opacity-50 flex flex-col justify-between"
                    >
                      <span className="block text-xs text-gray-200 font-medium">"Can we brew 80gal of Citra Sunset IPA?"</span>
                      <span className="block text-[10px] text-blue-300/60 mt-1 font-mono">Triggers: checkInventory</span>
                    </button>
                    <button 
                      onClick={() => handleMcpSend("What are the target vitals and style of American Stout?")}
                      disabled={isMcpLoading || apiStatus === 'offline'}
                      className="text-left p-3 rounded bg-gray-900/60 hover:bg-blue-955/30 border border-gray-700/60 hover:border-blue-500/50 transition-all font-sans disabled:opacity-50 flex flex-col justify-between"
                    >
                      <span className="block text-xs text-gray-200 font-medium">"Recipe vitals for American Stout"</span>
                      <span className="block text-[10px] text-blue-300/60 mt-1 font-mono">Triggers: getRecipeDetails</span>
                    </button>
                    <button 
                      onClick={() => handleMcpSend("Are there any fermentation vats currently experiencing parameter warnings?")}
                      disabled={isMcpLoading || apiStatus === 'offline'}
                      className="text-left p-3 rounded bg-gray-900/60 hover:bg-blue-955/30 border border-gray-700/60 hover:border-blue-500/50 transition-all font-sans disabled:opacity-50 flex flex-col justify-between"
                    >
                      <span className="block text-xs text-gray-200 font-medium">"Check active fermentation vat warnings"</span>
                      <span className="block text-[10px] text-blue-300/60 mt-1 font-mono">Triggers: checkBatchRisk</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleMcpSend(); }} className="bg-gray-800 p-4 border-t border-gray-700">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={mcpInput}
                  onChange={(e) => setMcpInput(e.target.value)}
                  placeholder={apiStatus === 'offline' ? "Agent is offline..." : "Ask the native assistant (e.g. 'Can we brew 50gal of Citra Sunset IPA?')..."}
                  disabled={isMcpLoading || apiStatus === 'offline'}
                  className="flex-1 rounded-md border border-gray-600 bg-gray-900 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isMcpLoading || !mcpInput.trim() || apiStatus === 'offline'}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>

          {/* REAL-TIME TRACE */}
          {mcpTrace && (
            <div className="mt-8 rounded-lg bg-gray-800 p-5 shadow border border-gray-700 w-full">
              <h4 className="text-md font-semibold text-white mb-4 flex items-center">
                <Terminal className="h-4 w-4 mr-2 text-blue-400" />
                Local Tool Invocation Log (MCP Native Trace)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
                <div className="bg-gray-950 p-4 rounded border border-gray-750">
                  <span className="text-blue-400 block font-bold mb-2">Function Called</span>
                  <span className="text-white font-mono text-xs">{mcpTrace.tool}()</span>
                </div>
                <div className="bg-gray-955 p-4 rounded border border-gray-750">
                  <span className="text-blue-400 block font-bold mb-2">Arguments Passed</span>
                  <pre className="text-white overflow-x-auto whitespace-pre-wrap leading-relaxed">{JSON.stringify(mcpTrace.arguments, null, 2)}</pre>
                </div>
                <div className="bg-gray-955 p-4 rounded border border-gray-750">
                  <span className="text-blue-400 block font-bold mb-2">Tool Execution Result</span>
                  <pre className="text-white overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[250px] overflow-y-auto">{JSON.stringify(mcpTrace.result, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}

          {/* EDUCATIONAL BOX FOR MCP */}
          <div className="mt-8 rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-6">
              <Terminal className="h-6 w-6 text-blue-500" />
              <div>
                <h3 className="text-xl font-bold text-white">Educational Sandbox: Native MCP Tool Routing</h3>
                <p className="text-sm text-gray-400">Exposing ColdFusion annotated component functions directly to GenAI clients for secure local execution.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Explanation of loop */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide">ColdFusion Agentic Tool Execution Loop</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Under the Model Context Protocol (MCP), tool schema exchange and tool execution are decoupled from web infrastructure. When an LLM client runs locally, it executes the tool by calling your local script functions directly.
                </p>
                <div className="rounded bg-gray-950 p-4 border border-blue-950/30 text-xs font-mono space-y-2 text-gray-400">
                  <div className="text-blue-400">1. LLM Client Request:</div>
                  <div>"Do we have enough inventory to brew 80gal of Citra Sunset?"</div>
                  <div className="text-blue-400">2. Model Decides Tool:</div>
                  <div>Output: {"{ \"tool\": \"checkInventory\", \"arguments\": { \"recipeName\": \"Citra Sunset IPA\", \"volumeGallons\": 80 } }"}</div>
                  <div className="text-blue-400">3. CF Local Call:</div>
                  <div>new api.v1.tools.BrewMasterTools().checkInventory("Citra Sunset IPA", 80)</div>
                  <div className="text-blue-400">4. Final Answer:</div>
                  <div>"No, we are missing 14 lbs of Citra Hops..."</div>
                </div>
              </div>

              {/* Code Panel */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between bg-gray-950 px-4 py-2 rounded-t border-t border-x border-gray-800">
                  <span className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-blue-400" />
                    CF Agent Orchestrator (mcp-chat.cfm)
                  </span>
                  <button
                    onClick={() => {
                      const code = `// Retrieve tools and execute locally\ntools = new api.v1.tools.BrewMasterTools();\nif (toolCall.tool == "checkInventory") {\n    response = tools.checkInventory(arguments.recipeName, arguments.volumeGallons);\n}`;
                      navigator.clipboard.writeText(code);
                      setCopiedMcpCode(true);
                      setTimeout(() => setCopiedMcpCode(false), 2000);
                    }}
                    className="text-gray-400 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
                  >
                    {copiedMcpCode ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-400" />
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-gray-950 border border-gray-800 rounded-b p-4 flex-1 overflow-x-auto font-mono text-xs text-gray-300 leading-relaxed max-h-[300px] overflow-y-auto">
                  <pre>{`// 1. Send system instruction describing tools
chatModel.chat("You have access to tools... Respond in JSON format: { \\"tool\\": ... }");

// 2. If Gemini requests tool execution, invoke locally
tools = new api.v1.tools.BrewMasterTools();
if (toolCall.tool == "checkInventory") {
    toolResult = tools.checkInventory(toolCall.arguments.recipeName, toolCall.arguments.volumeGallons);
}

// 3. Synthesize final response with results
chatModel.chat("The tool returned: " + serializeJson(toolResult) + ". Answer: " + userPrompt);`}</pre>
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {/* ========================================== */}
      {/* TAB 2: OPERATIONS ASSISTANT (NL-TO-SQL)   */}
      {/* ========================================== */}
      {activeTab === 'operations' && (
        <>
          {/* --- The Demo Box --- */}
          <div className="mt-4 rounded-md border-l-4 border-cyan-400 bg-cyan-900/30 p-5 shadow-lg mb-6">
            <h4 className="flex items-center font-bold text-cyan-300 mb-2">
               <Sparkles className="mr-2 h-5 w-5" />
               The Demo: Natural Language to SQL (QueryData)
            </h4>
            <p className="mt-2 text-sm text-cyan-100">
              This tab demonstrates <strong>conversational data access</strong> where users ask questions in plain English and <strong>AlloyDB translates them securely to SQL</strong>.
            </p>
            <ul className="mt-3 list-disc list-inside text-sm text-cyan-100 space-y-2 ml-2 leading-relaxed">
              <li><strong>Security-First:</strong> AlloyDB secures data boundaries natively using <strong>Parameterized Secure Views (PSVs)</strong>. Generated queries only see authorized records.</li>
              <li><strong>In-Database Logic:</strong> The SQL translation query calling Gemini runs directly inside the SQL layer via `google_ml.predict_row`.</li>
              <li><strong>No Middleware:</strong> Bypasses complex ORM layers and Python ML chains. ColdFusion handles it securely using standard query blocks.</li>
              <li><strong>Conversational Synthesis:</strong> Uses ColdFusion 2025's native <code>ChatModel</code> function to translate tabular database results back into plain-English operator feedback.</li>
            </ul>
          </div>

          {/* --- ColdFusion Orchestration & AI Differentiator (Full Width) --- */}
          <div className="rounded-lg bg-orange-950/20 border border-orange-900/30 p-5 shadow-md mt-4 mb-8 space-y-4">
            <div>
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">ColdFusion Orchestration (Securing Dynamic AI SQL)</span>
              <p className="text-sm text-gray-300 mt-1 leading-relaxed">
                Because the AI generates the entire SQL query structure (columns, tables, filters) dynamically, standard value-level parameters like {"<cfqueryparam>"} cannot be used. ColdFusion solves this security challenge by acting as a secure gateway: it performs instant regex keyword scanning to block destructive commands (like DROP or DELETE) and restricts the query's execution scope exclusively to AlloyDB's Parameterized Secure Views (PSVs), providing a rock-solid, multi-layered security model for conversational data access.
              </p>
            </div>
            
            <div className="border-t border-orange-900/30 pt-3">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">ColdFusion AI Capabilities (Conversational Insights Synthesis)</span>
              <p className="text-sm text-gray-300 mt-1 leading-relaxed">
                Raw database rows can be difficult for operators to digest in a chat space. CF-Brews leverages ColdFusion 2025's native <code>ChatModel</code> function (calling Gemini) to parse the JSON results returned by AlloyDB and synthesize them into natural, context-aware business summaries, keeping the chat interface clean and human-friendly.
              </p>
            </div>
          </div>

          {/* --- Chat Interface (Full Width) --- */}
          <div className="flex flex-col overflow-hidden rounded-lg bg-gray-800 shadow border border-gray-700 h-[600px] w-full">
            <div className="bg-gray-900/50 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center">
                <Bot className="h-6 w-6 text-purple-500 mr-2" />
                <h3 className="text-md font-semibold text-white">Operations Database Query Agent</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={resetOpsChat}
                  className="text-xs text-gray-400 hover:text-white bg-gray-900/50 hover:bg-gray-900 border border-gray-700 px-2.5 py-1.5 rounded transition-all flex items-center gap-1.5 font-medium"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Chat
                </button>
                {apiStatus === 'offline' && (
                  <span className="text-xs text-red-400 bg-red-900/50 px-2 py-1 rounded-full">Offline</span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/30">
              {opsMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[80%] rounded-lg px-4 py-3 shadow ${msg.from === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                    <div className="mr-3 mt-1 flex-shrink-0">
                      {msg.from === 'bot' ? <Sparkles className="h-5 w-5 text-purple-400" /> : <User className="h-5 w-5 text-blue-200" />}
                    </div>
                    <div className="whitespace-pre-wrap text-sm font-medium">
                        {msg.text.split('**').map((part, i) => 
                            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                        )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isOpsLoading && (
                 <div className="flex justify-start">
                   <div className="bg-gray-700 text-gray-400 rounded-lg px-4 py-2 text-sm flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin text-purple-500" />
                      Generating and executing secure SQL...
                   </div>
                 </div>
              )}

              {!isOpsLoading && (
                <div className="p-4 bg-purple-950/20 border border-purple-900/30 rounded-lg space-y-3 mt-4">
                  <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Suggested Starter Queries:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <button 
                      onClick={() => handleOpsSend("Show me all active batches and their styles")}
                      disabled={isOpsLoading || apiStatus === 'offline'}
                      className="text-left p-3 rounded bg-gray-900/60 hover:bg-purple-950/30 border border-gray-700/60 hover:border-purple-500/50 transition-all text-xs text-gray-200 hover:text-white font-sans disabled:opacity-50"
                    >
                      "Show me active batches and styles"
                    </button>
                    <button 
                      onClick={() => handleOpsSend("Are there any sensor readings with temp above 69 degrees?")}
                      disabled={isOpsLoading || apiStatus === 'offline'}
                      className="text-left p-3 rounded bg-gray-900/60 hover:bg-purple-950/30 border border-gray-700/60 hover:border-purple-500/50 transition-all text-xs text-gray-200 hover:text-white font-sans disabled:opacity-50"
                    >
                      "Check temperature levels (>69 °F)"
                    </button>
                    <button 
                      onClick={() => handleOpsSend("Show me all records from brews.vatsensorreadings")}
                      disabled={isOpsLoading || apiStatus === 'offline'}
                      className="text-left p-3 rounded bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 hover:border-red-500/50 transition-all font-sans disabled:opacity-50 flex flex-col justify-between"
                    >
                      <span className="font-semibold text-red-400 hover:text-red-300 font-sans">"Query raw tables" (Security Test)</span>
                      <span className="text-[10px] text-red-400/80 mt-1 leading-normal font-sans font-normal">
                        Demonstrates how AlloyDB automatically intercepts queries to raw tables and rewrites them to use secure views (PSVs).
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={onOpsSubmit} className="bg-gray-800 p-4 border-t border-gray-700">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={opsInput}
                  onChange={(e) => setOpsInput(e.target.value)}
                  placeholder={apiStatus === 'offline' ? "Ask for live data (e.g. 'Show me active batches')..." : "Ask for live data (e.g. 'Show me active batches')..."}
                  disabled={isOpsLoading || apiStatus === 'offline'}
                  className="flex-1 rounded-md border border-gray-600 bg-gray-900 px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isOpsLoading || !opsInput.trim() || apiStatus === 'offline'}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>

          {opsSummary && (
            <div className="rounded-lg bg-blue-950/20 border border-blue-900/30 p-5 shadow-md border-l-4 border-l-blue-400 mt-6">
              <h4 className="text-md font-semibold text-blue-300 mb-3 flex items-center gap-2 font-sans">
                <Sparkles className="h-5 w-5 text-blue-400" />
                AI Operations Summary
              </h4>
              <p className="text-sm text-blue-100 leading-relaxed font-sans font-medium">
                {opsSummary}
              </p>
            </div>
          )}

          {/* --- Generated SQL & Dynamic Grid Panel --- */}
          {(generatedSql || queryData.length > 0) && (
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left 1 Column: Generated SQL */}
              <div className="lg:col-span-1 flex flex-col rounded-lg bg-gray-800 p-5 shadow border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-semibold text-white">Generated Database SQL</h3>
                  {generatedSql && !generatedSql.includes("denied") && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedSql);
                        setCopiedSql(true);
                        setTimeout(() => setCopiedSql(false), 2000);
                      }}
                      className="text-gray-400 hover:text-white text-xs flex items-center gap-1"
                    >
                      {copiedSql ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                      <span className={copiedSql ? 'text-green-400' : ''}>{copiedSql ? 'Copied!' : 'Copy'}</span>
                    </button>
                  )}
                </div>
                <div className="bg-gray-950 border border-gray-700 rounded p-4 flex-1 font-mono text-xs text-green-300 break-all overflow-x-auto leading-relaxed max-h-[250px] overflow-y-auto">
                  {generatedSql}
                </div>
              </div>

              {/* Right 2 Columns: Dynamic Grid Table */}
              <div className="lg:col-span-2 flex flex-col rounded-lg bg-gray-800 p-5 shadow border border-gray-700">
                <h3 className="text-md font-semibold text-white mb-4">Real-time Query Results</h3>
                {queryData.length > 0 ? (
                  <DynamicDataGrid data={queryData} />
                ) : (
                  <div className="flex-1 flex items-center justify-center p-12 border border-dashed border-gray-700 rounded text-center">
                    <p className="text-sm text-gray-500">No active query data to display. Ask the operations agent a query above.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- Educational Sandbox: QueryData Security (PSVs) --- */}
          <div className="mt-8 rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-6">
              <Terminal className="h-6 w-6 text-purple-500" />
              <div>
                <h3 className="text-xl font-bold text-white">Educational Sandbox: Parameterized Secure Views (PSVs)</h3>
                <p className="text-sm text-gray-400">Restricting generative SQL queries natively inside PostgreSQL to enforce strict data compliance boundaries.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Comparison Box */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide">App-Layer Security vs. AlloyDB Native PSVs</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  When AI models dynamically compile and run SQL, enforcing user role restrictions in your app middleware is highly error-prone. AlloyDB native PSVs solve this by evaluating security parameters (like `CURRENT_USER` or session contexts) directly inside the view definition at the database kernel level.
                </p>
                
                <div className="space-y-3">
                  <div className="rounded bg-gray-950 p-3 border border-red-950/30">
                    <span className="text-[10px] font-bold text-red-400 uppercase block">Vulnerable Dynamic SQL Agent</span>
                    <p className="text-[10px] text-gray-500 leading-normal">
                      1. AI generates: SELECT * FROM sensorreadings;<br/>
                      2. regular app user executes it directly.<br/>
                      3. **Data Leak**: User gains visibility into restricted sensor logs across all vats, violating tenant boundaries.
                    </p>
                  </div>

                  <div className="rounded bg-gray-950 p-3 border border-green-950/30">
                    <span className="text-[10px] font-bold text-green-400 uppercase block">AlloyDB Secure PSV-Routed Agent</span>
                    <p className="text-[10px] text-gray-400 leading-normal">
                      {"-- AI generates query targeting: secure_vatsensorreadings "}<br/>
                      {"-- View restricts columns and rows dynamically inside SQL "}<br/>
                      {"-- regular user query is securely scoped to Vat A & B only."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Code Display Panel */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between bg-gray-950 px-4 py-2 rounded-t border-t border-x border-gray-800">
                  <span className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-purple-400" />
                    AlloyDB Secure View DDL (SQL)
                  </span>
                  <button
                    onClick={() => {
                      const code = `CREATE OR REPLACE VIEW brews.secure_vatsensorreadings AS\nSELECT r.*\nFROM brews.vatsensorreadings r\nJOIN brews.vats v ON r.vat_id = v.vat_id\nWHERE CURRENT_USER = 'postgres'\n   OR v.name IN ('Vat A', 'Vat B');`;
                      navigator.clipboard.writeText(code);
                      setCopiedPsvSql(true);
                      setTimeout(() => setCopiedPsvSql(false), 2000);
                    }}
                    className="text-gray-400 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
                  >
                    {copiedPsvSql ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-400" />
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy DDL</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-gray-950 border border-gray-800 rounded-b p-4 flex-1 overflow-x-auto font-mono text-xs text-gray-300 leading-relaxed">
                  <pre>{`CREATE OR REPLACE VIEW brews.secure_vatsensorreadings AS
SELECT r.* 
FROM brews.vatsensorreadings r
JOIN brews.vats v ON r.vat_id = v.vat_id
WHERE CURRENT_USER = 'postgres' 
   OR v.name IN ('Vat A', 'Vat B');`}</pre>
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {/* ========================================== */}
      {/* TAB 4: CONVERSATIONAL ANALYTICS (GCP PREVIEW) */}
      {/* ========================================== */}
      {activeTab === 'analytics' && (
        <>
          {/* --- GCP Preview Feature Spotlight Banner --- */}
          <div className="mt-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-blue-900/20 to-gray-900 border border-blue-500/30 p-6 shadow-2xl mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="h-40 w-40 text-blue-400" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div>
                <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300 ring-1 ring-inset ring-blue-500/30 mb-3">
                  Google Cloud Preview Feature Spotlight
                </span>
                <h4 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-blue-400" />
                  AlloyDB Conversational Analytics
                </h4>
                <p className="text-sm text-blue-100 max-w-3xl leading-relaxed font-sans font-medium">
                  Chat with your operational database in plain natural language. This preview capability utilizes Google's managed <strong>Conversational Analytics API</strong> to automatically build a stateful data agent that reasons across your schemas, runs queries safely, and renders charts without complex app-layer middleware.
                </p>
              </div>
            </div>
          </div>

          {caNotice && (
            <div className="mb-6 rounded-md border-l-4 border-yellow-400 bg-yellow-905/20 p-4 text-xs text-yellow-300 font-sans">
              {caNotice}
            </div>
          )}

          {/* --- Chat Interface (Full Width) --- */}
          <div className="flex flex-col overflow-hidden rounded-lg bg-gray-800 shadow border border-gray-700 h-[650px] w-full">
              <div className="bg-gray-900/50 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center">
                  <Bot className="h-6 w-6 text-indigo-400 mr-2" />
                  <h3 className="text-md font-semibold text-white">Conversational Data Agent</h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={resetCaChat}
                    className="text-xs text-gray-400 hover:text-white bg-gray-900/50 hover:bg-gray-900 border border-gray-700 px-2.5 py-1.5 rounded transition-all flex items-center gap-1.5 font-medium"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset Chat
                  </button>
                  <span className="text-xs text-indigo-300 bg-indigo-950/50 border border-indigo-900/30 px-2 py-0.5 rounded font-semibold">
                    ☁️ GCP Live Connection
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/30">
                {caMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex flex-col max-w-[85%] rounded-lg px-4 py-3 shadow ${msg.from === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                      <div className="flex items-start">
                        <div className="mr-3 mt-1 flex-shrink-0">
                          {msg.from === 'bot' ? <Sparkles className="h-5 w-5 text-indigo-400" /> : <User className="h-5 w-5 text-indigo-200" />}
                        </div>
                        <div className="whitespace-pre-wrap text-sm font-medium font-sans flex-1">
                          {formatMessageText(msg.text)}
                        </div>
                      </div>
                      
                      {msg.chart && (
                        <div className="mt-3 border-t border-gray-600/50 pt-3">
                          <MiniChart chartData={msg.chart} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {caMessages.length === 1 && (
                  <div className="p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-lg space-y-3 mt-4">
                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Suggested Starter Queries:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button 
                        onClick={() => handleCaSend("Show me all active batches and their styles")}
                        disabled={isCaLoading}
                        className="text-left p-3 rounded bg-gray-900/60 hover:bg-indigo-950/30 border border-gray-700/60 hover:border-indigo-500/50 transition-all text-[11px] text-gray-300 hover:text-white font-sans disabled:opacity-50"
                      >
                        "Show me active batches and styles"
                      </button>
                      <button 
                        onClick={() => handleCaSend("Can you make a line chart of temperature over time for Batch 1?")}
                        disabled={isCaLoading}
                        className="text-left p-3 rounded bg-gray-900/60 hover:bg-indigo-950/30 border border-gray-700/60 hover:border-indigo-500/50 transition-all text-[11px] text-gray-300 hover:text-white font-sans disabled:opacity-50"
                      >
                        "Chart temperature levels over time for Batch 1"
                      </button>
                      <button 
                        onClick={() => handleCaSend("Can we brew 50 gallons of 'Hazy Nebula' next week?")}
                        disabled={isCaLoading}
                        className="text-left p-3 rounded bg-gray-900/60 hover:bg-indigo-950/30 border border-gray-700/60 hover:border-indigo-500/50 transition-all text-[11px] text-gray-300 hover:text-white font-sans disabled:opacity-50"
                      >
                        "Can we brew 50gal of 'Hazy Nebula'?"
                      </button>
                      <button 
                        onClick={() => handleCaSend("Vat 2 pressure is spiking above 15 PSI, what should I do?")}
                        disabled={isCaLoading}
                        className="text-left p-3 rounded bg-gray-900/60 hover:bg-indigo-950/30 border border-gray-700/60 hover:border-indigo-500/50 transition-all text-[11px] text-gray-300 hover:text-white font-sans disabled:opacity-50"
                      >
                        "Vat 2 pressure spike recovery"
                      </button>
                    </div>
                  </div>
                )}

                {isCaLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 text-gray-450 rounded-lg px-4 py-3 text-sm flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin text-indigo-400" />
                      GCP Conversational Analytics agent is reasoning across AlloyDB schema...
                    </div>
                  </div>
                )}
              </div>

              {caFollowUps.length > 0 && (
                <div className="px-4 py-3 bg-gray-900/60 border-t border-gray-800/40 flex flex-wrap gap-2">
                  <div className="w-full text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 font-sans">Suggested Follow-ups:</div>
                  {caFollowUps.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleCaSend(q)}
                      disabled={isCaLoading}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-indigo-950/40 border border-gray-700 hover:border-indigo-505/50 text-gray-300 hover:text-indigo-200 rounded-full text-xs font-sans font-medium transition-all shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                    >
                      💡 {q}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={onCaSubmit} className="bg-gray-800 p-4 border-t border-gray-700">
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={caInput}
                    onChange={(e) => setCaInput(e.target.value)}
                    placeholder="Ask about active batches, temperature warnings, ingredient requirements..."
                    disabled={isCaLoading}
                    className="flex-1 rounded-md border border-gray-600 bg-gray-900 px-4 py-2 text-white placeholder-gray-550 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isCaLoading || !caInput.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-505 disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </div>

          {/* Dynamic SQL, Tabular Data, and Thought Process Audit Row */}
          {(caSql || caData.length > 0 || caReasoning.length > 0) && (
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Column 1: Translated DDL/SQL */}
              <div className="lg:col-span-1 flex flex-col rounded-lg bg-gray-800 p-5 shadow border border-gray-700">
                <h3 className="text-md font-semibold text-white mb-3">Translated SQL Query</h3>
                {caSql ? (
                  <div className="bg-gray-955 border border-gray-750 rounded p-3.5 flex-1 font-mono text-xs text-emerald-400 break-all overflow-x-auto leading-relaxed max-h-[250px] overflow-y-auto">
                    {caSql}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-8 border border-dashed border-gray-700 rounded text-center">
                    <p className="text-xs text-gray-500 font-sans">SQL compilation deferred until reasoning completes.</p>
                  </div>
                )}
              </div>

              {/* Column 2: Live Tabular Data */}
              <div className="lg:col-span-1 flex flex-col rounded-lg bg-gray-800 p-5 shadow border border-gray-700">
                <h3 className="text-md font-semibold text-white mb-3">Raw Query Data</h3>
                {caData.length > 0 ? (
                  <div className="flex-1 overflow-x-auto max-h-[250px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-950 sticky top-0">
                        <tr>
                          {Object.keys(caData[0]).map((col) => (
                            <th key={col} className="px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-950 font-sans">
                              {col.replace('_', ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700 bg-gray-850">
                        {caData.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-750 transition-colors">
                            {Object.keys(caData[0]).map((col) => (
                              <td key={col} className="whitespace-nowrap px-3 py-2 text-[10px] text-gray-300 font-mono">
                                {row[col] !== null ? String(row[col]) : 'NULL'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-8 border border-dashed border-gray-700 rounded text-center">
                    <p className="text-xs text-gray-500 font-sans">No raw metrics to display.</p>
                  </div>
                )}
              </div>

              {/* Column 3: Managed Agent Thought Process */}
              <div className="lg:col-span-1 flex flex-col rounded-lg bg-gray-800 p-5 shadow border border-gray-700">
                <h3 className="text-md font-semibold text-white mb-3 flex items-center">
                  <Terminal className="h-4 w-4 mr-2 text-indigo-400" />
                  Managed Agent Thought Process
                </h3>
                {caReasoning.length > 0 ? (
                  <div className="flex-1 overflow-y-auto max-h-[250px] space-y-3 pr-1">
                    {caReasoning.map((step, idx) => (
                      <div key={idx} className="border-l-2 border-indigo-500 pl-3 py-0.5">
                        <span className="block text-xs font-bold text-indigo-300 font-sans">{step.title}</span>
                        <span className="block text-[11px] text-gray-400 mt-0.5 font-sans leading-relaxed">{step.description}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-8 border border-dashed border-gray-700 rounded text-center">
                    <p className="text-xs text-gray-500 font-sans">Cognitive reasoning steps will display in real time during queries.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Architectural Shift comparison panel */}
          <div className="mt-8 rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-6">
              <Terminal className="h-6 w-6 text-indigo-500" />
              <div>
                <h3 className="text-xl font-bold text-white">Architectural Evolution: Handcrafted vs. Managed Data Agents</h3>
                <p className="text-sm text-gray-400 font-sans">Comparing the customized ColdFusion/SQL pipeline against the new native GCP Conversational Analytics Cloud Plane.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Architecture diagram/flow */}
              <div className="space-y-5">
                <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide font-sans">Data Access Flow Comparison</h4>
                
                <div className="space-y-4">
                  {/* Flow 1: Custom CFML */}
                  <div className="rounded-lg bg-gray-950 p-4 border border-purple-900/20 relative">
                    <span className="absolute top-2 right-2 text-[8px] font-bold text-purple-400 bg-purple-950 px-2 py-0.5 rounded-full font-mono">CURRENT TAB 3</span>
                    <span className="text-xs font-bold text-purple-300 block mb-2 font-sans">1. Custom CFML SQL Orchestrator</span>
                    <div className="text-[11px] text-gray-400 font-mono space-y-1.5">
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> User submits plain-text query in UI</div>
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> CF calls <code>ai.generate()</code> inside AlloyDB via JDBC</div>
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> AlloyDB returns compiled raw SQL statement</div>
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> CF filters SQL structure (security scanning)</div>
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> CF runs secure SELECT on AlloyDB; gets records</div>
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> CF invokes local <code>ChatModel()</code> (Gemini) to write summary</div>
                    </div>
                  </div>

                  {/* Flow 2: Managed GCP */}
                  <div className="rounded-lg bg-gray-955 p-4 border border-indigo-900/20 relative">
                    <span className="absolute top-2 right-2 text-[8px] font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded-full font-mono">NEW MANAGED PATH</span>
                    <span className="text-xs font-bold text-indigo-300 block mb-2 font-sans">2. Managed AlloyDB Conversational Analytics Agent</span>
                    <div className="text-[11px] text-gray-400 font-mono space-y-1.5">
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> User submits plain-text query in UI</div>
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> UI triggers CF API gateway containing OAuth token</div>
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> GCP Conversational Analytics Cloud plane intercepts request</div>
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Managed Data Agent maps query directly to AlloyDB schema</div>
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Agent reasons, runs SQL, packages data & synthesizes charts</div>
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Returns structured JSON response (text, reasoning, sql, data, charts)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Code Display Panel */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between bg-gray-950 px-4 py-2 rounded-t border-t border-x border-gray-800">
                  <span className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                    CFML GCP REST Gateway (query-data-agent.cfm)
                  </span>
                  <button
                    onClick={() => {
                      const code = `// Fetch Cloud Run token and POST to Conversational Analytics API\ntoken = getAuthToken();\ncfhttp(url="https://geminidataanalytics.googleapis.com/v1beta/projects/#projectId#/locations/us-central1/conversations:queryData", method="POST") {\n    cfhttpparam(type="header", name="Authorization", value="Bearer #token#");\n    cfhttpparam(type="body", value=serializeJson({ "query": userPrompt }));\n}`;
                      navigator.clipboard.writeText(code);
                      setCopiedCaCode(true);
                      setTimeout(() => setCopiedCaCode(false), 2000);
                    }}
                    className="text-gray-400 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
                  >
                    {copiedCaCode ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-400" />
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-gray-950 border border-gray-800 rounded-b p-4 flex-1 overflow-x-auto font-mono text-xs text-gray-300 leading-relaxed max-h-[350px] overflow-y-auto">
                  <pre>{`// 1. Fetch OAuth access token via Cloud Run Service Account
function getAuthToken() {
    cfhttp(url="http://metadata.google.internal/.../token", method="GET") {...}
    return tokenData.access_token;
}

// 2. POST to the managed Conversational Analytics Endpoint
var apiUrl = "https://geminidataanalytics.googleapis.com/v1beta/projects/#projectId#/locations/us-central1/conversations:queryData";

cfhttp(url=apiUrl, method="POST", result="apiResult") {
    cfhttpparam(type="header", name="Authorization", value="Bearer #token#");
    cfhttpparam(type="body", value=serializeJson({ "query": userPrompt }));
}

// 3. Return structured conversational text, reasoning trace, and SQL
return deserializeJson(apiResult.fileContent);`}</pre>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default BreweryAssistant;