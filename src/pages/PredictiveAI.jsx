import React, { useState, useEffect } from 'react';
import { BrainCircuit, Siren, WifiOff, AlertTriangle, Terminal, Copy, Check, Info, Sparkles } from 'lucide-react';
import { fetchWithRetry } from '../apiUtils.js'; 

// --- A component for API status ---
const ApiStatusMessage = ({ icon, title, message }) => (
  <div className="mt-8 max-w-lg rounded-lg bg-gray-800 p-10 text-center shadow">
    <div className="flex-shrink-0 flex justify-center">
      {icon}
    </div>
    <h3 className="mt-4 text-lg font-medium text-white">{title}</h3>
    <p className="mt-2 text-sm text-gray-400">{message}</p>
  </div>
);

// --- Loading skeleton ---
const PredictorLoading = () => (
  <div className="mt-6 max-w-lg rounded-lg bg-gray-800 p-5 shadow animate-pulse">
    <div className="h-5 bg-gray-700 rounded w-3/4"></div>
    <div className="h-4 bg-gray-700 rounded w-full mt-3"></div>
    
    <div className="mt-4 space-y-4">
      <div>
        <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
        <div className="h-10 bg-gray-900 rounded w-full"></div>
      </div>
      <div className="h-10 bg-orange-800 opacity-70 rounded w-full"></div>
    </div>
  </div>
);

// --- Prediction Loading Skeleton ---
const PredictionLoadingSkeleton = () => (
  <div className="rounded-lg border-2 border-gray-700 bg-gray-800/50 p-5 shadow-xl animate-pulse">
    <div className="flex items-center">
      <div className="h-10 w-10 rounded-full bg-gray-700"></div>
      <div className="ml-4 w-full">
        <div className="h-6 w-1/3 bg-gray-700 rounded mb-2"></div>
        <div className="h-10 w-2/3 bg-gray-700 rounded"></div>
      </div>
    </div>
    <div className="mt-6 h-4 w-full bg-gray-700 rounded"></div>
    <div className="mt-2 h-4 w-1/2 bg-gray-700 rounded"></div>
  </div>
);

