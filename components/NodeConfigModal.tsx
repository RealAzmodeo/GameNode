
import React, { useState, useEffect } from 'react';
import { AnyNode, OperationTypeEnum, LogicalCategoryEnum, NodeConfig } from '../types';
import { XMarkIcon, CheckCircleIcon } from './Icons';
import { DEFAULT_COMMENT_WIDTH, DEFAULT_COMMENT_HEIGHT, DEFAULT_FRAME_WIDTH, DEFAULT_FRAME_HEIGHT } from '../constants';


interface NodeConfigModalProps {
  node: AnyNode | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, newConfig: Partial<NodeConfig>) => void;
}

const NodeConfigModal: React.FC<NodeConfigModalProps> = ({ node, isOpen, onClose, onSave }) => {
  const [currentConfig, setCurrentConfig] = useState<Partial<NodeConfig>>({});

  useEffect(() => {
    if (node) {
      const initialConf: Partial<NodeConfig> = { ...node.config };
      if (node.operationType === OperationTypeEnum.VALUE_PROVIDER && !initialConf.hasOwnProperty('value')) {
        initialConf.value = '';
      }
      if ((node.operationType === OperationTypeEnum.INPUT_GRAPH || node.operationType === OperationTypeEnum.OUTPUT_GRAPH)) {
        if (!initialConf.hasOwnProperty('externalPortName')) initialConf.externalPortName = 'PortName';
        if (!initialConf.hasOwnProperty('externalPortCategory')) initialConf.externalPortCategory = LogicalCategoryEnum.ANY;
      }
      if (node.operationType === OperationTypeEnum.STATE) {
        if (!initialConf.hasOwnProperty('stateId')) initialConf.stateId = `state_${node.id.substring(0,5)}`;
        else initialConf.stateId = String(initialConf.stateId).trim(); // Ensure trimmed
        if (!initialConf.hasOwnProperty('initialValue')) initialConf.initialValue = null;
      }
      if (node.operationType === OperationTypeEnum.ON_EVENT && !initialConf.hasOwnProperty('eventName')) {
        initialConf.eventName = 'myEvent';
      }
      if (node.operationType === OperationTypeEnum.RANDOM_NUMBER) {
        if (!initialConf.hasOwnProperty('defaultMin')) initialConf.defaultMin = 0;
        if (!initialConf.hasOwnProperty('defaultMax')) initialConf.defaultMax = 1;
      }
      if (node.operationType === OperationTypeEnum.COMMENT && !initialConf.hasOwnProperty('commentText')) {
        initialConf.commentText = 'My Comment';
      }
      if (node.operationType === OperationTypeEnum.FRAME) {
        if (!initialConf.hasOwnProperty('frameTitle')) initialConf.frameTitle = 'Group';
        if (!initialConf.hasOwnProperty('frameWidth')) initialConf.frameWidth = DEFAULT_FRAME_WIDTH;
        if (!initialConf.hasOwnProperty('frameHeight')) initialConf.frameHeight = DEFAULT_FRAME_HEIGHT;
      }
      if ((node.operationType === OperationTypeEnum.SEND_DATA || node.operationType === OperationTypeEnum.RECEIVE_DATA) && !initialConf.hasOwnProperty('channelName')) {
        initialConf.channelName = 'defaultChannel';
      }
      setCurrentConfig(initialConf);
    }
  }, [node]);

  if (!isOpen || !node) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // 'type' from e.target refers to the input's type attribute (e.g., "text", "number", "textarea", "select-one")
    const elementType = (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).type; 
    let processedValue: any = value;

    if (name === "value" && node.operationType === OperationTypeEnum.VALUE_PROVIDER) {
        if (value === "true") processedValue = true;
        else if (value === "false") processedValue = false;
        else if (elementType === 'number' && !isNaN(parseFloat(value))) processedValue = parseFloat(value);
        else if (elementType === 'textarea') { // Check if the element is a textarea
             try {
                const parsed = JSON.parse(value);
                if (typeof parsed === 'object' || Array.isArray(parsed)) processedValue = parsed;
             } catch (error) { /* Not JSON, keep as string */ }
        }
    } else if (name === "initialValue" && node.operationType === OperationTypeEnum.STATE) {
        if (value === "true") processedValue = true;
        else if (value === "false") processedValue = false;
        else if (elementType === 'number' && !isNaN(parseFloat(value))) processedValue = parseFloat(value);
        else if (elementType === 'textarea') { // Check if the element is a textarea
            try {
                const parsed = JSON.parse(value);
                if (typeof parsed === 'object' || Array.isArray(parsed)) processedValue = parsed;
             } catch (error) { /* Not JSON, keep as string */ }
        }
    } else if (name === 'externalPortCategory') {
        processedValue = value as LogicalCategoryEnum;
    } else if ((name === 'stateId' && node.operationType === OperationTypeEnum.STATE) ||
               (name === 'eventName' && node.operationType === OperationTypeEnum.ON_EVENT) ||
               (name === 'channelName' && (node.operationType === OperationTypeEnum.SEND_DATA || node.operationType === OperationTypeEnum.RECEIVE_DATA))
              ) {
        processedValue = value.trim();
    } else if (name === 'maxIterations' && node.operationType === OperationTypeEnum.ITERATE) {
        processedValue = parseInt(value, 10);
        if (isNaN(processedValue) || processedValue < 0) processedValue = 0;
    } else if ((name === 'defaultMin' || name === 'defaultMax') && node.operationType === OperationTypeEnum.RANDOM_NUMBER) {
        processedValue = parseFloat(value);
        if (isNaN(processedValue)) processedValue = (name === 'defaultMin' ? 0 : 1);
    } else if (name === 'frameWidth' || name === 'frameHeight') {
        processedValue = parseInt(value, 10);
        if (isNaN(processedValue) || processedValue < 50) processedValue = 50; // Minimum size
    } else if (name === 'commentText' && node.operationType === OperationTypeEnum.COMMENT) {
        processedValue = value; // Keep as string
    } else if (name === 'frameTitle' && node.operationType === OperationTypeEnum.FRAME) {
        processedValue = value; // Keep as string
    }

    setCurrentConfig(prev => ({ ...prev, [name]: processedValue }));
  };

  const renderValueProviderField = (fieldName: 'value' | 'initialValue' = 'value') => {
    const currentValue = currentConfig[fieldName];
    let fieldType: 'select' | 'number' | 'textarea' | 'text' = 'text';

    if (typeof currentValue === 'boolean') fieldType = 'select';
    else if (typeof currentValue === 'number') fieldType = 'number';
    else if (typeof currentValue === 'object' || Array.isArray(currentValue)) fieldType = 'textarea';

    if (fieldType === 'select') {
        return (
             <select
                name={fieldName}
                value={String(currentValue ?? false)}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-gray-200 focus:ring-sky-500 focus:border-sky-500"
            >
                <option value="true">True</option>
                <option value="false">False</option>
            </select>
        );
    }
    if (fieldType === 'number') {
         return (
            <input
                type="number"
                name={fieldName}
                value={currentValue ?? ''}
                onChange={handleInputChange}
                step="any"
                className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-gray-200 focus:ring-sky-500 focus:border-sky-500"
            />
        );
    }
     return (
         <textarea
            name={fieldName}
            rows={3}
            value={typeof currentValue === 'object' ? JSON.stringify(currentValue, null, 2) : String(currentValue ?? '')}
            onChange={handleInputChange}
            placeholder="Enter value (string, number, boolean, or JSON for object/array)"
            className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-gray-200 font-mono text-sm focus:ring-sky-500 focus:border-sky-500"
        />
     );
  };

  const renderGraphPortFields = () => (
    <>
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">External Port Name</label>
            <input
                type="text"
                name="externalPortName"
                value={currentConfig.externalPortName || ''}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-gray-200 focus:ring-sky-500 focus:border-sky-500"
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">External Port Category</label>
            <select
                name="externalPortCategory"
                value={currentConfig.externalPortCategory || LogicalCategoryEnum.ANY}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-gray-200 focus:ring-sky-500 focus:border-sky-500"
            >
                {Object.values(LogicalCategoryEnum).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>
        </div>
    </>
  );

  const renderStateNodeFields = () => (
    <>
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">State ID (Unique Identifier)</label>
            <input
                type="text"
                name="stateId"
                value={currentConfig.stateId || ''}
                onChange={handleInputChange}
                placeholder="e.g., userScore, currentItemName"
                className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-gray-200 focus:ring-sky-500 focus:border-sky-500"
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Initial Value</label>
            {renderValueProviderField('initialValue')}
        </div>
    </>
  );

  const renderOnEventNodeFields = () => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Event Name</label>
        <input
            type="text"
            name="eventName"
            value={currentConfig.eventName || ''}
            onChange={handleInputChange}
            placeholder="e.g., buttonClicked, dataReceived"
            className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-gray-200 focus:ring-sky-500 focus:border-sky-500"
        />
    </div>
  );

  const renderRandomNumberNodeFields = () => (
    <>
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Default Min (if Min port unconnected)</label>
            <input
                type="number"
                name="defaultMin"
                step="any"
                value={currentConfig.defaultMin ?? 0}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-gray-200 focus:ring-sky-500 focus:border-sky-500"
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Default Max (if Max port unconnected)</label>
            <input
                type="number"
                name="defaultMax"
                step="any"
                value={currentConfig.defaultMax ?? 1}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-gray-200 focus:ring-sky-500 focus:border-sky-500"
            />
        </div>
    </>
  );

  const renderCommentNodeFields = () => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Comment Text</label>
        <textarea
            name="commentText"
            rows={5}
            value={currentConfig.commentText || ''}
            onChange={handleInputChange}
            placeholder="Enter your comment..."
            className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-gray-200 font-mono text-sm focus:ring-sky-500 focus:border-sky-500"
        />
    </div>
  );

  const renderFrameNodeFields = () => (
    <>
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Frame Title</label>
            <input
                type="text"
                name="frameTitle"
                value={currentConfig.frameTitle || ''}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-gray-200 focus:ring-sky-500 focus:border-sky-500"
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Width</label>
                <input type="number" name="frameWidth" value={currentConfig.frameWidth || DEFAULT_FRAME_WIDTH} onChange={handleInputChange}
                    className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-gray-200 focus:ring-sky-500 focus:border-sky-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Height</label>
                <input type="number" name="frameHeight" value={currentConfig.frameHeight || DEFAULT_FRAME_HEIGHT} onChange={handleInputChange}
                    className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-gray-200 focus:ring-sky-500 focus:border-sky-500" />
            </div>
        </div>
    </>
  );

  const renderChannelNodeFields = () => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Channel Name</label>
        <input
            type="text"
            name="channelName"
            value={currentConfig.channelName || ''}
            onChange={handleInputChange}
            placeholder="e.g., myDataChannel, userClicks"
            className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-gray-200 focus:ring-sky-500 focus:border-sky-500"
        />
    </div>
  );


  const handleSave = () => {
    if (node.operationType === OperationTypeEnum.STATE && (!currentConfig.stateId || currentConfig.stateId.trim() === '')) {
        alert("State ID cannot be empty for a STATE node.");
        return;
    }
    if (node.operationType === OperationTypeEnum.ON_EVENT && (!currentConfig.eventName || currentConfig.eventName.trim() === '')) {
        alert("Event Name cannot be empty for an ON_EVENT node.");
        return;
    }
    if ((node.operationType === OperationTypeEnum.SEND_DATA || node.operationType === OperationTypeEnum.RECEIVE_DATA) && (!currentConfig.channelName || currentConfig.channelName.trim() === '')) {
        alert("Channel Name cannot be empty for SEND/RECEIVE_DATA nodes.");
        return;
    }
    if (node.operationType === OperationTypeEnum.RANDOM_NUMBER) {
        const min = parseFloat(String(currentConfig.defaultMin));
        const max = parseFloat(String(currentConfig.defaultMax));
        if (!isNaN(min) && !isNaN(max) && min >= max) {
            alert("Default Min must be less than Default Max for RANDOM_NUMBER node.");
            return;
        }
    }

    let configToSave = {...currentConfig};
    if (configToSave.stateId) configToSave.stateId = String(configToSave.stateId).trim();
    if (configToSave.eventName) configToSave.eventName = String(configToSave.eventName).trim();
    if (configToSave.channelName) configToSave.channelName = String(configToSave.channelName).trim();
    if (configToSave.frameWidth !== undefined) configToSave.frameWidth = Math.max(50, configToSave.frameWidth);
    if (configToSave.frameHeight !== undefined) configToSave.frameHeight = Math.max(50, configToSave.frameHeight);


    onSave(node.id, configToSave);
    onClose();
  };

  const hasSpecificConfigFields =
    node.operationType === OperationTypeEnum.VALUE_PROVIDER ||
    node.operationType === OperationTypeEnum.INPUT_GRAPH ||
    node.operationType === OperationTypeEnum.OUTPUT_GRAPH ||
    node.operationType === OperationTypeEnum.STATE ||
    node.operationType === OperationTypeEnum.ON_EVENT ||
    node.operationType === OperationTypeEnum.ITERATE ||
    node.operationType === OperationTypeEnum.RANDOM_NUMBER ||
    node.operationType === OperationTypeEnum.COMMENT ||
    node.operationType === OperationTypeEnum.FRAME ||
    node.operationType === OperationTypeEnum.SEND_DATA ||
    node.operationType === OperationTypeEnum.RECEIVE_DATA;


  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-sky-400">Configure: {node.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {node.operationType === OperationTypeEnum.VALUE_PROVIDER && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Value</label>
              {renderValueProviderField('value')}
            </div>
          )}
          {(node.operationType === OperationTypeEnum.INPUT_GRAPH || node.operationType === OperationTypeEnum.OUTPUT_GRAPH) && renderGraphPortFields()}
          {node.operationType === OperationTypeEnum.STATE && renderStateNodeFields()}
          {node.operationType === OperationTypeEnum.ON_EVENT && renderOnEventNodeFields()}
          {node.operationType === OperationTypeEnum.RANDOM_NUMBER && renderRandomNumberNodeFields()}
          {node.operationType === OperationTypeEnum.COMMENT && renderCommentNodeFields()}
          {node.operationType === OperationTypeEnum.FRAME && renderFrameNodeFields()}
          {(node.operationType === OperationTypeEnum.SEND_DATA || node.operationType === OperationTypeEnum.RECEIVE_DATA) && renderChannelNodeFields()}
        </div>

        {node.type === 'Molecular' && node.operationType !== OperationTypeEnum.ITERATE && !hasSpecificConfigFields && (
            <div className="mt-4 p-3 bg-gray-700/50 rounded-md text-sm text-gray-300">
                <p>Molecular node configuration typically involves defining its sub-graph by adding INPUT_GRAPH and OUTPUT_GRAPH nodes within it and connecting them. The external ports of this Molecular Node will be derived from those special sub-graph nodes.</p>
            </div>
        )}
         {node.operationType === OperationTypeEnum.ITERATE && (
            <div className="mt-4 p-3 bg-gray-700/50 rounded-md text-sm text-gray-300">
                <p>Iterate node's external ports (Collection, Max Iterations, Results, etc.) are fixed for data. Execution flow is managed by 'Start Iteration' (Exec In) and 'Iteration Completed' (Exec Out).</p>
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1 mt-2">Default Max Iterations (if input port not connected)</label>
                    <input
                        type="number"
                        name="maxIterations"
                        min="0"
                        value={currentConfig.maxIterations ?? 100}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-gray-200 focus:ring-sky-500 focus:border-sky-500"
                    />
                </div>
            </div>
        )}
        {!hasSpecificConfigFields && node.type === 'Atomic' && (
             <div className="mt-4 p-3 bg-gray-700/50 rounded-md text-sm text-gray-300">
                <p>This node type does not have specific configuration options beyond its name and input port overrides (editable in the Inspector Panel if applicable).</p>
            </div>
        )}


        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
          >
            Cancel
          </button>
          {hasSpecificConfigFields && (
            <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-md flex items-center transition-colors"
            >
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeConfigModal;
