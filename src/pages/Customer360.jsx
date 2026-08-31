import React, { useState, useEffect } from 'react';
import { Network, HelpCircle, Users, Beaker, Copy, Check, RefreshCw, Terminal, Sparkles, Info } from 'lucide-react';
import { fetchWithRetry } from '../apiUtils';

const SEEDED_CUSTOMERS = [
  'Aaron', 'Bob', 'Charlie', 'Dave', 'Eve',
  'Fiona', 'George', 'Hannah', 'Ian', 'Julia'
];

function Customer360({ apiStatus }) {
  const [activeCustomer, setActiveCustomer] = useState('Ian');
  const [graphData, setGraphData] = useState([]);
  const [profileSummary, setProfileSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch graph data when active customer changes
  useEffect(() => {
    const loadGraphData = async () => {
      if (apiStatus === 'offline') return;
      setIsLoading(true);
      setError(null);
      setProfileSummary('');
      try {
        const res = await fetchWithRetry(`/api/v1/graph/recommendations.cfm?name=${encodeURIComponent(activeCustomer)}`);
        if (res.success) {
          setGraphData(res.data || []);
          setProfileSummary(res.summary || '');
        } else {
          setError(res.error || 'Failed to retrieve graph data.');
        }
      } catch (e) {
        setError(e.message || 'An error occurred connecting to the graph database.');
      } finally {
        setIsLoading(false);
      }
    };

    loadGraphData();
  }, [activeCustomer, apiStatus]);

  // Parse recommendations into visual nodes and edges
  const getNodesAndEdges = () => {
    const nodes = [];
    const edges = [];

    // Central Node (Active Customer)
    const centerNode = {
      id: 'me',
      label: activeCustomer,
      type: 'customer',
      x: 300,
      y: 200,
      details: 'Selected Profile (Loyalty: Gold)'
    };
    nodes.push(centerNode);

    if (graphData.length === 0) return { nodes, edges };

    // Extract unique friends and unique beers
    const uniqueFriends = [...new Set(graphData.map(item => item.friend_name))];
    const uniqueBeers = [...new Set(graphData.map(item => item.beer_name))];

    // 1. Map Friends (Inner Circle, Radius = 110px)
    const friendPositions = {};
    uniqueFriends.forEach((friend, index) => {
      const angle = (index / uniqueFriends.length) * 2 * Math.PI - Math.PI / 2;
      const fx = 300 + 110 * Math.cos(angle);
      const fy = 200 + 110 * Math.sin(angle);
      
      const friendNode = {
        id: `friend_${friend}`,
        label: friend,
        type: 'friend',
        x: fx,
        y: fy,
        details: `Friend (Purchased ${graphData.filter(d => d.friend_name === friend).length} distinct styles)`
      };
      nodes.push(friendNode);
      friendPositions[friend] = { x: fx, y: fy };

      // Edge: Center -> Friend (FRIEND_OF relationship)
      edges.push({
        id: `edge_friend_${friend}`,
        source: 'me',
        target: `friend_${friend}`,
        label: 'FRIEND_OF',
        x1: 300,
        y1: 200,
        x2: fx,
        y2: fy
      });
    });

    // 2. Map Beers (Outer Circle, Radius = 180px)
    const beerPositions = {};
    uniqueBeers.forEach((beer, index) => {
      const angle = (index / uniqueBeers.length) * 2 * Math.PI - Math.PI / 3;
      const bx = 300 + 180 * Math.cos(angle);
      const by = 200 + 180 * Math.sin(angle);

      // Find matching style
      const matchingItem = graphData.find(item => item.beer_name === beer);
      const style = matchingItem ? matchingItem.beer_style : 'Craft Style';

      const beerNode = {
        id: `beer_${beer}`,
        label: beer,
        type: 'beer',
        x: bx,
        y: by,
        details: `Style: ${style} (Recommended Peer Choice)`
      };
      nodes.push(beerNode);
      beerPositions[beer] = { x: bx, y: by };
    });

    // 3. Map Edges: Friend -> Beer (BUY relationship)
    graphData.forEach(item => {
      const fPos = friendPositions[item.friend_name];
      const bPos = beerPositions[item.beer_name];
      if (fPos && bPos) {
        edges.push({
          id: `edge_buy_${item.friend_name}_${item.beer_name}`,
          source: `friend_${item.friend_name}`,
          target: `beer_${item.beer_name}`,
          label: 'BUY',
          x1: fPos.x,
          y1: fPos.y,
          x2: bPos.x,
          y2: bPos.y
        });
      }
    });

    return { nodes, edges };
  };

  const { nodes, edges } = getNodesAndEdges();

  const copyGqlCode = () => {
    const code = `SELECT *
FROM GRAPH_TABLE(
  \`cf_brews_dataset.customer_360_graph\`
  MATCH 
    (me:Customer)-[:FRIEND_OF]-(friend:Customer)-[buy:BUY]->(rec_beer:Beer)
  WHERE me.customer_name = '${activeCustomer}'
    AND NOT EXISTS { 
      MATCH (m2:Customer)-[:BUY]->(rb2:Beer)
      WHERE m2.customer_id = me.customer_id 
        AND rb2.beer_id = rec_beer.beer_id
    }
  COLUMNS (
    friend.customer_name AS friend_name,
    rec_beer.beer_name AS beer_name,
    rec_beer.style AS beer_style
  )
)
LIMIT 6;`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      
      {/* --- Page Header --- */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
            <Network className="h-8 w-8 text-orange-500" />
            Customer 360 Graph Analytics
          </h1>
          <p className="text-gray-400">
            Powered by BigQuery SQL Property Graph (a type of Knowledge Graph). Mine relationship networks natively inside standard SQL.
          </p>
        </div>


      </div>

      {/* --- EDUCATIONAL DEMO INFO (Top Cyan Box) --- */}
      <div className="rounded-md border-l-4 border-cyan-400 bg-cyan-900/30 p-5 shadow-lg">
        <h4 className="flex items-center font-bold text-cyan-300 mb-2">
          <Sparkles className="mr-2 h-5 w-5" />
          The Demo: Taproom Relationship Mining (Property & Knowledge Graphs)
        </h4>
        <p className="mt-2 text-sm text-cyan-100">
          This demonstration highlights how <strong>Adobe ColdFusion</strong> operates as the orchestration manager to execute advanced graph relationship analysis across massive transactional databases using <strong>BigQuery SQL Property Graph (a core framework for building enterprise Knowledge Graphs)</strong>.
        </p>
        <ul className="mt-3 list-disc list-inside text-sm text-cyan-100 space-y-2 ml-2 leading-relaxed">
          <li>
            <strong>Multi-hop Network Analysis:</strong> GQL path matching (`MATCH`) naturally navigates complex relations like *friends of friends who ordered specific recipes*, replacing bloated relational SQL joins.
          </li>
          <li>
            <strong>No-ETL Analytics:</strong> Transactional profiles, feedback logs, and order tables written in <strong>AlloyDB</strong> are mapped in real-time in <strong>BigQuery</strong> without any data pipeline migration latency.
          </li>
          <li>
            <strong>JDBC Simplicity:</strong> ColdFusion executes these queries directly via standard SQL. No custom graph drivers, cypher layers, or specialized graph databases are required by the developer.
          </li>
        </ul>
      </div>

      {/* --- ColdFusion Orchestration Differentiator (Full Width between Top and Grid) --- */}
      <div className="rounded-lg bg-orange-950/20 border border-orange-900/30 p-5 shadow-md">
        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">ColdFusion Orchestration Differentiator</span>
        <p className="text-sm text-gray-300 mt-2 leading-relaxed">
          ColdFusion processes BigQuery SQL Property Graph queries natively via standard SQL syntax. Standard JDBC driver queries are mapped to arrays of structures dynamically, completely eliminating custom graph drivers, complex cypher layers, or specialized databases.
        </p>
      </div>

      {/* --- Main Content Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* A. Interactive Graph Canvas */}
        <div className="lg:col-span-2 rounded-xl bg-gray-950 border border-gray-800 p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[450px] shadow-2xl">
          
          {/* Loading & Error Overlays */}
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm">
              <RefreshCw className="h-10 w-10 animate-spin text-orange-500" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-950/90 p-6 text-center">
              <HelpCircle className="h-12 w-12 text-red-500 mb-3" />
              <p className="text-red-400 font-medium">{error}</p>
              <button 
                onClick={() => setActiveCustomer(activeCustomer)}
                className="mt-4 rounded bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700 border border-gray-700"
              >
                Retry Load
              </button>
            </div>
          )}

          {/* Node Info Floating Tooltip */}
          <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur border border-gray-800 rounded-lg p-3 max-w-xs shadow-lg">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Node Details</h4>
            <p className="text-sm font-bold text-white mt-1">
              {hoveredNode ? hoveredNode.label : activeCustomer}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {hoveredNode ? hoveredNode.details : 'Central Active Profile Node'}
            </p>
          </div>

          {/* SVG Element */}
          <svg 
            viewBox="0 0 600 400" 
            className="w-full max-w-[600px] h-auto relative z-0 aspect-[3/2]"
          >
            {/* Gradients and Filters definitions */}
            <defs>
              <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Render glowing backdrops */}
            <circle cx="300" cy="200" r="80" fill="url(#centerGlow)" />

            {/* Render Edges (Lines) */}
            {edges.map((edge) => {
              const isHovered = hoveredNode && 
                (hoveredNode.id === edge.source || hoveredNode.id === edge.target);

              return (
                <g key={edge.id}>
                  <line
                    x1={edge.x1}
                    y1={edge.y1}
                    x2={edge.x2}
                    y2={edge.y2}
                    stroke={isHovered ? '#a855f7' : '#374151'}
                    strokeWidth={isHovered ? 3 : 1.5}
                    strokeDasharray={isHovered ? '5,5' : 'none'}
                    className={isHovered ? 'animate-[dash_2s_linear_infinite]' : ''}
                    transition="all 0.3s"
                  />
                  
                  {/* Relationship edge label at midpoint */}
                  {isHovered && (
                    <rect
                      x={(edge.x1 + edge.x2) / 2 - 45}
                      y={(edge.y1 + edge.y2) / 2 - 10}
                      width="90"
                      height="20"
                      rx="4"
                      fill="#0f172a"
                      stroke="#a855f7"
                      strokeWidth="1"
                    />
                  )}
                  {isHovered && (
                    <text
                      x={(edge.x1 + edge.x2) / 2}
                      y={(edge.y1 + edge.y2) / 2 + 4}
                      fill="#c084fc"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Render Nodes (Circles) */}
            {nodes.map((node) => {
              const isHovered = hoveredNode && hoveredNode.id === node.id;
              const isCentral = node.type === 'customer';
              const isFriend = node.type === 'friend';
              
              let fill = '#111827';
              let stroke = '#4b5563';
              if (isCentral) { stroke = '#f97316'; fill = '#1c1917'; }
              else if (isFriend) { stroke = '#06b6d4'; fill = '#083344'; }
              else { stroke = '#22c55e'; fill = '#064e3b'; }

              return (
                <g 
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    r={isCentral ? 20 : isHovered ? 17 : 14}
                    fill={fill}
                    stroke={isHovered ? '#a855f7' : stroke}
                    strokeWidth={isHovered ? 3 : 2.5}
                    className="transition-all duration-200 ease-out"
                  />
                  <text
                    y={isCentral ? 35 : 25}
                    textAnchor="middle"
                    fill="#e5e7eb"
                    fontSize={isCentral ? 12 : 10}
                    fontWeight={isCentral ? 'bold' : 'normal'}
                    className="pointer-events-none"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* B. Right-Side Informational Panel */}
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 flex flex-col justify-between shadow-xl">
          <div>
            {/* Dropdown Select */}
            <div className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg mb-6">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-2">Focus Profile:</span>
              <select
                value={activeCustomer}
                onChange={(e) => setActiveCustomer(e.target.value)}
                className="bg-gray-900 text-orange-400 border border-gray-600 rounded px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                {SEEDED_CUSTOMERS.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 border-b border-gray-800 pb-3 mb-4">
              <Users className="h-5 w-5 text-cyan-500" />
              <h3 className="text-lg font-bold text-white">Taproom Relationships</h3>
            </div>

            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              BigQuery Property Graph (a type of Knowledge Graph) GQL query analyzes peer connections inside the active customer's network in real-time.
            </p>

            <div className="space-y-4">
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                <span className="text-xs font-bold text-gray-500 uppercase block">Customer Focus</span>
                <span className="text-base font-bold text-white mt-1 block">{activeCustomer}</span>
                <span className="text-xs text-orange-400 mt-1 block font-medium">Loyalty Tier: Gold</span>
              </div>

              <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                <span className="text-xs font-bold text-gray-500 uppercase block">Graph Results Found</span>
                <span className="text-xl font-extrabold text-cyan-400 mt-1 block">{graphData.length} Recommendations</span>
                <span className="text-xs text-gray-500 mt-1 block">Discovered through multi-hop relationships.</span>
              </div>

              {profileSummary && (
                <div className="rounded-lg bg-blue-950/20 border border-blue-900/30 p-5 shadow-md border-l-4 border-l-blue-400 mt-4">
                  <h4 className="text-md font-semibold text-blue-300 mb-3 flex items-center gap-2 font-sans">
                    <Sparkles className="h-5 w-5 text-blue-400" />
                    AI Profile Insight
                  </h4>
                  <p className="text-sm text-blue-100 leading-relaxed font-sans font-medium">
                    {profileSummary}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* --- Educational Section Box (The "Demo Pattern") --- */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-6">
          <Terminal className="h-6 w-6 text-purple-500" />
          <div>
            <h3 className="text-xl font-bold text-white">Educational Sandbox: Property Graph traversal</h3>
            <p className="text-sm text-gray-400">Traversing multi-hop social structures using standard GQL match rules.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Comparison Box */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Traditional SQL vs. Modern Graph</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Mining friends' orders that you have not ordered yet requires complex multi-way relational self-joins in standard relational databases. This causes highly bloated queries that are prone to logical traps and performance bottlenecks.
            </p>
            
            <div className="space-y-3">
              <div className="rounded bg-gray-950 p-3 border border-red-950/30">
                <span className="text-[10px] font-bold text-red-400 uppercase block">Relational (Bloated SQL JOINs)</span>
                <p className="text-[10px] text-gray-500 font-mono mt-1 leading-normal">
                  SELECT r.name FROM customers c <br/>
                  JOIN social_links sl ON c.id = sl.c_id_1 <br/>
                  JOIN customers f ON sl.c_id_2 = f.id <br/>
                  JOIN orders o ON f.id = o.c_id <br/>
                  WHERE NOT EXISTS (SELECT 1 FROM orders WHERE c_id = c.id)...
                </p>
              </div>

              <div className="rounded bg-gray-950 p-3 border border-green-950/30">
                <span className="text-[10px] font-bold text-green-400 uppercase block">BigQuery GQL (Natural Graph Path)</span>
                <p className="text-[10px] text-gray-400 font-mono mt-1 leading-normal">
                  {"MATCH (me:Customer)-[:FRIEND_OF]-(friend:Customer)-[:BUY]->(rec_beer:Beer)"} <br/>
                  {`WHERE me.name = '${activeCustomer}'`} <br/>
                  {"AND NOT EXISTS { MATCH (me)-[:BUY]->(rec_beer) }"}
                </p>
              </div>
            </div>
          </div>

          {/* Code Display Panel */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between bg-gray-950 px-4 py-2 rounded-t border-t border-x border-gray-800">
              <span className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-purple-400" />
                BigQuery GQL Query
              </span>
              <button
                onClick={copyGqlCode}
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
              <pre>{`SELECT *
FROM GRAPH_TABLE(
  \`cf_brews_dataset.customer_360_graph\`
  MATCH 
    (me:Customer)-[:FRIEND_OF]-(friend:Customer)-[buy:BUY]->(rec_beer:Beer)
  WHERE me.customer_name = '${activeCustomer}'
    AND NOT EXISTS { 
      MATCH (m2:Customer)-[:BUY]->(rb2:Beer)
      WHERE m2.customer_id = me.customer_id 
        AND rb2.beer_id = rec_beer.beer_id
    }
  COLUMNS (
    friend.customer_name AS friend_name,
    rec_beer.beer_name AS beer_name,
    rec_beer.style AS beer_style
  )
)
LIMIT 6;`}</pre>
            </div>
          </div>

          {/* GQL MATCH Syntax Explanation (Full Width) */}
          <div className="md:col-span-2 mt-6 border-t border-gray-800 pt-6">
            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-1.5 font-sans">
              <Info className="h-4 w-4 text-purple-400" />
              BigQuery GQL MATCH Syntax Explained
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
              <div className="bg-gray-950 p-3.5 rounded border border-gray-800 leading-relaxed">
                <strong className="text-purple-400 block mb-1">Nodes & Labels: (me:Customer)</strong>
                <span className="text-gray-400">
                  Parentheses represent entities (nodes). In <code>(me:Customer)</code>, <code>me</code> is the variable reference, and <code>Customer</code> is the label matching the entity type in the graph definition.
                </span>
              </div>
              <div className="bg-gray-950 p-3.5 rounded border border-gray-800 leading-relaxed">
                <strong className="text-purple-400 block mb-1">Relationships: -[:FRIEND_OF]-</strong>
                <span className="text-gray-400">
                  Square brackets represent relationship types (edges). Undirected hyphens <code>-</code> mean a mutual connection, while arrows <code>-&gt;</code> represent directed actions.
                </span>
              </div>
              <div className="bg-gray-950 p-3.5 rounded border border-gray-800 leading-relaxed">
                <strong className="text-purple-400 block mb-1">Anti-Join Pattern: NOT EXISTS {"{}"}</strong>
                <span className="text-gray-400">
                  To recommend beers the user has <em>not</em> bought yet, the query runs a sub-path MATCH assertion inside a <code>NOT EXISTS</code> block, matching the active user to the suggested beer.
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export default Customer360;