function PredictiveAI({ apiStatus }) {
  const [batches, setBatches] = useState([]); // For the dropdown
  const [selectedBatch, setSelectedBatch] = useState('');
  const [isLoading, setIsLoading] = useState(false); // For the predict button
  const [isPageLoading, setIsPageLoading] = useState(true); // For the initial batch load
  const [copied, setCopied] = useState(false);
  
  const [pageError, setPageError] = useState(null);
  const [predictionError, setPredictionError] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);

  // --- useEffect to load batches ---
  useEffect(() => {
    if (apiStatus !== 'online') {
      setIsPageLoading(false);
      return;
    }

    const fetchBatches = async () => {
      setIsPageLoading(true);
      setPageError(null);
      try {
        const data = await fetchWithRetry('/api/v1/predict/get-predictable-batches.cfm');
        if (data.success && data.batches) {
          setBatches(data.batches);
          if (data.batches.length > 0) {
            setSelectedBatch(data.batches[0].batch_id);
          }
        } else {
          throw new Error(data.message || 'Could not load batches.');
        }
      } catch (e) {
        setPageError(e.message);
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchBatches();
  }, [apiStatus]);

  const handlePredict = async () => {
    setIsLoading(true); 
    setPredictionError(null);
    setPredictionResult(null);

    try {
      const data = await fetchWithRetry('/api/v1/predict/failure.cfm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_id: selectedBatch }),
      });

      if (data.success) {
        setPredictionResult(data.prediction);
      } else {
        throw new Error(data.message || 'Prediction failed.');
      }
    } catch (e) {
      setPredictionError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyPredictiveCode = () => {
    const code = `// 1. Retrieve live features from AlloyDB via BigQuery Federated query
featuresResult = queryExecute( finalBqSql, {}, { "datasource": Application.bigquery_dsn } );

// 2. Call the AutoML Prediction Endpoint via standard HTTP POST
cfhttp(url=variables.vertexUrl, method="POST", result="apiResult") { ... }
failureRisk = parseFailureRisk(apiResult.fileContent);

// 3. Centralized Native ChatModel to explain the risk dynamically!
chatModel = ChatModel({
    "provider": "gemini",
    "modelName": "gemini-2.5-flash",
    "apiKey": application.AI_STUDIO_API_KEY
});
explanation = chatModel.chat("Explain the brewery risk score: " & failureRisk);`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = () => {
    if (apiStatus === 'offline') {
      return (
        <div className="mt-6">
          <ApiStatusMessage
            icon={<WifiOff className="h-12 w-12 text-red-500" />}
            title="API Offline"
            message="Cannot connect to the API. Predictive features are unavailable."
          />
        </div>
      );
    }

    if (isPageLoading) {
      return (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <PredictorLoading />
        </div>
      );
    }
    
    if (pageError) {
      return (
        <div className="mt-6">
          <ApiStatusMessage
            icon={<AlertTriangle className="h-12 w-12 text-yellow-500" />}
            title="Error Loading Page Data"
            message={pageError}
          />
        </div>
      );
    }

    return (
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* --- Column 1: The Controller --- */}
        <div>
          <div className="rounded-lg bg-gray-800 p-5 shadow border border-gray-700">
            <h2 className="text-lg font-semibold text-white">
              New Batch Failure Prediction
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Select an active batch. ColdFusion will gather its live sensor readings
              and ask the Gemini Enterprise Agent Platform model for an immediate risk assessment.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="batch"
                  className="block text-sm font-medium text-gray-300"
                >
                  Select a 'Pending' or 'Fermenting' Batch
                </label>
                <select
                  id="batch"
                  name="batch"
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  disabled={batches.length === 0}
                  className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 py-2 pl-3 pr-10 text-white focus:border-orange-500 focus:outline-none focus:ring-orange-500 sm:text-sm cursor-pointer"
                >
                  {batches.length === 0 ? (
                    <option>No active batches found.</option>
                  ) : (
                    batches.map((batch) => (
                      <option key={batch.batch_id} value={batch.batch_id}>
                        {batch.batch_name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <button
                onClick={handlePredict}
                disabled={isLoading || selectedBatch === '' || batches.length === 0}
                className="flex w-full items-center justify-center rounded-md bg-orange-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-orange-800 disabled:opacity-70"
              >
                <BrainCircuit className="mr-2 h-5 w-5" />
                {isLoading ? 'Analyzing...' : 'Predict Failure Risk'}
              </button>
              {isLoading && (
                <p className="mt-3 text-sm text-orange-300 animate-pulse">
                  Connecting to Gemini Enterprise Agent Platform... this may take a few seconds.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* --- Column 2: The Result --- */}
        <div>
          {predictionError && (
            <div className="rounded-lg bg-red-900/30 p-5 shadow-xl border border-red-900/50">
              <h3 className="text-md font-semibold text-red-300">Prediction Error</h3>
              <p className="text-sm text-red-200">{predictionError}</p>
            </div>
          )}

          {isLoading && <PredictionLoadingSkeleton />}

          {!isLoading && predictionResult && (
            <>
              <div
                className={`rounded-lg border-2 ${
                  predictionError ? 'mt-6' : ''
                } ${
                  predictionResult.risk > 0.75
                    ? 'border-red-500/50 bg-red-900/20'
                    : predictionResult.risk > 0.5
                    ? 'border-yellow-500/50 bg-yellow-900/20'
                    : 'border-green-500/50 bg-green-900/20'
                } p-5 shadow-xl`}
              >
                <div className="flex items-center">
                  <Siren
                    className={`h-10 w-10 ${
                      predictionResult.risk > 0.75
                        ? 'text-red-400'
                        : predictionResult.risk > 0.5
                        ? 'text-yellow-400'
                        : 'text-green-400'
                    }`}
                  />
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-white">
                      Prediction Result:{' '}
                      {predictionResult.risk > 0.75
                        ? 'HIGH RISK'
                        : predictionResult.risk > 0.5
                        ? 'MODERATE RISK'
                        : 'LOW RISK'}
                    </h3>
                    <p
                      className={`text-4xl font-bold ${
                        predictionResult.risk > 0.75
                          ? 'text-red-300'
                          : predictionResult.risk > 0.5
                          ? 'text-yellow-300'
                          : 'text-green-300'
                      }`}
                    >
                      {(predictionResult.risk * 100).toFixed(0)}% Chance of Failure
                    </p>
                  </div>
                </div>
              </div>

              {predictionResult.reason && (
                <div className="rounded-lg bg-blue-950/20 border border-blue-900/30 p-5 shadow-md border-l-4 border-l-blue-400 mt-4">
                  <h4 className="text-md font-semibold text-blue-300 mb-3 flex items-center gap-2 font-sans">
                    <Sparkles className="h-5 w-5 text-blue-400" />
                    AI Prediction Explanation
                  </h4>
                  <p className="text-sm text-blue-100 leading-relaxed font-sans font-medium">
                    {predictionResult.reason}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <h1 className="text-3xl font-bold text-white">Predictive AI</h1>
      <p className="mt-1 text-gray-400">
        Experience real-time Machine Learning operationalized with ColdFusion.
        This page generates live predictions using your most recent AlloyDB sensor data.
      </p>

      {/* --- EDUCATIONAL DEMO INFO (Top) --- */}
      <div className="mt-4 rounded-md border-l-4 border-cyan-400 bg-cyan-900/30 p-5 shadow-lg">
        <h4 className="flex items-center font-bold text-cyan-300 mb-2">
          <BrainCircuit className="mr-2 h-5 w-5" />
          The Demo: Real-Time AI Orchestration
        </h4>
        <p className="mt-2 text-sm text-cyan-100">
          This is not a static query. When you click 'Predict', your ColdFusion API acts as the core ML cognitive orchestrator:
        </p>
        <ul className="mt-3 list-disc list-inside text-sm text-cyan-100 space-y-2 ml-2 leading-relaxed">
          <li>
            <strong>Database Feature Gathering:</strong> ColdFusion runs standard SQL over 100M+ IoT rows in AlloyDB via federated BigQuery to build the risk parameters.
          </li>
          <li>
            <strong>AutoML Prediction Endpoint:</strong> ColdFusion calls the Gemini Enterprise Agent Platform AutoML endpoints using a standard `cfhttp` POST payload, performing high-performance predictive risk calculations.
          </li>
          <li>
            <strong>Native GenAI Explanation:</strong> ColdFusion uses its new native <code>ChatModel</code> interface (powered by Gemini) to analyze the AutoML risk score against the raw sensor anomalies, generating a natural language explanation and action plan for the brewer in real-time.
          </li>
        </ul>
      </div>

      {/* --- ColdFusion Orchestration Differentiator (Full Width) --- */}
      <div className="rounded-lg bg-orange-950/20 border border-orange-900/30 p-5 shadow-md mt-4">
        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">ColdFusion Orchestration Differentiator</span>
        <p className="text-sm text-gray-300 mt-2 leading-relaxed">
          ColdFusion acts as the complete Machine Learning features and explanation orchestrator. It extracts live operational logs from AlloyDB via federated SQL, calls the Gemini Enterprise Agent Platform AutoML endpoint using a native `cfhttp` POST call to predict risk, and then leverages the new ColdFusion native <code>ChatModel</code> to automatically generate a rich, contextual explanation and recommendation.
        </p>
      </div>

      {renderContent()}

      {/* --- Educational Section Box (The "Demo Pattern") --- */}
      <div className="mt-8 rounded-xl bg-gray-900 border border-gray-800 p-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-6">
          <Terminal className="h-6 w-6 text-purple-500" />
          <div>
            <h3 className="text-xl font-bold text-white">Educational Sandbox: Lightweight AI Orchestration</h3>
            <p className="text-sm text-gray-400">Interfacing directly with Google Cloud Gemini Enterprise Agent Platform AutoML endpoints using native SQL and HTTP.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Comparison Box */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Heavy Python Pipelines vs. ColdFusion</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Normally, gathering time-series sensor logs for ML inference requires standing up massive Apache Spark/Dataflow pipelines, exporting datasets, importing Python client libraries, and building complex SDK pipelines.
            </p>
            
            <div className="space-y-3">
              <div className="rounded bg-gray-950 p-3 border border-red-950/30">
                <span className="text-[10px] font-bold text-red-400 uppercase block">Complex (Heavy Python ML Pipeline)</span>
                <p className="text-[10px] text-gray-500 font-mono mt-1 leading-normal">
                  1. Stand up Apache Spark / Dataflow to stream data<br/>
                  2. Trigger Google Cloud Storage export logs<br/>
                  3. Setup custom Python FastAPI inference service<br/>
                  4. Import Google Cloud AI Platform Python SDKs and OpenAI/Gemini SDKs<br/>
                  5. Manage multi-container orchestration and SDK credentials.
                </p>
              </div>

              <div className="rounded bg-gray-950 p-3 border border-green-950/30">
                <span className="text-[10px] font-bold text-green-400 uppercase block">Hybrid AI (NATIVE COLD FUSION)</span>
                <p className="text-[10px] text-gray-400 font-mono mt-1 leading-normal">
                  {"1. Run queryExecute() for AlloyDB features"}<br/>
                  {"2. cfhttp() to get AutoML risk prediction"}<br/>
                  {"3. chatModel = ChatModel( config )"}<br/>
                  {"4. chatModel.chat( explain_risk_prompt )"}
                </p>
              </div>
            </div>
          </div>

          {/* Code Display Panel */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between bg-gray-950 px-4 py-2 rounded-t border-t border-x border-gray-800">
              <span className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-purple-400" />
                ColdFusion AI Orchestrator
              </span>
              <button
                onClick={copyPredictiveCode}
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
              <pre>{`// 1. Retrieve live features from AlloyDB via BigQuery Federated query
featuresResult = queryExecute( finalBqSql, {}, { "datasource": Application.bigquery_dsn } );

// 2. Call the AutoML Prediction Endpoint via standard HTTP POST
cfhttp(url=variables.vertexUrl, method="POST", result="apiResult") { ... }
failureRisk = parseFailureRisk(apiResult.fileContent);

// 3. Centralized Native ChatModel to explain the risk dynamically!
chatModel = ChatModel({
    "provider": "gemini",
    "modelName": "gemini-2.5-flash",
    "apiKey": application.AI_STUDIO_API_KEY
});
explanation = chatModel.chat("Explain the brewery risk score: " & failureRisk);`}</pre>
            </div>
          </div>

          {/* Predictive AI Code Explanation (Full Width) */}
          <div className="md:col-span-2 mt-6 border-t border-gray-800 pt-6">
            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-1.5 font-sans">
              <Info className="h-4 w-4 text-purple-400" />
              CFML Predictive AI Orchestrator Explained
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
              <div className="bg-gray-950 p-3.5 rounded border border-gray-800 leading-relaxed">
                <strong className="text-purple-400 block mb-1">Federated BQ Query: queryExecute()</strong>
                <span className="text-gray-400">
                  Retrieves live sensor telemetry features across millions of rows by executing federated SQL query statements directly on BigQuery datasets from ColdFusion.
                </span>
              </div>
              <div className="bg-gray-950 p-3.5 rounded border border-gray-800 leading-relaxed">
                <strong className="text-purple-400 block mb-1">Vertex AI Prediction: cfhttp()</strong>
                <span className="text-gray-400">
                  Submits live telemetry features to your deployed AutoML or custom predictive model on Google Vertex AI over HTTPS, parsing the returned risk likelihood score.
                </span>
              </div>
              <div className="bg-gray-950 p-3.5 rounded border border-gray-800 leading-relaxed">
                <strong className="text-purple-400 block mb-1">Native GenAI Context: ChatModel()</strong>
                <span className="text-gray-400">
                  Instantiates the native ColdFusion 2025 GenAI client using Gemini models to explain the risk dynamically based on real-time parameters.
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export default PredictiveAI;