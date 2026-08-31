import React, { useState, useEffect } from 'react';
import { X, Beaker, Loader, AlertTriangle } from 'lucide-react';
import { fetchWithRetry } from '../apiUtils';

function CreateBatchModal({ isOpen, onClose, onSuccess }) {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load recipes when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadRecipes = async () => {
        setIsLoadingRecipes(true);
        setError(null);
        try {
          const data = await fetchWithRetry('/api/v1/ops/get-recipes-dropdown.cfm');
          if (data.success) {
            setRecipes(data.recipes);
            if (data.recipes.length > 0) setSelectedRecipe(data.recipes[0].recipe_id);
          } else {
             setError("Failed to load recipes.");
          }
        } catch (e) {
          setError(e.message);
        } finally {
          setIsLoadingRecipes(false);
        }
      };
      loadRecipes();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const data = await fetchWithRetry('/api/v1/ops/create-batch.cfm', {
        method: 'POST',
        body: JSON.stringify({ recipe_id: selectedRecipe })
      });

      if (data.success) {
        onSuccess(); // Tell parent to refresh
        onClose();   // Close modal
      } else {
        throw new Error(data.error || "Failed to start batch.");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-6 shadow-xl border border-gray-700">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center">
            <Beaker className="mr-2 h-6 w-6 text-orange-500" />
            Start New Batch
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 rounded-md bg-red-900/50 p-3 flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Loading State (Recipes) */}
        {isLoadingRecipes ? (
          <div className="py-8 flex justify-center">
            <Loader className="h-8 w-8 text-orange-500 animate-spin" />
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Recipe
              </label>
              <select
                value={selectedRecipe}
                onChange={(e) => setSelectedRecipe(e.target.value)}
                className="block w-full rounded-md border-gray-600 bg-gray-900 py-2 px-3 text-white focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
              >
                {recipes.map((r) => (
                  <option key={r.recipe_id} value={r.recipe_id}>
                    {r.recipe_name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">
                The system will automatically assign the first available Vat.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md bg-gray-700 text-white hover:bg-gray-600 text-sm font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || recipes.length === 0}
                className="flex items-center px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-500 text-sm font-bold disabled:opacity-50"
              >
                {isSubmitting && <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                Start Brewing
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default CreateBatchModal;