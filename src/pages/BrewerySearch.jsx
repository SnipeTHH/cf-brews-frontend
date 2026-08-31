import React, { useState } from 'react';
import { Search, Sparkles, Loader, Info, Beer, WifiOff, AlertTriangle, ArrowRight, Terminal, Copy, Check } from 'lucide-react';
import { fetchWithRetry } from '../apiUtils';

// --- A component to render rich formatted text with bold and list support ---
const FormattedText = ({ text }) => {
  if (!text) return null;
  return (
    <div className="space-y-3">
      {text.split('\n').map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        
        // Process bold text (**text**)
        const parseBold = (str) => {
          const parts = str.split(/\*\*([^*]+)\*\*/g);
          return parts.map((part, i) => {
            if (i % 2 === 1) {
              return <strong key={i} className="text-blue-300 font-bold">{part}</strong>;
            }
            return part;
          });
        };

        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const cleanLine = trimmed.replace(/^[-*]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2 text-sm pl-1">
              <span className="text-blue-400 mt-1.5">•</span>
              <p className="flex-1 text-blue-100 leading-relaxed font-sans font-medium">{parseBold(cleanLine)}</p>
            </div>
          );
        }
        
        return <p key={idx} className="text-sm text-blue-100 leading-relaxed font-sans font-medium">{parseBold(trimmed)}</p>;
      })}
    </div>
  );
};

