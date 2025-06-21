import React from 'react';
import { XMarkIcon, CheckCircleIcon, ArrowDownTrayIcon, TrashIcon as ClearIcon } from './Icons';

interface ClearGraphConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndClear: () => void;
  onClearAnyway: () => void;
  graphName: string;
}

const ClearGraphConfirmationModal: React.FC<ClearGraphConfirmationModalProps> = ({
  isOpen,
  onClose,
  onSaveAndClear,
  onClearAnyway,
  graphName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-amber-400">Confirm Clear Graph</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <p className="text-gray-300 mb-6">
          Are you sure you want to clear all nodes and connections in{' '}
          <strong className="text-sky-300">{graphName}</strong>? This action cannot be undone.
        </p>

        <div className="flex flex-col space-y-3">
          <button
            onClick={onSaveAndClear}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-md primary-action-button"
            title="Save the current graph as a JSON file, then clear it."
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            Save & Clear Graph
          </button>
          <button
            onClick={onClearAnyway}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-md primary-action-button" // Reusing primary style, but with red bg
            title="Clear the graph without saving."
          >
            <ClearIcon className="w-5 h-5 mr-2" />
            Clear Graph Anyway
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md neumorphic-button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClearGraphConfirmationModal;
