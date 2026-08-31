import React, { useState, useEffect, useCallback } from 'react';
import { Flame, Server, Database, BrainCircuit, MessageSquare, Maximize2, X, Activity, Workflow, Sparkles, Hammer, ChevronLeft, ChevronRight, Network, Terminal } from 'lucide-react';

const DIAGRAMS = [
  { id: 'highlevel', title: 'High-Level Architecture', icon: Server, imgSrc: '/images/arch-highlevel.png' },
  { id: 'erd', title: 'Entity Relationship Diagram', icon: Database, imgSrc: '/images/erd.png' },
  { id: 'infra', title: 'Infrastructure Topology', icon: Server, imgSrc: '/images/arch-physical.png' },
  { id: 'cicd', title: 'CI/CD & Deployment Pipeline', icon: Hammer, imgSrc: '/images/flow-cicd.png' },
  { id: 'htap', title: 'Flow: HTAP Dashboard', icon: Activity, imgSrc: '/images/flow-dashboard.png' },
  { id: 'predict', title: 'Flow: Predictive AI', icon: BrainCircuit, imgSrc: '/images/flow-predict.png' },
  { id: 'semantic', title: 'Flow: Semantic Search', icon: Sparkles, imgSrc: '/images/flow-semantic.png' },
  { id: 'agent', title: 'Flow: Agentic AI Loop', icon: MessageSquare, imgSrc: '/images/flow-agent.png' },
  { id: 'ops', title: 'Operations - Physical View', icon: Workflow, imgSrc: '/images/ops-physical.png' },
  { id: 'graph', title: 'Flow: GQL Knowledge Graph', icon: Network, imgSrc: '/images/flow-graph.png' },
];

const ImageModal = ({ currentDiagram, isOpen, onClose, onNext, onPrev }) => {
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNext, onPrev, onClose]);

  if (!isOpen || !currentDiagram) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95 backdrop-blur-sm" onClick={onClose}>

      {/* Navigation Buttons (Left) */}
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className="absolute left-4 sm:left-8 z-50 p-2 rounded-full bg-gray-800/50 text-white hover:bg-orange-500 hover:text-white transition-colors border border-gray-700 hover:border-orange-400"
        aria-label="Previous Diagram"
      >
        <ChevronLeft className="h-8 w-8" />
      </button>

      {/* Main Content */}
      <div className="relative max-w-7xl max-h-[90vh] w-full flex flex-col items-center p-4" onClick={(e) => e.stopPropagation()}>

        {/* Header: Title & Close */}
        <div className="w-full flex items-center justify-between mb-4 px-2 sm:px-0">
          <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center">
            {React.createElement(currentDiagram.icon, { className: "h-6 w-6 mr-3 text-orange-500" })}
            {currentDiagram.title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-full p-2 transition-colors"
            aria-label="Close Modal"
          >
            <X className="h-8 w-8" />
          </button>
        </div>

        {/* Image Container */}
        <div className="relative rounded-lg overflow-hidden shadow-2xl border border-gray-800 bg-gray-900">
          <img
            src={currentDiagram.imgSrc}
            alt={currentDiagram.title}
            className="max-h-[80vh] w-auto object-contain"
            onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/1200x800/1f2937/FFF?text=Diagram+Placeholder" }}
          />
        </div>

        {/* Footer / Pagination Indicator */}
        <div className="mt-4 text-gray-500 text-sm">
          {DIAGRAMS.findIndex(d => d.id === currentDiagram.id) + 1} / {DIAGRAMS.length}
        </div>
      </div>

      {/* Navigation Buttons (Right) */}
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="absolute right-4 sm:right-8 z-50 p-2 rounded-full bg-gray-800/50 text-white hover:bg-orange-500 hover:text-white transition-colors border border-gray-700 hover:border-orange-400"
        aria-label="Next Diagram"
      >
        <ChevronRight className="h-8 w-8" />
      </button>

    </div>
  );
};