function BrewerySearch({ apiStatus }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchSummary, setSearchSummary] = useState('');

  const handleSearch = async (e, overrideQuery) => {
    if (e) e.preventDefault();
    const searchTerm = overrideQuery || query;
    if (!searchTerm.trim() || searchTerm.length < 3) return;

    if (overrideQuery) setQuery(overrideQuery);

    setIsSearching(true);
    setError(null);
    setHasSearched(true);
    setResults([]); // Clear previous results
    setSearchSummary(''); // Clear previous summary

    try {
      const response = await fetchWithRetry(`/api/v1/search/beers.cfm?q=${encodeURIComponent(searchTerm)}`);

      if (response.success) {
        setResults(response.data || []);
        setSearchSummary(response.summary || '');
      } else {
        throw new Error(response.error || 'Search failed');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const copySqlCode = () => {
    const code = `-- 1. Build high-performance HNSW vector index in AlloyDB Studio\nCREATE INDEX IF NOT EXISTS recipes_hnsw_idx \nON brews.recipes USING HNSW (recipe_embeddings vector_cosine_ops);\n\n-- 2. Refresh the Columnar Engine cache for the recipes table\nSELECT public.google_columnar_engine_refresh('brews.recipes'::regclass);\n\n-- 3. Run the accelerated hybrid vector search query from ColdFusion\nSELECT \n    recipe_id, recipe_name, style, description,\n    (recipe_embeddings <=> google_ml.embedding('text-gecko'::TEXT, :term::TEXT)::vector) as flavor_score,\n    ts_rank(to_tsvector('english', COALESCE(recipe_name, '') || ' ' || COALESCE(description, '')), plainto_tsquery('english', :term)) as text_rank\nFROM brews.recipes\nWHERE recipe_embeddings IS NOT NULL\nORDER BY flavor_score ASC, text_rank DESC\nLIMIT 6;`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const suggestions = [
    { text: "Tropical Beach Day", query: "Something tropical for a beach day" },
    { text: "Dark Stout w/ Chocolate", query: "Heavy dark stout with chocolate notes" },
    { text: "Citrus IPA", query: "Citrus IPA with strong hops" }
  ];

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <h1 className="text-3xl font-bold text-white mb-1">Semantic Beer Search</h1>
      <p className="text-gray-400 mb-6">
        Powered by AlloyDB AI. Search your catalog using natural language descriptions.
      </p>

      {/* --- EDUCATIONAL DEMO INFO (Top) --- */}
      <div className="mb-8 rounded-md border-l-4 border-cyan-400 bg-cyan-900/30 p-5 shadow-lg">
        <h4 className="flex items-center font-bold text-cyan-300 mb-2">
          <Sparkles className="mr-2 h-5 w-5" />
          The Demo: Hybrid Search & GenAI Sommelier (AlloyDB AI)
        </h4>
        <p className="mt-2 text-sm text-cyan-100">
          This demonstration highlights how <strong>Adobe ColdFusion</strong> can leverage <strong>Google AlloyDB AI</strong> to perform advanced "Hybrid Search" and real-time Retrieval-Augmented Generation (RAG) without external ML frameworks.
        </p>
        <ul className="mt-3 list-disc list-inside text-sm text-cyan-100 space-y-2 ml-2 leading-relaxed">
          <li>
            <strong>Vector Embeddings (The "Vibe"):</strong> When you search, ColdFusion generates a 768-dimensional vector for your query using the <code className="bg-cyan-900/50 px-1 py-0.5 rounded text-cyan-200">text-embedding-gecko</code> model. AlloyDB then finds beers that are <em>mathematically similar</em> in meaning (Cosine Distance), even if they don't share any keywords.
          </li>
          <li>
            <strong>Keyword Ranking (The "Facts"):</strong> Simultaneously, we perform a traditional Full-Text Search to boost results that explicitly mention your keywords (like "Hops" or "Stout").
          </li>
          <li>
            <strong>SQL Orchestration:</strong> The magic happens in a single SQL query. ColdFusion doesn't need to know Python or TensorFlow—it just sends standard SQL to AlloyDB, which handles the vector math and ranking natively at the database layer.
          </li>
          <li>
            <strong>Hardware Acceleration (Columnar Caching):</strong> While standard vector searches require intensive CPU calculations, AlloyDB automatically caches our HNSW index inside the in-memory <strong>Columnar Engine</strong>, guaranteeing sub-millisecond query speeds even under heavy transactional writes.
          </li>
          <li>
            <strong>Sommelier RAG Synthesis (The "Insight"):</strong> Finally, ColdFusion intercepts the matching recipe results and feeds them as context into the new native <code>ChatModel()</code> interface (powered by Gemini). The model acts as an on-the-fly sommelier, summarizing how the matches align with the user's craving and recommending a starter beer in the right-hand panel.
          </li>
        </ul>
      </div>

      {/* --- ColdFusion Orchestration Differentiator (Full Width) --- */}
      <div className="rounded-lg bg-orange-950/20 border border-orange-900/30 p-5 shadow-md mb-8">
        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">ColdFusion Orchestration Differentiator</span>
        <p className="text-sm text-gray-300 mt-2 leading-relaxed">
          ColdFusion acts as a complete, lightweight AI Orchestrator. In a single server-side controller request, it binds AlloyDB hybrid vector search directly with real-time GenAI synthesis. By utilizing the new native <code>ChatModel</code> interface, ColdFusion instantly passes matching search records into Gemini for contextual summarization (RAG), completely bypassing external AI frameworks, complex synchronization pipelines, or Python wrappers.
        </p>
      </div>

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN (Search & Results) */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Search Bar Area */}
          <div className="rounded-lg bg-gray-800 p-6 shadow border border-gray-700">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={apiStatus === 'offline' ? "Search offline..." : "Describe a flavor, mood, or ingredient..."}
                disabled={isSearching || apiStatus === 'offline'}
                className="w-full rounded-xl border border-gray-600 bg-gray-900 py-4 pl-14 pr-32 text-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isSearching || query.length < 3 || apiStatus === 'offline'}
                className="absolute right-2 top-2 bottom-2 rounded-lg bg-orange-600 px-6 font-bold text-white hover:bg-orange-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all flex items-center"
              >
                {isSearching ? <Loader className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                <span className="ml-2 hidden sm:inline">Search</span>
              </button>
            </form>
          </div>

          {/* Results Area */}
          <div className="w-full">
            {error && (
              <div className="rounded-md bg-red-900/30 p-4 flex items-center border border-red-900/50">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-3" />
                <span className="text-red-200">{error}</span>
              </div>
            )}

            {hasSearched && !isSearching && results.length === 0 && !error && (
              <div className="text-center p-12 bg-gray-800/50 rounded-lg border border-gray-700">
                <Beer className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-white font-medium">No matches found</h3>
                <p className="text-gray-400 text-sm mt-1">AlloyDB couldn't find a semantic match for that description.</p>
              </div>
            )}

            {!hasSearched && (
              <div className="text-center p-12 border-2 border-dashed border-gray-800 rounded-lg">
                <Sparkles className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500">Enter a description above to start searching.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((beer, idx) => (
                <div key={idx} className="flex flex-col rounded-lg bg-gray-800 border border-gray-700 overflow-hidden hover:border-orange-500/50 transition-all shadow-lg group">
                  <div className="p-4 border-b border-gray-700 bg-gray-900/40">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-bold text-white truncate group-hover:text-orange-400 transition-colors">{beer.recipe_name}</h3>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Match
                        </div>
                        <div className="text-xs font-mono text-gray-400">
                          {(1 - beer.flavor_score).toFixed(3)}
                        </div>
                      </div>
                    </div>
                    <span className="inline-block mt-1 rounded-full bg-blue-900/30 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-900/50">
                      {beer.style}
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <p className="text-sm text-gray-400 leading-relaxed italic line-clamp-3">
                      "{beer.description || 'No description available.'}"
                    </p>
                    <div className="mt-4 pt-3 border-t border-gray-700/50 flex items-center justify-between text-[10px]">
                      {/* Rank / Match Type Explanation */}
                      <div className="flex items-center text-gray-400" title="Keyword Rank">
                        {Number(beer.text_rank) > 0.01 ? (
                          <span className="flex items-center text-cyan-400 font-bold">
                            <Info className="h-3 w-3 mr-1" />
                            Keyword + Vector
                          </span>
                        ) : (
                          <span className="flex items-center text-purple-400 font-bold">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Pure Concept
                          </span>
                        )}
                      </div>

                      {/* Relevance Score Badge */}
                      <div className={`px-2 py-0.5 rounded font-bold ${beer.flavor_score < 0.55 ? 'bg-green-900/30 text-green-400' :
                          beer.flavor_score < 0.70 ? 'bg-yellow-900/30 text-yellow-400' :
                            'bg-red-900/30 text-red-400'
                        }`}>
                        {beer.flavor_score < 0.55 ? 'HIGH RELEVANCE' : 'PARTIAL MATCH'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (Suggestions & Info) */}
        <div className="space-y-6 lg:sticky lg:top-6">

          {/* Suggestions List */}
          <div className="rounded-lg bg-gray-800 p-5 shadow border border-gray-700">
            <h4 className="text-md font-semibold text-white mb-4 flex items-center">
              <ArrowRight className="h-4 w-4 mr-2 text-orange-500" />
              Try these searches:
            </h4>

            <div className="space-y-3">
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSearch(null, item.query)}
                  disabled={isSearching || apiStatus === 'offline'}
                  className="w-full text-left p-3 rounded-md bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-orange-500/50 transition-all group disabled:opacity-50"
                >
                  <span className="block text-sm text-gray-200 font-medium group-hover:text-orange-200 transition-colors">
                    {item.text}
                  </span>
                  <span className="block text-xs text-gray-500 mt-1 truncate group-hover:text-gray-400">
                    "{item.query}"
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Search Insight */}
          {hasSearched && !isSearching && searchSummary && (
            <div className="rounded-lg bg-blue-950/20 border border-blue-900/30 p-5 shadow-md border-l-4 border-l-blue-400">
              <h4 className="text-md font-semibold text-blue-300 mb-3 flex items-center gap-2 font-sans">
                <Sparkles className="h-5 w-5 text-blue-400" />
                AI Search Insight
              </h4>
              <FormattedText text={searchSummary} />
            </div>
          )}

        </div>

      </div>

      {/* --- Educational Section Box (The "Demo Pattern") --- */}
      <div className="mt-8 rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-6">
          <Terminal className="h-6 w-6 text-purple-500" />
          <div>
            <h3 className="text-xl font-bold text-white">Educational Sandbox: No-ETL Semantic Search</h3>
            <p className="text-sm text-gray-400">Generating vector embeddings and running semantic calculations natively in standard SQL.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Comparison Box */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Standard Vector Search vs. Columnar-Cached HNSW</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Searching millions of high-dimensional vectors under a heavy operational load creates severe database bottlenecks. AlloyDB completely resolves this by vectorizing and caching the HNSW index inside the in-memory Columnar Engine.
            </p>
            
            <div className="space-y-3">
              <div className="rounded bg-gray-950 p-3 border border-red-950/30">
                <span className="text-[10px] font-bold text-red-400 uppercase block">Standard Row-Based HNSW Index</span>
                <p className="text-[10px] text-gray-500 font-mono mt-1 leading-normal">
                  1. Creates standard index on disk/RAM.<br/>
                  2. Vector searches require heavy CPU-intensive graph traversal.<br/>
                  3. Transactional write locks and background updates cause search QPS to drop sharply during operational spikes.
                </p>
              </div>

              <div className="rounded bg-gray-950 p-3 border border-green-950/30">
                <span className="text-[10px] font-bold text-green-400 uppercase block">AlloyDB Columnar-Cached HNSW (HTAP + AI)</span>
                <p className="text-[10px] text-gray-400 font-mono mt-1 leading-normal">
                  {"-- The HNSW index is cached in-memory inside the Columnar Engine "}<br/>
                  {"-- Dynamic vector calculations compile at extreme speed "}<br/>
                  {"-- zero read locks, zero ETL delays, and extremely high QPS under write load."}
                </p>
              </div>
            </div>
          </div>

          {/* Code Display Panel */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between bg-gray-950 px-4 py-2 rounded-t border-t border-x border-gray-800">
              <span className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-purple-400" />
                AlloyDB DDL & Accelerated SQL Hybrid Query
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
              <pre>{`-- 1. Build high-performance HNSW vector index in AlloyDB Studio
CREATE INDEX IF NOT EXISTS recipes_hnsw_idx 
ON brews.recipes USING HNSW (recipe_embeddings vector_cosine_ops);

-- 2. Refresh the Columnar Engine cache for the recipes table
SELECT public.google_columnar_engine_refresh('brews.recipes'::regclass);

-- 3. Run the accelerated hybrid vector search query from ColdFusion
SELECT 
    recipe_id, recipe_name, style, description,
    (recipe_embeddings <=> google_ml.embedding('text-gecko'::TEXT, :term::TEXT)::vector) as flavor_score,
    ts_rank(to_tsvector('english', COALESCE(recipe_name, '') || ' ' || COALESCE(description, '')), plainto_tsquery('english', :term)) as text_rank
FROM brews.recipes
WHERE recipe_embeddings IS NOT NULL
ORDER BY flavor_score ASC, text_rank DESC
LIMIT 6;`}</pre>
            </div>
          </div>

          {/* Hybrid SQL Syntax Explanation (Full Width) */}
          <div className="md:col-span-2 mt-6 border-t border-gray-800 pt-6">
            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-1.5 font-sans">
              <Info className="h-4 w-4 text-purple-400" />
              Hybrid Vector Search SQL Syntax Explained
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
              <div className="bg-gray-950 p-3.5 rounded border border-gray-800 leading-relaxed">
                <strong className="text-purple-400 block mb-1">Vector Distance Operator: &lt;=&gt;</strong>
                <span className="text-gray-400">
                  Calculates <strong>Cosine Distance</strong> (relevance score) between the stored recipe embeddings and the query vector. Closer to <code>0</code> means higher semantic match, which is why we sort by <code>flavor_score ASC</code>.
                </span>
              </div>
              <div className="bg-gray-950 p-3.5 rounded border border-gray-800 leading-relaxed">
                <strong className="text-purple-400 block mb-1">In-Database Embeddings: google_ml.embedding()</strong>
                <span className="text-gray-400">
                  Generates vector embeddings directly inside the query planner by executing Google's <code>text-gecko</code> model on-the-fly, removing the need for pre-vectorization logic in application layers.
                </span>
              </div>
              <div className="bg-gray-950 p-3.5 rounded border border-gray-800 leading-relaxed">
                <strong className="text-purple-400 block mb-1">Keyword Search: ts_rank(to_tsvector(), plainto_tsquery())</strong>
                <span className="text-gray-400">
                  Performs traditional keyword matching. It tokenizes text columns into search-optimized lexemes (<code>to_tsvector</code>) and matches them against keywords (<code>plainto_tsquery</code>), returning a score used to sort results.
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export default BrewerySearch;