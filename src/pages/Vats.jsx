import React, { useState, useEffect } from 'react';
import { fetchWithRetry } from '../apiUtils';
import { AlertTriangle, Loader, Sparkles, WifiOff, Thermometer, Gauge, Terminal, Copy, Check } from 'lucide-react';

function Vats({ apiStatus }) {
  const [vats, setVats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadVats = async () => {
      if (apiStatus === 'offline') {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchWithRetry('/api/v1/ops/get-vats.cfm');
        if (data.success) {
          setVats(data.vats);
        } else {
          throw new Error(data.error || 'Failed to load vats.');
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadVats();
  }, [apiStatus]);

  const copySqlCode = () => {
    const code = `SELECT
    v.vat_id,
    v.name,
    r.recipe_name as current_batch,
    b.status as batch_status,
    lr.temp,
    lr.pressure,
    TO_CHAR(lr.reading_time, 'YYYY-MM-DD HH24:MI:SS') as last_read_time
FROM Vats v
LEFT JOIN Batches b ON v.current_batch_id = b.batch_id
LEFT JOIN Recipes r ON b.recipe_id = r.recipe_id
-- Highly optimized lateral query: Fetches EXACTLY the latest 1 row per Vat
LEFT JOIN LATERAL (
    SELECT temp, pressure, reading_time
    FROM VatSensorReadings vsr
    WHERE vsr.vat_id = v.vat_id
    ORDER BY reading_time DESC
    LIMIT 1
) lr ON TRUE
ORDER BY v.vat_id ASC;`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-700 text-gray-300';
    switch (status) {
      case 'Fermenting': return 'bg-blue-900/50 text-blue-200 border border-blue-800';
      case 'Conditioning': return 'bg-purple-900/50 text-purple-200 border border-purple-800';
      case 'Complete': return 'bg-green-900/50 text-green-200 border border-green-800';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  const renderContent = () => {
    if (apiStatus === 'offline') {
      return (
        <div className="p-12 flex flex-col items-center justify-center text-gray-400 bg-gray-800 rounded-lg shadow border border-gray-700">
          <WifiOff className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-white">API Offline</h3>
          <p className="text-sm">Cannot connect to sensors.</p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="p-20 flex justify-center bg-gray-800 rounded-lg shadow border border-gray-700">
          <Loader className="h-10 w-10 text-orange-500 animate-spin" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-md bg-red-900/50 p-4 flex items-center border border-red-900/50">
          <AlertTriangle className="h-6 w-6 text-red-400 mr-3" />
          <span className="text-red-200">Error: {error}</span>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {vats.map((vat) => {
          const isActive = !!vat.current_batch;
          const displayStatus = isActive ? vat.batch_status : 'Empty';
          
          let statusBorder = 'border-gray-700';
          if (vat.batch_status === 'Fermenting') statusBorder = 'border-blue-500';
          else if (vat.batch_status === 'Conditioning') statusBorder = 'border-purple-500';
          else if (vat.batch_status === 'Complete') statusBorder = 'border-green-500';

          return (
            <div
              key={vat.vat_id}
              className={`overflow-hidden rounded-lg bg-gray-800 shadow-lg border-t-4 ${statusBorder} border-x border-b border-gray-700`}
            >
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white truncate">
                    {vat.name}
                  </h3>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(vat.batch_status)}`}>
                    {displayStatus}
                  </span>
                </div>
                
                <p className="mt-2 text-sm text-gray-400 h-5 truncate">
                  {vat.current_batch ? vat.current_batch : 'No active batch'}
                </p>
                
                {isActive ? (
                  <>
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="rounded-md bg-gray-900/50 p-3 border border-gray-700">
                        <div className="flex items-center text-xs font-medium text-gray-400 mb-1">
                          <Thermometer className="h-3.5 w-3.5 mr-1" /> Temp
                        </div>
                        <div className="text-2xl font-semibold text-white">
                          {vat.temp ? <span>{vat.temp}<span className="text-sm text-gray-500 ml-1">°F</span></span> : '--'}
                        </div>
                      </div>
                      <div className="rounded-md bg-gray-900/50 p-3 border border-gray-700">
                        <div className="flex items-center text-xs font-medium text-gray-400 mb-1">
                          <Gauge className="h-3.5 w-3.5 mr-1" /> Pressure
                        </div>
                        <div className="text-2xl font-semibold text-white">
                          {vat.pressure ? <span>{vat.pressure}<span className="text-sm text-gray-500 ml-1">PSI</span></span> : '--'}
                        </div>
                      </div>
                    </div>
                    {vat.last_read_time && (
                       <p className="mt-3 text-xs text-right text-gray-500">
                         Last reading: {vat.last_read_time}
                       </p>
                     )}
                  </>
                ) : (
                  <div className="mt-6 h-[88px] rounded-md bg-gray-900/20 border border-gray-800/50 flex items-center justify-center text-gray-600 text-sm italic">
                    Sensors offline
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <h1 className="text-3xl font-bold text-white">Vats & Sensors</h1>
      <p className="mt-1 text-gray-400">
        Live status and real-time sensor readings from all fermentation vessels.
      </p>

      {/* --- THE DEMO BOX --- */}
      <div className="mt-4 rounded-md border-l-4 border-cyan-400 bg-cyan-900/30 p-5 mb-6 shadow-lg">
        <h4 className="flex items-center font-bold text-cyan-300 mb-2">
           <Sparkles className="mr-2 h-5 w-5" />
           The Demo: Real-Time Data Aggregation
        </h4>
        <p className="mt-2 text-sm text-cyan-100">
          This page demonstrates joining static asset data with high-velocity time-series data.
        </p>
        <ul className="mt-3 list-disc list-inside text-sm text-cyan-100 space-y-2 ml-2 leading-relaxed">
          <li>It uses a specialized SQL technique (<strong>LATERAL JOIN</strong>) to instantly fetch only the <em>most recent</em> sensor reading for each vat from a table of millions of historical rows.</li>
          <li>This avoids expensive subqueries and keeps the dashboard responsive even under heavy IoT load.</li>
        </ul>
      </div>

      {/* --- ColdFusion Orchestration Differentiator (Full Width) --- */}
      <div className="rounded-lg bg-orange-950/20 border border-orange-900/30 p-5 shadow-md mt-4 mb-8">
        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">ColdFusion Orchestration Differentiator</span>
        <p className="text-sm text-gray-300 mt-2 leading-relaxed">
          ColdFusion orchestrates highly efficient time-series sensor mapping using standard SQL. By leveraging advanced relational features like lateral subqueries (`LEFT JOIN LATERAL`), it retrieves the "top 1" sensor temperature/pressure reading per vat in a single database execution round-trip, completely eliminating the N+1 sensor lookup performance trap in application code.
        </p>
      </div>

      {renderContent()}

      {/* --- Educational Section Box (The "Demo Pattern") --- */}
      <div className="mt-8 rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-6">
          <Terminal className="h-6 w-6 text-purple-500" />
          <div>
            <h3 className="text-xl font-bold text-white">Educational Sandbox: Real-Time Time-Series Tracking</h3>
            <p className="text-sm text-gray-400">Leveraging lateral subqueries in standard SQL to capture the most recent child logs efficiently.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Comparison Box */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Subquery Overhead vs. Lateral Joins</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              To get the single latest sensor log for each vessel, traditional subqueries require scanning the entire index repeatedly, or loops in application code run N separate database requests, causing heavy database strain.
            </p>
            
            <div className="space-y-3">
              <div className="rounded bg-gray-950 p-3 border border-red-950/30">
                <span className="text-[10px] font-bold text-red-400 uppercase block">Procedural Loop (N+1 Sensor Selects)</span>
                <p className="text-[10px] text-gray-500 font-mono mt-1 leading-normal">
                  1. SELECT * FROM Vats;<br/>
                  2. For each vat:<br/>
                  {"   SELECT * FROM VatSensorReadings WHERE vat_id = [id] ORDER BY time DESC LIMIT 1;"}<br/>
                  -- Executes 10+ separate time-series scans!
                </p>
              </div>

              <div className="rounded bg-gray-950 p-3 border border-green-950/30">
                <span className="text-[10px] font-bold text-green-400 uppercase block">AlloyDB HTAP (Lateral Subquery)</span>
                <p className="text-[10px] text-gray-400 font-mono mt-1 leading-normal">
                  {"SELECT v.*, lr.temp "}<br/>
                  {"FROM Vats v LEFT JOIN LATERAL ( "}<br/>
                  {"  SELECT temp FROM VatSensorReadings vsr WHERE vsr.vat_id = v.vat_id "}<br/>
                  {"  ORDER BY time DESC LIMIT 1 "}<br/>
                  {") lr ON TRUE ORDER BY v.vat_id ASC;"}
                </p>
              </div>
            </div>
          </div>

          {/* Code Display Panel */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between bg-gray-950 px-4 py-2 rounded-t border-t border-x border-gray-800">
              <span className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-purple-400" />
                AlloyDB Lateral JOIN SQL Query
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
    v.vat_id,
    v.name,
    r.recipe_name as current_batch,
    b.status as batch_status,
    lr.temp,
    lr.pressure,
    TO_CHAR(lr.reading_time, 'YYYY-MM-DD HH24:MI:SS') as last_read_time
FROM Vats v
LEFT JOIN Batches b ON v.current_batch_id = b.batch_id
LEFT JOIN Recipes r ON b.recipe_id = r.recipe_id
-- Highly optimized lateral query: Fetches EXACTLY the latest 1 row per Vat
LEFT JOIN LATERAL (
    SELECT temp, pressure, reading_time
    FROM VatSensorReadings vsr
    WHERE vsr.vat_id = v.vat_id
    ORDER BY reading_time DESC
    LIMIT 1
) lr ON TRUE
ORDER BY v.vat_id ASC;`}</pre>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export default Vats;