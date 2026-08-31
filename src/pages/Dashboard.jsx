import React, { useState, useEffect } from 'react';
import {
  Beaker,
  Package,
  Scan,
  Siren,
  WifiOff,
  Database,
  AlertTriangle,
  Sparkles,
  Terminal,
  Copy,
  Check,
  Smile,
} from 'lucide-react';
import { fetchWithRetry } from '../apiUtils';

// --- Loading/Empty State Components ---
const StatCardLoading = () => (
  <div className="overflow-hidden rounded-lg bg-gray-800 shadow p-5 animate-pulse">
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <div className="h-8 w-8 rounded-full bg-gray-700"></div>
      </div>
      <div className="ml-5 w-0 flex-1">
        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        <div className="h-8 bg-gray-700 rounded w-1/2 mt-2"></div>
      </div>
    </div>
  </div>
);

const AlertsTableLoading = () => (
  <div className="mt-4 overflow-hidden rounded-lg bg-gray-800 shadow">
    <table className="min-w-full divide-y divide-gray-700 animate-pulse">
      <thead className="bg-gray-800">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Batch</th>
          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Vat</th>
          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Sensor</th>
          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Value</th>
          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Level</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-700 bg-gray-800">
        {[...Array(3)].map((_, i) => (
          <tr key={i}>
            <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-3/4"></div></td>
            <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-1/2"></div></td>
            <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-1/2"></div></td>
            <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-1/4"></div></td>
            <td className="px-6 py-4"><div className="h-4 bg-gray-700 rounded w-1/3"></div></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const EmptyAlerts = () => (
  <div className="mt-4 overflow-hidden rounded-lg bg-gray-800 shadow p-10 text-center">
    <Database className="mx-auto h-12 w-12 text-green-500" />
    <h3 className="mt-2 text-sm font-medium text-white">No Active Alerts</h3>
    <p className="mt-1 text-sm text-gray-400">All systems are currently stable.</p>
  </div>
);

const ApiStatusMessage = ({ icon, title, message }) => (
  <div className="mt-8 rounded-lg bg-gray-800 p-10 text-center shadow">
    <div className="flex-shrink-0 flex justify-center">
      {icon}
    </div>
    <h3 className="mt-4 text-lg font-medium text-white">{title}</h3>
    <p className="mt-2 text-sm text-gray-400">{message}</p>
  </div>
);

function Dashboard({ apiStatus, setCurrentPage, setAssistantTab }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [copied, setCopied] = useState(false);

  const iconMap = {
    Beaker,
    Package,
    Scan,
    Siren,
    Smile,
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (apiStatus !== 'online') {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [statsData, alertsData] = await Promise.all([
          fetchWithRetry('/api/v1/dashboard/stats.cfm'),
          fetchWithRetry('/api/v1/dashboard/alerts.cfm')
        ]);

        if (statsData.success) {
          setStats(statsData.stats);
        } else {
          throw new Error(statsData.message || 'Failed to fetch stats');
        }

        if (alertsData.success) {
          setAlerts(alertsData.alerts);
        } else {
          throw new Error(alertsData.message || 'Failed to fetch alerts');
        }

      } catch (e) {
        console.error('Dashboard fetch error:', e);
        if (e.message.includes('Failed to fetch')) {
          setError('Lost connection to API. The server may have gone offline.');
        } else {
          setError(e.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [apiStatus]);

  const copyDashboardCode = () => {
    const code = `(
    SELECT rec.recipe_name AS batch, v.name AS vat, 'Temperature' AS type,
           CAST(r.temp AS VARCHAR) || ' °F' AS value, 'High' AS level, r.reading_time
    FROM VatSensorReadings AS r
    JOIN Batches AS b ON r.batch_id = b.batch_id
    JOIN Recipes AS rec ON b.recipe_id = rec_recipe.recipe_id
    JOIN Vats AS v ON r.vat_id = v.vat_id
    WHERE r.temp > 74.0 AND b.status = 'Fermenting'
    ORDER BY r.reading_time DESC LIMIT 3
)
UNION ALL
(
    SELECT rec.recipe_name AS batch, v.name AS vat, 'Pressure' AS type,
           CAST(r.pressure AS VARCHAR) || ' PSI' AS value, 'High' AS level, r.reading_time
    FROM VatSensorReadings AS r
    JOIN Batches AS b ON r.batch_id = b.batch_id
    JOIN Recipes AS rec ON b.recipe_id = rec.recipe_id
    JOIN Vats AS v ON r.vat_id = v.vat_id
    WHERE r.pressure > 14.5 AND b.status = 'Fermenting'
    ORDER BY r.reading_time DESC LIMIT 2
)
ORDER BY reading_time DESC;`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = () => {
    if (apiStatus === 'offline') {
      return (
        <ApiStatusMessage
          icon={<WifiOff className="h-12 w-12 text-red-500" />}
          title="API Offline"
          message="Cannot connect to the API. The server may be offline or unreachable."
        />
      );
    }
    
    if (error) {
       return (
        <ApiStatusMessage
          icon={<AlertTriangle className="h-12 w-12 text-yellow-500" />}
          title="Error Loading Dashboard Data"
          message={error}
        />
      );
    }

    if (isLoading) {
      return (
        <>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {[...Array(5)].map((_, i) => <StatCardLoading key={i} />)}
          </div>
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-white">Recent Sensor Alerts</h2>
            <AlertsTableLoading />
          </div>
        </>
      );
    }

    return (
      <>
        {/* --- Stats Cards --- */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {stats.map((item) => {
            const IconComponent = iconMap[item.icon] || Beaker;
            return (
              <div
                key={item.name}
                className="overflow-hidden rounded-lg bg-gray-800 shadow border border-gray-700"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <IconComponent
                        className={`h-8 w-8 ${item.color}`}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="truncate text-sm font-medium text-gray-400">
                          {item.name}
                        </dt>
                        <dd className="text-3xl font-semibold text-gray-100 mt-1">
                          {item.value}
                        </dd>
                        {item.subtext && (
                          <dd className="text-[10px] text-gray-500 mt-1 font-mono truncate">
                            {item.subtext}
                          </dd>
                        )}
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* --- Recent Alerts --- */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white">Recent Sensor Alerts</h2>
          {alerts.length === 0 ? (
            <EmptyAlerts />
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg bg-gray-800 shadow border border-gray-700">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Batch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Vat</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Sensor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-100">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 bg-gray-800">
                  {alerts.map((alert, idx) => {
                    const rowClass = 
                      alert.level === 'High' ? 'bg-red-900/20' :
                      alert.level === 'Warning' ? 'bg-yellow-900/20' :
                      'bg-blue-900/20';
                      
                    const badgeClass =
                      alert.level === 'High' ? 'bg-red-200 text-red-800 shadow-sm' :
                      alert.level === 'Warning' ? 'bg-yellow-200 text-yellow-800 shadow-sm' :
                      'bg-blue-200 text-blue-800 shadow-sm';

                    return (
                      <tr key={idx} className={rowClass}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-100">{alert.batch}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">{alert.vat}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">{alert.type}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-100">{alert.value}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${badgeClass}`}>
                            {alert.level}
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
      </>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <h1 className="text-3xl font-bold text-white">Dashboard</h1>
      <p className="mt-1 text-gray-400">
        At-a-glance overview of your brewery operations.
      </p>

      {/* --- THE DEMO BOX --- */}
      <div className="mt-4 rounded-md border-l-4 border-cyan-400 bg-cyan-900/30 p-5 shadow-lg">
        <h4 className="flex items-center font-bold text-cyan-300 mb-2">
           <Sparkles className="mr-2 h-5 w-5" />
           The Demo: Operational Scale (HTAP)
        </h4>
        <p className="mt-2 text-sm text-cyan-100">
          This dashboard might look standard, but it demonstrates <strong>Hybrid Transactional/Analytical Processing (HTAP)</strong>.
        </p>
        <ul className="mt-3 list-disc list-inside text-sm text-cyan-100 space-y-2 ml-2 leading-relaxed">
          <li>The "Recent Sensor Alerts" table below is querying a dataset of <strong>100+ million records</strong> instantly.</li>
          <li>It uses AlloyDB's <strong>Columnar Engine</strong> to scan massive historical data without slowing down real-time operations.</li>
        </ul>

        {/* Quick Hook to conversational Operations Assistant */}
        <div className="mt-4 pt-4 border-t border-cyan-800/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-cyan-200/80">
            Want to query this operational database using plain conversational English?
          </p>
          <button
            onClick={() => {
              if (setAssistantTab) {
                setAssistantTab('operations');
              }
              setCurrentPage('Brewery Assistant');
            }}
            className="inline-flex items-center gap-1.5 rounded bg-cyan-500 px-3.5 py-1.5 text-xs font-bold text-gray-950 hover:bg-cyan-400 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shrink-0 self-start sm:self-auto"
          >
             Try Operations Assistant ➔
          </button>
        </div>
      </div>

      {/* --- ColdFusion Orchestration Differentiator (Full Width) --- */}
      <div className="rounded-lg bg-orange-950/20 border border-orange-900/30 p-5 shadow-md mt-4 mb-6">
        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">ColdFusion Orchestration Differentiator</span>
        <p className="text-sm text-gray-300 mt-2 leading-relaxed">
          ColdFusion orchestrates a real-time HTAP dashboard experience by issuing standard database queries that populate live sensor metrics, active fermentation alerts, and tank statuses concurrently in milliseconds, completely bypassing lag-prone data replication pipelines and complex cache-warming systems.
        </p>
      </div>
      
      {renderContent()}

      {/* --- Educational Section Box (The "Demo Pattern") --- */}
      <div className="mt-8 rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-6">
          <Terminal className="h-6 w-6 text-purple-500" />
          <div>
            <h3 className="text-xl font-bold text-white">Educational Sandbox: Unified HTAP Dashboard Metrics</h3>
            <p className="text-sm text-gray-400">Scanning 100M+ time-series sensor logs for active fermentation alerts without read-replica lag or transactional locks.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Comparison Box */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Fragmented BI Pipelines vs. Live HTAP scans</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Compiling real-time alert counts across millions of time-series sensor logs on traditional operational tables causes severe database locks. Typically, databases resolve this by introducing hourly ETL sync delays or replication lags.
            </p>
            
            <div className="space-y-3">
              <div className="rounded bg-gray-950 p-3 border border-red-950/30">
                <span className="text-[10px] font-bold text-red-400 uppercase block">Relational replication lag (BI Pipeline)</span>
                <p className="text-[10px] text-gray-500 font-mono mt-1 leading-normal">
                  1. Set up periodic cron script to compile sensor counts<br/>
                  2. Wait for analytical warehouse replication<br/>
                  3. Critical warning alerts are delayed by minutes/hours, missing active tank pressure spikes.
                </p>
              </div>

              <div className="rounded bg-gray-950 p-3 border border-green-950/30">
                <span className="text-[10px] font-bold text-green-400 uppercase block">AlloyDB HTAP Engine (Live Alerts)</span>
                <p className="text-[10px] text-gray-400 font-mono mt-1 leading-normal">
                  {"-- ColdFusion queries live time-series sensor alerts directly "}<br/>
                  {"-- using standard SQL UNION ALL groupings "}<br/>
                  {"-- reading from vectorized columnar stores with zero index locks."}
                </p>
              </div>
            </div>
          </div>

          {/* Code Display Panel */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between bg-gray-950 px-4 py-2 rounded-t border-t border-x border-gray-800">
              <span className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-purple-400" />
                Live Dashboard Alerts SQL
              </span>
              <button
                onClick={copyDashboardCode}
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
              <pre>{`SELECT rec.recipe_name AS batch, v.name AS vat, 'Temperature' AS type,
       CAST(r.temp AS VARCHAR) || ' °F' AS value, 'High' AS level, r.reading_time
FROM VatSensorReadings AS r
JOIN Batches AS b ON r.batch_id = b.batch_id
JOIN Recipes AS rec ON b.recipe_id = rec.recipe_id
JOIN Vats AS v ON r.vat_id = v.vat_id
WHERE r.temp > 74.0 AND b.status = 'Fermenting'
ORDER BY r.reading_time DESC LIMIT 3;`}</pre>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export default Dashboard;