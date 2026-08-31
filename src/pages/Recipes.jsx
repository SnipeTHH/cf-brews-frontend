import React, { useState, useEffect } from 'react';
import { fetchWithRetry } from '../apiUtils';
import { AlertTriangle, Loader, Sparkles, WifiOff, BookTemplate, Thermometer, Droplet, Terminal, Copy, Check } from 'lucide-react';

function Recipes({ apiStatus }) {
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadRecipes = async () => {
      if (apiStatus === 'offline') {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const data = await fetchWithRetry('/api/v1/ops/get-recipes.cfm');
        if (data.success) {
          setRecipes(data.recipes);
        } else {
          throw new Error(data.error || 'Failed to load recipes.');
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadRecipes();
  }, [apiStatus]);

  const copySqlCode = () => {
    const code = `SELECT
    r.recipe_id,
    r.recipe_name,
    r.style,
    r.ideal_min_temp,
    r.ideal_max_temp,
    r.target_ph,
    r.target_abv,
    -- Nested JSON Array of child ingredients in a single query
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'item', i.name,
                'amount', ri.amount_per_gallon,
                'unit', i.unit
            ) ORDER BY ri.amount_per_gallon DESC
        ) FILTER (WHERE i.name IS NOT NULL),
        '[]'::jsonb
    ) AS ingredients
FROM Recipes r
LEFT JOIN RecipeIngredients ri ON r.recipe_id = ri.recipe_id
LEFT JOIN Inventory i ON ri.inventory_item_id = i.item_id
GROUP BY r.recipe_id
ORDER BY r.recipe_name ASC;`;
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
        </div>
      );
    }
    if (isLoading) {
      return <div className="p-20 flex justify-center"><Loader className="h-10 w-10 text-orange-500 animate-spin" /></div>;
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
        {recipes.map((recipe) => (
          <div key={recipe.recipe_id} className="overflow-hidden rounded-lg bg-gray-800 shadow-lg border border-gray-700 flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-gray-700 bg-gray-800/50">
              <h3 className="text-xl font-bold text-white truncate">{recipe.recipe_name}</h3>
              <span className="inline-flex mt-2 items-center rounded-full bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-300 border border-blue-900/50">
                {recipe.style}
              </span>
            </div>
            
            {/* Vitals */}
            <div className="px-5 py-3 bg-gray-900/30 grid grid-cols-2 gap-2 text-sm border-b border-gray-700/50">
               <div className="flex items-center text-gray-300" title="Ideal Fermentation Temp Range">
                 <Thermometer className="h-4 w-4 mr-2 text-orange-400" />
                 {recipe.ideal_min_temp}° - {recipe.ideal_max_temp}°F
               </div>
               <div className="flex items-center text-gray-300" title="Target pH">
                 <Droplet className="h-4 w-4 mr-2 text-cyan-400" />
                 pH {recipe.target_ph}
               </div>
               {recipe.target_abv && (
                 <div className="col-span-2 flex items-center text-gray-300 mt-1" title="Target ABV">
                   <span className="font-bold text-purple-400 mr-2">ABV:</span> {recipe.target_abv}%
                 </div>
               )}
            </div>

            {/* Ingredients List */}
            <div className="flex-1 p-5">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Bill of Materials (per gal)
              </h4>
              <ul className="space-y-2">
                {recipe.ingredients && recipe.ingredients.length > 0 ? (
                   recipe.ingredients.map((ing, idx) => (
                    <li key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-300">{ing.item}</span>
                      <span className="text-gray-500 font-mono">{Number(ing.amount).toFixed(2)} {ing.unit === 'units' ? '' : ing.unit}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-500 italic">No ingredients listed.</li>
                )}
              </ul>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Recipe Book</h1>
          <p className="mt-1 text-gray-400">Master catalog of all authorized brew formulations.</p>
        </div>
      </div>

      {/* --- THE DEMO BOX --- */}
      <div className="mt-4 rounded-md border-l-4 border-cyan-400 bg-cyan-900/30 p-5 mb-8 shadow-lg">
        <h4 className="flex items-center font-bold text-cyan-300 mb-2">
           <Sparkles className="mr-2 h-5 w-5" />
           The Demo: Complex JSON Aggregation
        </h4>
        <p className="mt-2 text-sm text-cyan-100">
          Instead of running dozens of separate queries to fetch ingredients for every recipe (the N+1 query loop problem), this page uses <strong>AlloyDB's native JSON functions</strong>.
        </p>
        <p className="mt-2 text-sm text-cyan-100">
          A single SQL query groups all child ingredients into nested JSON arrays instantly, which ColdFusion simply passes through to the frontend.
        </p>
      </div>

      {/* --- ColdFusion Orchestration Differentiator (Full Width) --- */}
      <div className="rounded-lg bg-orange-950/20 border border-orange-900/30 p-5 shadow-md mt-4 mb-8">
        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">ColdFusion Orchestration Differentiator</span>
        <p className="text-sm text-gray-300 mt-2 leading-relaxed">
          ColdFusion leverages AlloyDB's native JSON capabilities by mapping nested SQL queries directly to an array of structures dynamically in the database driver, completely avoiding complex data hydration loops and nested looping queries in application code.
        </p>
      </div>

      {renderContent()}

      {/* --- Educational Section Box (The "Demo Pattern") --- */}
      <div className="mt-8 rounded-xl bg-gray-900 border border-gray-800/50 p-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-6">
          <Terminal className="h-6 w-6 text-purple-500" />
          <div>
            <h3 className="text-xl font-bold text-white">Educational Sandbox: Solving N+1 Performance Traps</h3>
            <p className="text-sm text-gray-400">Utilizing PostgreSQL JSON functions to aggregate nested child relational arrays natively in a single SQL execution.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Comparison Box */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Traditional N+1 Loops vs. JSON Aggregation</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Looping over recipe datasets in application code and running subsequent SQL calls to fetch ingredients for each item causes severe database round-trip latency. In modern setups, we aggregate these child structures directly inside the parent SQL query.
            </p>
            
            <div className="space-y-3">
              <div className="rounded bg-gray-950 p-3 border border-red-950/30">
                <span className="text-[10px] font-bold text-red-400 uppercase block">Traditional Loop (N+1 Select Bottleneck)</span>
                <p className="text-[10px] text-gray-500 font-mono mt-1 leading-normal">
                  1. SELECT * FROM Recipes;<br/>
                  2. For each recipe:<br/>
                  {"   SELECT * FROM RecipeIngredients WHERE r_id = [id]"}<br/>
                  -- Executes 20+ separate database round-trip calls!
                </p>
              </div>

              <div className="rounded bg-gray-950 p-3 border border-green-950/30">
                <span className="text-[10px] font-bold text-green-400 uppercase block">AlloyDB HTAP (Dynamic JSON Nesting)</span>
                <p className="text-[10px] text-gray-400 font-mono mt-1 leading-normal">
                  {"SELECT r.*, "}<br/>
                  {"  jsonb_agg(jsonb_build_object('item', i.name, 'amount', ri.amount)) "}<br/>
                  {"FROM Recipes r LEFT JOIN ... GROUP BY r.recipe_id;"}
                </p>
              </div>
            </div>
          </div>

          {/* Code Display Panel */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between bg-gray-950 px-4 py-2 rounded-t border-t border-x border-gray-800">
              <span className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-purple-400" />
                AlloyDB JSON Aggregation Query
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
    r.recipe_id,
    r.recipe_name,
    r.style,
    r.ideal_min_temp,
    r.ideal_max_temp,
    r.target_ph,
    r.target_abv,
    -- Nested JSON Array of child ingredients in a single query
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'item', i.name,
                'amount', ri.amount_per_gallon,
                'unit', i.unit
            ) ORDER BY ri.amount_per_gallon DESC
        ) FILTER (WHERE i.name IS NOT NULL),
        '[]'::jsonb
    ) AS ingredients
FROM Recipes r
LEFT JOIN RecipeIngredients ri ON r.recipe_id = ri.recipe_id
LEFT JOIN Inventory i ON ri.inventory_item_id = i.item_id
GROUP BY r.recipe_id
ORDER BY r.recipe_name ASC;`}</pre>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export default Recipes;