function Home({ setCurrentPage, setAssistantTab }) {
  const [selectedDiagramIndex, setSelectedDiagramIndex] = useState(null);

  const openAppModal = (index) => setSelectedDiagramIndex(index);
  const closeAppModal = () => setSelectedDiagramIndex(null);

  const handleNext = useCallback(() => {
    setSelectedDiagramIndex((prev) => (prev + 1) % DIAGRAMS.length);
  }, []);

  const handlePrev = useCallback(() => {
    setSelectedDiagramIndex((prev) => (prev - 1 + DIAGRAMS.length) % DIAGRAMS.length);
  }, []);

  const ArchitectureCard = ({ item, index }) => (
    <div 
      className="group relative overflow-hidden rounded-lg bg-gray-800 border border-gray-700 shadow-md hover:border-orange-500/50 transition-all cursor-pointer flex flex-col"
      onClick={() => openAppModal(index)}
    >
      <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-900/30">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center">
          {React.createElement(item.icon, { className: "h-4 w-4 mr-2 text-orange-500" })}
          {item.title}
        </h3>
        <Maximize2 className="h-4 w-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="flex-1 bg-white/5 relative p-4">
        <img 
          src={item.imgSrc}
          alt={item.title} 
          className="w-full h-48 object-contain opacity-90 group-hover:opacity-100 transition-opacity"
          onError={(e) => {e.target.onerror = null; e.target.src = "https://placehold.co/600x400/1f2937/FFF?text=Diagram+Placeholder"}}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-12">
      {/* --- Hero Section --- */}
      <div className="rounded-2xl bg-gradient-to-r from-orange-900/20 to-gray-900 border border-orange-900/50 p-8">
        <div className="w-full"> 
          <div className="flex items-center mb-4">
            <Flame className="h-10 w-10 text-orange-500 mr-3" />
            <h1 className="text-4xl font-extrabold text-white tracking-tight">
              CF Brews
            </h1>
          </div>
          <p className="text-xl text-orange-100 font-medium mb-4">
            Full-Stack Modernization on Google Cloud
          </p>
          <p className="text-gray-400 text-lg leading-relaxed">
            A reference architecture for <strong>HTAP, No-ETL AI, & GQL Property Graphs</strong>. Demonstrates how <strong>Adobe ColdFusion</strong> orchestrates massive-scale data (AlloyDB) alongside cutting-edge AI (Predictive, Generative, & Semantic) and relationship networks (BigQuery Graph) directly via standard SQL.
          </p>
        </div>
      </div>

      {/* --- Key Differentiators Grid --- */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Core Differentiators</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: HTAP */}
          <div 
            onClick={() => setCurrentPage('Analytics')}
            className="rounded-lg bg-gray-800 p-6 border-t-4 border-cyan-500 shadow-lg cursor-pointer transition-all hover:scale-[1.02] hover:border-cyan-400 hover:bg-gray-800/90 hover:shadow-xl duration-200"
          >
            <div className="flex items-center mb-4">
              <Database className="h-8 w-8 text-cyan-500 mr-3" />
              <h3 className="text-lg font-bold text-white">The "Impossible" Query</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              A dashboard showing live sensor data alongside complex aggregations over <strong>100+ million records</strong>.
            </p>
            <div className="text-sm bg-gray-900/50 p-3 rounded border border-cyan-900/30 text-cyan-100">
              <span className="text-cyan-300 font-semibold">CF Value:</span> Both run in milliseconds using standard <code>&lt;cfquery&gt;</code>. No ETL, no read replicas, zero index management.
            </div>
          </div>

          {/* Card 2: Predictive AI */}
          <div 
            onClick={() => setCurrentPage('Predictive AI')}
            className="rounded-lg bg-gray-800 p-6 border-t-4 border-orange-500 shadow-lg cursor-pointer transition-all hover:scale-[1.02] hover:border-orange-400 hover:bg-gray-800/90 hover:shadow-xl duration-200"
          >
            <div className="flex items-center mb-4">
              <BrainCircuit className="h-8 w-8 text-orange-500 mr-3" />
              <h3 className="text-lg font-bold text-white">Native Predictive AI</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Real-time failure risk assessment using live IoT data piped directly to Gemini Enterprise Agent Platform models.
            </p>
            <div className="text-sm bg-gray-900/50 p-3 rounded border border-orange-900/30 text-orange-100">
              <span className="text-orange-300 font-semibold">CF Value:</span> ColdFusion orchestrates the entire ML pipeline using federated queries and a simple <code>&lt;cfhttp&gt;</code> call. No Python required.
            </div>
          </div>

          {/* Card 3: Hybrid Search & Sentiment */}
          <div 
            onClick={() => setCurrentPage('Semantic Search')}
            className="rounded-lg bg-gray-800 p-6 border-t-4 border-purple-500 shadow-lg cursor-pointer transition-all hover:scale-[1.02] hover:border-purple-400 hover:bg-gray-800/90 hover:shadow-xl duration-200"
          >
            <div className="flex items-center mb-4">
              <Sparkles className="h-8 w-8 text-purple-500 mr-3" />
              <h3 className="text-lg font-bold text-white">Search & Sentiment AI</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Finds beers by flavor "vibe" (vectors accelerated by AlloyDB's HNSW index) and evaluates customer feedback sentiments natively in SQL.
            </p>
            <div className="text-sm bg-gray-900/50 p-3 rounded border border-purple-900/30 text-purple-100">
              <span className="text-purple-300 font-semibold">CF Value:</span> ColdFusion runs semantic searches and sentiment evaluations directly inside standard SQL queries, completely avoiding separate vector DBs and complex AI pipelines.
            </div>
          </div>

          {/* Card 4: Customer 360 Knowledge Graph */}
          <div 
            onClick={() => setCurrentPage('Customer 360')}
            className="rounded-lg bg-gray-800 p-6 border-t-4 border-pink-500 shadow-lg flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] hover:border-pink-400 hover:bg-gray-800/90 hover:shadow-xl duration-200"
          >
            <div>
              <div className="flex items-center mb-4">
                <Network className="h-8 w-8 text-pink-500 mr-3" />
                <h3 className="text-lg font-bold text-white">Customer 360 Graph</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Real-time relationship mining and peer-based collaborative recommendations traversed via GQL path match queries.
              </p>
            </div>
            <div className="text-sm bg-gray-900/50 p-3 rounded border border-pink-900/30 text-pink-100">
              <span className="text-pink-300 font-semibold">CF Value:</span> ColdFusion runs GQL graph queries natively via standard SQL and JDBC, eliminating specialized graph DBs and Cypher driver layers.
            </div>
          </div>

          {/* Card 5: GenAI Agents */}
          <div 
            onClick={() => { setCurrentPage('Brewery Assistant'); setAssistantTab('mcp'); }}
            className="rounded-lg bg-gray-800 p-6 border-t-4 border-green-500 shadow-lg cursor-pointer transition-all hover:scale-[1.02] hover:border-green-400 hover:bg-gray-800/90 hover:shadow-xl duration-200"
          >
            <div className="flex items-center mb-4">
              <MessageSquare className="h-8 w-8 text-green-500 mr-3" />
              <h3 className="text-lg font-bold text-white">Agentic AI Tools</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              "BrewMaster AI" answers complex operational questions by deterministically executing local ColdFusion functions and databases.
            </p>
            <div className="text-sm bg-gray-900/50 p-3 rounded border border-green-900/30 text-green-100">
              <span className="text-green-300 font-semibold">CF Value:</span> ColdFusion acts natively as a Model Context Protocol (MCP) server, converting annotated CFCs into tool schemas automatically for secure GenAI execution.
            </div>
          </div>

          {/* Card 6: Operations Assistant (NL-to-SQL) */}
          <div 
            onClick={() => { setCurrentPage('Brewery Assistant'); setAssistantTab('operations'); }}
            className="rounded-lg bg-gray-800 p-6 border-t-4 border-indigo-500 shadow-lg flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] hover:border-indigo-400 hover:bg-gray-800/90 hover:shadow-xl duration-200"
          >
            <div>
              <div className="flex items-center mb-4">
                <Terminal className="h-8 w-8 text-indigo-500 mr-3" />
                <h3 className="text-lg font-bold text-white">Operations Assistant</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Translate plain English operational questions into secure, executable SQL queries dynamically at the database layer.
              </p>
            </div>
            <div className="text-sm bg-gray-900/50 p-3 rounded border border-indigo-900/30 text-indigo-100">
              <span className="text-indigo-300 font-semibold">CF Value:</span> Bypasses complex ORMs and ML middleware. ColdFusion runs native SQL translation and secures the query boundary using AlloyDB's Parameterized Secure Views (PSVs).
            </div>
          </div>
        </div>
      </div>

      {/* --- Architecture Diagrams (Dynamic Grid) --- */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Architecture & Design</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DIAGRAMS.map((item, index) => (
            <ArchitectureCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>

      <ImageModal 
        currentDiagram={selectedDiagramIndex !== null ? DIAGRAMS[selectedDiagramIndex] : null}
        isOpen={selectedDiagramIndex !== null}
        onClose={closeAppModal}
        onNext={handleNext}
        onPrev={handlePrev}
      />
    </div>
  );
}

export default Home;