import React, { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../apiUtils';
import { AlertTriangle, Loader, Plus, Sparkles, WifiOff, Terminal, Copy, Check } from 'lucide-react';
import CreateBatchModal from '../components/CreateBatchModal';

function Batches({ apiStatus }) {
  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadBatches = useCallback(async () => {
    if (apiStatus === 'offline') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchWithRetry('/api/v1/ops/get-batches.cfm');
      if (data.success) {
        setBatches(data.batches);
      } else {
        throw new Error(data.error || 'Failed to load batches.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [apiStatus]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const copySqlCode = () => {
    const code = `SELECT
    b.batch_id,
    r.recipe_name,
    b.status,
    TO_CHAR(b.start_time, 'YYYY-MM-DD') as start_date,
    v.name AS vat_name,
    -- real-time customer ratings aggregates
    COALESCE(ROUND(AVG(tf.rating), 1), 0) AS avg_rating,
    COUNT(tf.feedback_id) AS feedback_count
FROM Batches b
INNER JOIN Recipes r ON b.recipe_id = r.recipe_id
LEFT JOIN Vats v ON b.batch_id = v.current_batch_id
LEFT JOIN brews.taproom_feedback tf ON b.batch_id = tf.batch_id
GROUP BY b.batch_id, r.recipe_name, b.status, b.start_time, v.name
ORDER BY b.batch_id DESC
LIMIT 50;`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status) => {
      switch (status) {
        case 'Fermenting': return 'bg-blue-500 text-blue-100';
        case 'Conditioning': return 'bg-purple-500 text-purple-100';
        case 'Complete': return 'bg-green-500 text-green-100';
        case 'Pending': return 'bg-yellow-500 text-yellow-100';
        case 'Failed': return 'bg-red-500 text-red-100';
        default: return 'bg-gray-500 text-gray-100';
      }
  };

  const renderContent = () => {
    if (apiStatus === 'offline') {
      return (
        <div className="p-12 flex flex-col items-center justify-center text-gray-400">
          <WifiOff className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-white">API Offline</h3>
          <p className="text-sm">Cannot connect to the brewery network.</p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="p-12 flex justify-center">
          <Loader className="h-8 w-8 text-orange-500 animate-spin" />
        </div>
      );
    }

    if (batches.length === 0) {
       return (
         <div className="p-12 text-center text-gray-400">
           No recent batches found in AlloyDB.
         </div>
       );
    }

    return (
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Batch ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Recipe</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Assigned Vat</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 text-center">Taproom Sentiment</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Start Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700 bg-gray-800">
          {batches.map((batch) => (
            <tr key={batch.batch_id}>
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-orange-400">#{batch.batch_id}</td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-100 font-medium">{batch.recipe_name}</td>
              <td className="whitespace-nowrap px-6 py-4 text-sm">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold leading-5 ${getStatusColor(batch.status)}`}>
                  {batch.status}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">
                {batch.vat_name ? <span className="flex items-center">{batch.vat_name}</span> : <span className="text-gray-500 italic">Unassigned</span>}
              </td>
              {/* Real-Time BOH-to-FOH Sentiment Bridge */}
              <td className="whitespace-nowrap px-6 py-4 text-sm">
                {Number(batch.feedback_count) > 0 ? (
                  <div className="flex flex-col items-start">
                    <span className="flex items-center font-bold text-yellow-400">
                      ★ {Number(batch.avg_rating).toFixed(1)}
                      <span className="text-xs font-normal text-gray-500 ml-1">({batch.feedback_count} review{Number(batch.feedback_count) > 1 ? 's' : ''})</span>
                    </span>
                    {Number(batch.avg_rating) <= 2.5 && (
                      <span className="text-[9px] font-extrabold text-red-400 bg-red-900/20 border border-red-900/30 px-2 py-0.5 rounded mt-1 uppercase tracking-wider animate-pulse">
                        ⚠️ Quality Alert
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-500 italic text-xs">No feedback yet</span>
                )}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">{batch.start_date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Brew Batches</h1>
          <p className="mt-1 text-gray-400">Manage all active and recent brew batches.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          disabled={apiStatus === 'offline'}
          className="flex items-center rounded-md bg-orange-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create New Batch
        </button>
      </div>

      {/* --- THE DEMO BOX --- */}
      <div className="mt-4 rounded-md border-l-4 border-cyan-400 bg-cyan-900/30 p-5 mb-6 shadow-lg">
        <h4 className="flex items-center font-bold text-cyan-300 mb-2">
           <Sparkles className="mr-2 h-5 w-5" />
           The Demo: Operational & Commercial Unification
        </h4>
        <p className="mt-2 text-sm text-cyan-100">
          This operations dashboard displays traditional back-of-house (BOH) production logs alongside <strong>real-time front-of-house (FOH) customer ratings</strong> in the taproom.
        </p>
        <ul className="mt-3 list-disc list-inside text-sm text-cyan-100 space-y-2 ml-2 leading-relaxed">
          <li><strong>Real-time HTAP:</strong> Real-time sales feedback aggregates are calculated using a relational `LEFT JOIN` directly on operational logs, proving a unified operational/sentiment database.</li>
          <li><strong>Head-Brewer Loop:</strong> Operators instantly notice if completed batches receive negative sentiment (spawning a pulsing **Quality Alert** for average ratings $\le$ 2.5).</li>
        </ul>
      </div>

      {/* --- ColdFusion Orchestration Differentiator (Full Width) --- */}
      <div className="rounded-lg bg-orange-950/20 border border-orange-900/30 p-5 shadow-md mt-4 mb-8">
        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">ColdFusion Orchestration Differentiator</span>
        <p className="text-sm text-gray-300 mt-2 leading-relaxed">
          ColdFusion bridges operational production metrics with real-time taproom customer feedback in a single SQL statement. By using standard relational aggregates (`LEFT JOIN`), it calculates average review stars and dynamically triggers high-impact **Quality Alerts** directly inside BOH dashboard views.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-md bg-red-900/50 p-4 flex items-center border border-red-900/50">
          <AlertTriangle className="h-6 w-6 text-red-400 mr-3" />
          <span className="text-red-200">Error: {error}</span>
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-lg bg-gray-800 shadow border border-gray-700">
        {renderContent()}
      </div>

      {/* --- Educational Section Box (The "Demo Pattern") --- */}
      <div className="mt-8 rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-6">
          <Terminal className="h-6 w-6 text-purple-500" />
          <div>
            <h3 className="text-xl font-bold text-white">Educational Sandbox: BOH-to-FOH Real-time Sentiment Bridge</h3>
            <p className="text-sm text-gray-400">Correlating front-of-house customer reviews directly with back-of-house batch data using dynamic HTAP query joins.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Comparison Box */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Fragmented CRM Silos vs. HTAP Unification</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Normally, customer rating logs live in isolated CRM or retail transaction databases. Head brewers cannot cross-reference quality complaints without running heavy nightly ETL pipelines to sync and correlate BOH and FOH tables.
            </p>
            
            <div className="space-y-3">
              <div className="rounded bg-gray-950 p-3 border border-red-950/30">
                <span className="text-[10px] font-bold text-red-400 uppercase block">Isolated CRM Database (Data Latency)</span>
                <p className="text-[10px] text-gray-500 font-mono mt-1 leading-normal">
                  1. Customer ratings write to isolated CRM/Fasting DB<br/>
                  2. Nightly ETL scripts extract and join logs<br/>
                  3. Head brewers only see quality complaints the next day.
                </p>
              </div>

              <div className="rounded bg-gray-950 p-3 border border-green-950/30">
                <span className="text-[10px] font-bold text-green-400 uppercase block">AlloyDB HTAP (Unified Real-time Join)</span>
                <p className="text-[10px] text-gray-400 font-mono mt-1 leading-normal">
                  {"SELECT b.batch_id, ROUND(AVG(tf.rating), 1) AS avg_rating "}<br/>
                  {"FROM Batches b LEFT JOIN brews.taproom_feedback tf "}<br/>
                  {"ON b.batch_id = tf.batch_id GROUP BY b.batch_id;"}
                </p>
              </div>
            </div>
          </div>

          {/* Code Display Panel */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between bg-gray-950 px-4 py-2 rounded-t border-t border-x border-gray-800">
              <span className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-purple-400" />
                HTAP Sentiment SQL Query
              </span>
              <button
                onClick={copySqlCode}
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
    r.recipe_name,
    b.status,
    TO_CHAR(b.start_time, 'YYYY-MM-DD') as start_date,
    v.name AS vat_name,
    -- real-time customer ratings aggregates
    COALESCE(ROUND(AVG(tf.rating), 1), 0) AS avg_rating,
    COUNT(tf.feedback_id) AS feedback_count
FROM Batches b
INNER JOIN Recipes r ON b.recipe_id = r.recipe_id
LEFT JOIN Vats v ON b.batch_id = v.current_batch_id
LEFT JOIN brews.taproom_feedback tf ON b.batch_id = tf.batch_id
GROUP BY b.batch_id, r.recipe_name, b.status, b.start_time, v.name
ORDER BY b.batch_id DESC
LIMIT 50;`}</pre>
            </div>
          </div>

        </div>
      </div>

      <CreateBatchModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={loadBatches}
      />

    </div>
  );
}

export default Batches;