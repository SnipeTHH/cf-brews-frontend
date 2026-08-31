import React from 'react';
import { Loader2 } from 'lucide-react';

// Import all the pages you created
import Home from '../pages/Home';
import Dashboard from '../pages/Dashboard';
import Analytics from '../pages/Analytics';
import Batches from '../pages/Batches';
import BreweryAssistant from '../pages/BreweryAssistant';
import Inventory from '../pages/Inventory';
import PredictiveAI from '../pages/PredictiveAI';
import Vats from '../pages/Vats';
import Recipes from '../pages/Recipes';
import BrewerySearch from '../pages/BrewerySearch';
import Customer360 from '../pages/Customer360';
import Changelog from '../pages/Changelog';


/**
 * A simple full-screen loading spinner.
 * This is shown when the app first loads and is checking the API status.
 */
function ApplicationLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center text-gray-400">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
        <span className="text-lg font-semibold">
          Connecting to Brewery API...
        </span>
      </div>
    </div>
  );
}

/**
 * PageContent
 * This component acts as a router, displaying the correct page
 * based on the `currentPage` prop.
 */
function PageContent({ currentPage, setCurrentPage, assistantTab, setAssistantTab, apiStatus }) {
  // --- UPDATED LOGIC ---
  // If the requested page is 'Home', render it immediately.
  // The Home page is static and doesn't require the API to be ready.
  if (currentPage === 'Home') {
    return <Home setCurrentPage={setCurrentPage} setAssistantTab={setAssistantTab} />;
  }

  // For all other pages, if the API status is still 'checking',
  // show the loading spinner.
  if (apiStatus === 'checking') {
    return <ApplicationLoading />;
  }

  // --- Page Routing for API-dependent pages ---
  switch (currentPage) {
    case 'Dashboard':
      return <Dashboard apiStatus={apiStatus} setCurrentPage={setCurrentPage} setAssistantTab={setAssistantTab} />;
    case 'Batches':
      return <Batches apiStatus={apiStatus} />;
    case 'Vats & Sensors':
      return <Vats apiStatus={apiStatus} />;
    case 'Inventory':
      return <Inventory apiStatus={apiStatus} />;
    case 'Analytics':
      return <Analytics apiStatus={apiStatus} />;
    case 'Predictive AI':
      return <PredictiveAI apiStatus={apiStatus} />;
    case 'Semantic Search':
      return <BrewerySearch apiStatus={apiStatus} />;
    case 'Brewery Assistant':
      return <BreweryAssistant apiStatus={apiStatus} activeTab={assistantTab} setActiveTab={setAssistantTab} />;
    case 'Recipes':
      return <Recipes apiStatus={apiStatus} />;
    case 'Customer 360':
      return <Customer360 apiStatus={apiStatus} />;
    case 'Changelog':
      return <Changelog apiStatus={apiStatus} />;
    default:

      // Fallback to Home if something goes wrong
      return <Home />;
  }
}

export default PageContent;