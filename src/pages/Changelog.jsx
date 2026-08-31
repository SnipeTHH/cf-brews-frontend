import React from 'react';
import changelogData from '../data/changelog.json';
import { Calendar, GitCommit, AlertOctagon } from 'lucide-react';

function Changelog() {
  // Helper to get type color/badge
  const getTypeStyle = (type, breaking) => {
    if (breaking) return 'bg-red-900/30 text-red-400 border-red-900/50';
    switch (type) {
      case 'feat':
        return 'bg-green-900/30 text-green-400 border-green-900/50';
      case 'fix':
        return 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50';
      case 'docs':
        return 'bg-blue-900/30 text-blue-400 border-blue-900/50';
      case 'refactor':
        return 'bg-purple-900/30 text-purple-400 border-purple-900/50';
      case 'perf':
        return 'bg-cyan-900/30 text-cyan-400 border-cyan-900/50';
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <h1 className="text-3xl font-bold text-white">Application Changelog</h1>
      <p className="mt-1 text-gray-400 font-medium">
        Track the evolution of CF-Brews. Aggregated history from backend and frontend repositories.
      </p>

      <div className="mt-8 relative border-l border-gray-800 ml-4">
        {changelogData.map((day) => (
          <div key={day.date} className="mb-10 ml-6">
            {/* Timeline dot with Calendar Icon */}
            <span className="absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 ring-8 ring-gray-900">
              <Calendar className="h-4 w-4 text-gray-400" />
            </span>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
               <h2 className="text-xl font-bold text-white flex items-center">
                 {day.date}
               </h2>
               <span className="text-xs text-gray-500 font-mono">
                 {day.changes.length} change{day.changes.length > 1 ? 's' : ''}
               </span>
            </div>

            <div className="space-y-4">
              {day.changes.map((change) => (
                <div 
                  key={change.commit} 
                  className="bg-gray-800/30 rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {/* Scope Badge */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        change.scope === 'Backend' 
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-900/50' 
                          : 'bg-teal-950 text-teal-300 border border-teal-900/50'
                      }`}>
                        {change.scope}
                      </span>

                      {/* Type Badge */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getTypeStyle(change.type, change.breaking)}`}>
                        {change.breaking ? 'BREAKING' : change.type}
                      </span>

                      {change.breaking && (
                        <AlertOctagon className="h-4 w-4 text-red-500 animate-pulse" />
                      )}
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {change.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <GitCommit className="h-4 w-4 text-gray-700" />
                    <span className="text-xs font-mono text-gray-600" title="Commit Hash">
                      {change.commit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Changelog;
