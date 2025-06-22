
import React, { useState, useEffect, useCallback } from 'react';
import { AnyNode, Connection, InputPort, OperationTypeEnum, NodeConfig, LogicalCategoryEnum, NodeId, Port, SwitchCaseConfig } from '../types';
import { PlusCircleIcon, MinusCircleIcon, XMarkIcon, EyeIcon, EyeSlashIcon, ChatBubbleBottomCenterTextIcon } from './Icons'; 

interface InspectorPanelProps {
  selectedNode: AnyNode;
  connections: Connection[];
  allNodes: AnyNode[]; // Used to check for port compatibility or other context if needed in future
  onConfigChange: (nodeId: NodeId, newConfig: Partial<NodeConfig>) => void;
  onNodeNameChange: (nodeId: NodeId, newName: string) => void;
}

const InspectorPanel: React.FC<InspectorPanelProps> = ({ selectedNode, connections, allNodes, onConfigChange, onNodeNameChange }) => {
  const [localConfig, setLocalConfig] = useState<Partial<NodeConfig>>(selectedNode.config || {});
  const [nodeName, setNodeName] = useState<string>(selectedNode.name);
  const [isFooterNoteSectionOpen, setIsFooterNoteSectionOpen] = useState(true);
  const [dataTableColumnsInput, setDataTableColumnsInput] = useState<string>('');


  // Update local state when the selected node prop changes
  useEffect(() => {
    const newConfig = selectedNode.config || {};
    setLocalConfig(newConfig);
    setNodeName(selectedNode.name);
    if (selectedNode.config?.showFooterNote || (selectedNode.config?.footerNoteText && selectedNode.config.footerNoteText.trim() !== '')) {
        setIsFooterNoteSectionOpen(true);
    }
    if (selectedNode.operationType === OperationTypeEnum.DATA_TABLE && Array.isArray(newConfig.dataTableColumns)) {
        setDataTableColumnsInput(newConfig.dataTableColumns.join(', '));
    } else {
        setDataTableColumnsInput('');
    }
  }, [selectedNode]);

  const parseValueFromString = (rawValue: string, targetTypeHint?: 'number' | 'boolean' | 'string' | 'object' | 'array' ) => {
    let processedValue: any = rawValue;
    if (rawValue.toLowerCase() === 'true') processedValue = true;
    else if (rawValue.toLowerCase() === 'false') processedValue = false;
    else if (targetTypeHint === 'number' || (!isNaN(parseFloat(rawValue)) && isFinite(Number(rawValue)) && String(parseFloat(rawValue)) === rawValue.trim() ) ) {
      processedValue = parseFloat(rawValue);
    } else {
        try { 
            const parsed = JSON.parse(rawValue);
            if (typeof parsed === 'object' || Array.isArray(parsed)) {
                processedValue = parsed;
            }
        } catch (e) { /* Not JSON, keep as string */ }
    }
    return processedValue;
  };

  const handleConfigFieldChange = (fieldName: keyof NodeConfig | `switchCases.${number}.caseValue` | `switchCases.${number}.outputValue` | 'showFooterNote', value: any) => {
    let processedValue = value;
    let newConfigPart: Partial<NodeConfig> = {};

    if (typeof fieldName === 'string' && fieldName.startsWith('switchCases')) {
        const parts = fieldName.split('.');
        const index = parseInt(parts[1], 10);
        const field = parts[2] as 'caseValue' | 'outputValue';
        
        const updatedCases = [...(localConfig.switchCases || [])];
        if (updatedCases[index]) {
            updatedCases[index] = { ...updatedCases[index], [field]: parseValueFromString(value) };
        }
        newConfigPart = { switchCases: updatedCases };
    } else if (fieldName === 'showFooterNote') {
        newConfigPart = { [fieldName]: typeof value === 'boolean' ? value : false };
    } else if (fieldName === 'barColor' && selectedNode.operationType === OperationTypeEnum.PROGRESS_BAR) {
        newConfigPart = { barColor: String(value).trim() };
    } else if (fieldName === 'showPercentage' && selectedNode.operationType === OperationTypeEnum.PROGRESS_BAR) {
        newConfigPart = { showPercentage: typeof value === 'boolean' ? value : false };
    } else if (fieldName === 'dataTableColumns' && selectedNode.operationType === OperationTypeEnum.DATA_TABLE) {
        const colsArray = String(value).split(',').map(s => s.trim()).filter(s => s);
        newConfigPart = { dataTableColumns: colsArray };
        setDataTableColumnsInput(String(value)); // Keep input in sync
    } else if (typeof fieldName === 'string') { 
        if (fieldName === 'stateId' && typeof value === 'string') {
            processedValue = value.trim();
        } else if (fieldName === 'eventName' && typeof value === 'string') {
            processedValue = value.trim();
        } else if ((fieldName === 'defaultMin' || fieldName === 'defaultMax') && selectedNode.operationType === OperationTypeEnum.RANDOM_NUMBER) {
            processedValue = parseFloat(value);
            if (isNaN(processedValue)) processedValue = (fieldName === 'defaultMin' ? 0 : 1); 
        } else if (fieldName === 'switchDefaultValue') {
            processedValue = parseValueFromString(value);
        }
        newConfigPart = { [fieldName as keyof NodeConfig]: processedValue };
    }

    setLocalConfig(prev => ({ ...prev, ...newConfigPart }));
    onConfigChange(selectedNode.id, newConfigPart);
  };
  
  const handleValueProviderOrInitialValueChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, fieldName: 'value' | 'initialValue' | 'switchDefaultValue' | `switchCases.${number}.caseValue` | `switchCases.${number}.outputValue`) => {
    const rawValue = e.target.value;
    handleConfigFieldChange(fieldName, rawValue); 
  };

  const handleInputOverrideChange = (portId: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const rawValue = e.target.value;
    let processedValue: any = parseValueFromString(rawValue);

    const currentOverrides = localConfig.inputPortOverrides || {};
    let updatedOverrides = { ...currentOverrides, [portId]: processedValue };

    if (rawValue.trim() === '') { 
        delete updatedOverrides[portId]; 
    }
    
    handleConfigFieldChange('inputPortOverrides', updatedOverrides);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNodeName(e.target.value);
  };

  const handleNameBlur = () => {
    if (nodeName.trim() !== '' && nodeName !== selectedNode.name) {
      onNodeNameChange(selectedNode.id, nodeName.trim());
    } else {
      setNodeName(selectedNode.name); 
    }
  };

  const renderInputPortInspector = (port: InputPort) => {
    const isConnected = connections.some(conn => conn.toNodeId === selectedNode.id && conn.toPortId === port.id);
    const overrideValue = localConfig.inputPortOverrides?.[port.id];
    let displayValue = '';
    if (overrideValue !== undefined) {
        if (typeof overrideValue === 'object') displayValue = JSON.stringify(overrideValue);
        else displayValue = String(overrideValue);
    }

    return (
      <div key={port.id} className="mb-3 p-2.5 bg-[rgba(0,0,0,0.05)] rounded-md border border-[rgba(255,255,255,0.05)]"
           style={{boxShadow: 'inset 2px 2px 4px rgba(33,36,41,0.4), inset -2px -2px 4px rgba(57,60,73,0.3)'}}
      >
        <label className="block text-xs font-medium text-sky-400 mb-1">{port.name} ({port.category})</label>
        {isConnected ? (
          <p className="text-xs text-green-400 italic">Connected. Value from link.</p>
        ) : (
          <input
            type="text" 
            placeholder={`Literal for ${port.name}`}
            value={displayValue}
            onChange={(e) => handleInputOverrideChange(port.id, e)}
            className="w-full p-1.5 text-xs border border-[rgba(255,255,255,0.1)] rounded-md bg-[#252830] text-[rgba(255,255,255,0.8)] focus:ring-1 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500"
          />
        )}
      </div>
    );
  };
  
  const getValueInputType = (currentValue: any) => {
    if (typeof currentValue === 'boolean') return 'select';
    if (typeof currentValue === 'number') return 'number';
    if (typeof currentValue === 'object' || Array.isArray(currentValue)) return 'textarea';
    return 'text';
  };
  
  const renderGeneralValueInput = (
      fieldName: 'value' | 'initialValue' | 'switchDefaultValue' | `switchCases.${number}.caseValue` | `switchCases.${number}.outputValue`, 
      currentValue: any,
      placeholder?: string
    ) => {
    const inputType = getValueInputType(currentValue);
    const displayVal = currentValue === undefined ? '' : 
                       typeof currentValue === 'object' ? JSON.stringify(currentValue, null, 2) : 
                       String(currentValue);

    const commonInputClass = "w-full p-2 border border-[rgba(255,255,255,0.1)] rounded-md bg-[#252830] text-[rgba(255,255,255,0.8)] focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-sm placeholder-gray-500";

    if (inputType === 'select') {
        return (
          <select value={String(currentValue ?? false)} onChange={(e) => handleValueProviderOrInitialValueChange(e, fieldName)}
            className={commonInputClass}>
            <option value="true">True</option><option value="false">False</option>
          </select>
        );
    }
    if (inputType === 'textarea') { 
        return (
          <textarea rows={3} value={displayVal}
            onChange={(e) => handleValueProviderOrInitialValueChange(e, fieldName)} placeholder={placeholder || "Enter JSON value"}
            className={`${commonInputClass} font-mono`} />
        );
    }
    return (
       <input 
         type={inputType === 'number' ? 'number' : 'text'} 
         value={displayVal} 
         onChange={(e) => handleValueProviderOrInitialValueChange(e, fieldName)}
         className={commonInputClass}
         step={inputType === 'number' ? 'any' : undefined} 
         placeholder={placeholder || "Enter value"}
        />
    );
  };

  const handleAddSwitchCase = () => {
    const newCase: SwitchCaseConfig = { id: `case_${Date.now()}_${Math.random().toString(36).substring(2,5)}`, caseValue: '', outputValue: '' };
    const updatedCases = [...(localConfig.switchCases || []), newCase];
    setLocalConfig(prev => ({ ...prev, switchCases: updatedCases }));
    onConfigChange(selectedNode.id, { switchCases: updatedCases });
  };

  const handleRemoveSwitchCase = (idToRemove: string) => {
    const updatedCases = (localConfig.switchCases || []).filter(c => c.id !== idToRemove);
    setLocalConfig(prev => ({ ...prev, switchCases: updatedCases }));
    onConfigChange(selectedNode.id, { switchCases: updatedCases });
  };

  const description = selectedNode.description || "No description available for this node type.";


  const showInputOverrides = selectedNode.inputPorts.length > 0 && 
                             selectedNode.operationType !== OperationTypeEnum.VALUE_PROVIDER &&
                             selectedNode.operationType !== OperationTypeEnum.OUTPUT_GRAPH &&
                             selectedNode.operationType !== OperationTypeEnum.INPUT_GRAPH &&
                             selectedNode.operationType !== OperationTypeEnum.LOOP_ITEM && 
                             selectedNode.operationType !== OperationTypeEnum.ITERATION_RESULT &&
                             selectedNode.operationType !== OperationTypeEnum.ON_EVENT && 
                             selectedNode.operationType !== OperationTypeEnum.STATE &&
                             selectedNode.operationType !== OperationTypeEnum.SWITCH && 
                             selectedNode.operationType !== OperationTypeEnum.LOG_VALUE && 
                             selectedNode.operationType !== OperationTypeEnum.CONSTRUCT_OBJECT &&
                             selectedNode.operationType !== OperationTypeEnum.DISPLAY_VALUE &&
                             selectedNode.operationType !== OperationTypeEnum.DISPLAY_MARKDOWN_TEXT &&
                             selectedNode.operationType !== OperationTypeEnum.PROGRESS_BAR &&
                             selectedNode.operationType !== OperationTypeEnum.DATA_TABLE;

  const configSectionStyle = {
    boxShadow: 'inset 2px 2px 4px rgba(33,36,41,0.4), inset -2px -2px 4px rgba(57,60,73,0.3)' 
  };

  return (
    <div className="p-4 bg-transparent h-full flex flex-col space-y-3 overflow-y-auto"> 
      <div>
        <h2 className="text-lg font-semibold text-sky-300 border-b border-[rgba(255,255,255,0.1)] pb-2 mb-3">
          Inspector: <span className="text-teal-300">{selectedNode.name}</span>
        </h2>
        
        <div className="p-2.5 bg-[rgba(0,0,0,0.05)] rounded-md border border-[rgba(255,255,255,0.05)]" style={configSectionStyle}>
          <label htmlFor="nodeName" className="block text-sm font-medium text-[rgba(255,255,255,0.7)] mb-1">Node Name</label>
          <input type="text" id="nodeName" name="nodeName" value={nodeName} onChange={handleNameChange} onBlur={handleNameBlur}
            className="w-full p-2 border border-[rgba(255,255,255,0.1)] rounded-md bg-[#252830] text-[rgba(255,255,255,0.8)] focus:ring-1 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500" />
        </div>

        {selectedNode.operationType === OperationTypeEnum.VALUE_PROVIDER && (
          <div className="mt-3 p-2.5 bg-[rgba(0,0,0,0.05)] rounded-md border border-[rgba(255,255,255,0.05)]" style={configSectionStyle}>
            <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)] mb-1">Provided Value</label>
            {renderGeneralValueInput('value', localConfig.value, "Enter value (string, number, boolean, or JSON)")}
            {selectedNode.outputPorts[0] && <p className="text-xs text-gray-400 mt-1">Output Type: {selectedNode.outputPorts[0].category}</p>}
          </div>
        )}
        
        {selectedNode.operationType === OperationTypeEnum.STATE && (
            <div className="mt-3 p-2.5 bg-[rgba(0,0,0,0.05)] rounded-md space-y-2 border border-[rgba(255,255,255,0.05)]" style={configSectionStyle}>
                <div>
                    <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)] mb-1">State ID (Unique Identifier)</label>
                    <input type="text" value={localConfig.stateId || ''}
                        onChange={(e) => handleConfigFieldChange('stateId', e.target.value)}
                        onBlur={() => onConfigChange(selectedNode.id, { stateId: localConfig.stateId?.trim() })} 
                        placeholder="e.g., userScore, currentLoopIndex"
                        className="w-full p-2 border border-[rgba(255,255,255,0.1)] rounded-md bg-[#252830] text-[rgba(255,255,255,0.8)] focus:ring-1 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)] mb-1">Initial Value</label>
                    {renderGeneralValueInput('initialValue', localConfig.initialValue, "Enter initial value (string, number, boolean, or JSON)")}
                 </div>
            </div>
        )}
         {selectedNode.operationType === OperationTypeEnum.ON_EVENT && (
             <div className="mt-3 p-2.5 bg-[rgba(0,0,0,0.05)] rounded-md space-y-2 border border-[rgba(255,255,255,0.05)]" style={configSectionStyle}>
                <div>
                    <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)] mb-1">Event Name</label>
                    <input type="text" value={localConfig.eventName || ''}
                        onChange={(e) => handleConfigFieldChange('eventName', e.target.value)}
                         onBlur={() => onConfigChange(selectedNode.id, { eventName: localConfig.eventName?.trim() })}
                        placeholder="e.g., buttonClicked, dataReceived"
                        className="w-full p-2 border border-[rgba(255,255,255,0.1)] rounded-md bg-[#252830] text-[rgba(255,255,255,0.8)] focus:ring-1 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500" />
                </div>
             </div>
        )}

        {selectedNode.operationType === OperationTypeEnum.RANDOM_NUMBER && (
            <div className="mt-3 p-2.5 bg-[rgba(0,0,0,0.05)] rounded-md space-y-2 border border-[rgba(255,255,255,0.05)]" style={configSectionStyle}>
                 <div>
                    <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)] mb-1">Default Min (if Min port unconnected)</label>
                    <input type="number" step="any" value={localConfig.defaultMin ?? selectedNode.config?.defaultMin ?? 0}
                        onChange={(e) => handleConfigFieldChange('defaultMin', parseFloat(e.target.value))}
                        className="w-full p-2 border border-[rgba(255,255,255,0.1)] rounded-md bg-[#252830] text-[rgba(255,255,255,0.8)] focus:ring-1 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)] mb-1">Default Max (if Max port unconnected)</label>
                    <input type="number" step="any" value={localConfig.defaultMax ?? selectedNode.config?.defaultMax ?? 1}
                        onChange={(e) => handleConfigFieldChange('defaultMax', parseFloat(e.target.value))}
                        className="w-full p-2 border border-[rgba(255,255,255,0.1)] rounded-md bg-[#252830] text-[rgba(255,255,255,0.8)] focus:ring-1 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500" />
                </div>
            </div>
        )}


        {(selectedNode.operationType === OperationTypeEnum.INPUT_GRAPH || selectedNode.operationType === OperationTypeEnum.OUTPUT_GRAPH) && (
             <div className="mt-3 p-2.5 bg-[rgba(0,0,0,0.05)] rounded-md space-y-2 border border-[rgba(255,255,255,0.05)]" style={configSectionStyle}>
                <div>
                    <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)] mb-1">External Port Name</label>
                    <input type="text" value={localConfig.externalPortName || ''}
                        onChange={(e) => handleConfigFieldChange('externalPortName', e.target.value)}
                        className="w-full p-2 border border-[rgba(255,255,255,0.1)] rounded-md bg-[#252830] text-[rgba(255,255,255,0.8)] focus:ring-1 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)] mb-1">External Port Category</label>
                    <select value={localConfig.externalPortCategory || LogicalCategoryEnum.ANY}
                        onChange={(e) => handleConfigFieldChange('externalPortCategory', e.target.value as LogicalCategoryEnum)}
                        className="w-full p-2 border border-[rgba(255,255,255,0.1)] rounded-md bg-[#252830] text-[rgba(255,255,255,0.8)] focus:ring-1 focus:ring-sky-500 focus:border-sky-500">
                        {Object.values(LogicalCategoryEnum).map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                    </select>
                </div>
             </div>
        )}
        
        {selectedNode.operationType === OperationTypeEnum.ITERATE && (
            <div className="mt-3 p-2.5 bg-[rgba(0,0,0,0.05)] rounded-md border border-[rgba(255,255,255,0.05)]" style={configSectionStyle}>
                <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)] mb-1">Default Max Iterations (if not connected)</label>
                <input type="number"
                    value={localConfig.maxIterations ?? selectedNode.config?.maxIterations ?? ''}
                    onChange={(e) => handleConfigFieldChange('maxIterations', parseInt(e.target.value,10) || 0)}
                    className="w-full p-2 border border-[rgba(255,255,255,0.1)] rounded-md bg-[#252830] text-[rgba(255,255,255,0.8)] focus:ring-1 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500"
                />
            </div>
        )}

        {selectedNode.operationType === OperationTypeEnum.SWITCH && (
            <div className="mt-3 p-2.5 bg-[rgba(0,0,0,0.05)] rounded-md space-y-3 border border-[rgba(255,255,255,0.05)]" style={configSectionStyle}>
                <h3 className="text-sm font-medium text-sky-400 mb-1.5">Switch Cases</h3>
                {(localConfig.switchCases || []).map((switchCase, index) => (
                    <div key={switchCase.id} className="p-2 border border-[rgba(255,255,255,0.08)] rounded-md space-y-2 bg-[rgba(0,0,0,0.1)]">
                        <div className="flex items-center justify-between">
                             <span className="text-xs text-gray-400">Case {index + 1}</span>
                             <button onClick={() => handleRemoveSwitchCase(switchCase.id)} className="p-0.5 text-red-500 hover:text-red-400">
                                <MinusCircleIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-0.5">If Input Value Is:</label>
                            {renderGeneralValueInput(`switchCases.${index}.caseValue`, switchCase.caseValue, "Case value")}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-0.5">Then Output Value Is:</label>
                            {renderGeneralValueInput(`switchCases.${index}.outputValue`, switchCase.outputValue, "Output for this case")}
                        </div>
                    </div>
                ))}
                <button onClick={handleAddSwitchCase}
                    className="flex items-center text-sm px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors neumorphic-button hover:text-sky-300">
                    <PlusCircleIcon className="w-4 h-4 mr-1.5"/> Add Case
                </button>
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1 mt-2">Default Output Value (if no case matches)</label>
                    {renderGeneralValueInput('switchDefaultValue', localConfig.switchDefaultValue, "Default output value")}
                 </div>
            </div>
        )}

        {selectedNode.operationType === OperationTypeEnum.PROGRESS_BAR && (
            <div className="mt-3 p-2.5 bg-[rgba(0,0,0,0.05)] rounded-md space-y-2 border border-[rgba(255,255,255,0.05)]" style={configSectionStyle}>
                <div>
                    <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)] mb-1">Bar Color (Hex)</label>
                    <input type="text" value={localConfig.barColor || '#33C1FF'}
                        onChange={(e) => handleConfigFieldChange('barColor', e.target.value)}
                        placeholder="#33C1FF"
                        className="w-full p-2 border border-[rgba(255,255,255,0.1)] rounded-md bg-[#252830] text-[rgba(255,255,255,0.8)] focus:ring-1 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500" />
                </div>
                 <div className="flex items-center">
                    <input type="checkbox" id="showPercentage" name="showPercentage"
                           checked={localConfig.showPercentage !== undefined ? localConfig.showPercentage : true}
                           onChange={(e) => handleConfigFieldChange('showPercentage', e.target.checked)}
                           className="h-4 w-4 rounded border-gray-500 bg-gray-600 text-sky-500 focus:ring-sky-400 focus:ring-offset-gray-800" />
                    <label htmlFor="showPercentage" className="ml-2 block text-sm text-[rgba(255,255,255,0.7)]">Show Percentage</label>
                </div>
            </div>
        )}
        {selectedNode.operationType === OperationTypeEnum.DATA_TABLE && (
            <div className="mt-3 p-2.5 bg-[rgba(0,0,0,0.05)] rounded-md space-y-2 border border-[rgba(255,255,255,0.05)]" style={configSectionStyle}>
                <div>
                    <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)] mb-1">Columns (comma-separated, optional)</label>
                    <input type="text" value={dataTableColumnsInput}
                        onChange={(e) => setDataTableColumnsInput(e.target.value)}
                        onBlur={() => handleConfigFieldChange('dataTableColumns', dataTableColumnsInput)}
                        placeholder="e.g., id, name, value (or leave blank)"
                        className="w-full p-2 border border-[rgba(255,255,255,0.1)] rounded-md bg-[#252830] text-[rgba(255,255,255,0.8)] focus:ring-1 focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500" />
                     <p className="text-xs text-gray-400 mt-1">If blank, columns are inferred from the first data object.</p>
                </div>
            </div>
        )}


        {showInputOverrides && (
          <div className="mt-3">
            <h3 className="text-sm font-medium text-[rgba(255,255,255,0.6)] mb-1.5">Input Port Overrides (Literals)</h3>
            {selectedNode.inputPorts.map(renderInputPortInspector)}
          </div>
        )}
        
        {selectedNode.type === 'Molecular' && (selectedNode.operationType === OperationTypeEnum.MOLECULAR || selectedNode.operationType === OperationTypeEnum.ITERATE) && (
          <div className="mt-3 p-3 bg-[rgba(0,0,0,0.05)] rounded-md text-sm text-gray-300 border border-[rgba(255,255,255,0.05)]" style={configSectionStyle}>
              <p className="text-teal-400">
                {selectedNode.operationType === OperationTypeEnum.ITERATE ? "Iterate Node Sub-Graph Interface:" : "Molecular Node Interface:"}
              </p>
              <p className="text-xs mt-1">Inputs: {selectedNode.inputPorts.map(p => `${p.name} (${p.category}, ${p.portType})`).join(', ') || 'None'}</p>
              <p className="text-xs mt-1">Outputs: {selectedNode.outputPorts.map(p => `${p.name} (${p.category}, ${p.portType})`).join(', ') || 'None'}</p>
              {selectedNode.operationType === OperationTypeEnum.ITERATE && (
                  <p className="text-xs mt-1 text-yellow-400">Inside sub-graph, use LOOP_ITEM for item/index and ITERATION_RESULT for output per item.</p>
              )}
          </div>
        )}
      </div>
      
      <div className="mt-3">
        <button 
          onClick={() => setIsFooterNoteSectionOpen(prev => !prev)}
          className="flex items-center justify-between w-full p-2 text-sm font-medium text-left text-sky-400 bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.1)] rounded-md focus:outline-none neumorphic-button"
        >
          <div className="flex items-center">
            <ChatBubbleBottomCenterTextIcon className="w-4 h-4 mr-2"/>
            Footer Note
          </div>
          {isFooterNoteSectionOpen ? <MinusCircleIcon className="w-4 h-4" /> : <PlusCircleIcon className="w-4 h-4" />}
        </button>
        {isFooterNoteSectionOpen && (
          <div className="mt-2 p-2.5 bg-[rgba(0,0,0,0.05)] rounded-b-md space-y-2 border border-t-0 border-[rgba(255,255,255,0.05)]" style={{...configSectionStyle, borderTopLeftRadius: 0, borderTopRightRadius: 0}}>
            <div>
              <label htmlFor="footerNoteText" className="block text-xs font-medium text-[rgba(255,255,255,0.7)] mb-1">Note Text</label>
              <textarea
                id="footerNoteText"
                name="footerNoteText"
                rows={3}
                value={localConfig.footerNoteText || ''}
                onChange={(e) => handleConfigFieldChange('footerNoteText', e.target.value)}
                placeholder="Enter annotations or comments for this node..."
                className="w-full p-1.5 text-xs border border-[rgba(255,255,255,0.1)] rounded-md bg-[#252830] text-[rgba(255,255,255,0.8)] focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-mono placeholder-gray-500"
              />
            </div>
            <div className="flex items-center">
              <input
                id="showFooterNote"
                name="showFooterNote"
                type="checkbox"
                checked={localConfig.showFooterNote || false}
                onChange={(e) => handleConfigFieldChange('showFooterNote', e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-500 bg-gray-600 text-sky-500 focus:ring-sky-400 focus:ring-offset-gray-800"
              />
              <label htmlFor="showFooterNote" className="ml-2 block text-xs text-[rgba(255,255,255,0.7)]">
                Show note on node
              </label>
            </div>
          </div>
        )}
      </div>


      <div className="mt-auto pt-3 border-t border-[rgba(255,255,255,0.1)]">
        <h3 className="text-sm font-semibold text-sky-300 mb-1.5">Node Description</h3>
        <p className="text-xs text-[rgba(255,255,255,0.75)] bg-[rgba(0,0,0,0.05)] p-2.5 rounded-md leading-relaxed border border-[rgba(255,255,255,0.05)]" style={configSectionStyle}>
          {description}
        </p>
      </div>
    </div>
  );
};

export default InspectorPanel;