import React, { useState, useEffect, useRef } from 'react';
import { WifiOff, Terminal, Copy, Check, Loader2, Sparkles, Info } from 'lucide-react';
import { fetchWithRetry } from '../apiUtils';

// --- Offline Message Component ---
const ApiOfflineMessage = () => (
  <div className="rounded-lg bg-gray-800 p-10 text-center shadow">
    <div className="flex-shrink-0 flex justify-center">
      <WifiOff className="h-12 w-12 text-red-500" />
    </div>
    <h3 className="mt-4 text-lg font-medium text-white">API Offline</h3>
    <p className="mt-2 text-sm text-gray-400">
      Cannot connect to the API. The server may be offline or unreachable.
      This page will not function until the connection is restored.
    </p>
  </div>
);

function Analytics({ apiStatus }) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const simulationInterval = useRef(null);

  const [rowCount, setRowCount] = useState('...');
  const [vatCount, setVatCount] = useState('...');
  const [batchCount, setBatchCount] = useState('...');
  
  const [isColumnarQuerying, setIsColumnarQuerying] = useState(false);
  const [isRowBasedQuerying, setIsRowBasedQuerying] = useState(false);
  
  const [querySpeed, setQuerySpeed] = useState('... s');
  const [rowQuerySpeed, setRowQuerySpeed] = useState('... s');

  const [columnarExplainOutput, setColumnarExplainOutput] = useState(
    'Click "Run Query" to see the plan...'
  );
  const [rowBasedExplainOutput, setRowBasedExplainOutput] = useState(
    'Click "Run Query" to see the plan...'
  );
  const [copied, setCopied] = useState(false);

  // --- AlloyDB AI Sentiment & Summaries States ---
  const [reviews, setReviews] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [isSummariesLoading, setIsSummariesLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const [summariesError, setSummariesError] = useState(null);
  const [copiedSentimentSql, setCopiedSentimentSql] = useState(false);
  const [activeTab, setActiveTab] = useState('sensor');

  const fetchColumnarRowCount = async () => {
    if (apiStatus !== 'online') return;
    
    try {
      if (rowCount === '...') setRowCount('Loading...');
      const data = await fetchWithRetry('/api/v1/stats/rowcount.cfm'); 
      
      if (data.success && data.total !== undefined) {
        setRowCount(new Intl.NumberFormat().format(data.total));
      } else {
        setRowCount('Error');
      }
    } catch (e) {
      console.error('Error fetching columnar row count:', e);
      setRowCount('Error');
    }
  };

  useEffect(() => {
    const fetchOtherStats = async () => {
      try {
        const vatData = await fetchWithRetry('/api/v1/stats/vatcount.cfm');
        if (vatData.success && vatData.total !== undefined) {
          setVatCount(new Intl.NumberFormat().format(vatData.total));
        } else {
          setVatCount('Error');
        }
        
        const batchData = await fetchWithRetry('/api/v1/stats/batchcount.cfm');
        if (batchData.success && batchData.total !== undefined) {
          setBatchCount(new Intl.NumberFormat().format(batchData.total));
        } else {
          setBatchCount('Error');
        }
      } catch (e) {
        console.error('Error fetching vat/batch counts:', e);
        setVatCount('Error');
        setBatchCount('Error');
      }
    };
    
    const fetchReviewsAndSummaries = async () => {
      setIsReviewsLoading(true);
      setIsSummariesLoading(true);
      setReviewsError(null);
      setSummariesError(null);

      try {
        const reviewsData = await fetchWithRetry('/api/v1/ops/get-reviews.cfm');
        if (reviewsData.success) {
          setReviews(reviewsData.reviews);
        } else {
          throw new Error(reviewsData.message || 'Failed to fetch reviews');
        }
      } catch (e) {
        console.error('Reviews fetch error:', e);
        setReviewsError(e.message);
      } finally {
        setIsReviewsLoading(false);
      }

      try {
        const summariesData = await fetchWithRetry('/api/v1/ops/get-beer-summaries.cfm');
        if (summariesData.success) {
          setSummaries(summariesData.summaries);
        } else {
          throw new Error(summariesData.message || 'Failed to fetch summaries');
        }
      } catch (e) {
        console.error('Summaries fetch error:', e);
        setSummariesError(e.message);
      } finally {
        setIsSummariesLoading(false);
      }
    };

    if (apiStatus === 'online') {
      fetchOtherStats();
      fetchColumnarRowCount();
      fetchReviewsAndSummaries();
    } else {
      setRowCount('...');
      setVatCount('...');
      setBatchCount('...');
      setReviews([]);
      setSummaries([]);
    }
  }, [apiStatus]);

  useEffect(() => {
    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    };
  }, []);

  const handleToggleSimulation = () => {
    if (apiStatus !== 'online') return;

    if (isSimulating) {
      clearInterval(simulationInterval.current);
      simulationInterval.current = null;
      setIsSimulating(false);
      setGenResult('Simulation stopped.');
    } else {
      setIsSimulating(true);
      setGenResult('Simulation started...');

      const runSimulationBatch = async () => {
        try {
          const response = await fetch('/api/v1/datagenerator/datagenerator.cfm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numRows: 500 }),
          });
          
          if (!response.ok) throw new Error('API request failed');
          
          const result = await response.json();
          if (result.success) {
            setGenResult(`Last Batch: Inserted ${result.rowsInserted} rows in ${result.duration_sec}s.`);
            await fetchColumnarRowCount();
          } else {
            throw new Error(result.message || 'Error in simulation API');
          }
        } catch (e) {
          console.error('Error in simulation batch:', e);
          setGenResult(`Error: ${e.message}. Stopping simulation.`);
          clearInterval(simulationInterval.current);
          simulationInterval.current = null;
          setIsSimulating(false);
        }
      };

      runSimulationBatch();
      simulationInterval.current = setInterval(runSimulationBatch, 5000); 
    }
  };
  
  const handleRunColumnarQuery = async () => {
    if (apiStatus !== 'online') return;

    setIsColumnarQuerying(true);
    setQuerySpeed('... s');
    setColumnarExplainOutput('Fetching query plan...');

    try {
      const data = await fetchWithRetry('/api/v1/analytics/batch-summary-explain.cfm');
      if (data.success) {
        setQuerySpeed(`${data.querySpeed} s`);
        setColumnarExplainOutput(data.explainOutput);
      } else {
        throw new Error(data.message || 'Error in summary API');
      }
    } catch (e) {
      console.error('Columnar query error:', e);
      setQuerySpeed('Error');
      setColumnarExplainOutput(`Error: ${e.message}`);
    }

    setIsColumnarQuerying(false);
  };
  
  const handleRunRowBasedQuery = async () => {
    if (apiStatus !== 'online') return;

    setIsRowBasedQuerying(true);
    setRowQuerySpeed('... s');
    setRowBasedExplainOutput('Fetching query plan...');

    try {
      const data = await fetchWithRetry('/api/v1/analytics/batch-summary-no-columnar-explain.cfm');
      if (data.success) {
        setRowQuerySpeed(`${data.querySpeed} s`);
        setRowBasedExplainOutput(data.explainOutput);
      } else {
        throw new Error(data.message || 'Error in row-based summary API');
      }
    } catch (e) {
      console.error('Row-based query error:', e);
      setRowQuerySpeed('Error');
      setRowBasedExplainOutput(`Error: ${e.message}`);
    }

    setIsRowBasedQuerying(false);
  };

  const copyHtapCode = () => {
    const code = `SELECT 
    b.batch_id,
    AVG(v.temp) AS avg_temp, 
    MAX(v.temp) AS max_temp, 
    MIN(v.temp) AS min_temp, 
    STDDEV(v.temp) AS stddev_temp,
    COUNT(CASE WHEN v.temp > 74.0 THEN 1 END) AS high_temp_alert_count
FROM brews.batches b
INNER JOIN brews.vatsensorreadings v ON b.batch_id = v.batch_id
GROUP BY b.batch_id;`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  if (apiStatus === 'offline') {
    return (
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
        <div className="mt-6">
          <ApiOfflineMessage />
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto pb-12">
      <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
      
      {/* --- Sleek Tab Switcher --- */}
      <div className="border-b border-gray-800 mb-8 mt-4">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('sensor')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
              activeTab === 'sensor'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            📶 IoT Sensor Analytics (HTAP)
          </button>
          <button
            onClick={() => setActiveTab('sentiment')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
              activeTab === 'sentiment'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            🧠 Customer Feedback AI (AlloyDB AI)
          </button>
        </nav>
      </div>

      {/* ========================================== */}
      {/* TAB 1: SENSOR ANALYTICS (HTAP)             */}
      {/* ========================================== */}
      {activeTab === 'sensor' && (
        <>
          {/* --- EDUCATIONAL DEMO INFO (Top) --- */}
          <div className="rounded-md border-l-4 border-cyan-400 bg-cyan-900/30 p-5 shadow-lg">
            <h4 className="font-bold text-cyan-300">The Demo: Hybrid Processing (HTAP)</h4>
            <p className="mt-2 text-sm text-cyan-100">
              This page demonstrates running data warehouse-level queries directly on a 
              production database—<strong>while it's under a live transactional load.</strong>
            </p>
            <p className="mt-2 text-sm text-cyan-100">
              You will see the Columnar Engine query finish in seconds, while the 
              standard Row-Based query is significantly slower, all without an ETL pipeline.
            </p>
            <p className="mt-2 text-sm text-cyan-100">
              <strong>Zero Index Management:</strong> The Columnar Engine requires NO specialized reporting indexes to achieve this speed.
            </p>
          </div>

          {/* --- ColdFusion Orchestration Differentiator (Full Width) --- */}
          <div className="rounded-lg bg-orange-950/20 border border-orange-900/30 p-5 shadow-md mt-4 mb-6">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">ColdFusion Orchestration Differentiator</span>
            <p className="text-sm text-gray-300 mt-2 leading-relaxed">
              ColdFusion executes warehouse-level queries and heavy metrics aggregations over 100M+ sensor rows using a standard, index-free {"<cfquery>"} block. Database-level in-memory vectorization handles the load, completely avoiding lag-prone ETL pipelines and separate analytics warehouses.
            </p>
          </div>

          {/* --- HTAP Live Simulation --- */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            
            {/* --- Column 1: Start Live IoT Load --- */}
            <div className="rounded-lg bg-gray-800 p-5 shadow border border-gray-700">
              <h2 className="text-lg font-semibold text-white">
                1. Start Live IoT Load
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Start a continuous stream of mock IoT sensor readings (500 rows
                every 5 seconds) to simulate a live transactional load on your
                database.
              </p>
              <button
                onClick={handleToggleSimulation}
                className={`mt-4 rounded-md px-4 py-2 font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-700 disabled:opacity-50 ${
                  isSimulating
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {isSimulating ? 'Stop Live IoT Load' : 'Start Live IoT Load'}
              </button>
              
              {isSimulating && (
                 <div className="mt-4 flex items-center">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="ml-3 text-sm text-green-300">
                    Writing 500 rows every 5 seconds...
                  </span>
                </div>
              )}
              
              {genResult && (
                <p
                  className={`mt-4 text-sm ${
                    genResult.startsWith('Error')
                      ? 'text-red-400'
                      : 'text-green-300'
                  }`}
                >
                  {genResult}
                </p>
              )}
            </div>
            
            {/* --- Column 2: Database Stats --- */}
            <div className="rounded-lg bg-gray-800 p-5 shadow border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">
                Database Stats
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-lg bg-gray-900 p-4 text-center border border-gray-800">
                  <div className="text-sm font-medium text-gray-400">
                    Total Sensor Rows
                  </div>
                  <div className="mt-2 text-5xl font-bold text-white">{rowCount}</div>
                </div>
                <div className="rounded-lg bg-gray-900 p-4 text-center border border-gray-800">
                  <div className="text-sm font-medium text-gray-400">
                    Total Vats
                  </div>
                  <div className="mt-2 text-5xl font-bold text-white">{vatCount}</div>
                </div>
                <div className="rounded-lg bg-gray-900 p-4 text-center border border-gray-800">
                  <div className="text-sm font-medium text-gray-400">
                    Total Batches
                  </div>
                  <div className="mt-2 text-5xl font-bold text-white">{batchCount}</div>
                </div>
              </div>
            </div>
          </div>

          {/* --- Query Runner --- */}
          <div className="mt-8 rounded-lg bg-gray-800 p-5 shadow border border-gray-700">
            <h2 className="text-lg font-semibold text-white">
              2. Run Analytical Query
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Now, run an `EXPLAIN ANALYZE` on a complex analytical query (a `SELECT`
              with `AVG`, `MAX`, `MIN`, and `GROUP BY`) against both the standard
              Row-Based table and the Columnar table. This demonstrates the
              performance difference for analytics, even while the live load is
              running.
            </p>
            
            <div className="mt-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                
                {/* --- Columnar Speed (Fast) --- */}
                <div className="rounded-lg bg-gray-900 p-4 border border-gray-800">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-md font-semibold text-white">
                      🚀 Columnar Engine Speed
                    </h2>
                    <button
                      onClick={handleRunColumnarQuery}
                      disabled={isColumnarQuerying || rowCount === '...' || rowCount === 'Loading...'}
                      className="rounded-md bg-green-600 px-3 py-1 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-green-800 disabled:opacity-50"
                    >
                      {isColumnarQuerying ? 'Running...' : 'Run Query'}
                    </button>
                  </div>
                  <span className="text-4xl font-bold text-cyan-400">
                    {querySpeed}
                  </span>
                  
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-400">
                      Columnar Query Plan:
                    </h3>
                    <pre className="scrollbar-thin mt-2 h-64 overflow-x-auto rounded-md bg-black p-4 text-xs text-green-300">
                      {columnarExplainOutput}
                    </pre>
                  </div>
                </div>

                {/* --- Row-Based Speed (Slow) --- */}
                <div className="rounded-lg bg-gray-900 p-4 border border-gray-800">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-md font-semibold text-white">
                      🐢 Row-Based Speed (No Columnar)
                    </h2>
                    <button
                      onClick={handleRunRowBasedQuery}
                      disabled={isRowBasedQuerying || rowCount === '...' || rowCount === 'Loading...'}
                      className="rounded-md bg-red-600 px-3 py-1 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-800 disabled:opacity-50"
                    >
                      {isRowBasedQuerying ? 'Running...' : 'Run Query'}
                    </button>
                  </div>
                  <span className="text-4xl font-bold text-red-400">
                    {rowQuerySpeed}
                  </span>

                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-400">
                      Row-Based Query Plan:
                    </h3>
                    <pre className="scrollbar-thin mt-2 h-64 overflow-x-auto rounded-md bg-black p-4 text-xs text-green-300">
                      {rowBasedExplainOutput}
                    </pre>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* --- Educational Section Box (The "Demo Pattern") --- */}
          <div className="mt-8 rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-6">
              <Terminal className="h-6 w-6 text-purple-500" />
              <div>
                <h3 className="text-xl font-bold text-white">Educational Sandbox: Real-time HTAP (AlloyDB Columnar Engine)</h3>
                <p className="text-sm text-gray-400">Analyzing how databases dynamically vectorize analytical query plans without locking operational transactional tables.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Comparison Box */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Traditional BI Architecture vs. AlloyDB HTAP</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Running analytical aggregates over millions of time-series rows on transactional tables causes severe query lock bottlenecks. Traditionally, companies handle this by building heavy, lag-prone ETL pipelines to move data to dedicated warehouses.
                </p>
                
                <div className="space-y-3">
                  <div className="rounded bg-gray-950 p-3 border border-red-950/30">
                    <span className="text-[10px] font-bold text-red-400 uppercase block">Relational performance bottleneck</span>
                    <p className="text-[10px] text-gray-500 font-mono mt-1 leading-normal">
                      1. Set up daily ETL pipeline script<br/>
                      2. Wait for data warehouse synchronization<br/>
                      3. Manage multi-column reporting indexes on row stores<br/>
                      4. Aggregates over millions of rows cause database lock crashes during transactional write spikes.
                    </p>
                  </div>

                  <div className="rounded bg-gray-950 p-3 border border-green-950/30">
                    <span className="text-[10px] font-bold text-green-400 uppercase block">AlloyDB HTAP Engine (Vectorized Columnar Engine)</span>
                    <p className="text-[10px] text-gray-400 font-mono mt-1 leading-normal">
                      {"-- Standard SQL aggregations compile at extreme speed "}<br/>
                      {"-- dynamically reading from AlloyDB's vectorized in-memory column store "}<br/>
                      {"-- without locks or ETL pipeline delays."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Code Display Panel */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between bg-gray-950 px-4 py-2 rounded-t border-t border-x border-gray-800">
                  <span className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-purple-400" />
                    HTAP Analytics Query
                  </span>
                  <button
                    onClick={copyHtapCode}
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
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-gray-950 border border-gray-800 rounded-b p-4 flex-1 overflow-x-auto font-mono text-xs text-gray-300 leading-relaxed">
                  <pre>{`SELECT 
    b.batch_id,
    AVG(v.temp) AS avg_temp, 
    MAX(v.temp) AS max_temp, 
    MIN(v.temp) AS min_temp, 
    STDDEV(v.temp) AS stddev_temp,
    COUNT(CASE WHEN v.temp > 74.0 THEN 1 END) AS high_temp_alert_count
FROM brews.batches b
INNER JOIN brews.vatsensorreadings v ON b.batch_id = v.batch_id
GROUP BY b.batch_id;`}</pre>
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {/* ========================================== */}
      {/* TAB 2: AI SENTIMENT & SUMMARIZATION        */}
      {/* ========================================== */}
      {activeTab === 'sentiment' && (
        <>
          {/* --- EDUCATIONAL DEMO INFO (Top) --- */}
          <div className="rounded-md border-l-4 border-cyan-400 bg-cyan-900/30 p-5 shadow-lg">
            <h4 className="font-bold text-cyan-300 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              The Demo: In-Database Generative AI (No-ETL AI)
            </h4>
            <p className="mt-2 text-sm text-cyan-100">
              This section showcases AlloyDB's <strong>built-in generative AI functions</strong>.
            </p>
            <p className="mt-2 text-sm text-cyan-100">
              AlloyDB compiles natural language sentiment evaluations and aggregates multi-row review summaries on-the-fly, running natively inside the SQL layer.
            </p>
            <p className="mt-2 text-sm text-cyan-100">
              <strong>Zero Data Latency:</strong> Generative intelligence runs directly inside your transactional database, completely eliminating separate vector databases and lag-prone ETL pipeline synchronization delays.
            </p>
          </div>

          {/* --- ColdFusion Orchestration Differentiator (Full Width) --- */}
          <div className="rounded-lg bg-orange-950/20 border border-orange-900/30 p-5 shadow-md mt-4 mb-6">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">ColdFusion Orchestration Differentiator</span>
            <p className="text-sm text-gray-300 mt-2 leading-relaxed">
              ColdFusion orchestrates in-database Generative AI by executing direct, native SQL queries against your AlloyDB cluster. By leveraging database-level proxy models, ColdFusion completely eliminates the need for complex Python AI middleware, external REST API wrappers, and separate vector index management, serving AI-driven sentiment directly to your React app in milliseconds.
            </p>
          </div>

          {/* --- Sentiment Stats Cards --- */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="overflow-hidden rounded-lg bg-gray-800 shadow border border-gray-700 p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md bg-emerald-500/10 p-3">
                  <span className="text-xl">😊</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-400">Positive Reviews</dt>
                    <dd className="text-3xl font-semibold text-emerald-400">{reviews.length ? reviews.filter(r => (r.sentiment || '').toUpperCase() === 'POSITIVE').length : '...'}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg bg-gray-800 shadow border border-gray-700 p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md bg-rose-500/10 p-3">
                  <span className="text-xl">😢</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-400">Negative Reviews</dt>
                    <dd className="text-3xl font-semibold text-rose-400">{reviews.length ? reviews.filter(r => (r.sentiment || '').toUpperCase() === 'NEGATIVE').length : '...'}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg bg-gray-800 shadow border border-gray-700 p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md bg-gray-500/10 p-3">
                  <span className="text-xl">😐</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-400">Neutral Reviews</dt>
                    <dd className="text-3xl font-semibold text-gray-400">{reviews.length ? reviews.filter(r => (r.sentiment || '').toUpperCase() === 'NEUTRAL').length : '...'}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* --- Dual Panel Layout: Reviews & Summaries --- */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            
            {/* Left: Recent Reviews Table */}
            <div className="rounded-lg bg-gray-800 p-5 shadow border border-gray-700 flex flex-col">
              <h3 className="text-lg font-semibold text-white mb-4">Live Taproom Reviews (Dynamically Classified)</h3>
              
              {isReviewsLoading ? (
                <div className="flex-1 flex items-center justify-center p-10 min-h-[200px]">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              ) : reviewsError ? (
                <p className="text-sm text-red-400 p-4 bg-red-950/20 border border-red-900/30 rounded">{reviewsError}</p>
              ) : reviews.length === 0 ? (
                <p className="text-sm text-gray-400 p-4 bg-gray-900/30 border border-gray-800 rounded text-center">No feedback available yet.</p>
              ) : (
                <div className="overflow-x-auto border border-gray-700 rounded-md">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Patron</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Beer</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Feedback</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Sentiment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 bg-gray-800">
                      {reviews.map((review) => {
                        const sentimentUpper = (review.sentiment || '').toUpperCase();
                        const badgeClass = 
                          sentimentUpper === 'POSITIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          sentimentUpper === 'NEGATIVE' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                          'bg-gray-500/20 text-gray-400 border-gray-500/30';
                        
                        return (
                          <tr key={review.purchase_id} className="hover:bg-gray-750 transition-colors">
                            <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-200">{review.customer_name}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-400 font-medium">{review.recipe_name}</td>
                            <td className="px-4 py-3 text-xs text-gray-300 italic leading-relaxed">"{review.feedback_text}"</td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold border ${badgeClass}`}>
                                {sentimentUpper}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right: Crowd Summaries List */}
            <div className="rounded-lg bg-gray-800 p-5 shadow border border-gray-700 flex flex-col">
              <h3 className="text-lg font-semibold text-white mb-4">AI Crowd Feedback Summaries (Aggregate)</h3>
              
              {isSummariesLoading ? (
                <div className="flex-1 flex items-center justify-center p-10 min-h-[200px]">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              ) : summariesError ? (
                <p className="text-sm text-red-400 p-4 bg-red-950/20 border border-red-900/30 rounded">{summariesError}</p>
              ) : summaries.length === 0 ? (
                <p className="text-sm text-gray-400 p-4 bg-gray-900/30 border border-gray-800 rounded text-center">No summaries available yet.</p>
              ) : (
                <div className="space-y-4 overflow-y-auto max-h-[350px] pr-1">
                  {summaries.map((summary) => (
                    <div key={summary.recipe_id} className="rounded-md bg-gray-900 p-4 border border-gray-700/50">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-bold text-white">{summary.recipe_name}</h4>
                        <span className="inline-flex rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-300 tracking-wider uppercase">
                          {summary.style}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed italic bg-purple-950/10 border border-purple-900/10 rounded p-2.5 mt-2">
                        "{summary.crowd_summary || 'Collecting patron feedback to generate summary...'}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* --- Educational AI Sandbox Box --- */}
          <div className="mt-8 rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-6">
              <Terminal className="h-6 w-6 text-purple-500" />
              <div>
                <h3 className="text-xl font-bold text-white">Educational Sandbox: Real-time In-Database AI Functions</h3>
                <p className="text-sm text-gray-400">Analyzing how AlloyDB processes natural language text directly inside SQL queries using optimized proxy models.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Comparison Box */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Traditional App AI Pipelines vs. In-Database AI</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Typically, analyzing feedback requires pulling database rows into a backend app (e.g., Python), orchestrating external REST API calls to a model, parsing JSON results, and writing back to a DB. Under load, this creates severe latency bottlenecks and operational costs.
                </p>
                
                <div className="space-y-3">
                  <div className="rounded bg-gray-950 p-3 border border-red-950/30">
                    <span className="text-[10px] font-bold text-red-400 uppercase block">Traditional App Layer AI Orchestration</span>
                    <p className="text-[10px] text-gray-500 font-mono mt-1 leading-normal">
                      1. Pull reviews: SELECT * FROM feedback;<br/>
                      2. Loop in backend code (Node/Python/CF)<br/>
                      3. Trigger HTTP post requests to Gemini Enterprise Agent Platform for each comment<br/>
                      4. Suffer 200ms - 1s latency per API call + network round-trips.
                    </p>
                  </div>

                  <div className="rounded bg-gray-950 p-3 border border-green-950/30">
                    <span className="text-[10px] font-bold text-green-400 uppercase block">AlloyDB AI Local SQL Evaluation</span>
                    <p className="text-[10px] text-gray-400 font-mono mt-1 leading-normal">
                      {"-- Single SQL query evaluates sentiment and summaries directly "}<br/>
                      {"-- in-database using native SQL function calls "}<br/>
                      {"-- executed at local speeds with zero external round-trip lag."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Code Display Panel */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between bg-gray-950 px-4 py-2 rounded-t border-t border-x border-gray-800">
                  <span className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-purple-400" />
                    AlloyDB AI Sentiment & Summarization SQL
                  </span>
                  <button
                    onClick={() => {
                      const code = `SELECT \n  r.recipe_name,\n  ai.analyze_sentiment(p.feedback_text) AS sentiment,\n  ai.agg_summarize(p.feedback_text) AS crowd_summary\nFROM brews.purchases p\nJOIN brews.recipes r ON p.recipe_id = r.recipe_id\nGROUP BY r.recipe_name, p.feedback_text;`;
                      navigator.clipboard.writeText(code);
                      setCopiedSentimentSql(true);
                      setTimeout(() => setCopiedSentimentSql(false), 2000);
                    }}
                    className="text-gray-400 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
                  >
                    {copiedSentimentSql ? (
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
                <div className="bg-gray-950 border border-gray-800 rounded-b p-4 flex-1 overflow-x-auto font-mono text-xs text-gray-300 leading-relaxed">
                  <pre>{`SELECT 
  r.recipe_name,
  ai.analyze_sentiment(p.feedback_text) AS sentiment,
  ai.agg_summarize(p.feedback_text) AS crowd_summary
FROM brews.purchases p
JOIN brews.recipes r ON p.recipe_id = r.recipe_id
GROUP BY r.recipe_name, p.feedback_text;`}</pre>
                </div>
              </div>

              {/* AlloyDB AI Sentiment Syntax Explanation (Full Width) */}
              <div className="md:col-span-2 mt-6 border-t border-gray-800 pt-6">
                <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-1.5 font-sans">
                  <Info className="h-4 w-4 text-purple-400" />
                  AlloyDB In-Database AI Functions Explained
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
                  <div className="bg-gray-950 p-3.5 rounded border border-gray-800 leading-relaxed">
                    <strong className="text-purple-400 block mb-1">Sentiment: ai.analyze_sentiment()</strong>
                    <span className="text-gray-400">
                      Built-in scalar function that uses localized proxy models to classify text records as positive, negative, or neutral, returning answers instantly within the row result.
                    </span>
                  </div>
                  <div className="bg-gray-950 p-3.5 rounded border border-gray-800 leading-relaxed">
                    <strong className="text-purple-400 block mb-1">Summarization: ai.agg_summarize()</strong>
                    <span className="text-gray-400">
                      An aggregate function that processes multiple rows of feedback text within a <code>GROUP BY</code> partition and generates a cohesive crowd summary.
                    </span>
                  </div>
                  <div className="bg-gray-950 p-3.5 rounded border border-gray-800 leading-relaxed">
                    <strong className="text-purple-400 block mb-1">No-ETL AI Processing</strong>
                    <span className="text-gray-400">
                      Executes natural language analysis natively inside the database query plan, completely avoiding external data sync queues or Python backend workers.
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </>
      )}

    </div>
  );
}

export default Analytics;
