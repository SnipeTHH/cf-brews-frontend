import React, { useState, useEffect } from 'react';
import { fetchWithRetry } from '../apiUtils';
import { AlertTriangle, Loader, Sparkles, WifiOff, Package, Terminal, Copy, Check } from 'lucide-react';

function Inventory({ apiStatus }) {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadInventory = async () => {
      if (apiStatus === 'offline') {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchWithRetry('/api/v1/ops/get-inventory.cfm');
        if (data.success) {
          setInventory(data.inventory);
        } else {
          throw new Error(data.error || 'Failed to load inventory.');
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadInventory();
  }, [apiStatus]);

  const copySqlCode = () => {
    const code = `SELECT
    item_id,
    name,
    type,
    quantity_on_hand,
    unit,
    -- Database-level conditional calculation
    CASE
        WHEN quantity_on_hand < 50 THEN 'Low'
        ELSE 'Stocked'
    END AS status
FROM Inventory
ORDER BY type ASC, name ASC;`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = () => {
    if (apiStatus === 'offline') {
      return (
        <div className="p-12 flex flex-col items-center justify-center text-gray-400 bg-gray-800 rounded-lg shadow border border-gray-700">
          <WifiOff className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-white">API Offline</h3>
          <p className="text-sm">Cannot connect to inventory system.</p>
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

    if (inventory.length === 0) {
       return (
         <div className="p-12 text-center text-gray-400 bg-gray-800 rounded-lg shadow border border-gray-700">
           <Package className="mx-auto h-12 w-12 text-gray-600 mb-4" />
           <h3>No inventory items found.</h3>
         </div>
       );
    }

    return (
      <div className="overflow-hidden rounded-lg bg-gray-800 shadow border border-gray-700">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700 bg-gray-800">
            {inventory.map((item) => (
              <tr key={item.item_id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-500">#{item.item_id}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-100 font-medium">{item.name}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">{item.type}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300 font-mono">
                  {item.quantity_on_hand} <span className="text-gray-500 text-xs">{item.unit}</span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      item.status === 'Low'
                        ? 'bg-red-900/50 text-red-300 border border-red-900/50'
                        : 'bg-green-900/30 text-green-300 border border-green-900/50'
                    }`}
                  >
                    {item.status === 'Low' ? 'LOW STOCK' : 'IN STOCK'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <h1 className="text-3xl font-bold text-white">Inventory</h1>
      <p className="mt-1 text-gray-400">
        Manage hops, malt, yeast, and other raw ingredients.
      </p>

      {/* --- THE DEMO BOX --- */}
      <div className="mt-4 rounded-md border-l-4 border-cyan-400 bg-cyan-900/30 p-5 mb-6 shadow-lg">
        <h4 className="flex items-center font-bold text-cyan-300 mb-2">
           <Sparkles className="mr-2 h-5 w-5" />
           The Demo: AI Resource Layer
        </h4>
        <p className="mt-2 text-sm text-cyan-100">
          While this page is a simple operational view, this data is critical for the <strong>BrewMaster AI Agent</strong>.
        </p>
        <ul className="mt-3 list-disc list-inside text-sm text-cyan-100 space-y-2 ml-2 leading-relaxed">
          <li>It serves as the "ground truth" for resource availability.</li>
          <li>The agent uses this exact data to perform "Cross-Domain Reasoning"—calculating if future recipes can be brewed based on these current stock levels.</li>
        </ul>
      </div>

      {/* --- ColdFusion Orchestration Differentiator (Full Width) --- */}
      <div className="rounded-lg bg-orange-950/20 border border-orange-900/30 p-5 shadow-md mt-4 mb-8">
        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">ColdFusion Orchestration Differentiator</span>
        <p className="text-sm text-gray-300 mt-2 leading-relaxed">
          ColdFusion delegates dynamic status warnings directly to standard SQL expressions. By calculating item safety parameters inline using conditional statements (`CASE WHEN`), it returns formatted and clean pre-computed metrics directly to the visual client, avoiding redundant logic iterations in application memory.
        </p>
      </div>

      {renderContent()}

      {/* --- Educational Section Box (The "Demo Pattern") --- */}
      <div className="mt-8 rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-6">
          <Terminal className="h-6 w-6 text-purple-500" />
          <div>
            <h3 className="text-xl font-bold text-white">Educational Sandbox: Conditional SQL Expressions</h3>
            <p className="text-sm text-gray-400">Computing operational statuses and business warnings at the database layer using standard SQL CASE statements.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Comparison Box */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Procedural Loops vs. Declarative SQL</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Evaluating safety reorder levels (e.g., warning flags when stock falls below 50 units) inside application loops clutters code logic, bloats backend data structures, and introduces redundant iterations over row sets. In modern DB architectures, this logic is declared natively.
            </p>
            
            <div className="space-y-3">
              <div className="rounded bg-gray-950 p-3 border border-red-950/30">
                <span className="text-[10px] font-bold text-red-400 uppercase block">Procedural Code (Looping logic)</span>
                <p className="text-[10px] text-gray-500 font-mono mt-1 leading-normal">
                  1. SELECT item_id, quantity FROM Inventory;<br/>
                  2. Loop over results in ColdFusion/Javascript:<br/>
                  {"   if (row.quantity < 50) { row.status = 'Low'; }"}<br/>
                  {"   else { row.status = 'Stocked'; }"}
                </p>
              </div>

              <div className="rounded bg-gray-950 p-3 border border-green-950/30">
                <span className="text-[10px] font-bold text-green-400 uppercase block">AlloyDB Declarative SQL (Case Evaluation)</span>
                <p className="text-[10px] text-gray-400 font-mono mt-1 leading-normal">
                  {"SELECT item_id, quantity_on_hand, "}<br/>
                  {"  CASE WHEN quantity_on_hand < 50 THEN 'Low' "}<br/>
                  {"  ELSE 'Stocked' END AS status FROM Inventory;"}
                </p>
              </div>
            </div>
          </div>

          {/* Code Display Panel */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between bg-gray-950 px-4 py-2 rounded-t border-t border-x border-gray-800">
              <span className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-purple-400" />
                Inventory Status SQL Query
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
    item_id,
    name,
    type,
    quantity_on_hand,
    unit,
    -- Database-level conditional calculation
    CASE
        WHEN quantity_on_hand < 50 THEN 'Low'
        ELSE 'Stocked'
    END AS status
FROM Inventory
ORDER BY type ASC, name ASC;`}</pre>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export default Inventory;