
import React, { useState, useCallback, useMemo } from 'react';
import { OperationTypeEnum, NodeId, MolecularNode, ComponentBlueprint, QuickShelfItem, OutputPort, AnyNode, Connection, RegisteredAtomicNodeDefinition } from '@/types';
import { nodeRegistryService } from '@/services/NodeRegistryService';
import { componentRegistryService } from '@/services/ComponentRegistryService';
import * as Icons from './Icons';
import { XMarkIcon } from './Icons';
import { canConnect } from '@/services/validationService';

interface NodeButtonProps {
  label: string;
  icon: JSX.Element;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLButtonElement>) => void;
  isArchetype?: boolean;
  isCompatible?: boolean;
  isFilteredOut?: boolean;
}

const NodeButton: React.FC<NodeButtonProps> = ({
    label, icon, onClick, disabled, title, draggable, onDragStart,
    isArchetype, isCompatible, isFilteredOut
}) => {
    const buttonClasses = [
        "flex items-center justify-start w-full px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#2D3039] neumorphic-button",
        disabled ? '' : 'hover:text-sky-300 focus:ring-sky-400',
        isArchetype ? 'archetype-node-button' : '',
        isCompatible && !isFilteredOut ? 'compatible-highlight-pulse' : '',
        isFilteredOut ? 'filtered-out-button' : ''
    ].filter(Boolean).join(' ');

    return (
      <button
        onClick={onClick}
        disabled={disabled || isFilteredOut}
        className={buttonClasses}
        title={title || `Add ${label} node`}
        draggable={draggable && !isFilteredOut}
        onDragStart={onDragStart}
        aria-label={title || `Add ${label} node`}
      >
        {React.cloneElement(icon, { className: `w-4 h-4 mr-2 ${disabled ? 'text-gray-500' : ''} ${isArchetype ? 'archetype-icon-size' : ''}` })}
        <span className="truncate">{label}</span>
      </button>
    );
};

interface ControlsPanelProps {
  onAddNode: (type: OperationTypeEnum) => void;
  onAddBlueprintNode: (blueprintCreator: () => MolecularNode) => void;
  currentGraphId: NodeId | 'root';
  parentNodeOperationType?: OperationTypeEnum;
  quickShelfItems: QuickShelfItem[];
  addQuickShelfItem: (item: Omit<QuickShelfItem, 'id'> & {id?: string}) => void;
  removeQuickShelfItem: (itemId: string) => void;
  isFocusModeActive: boolean;
  selectedNodeOutputsForAffinity: OutputPort[];
  allNodes: AnyNode[]; // Kept for context if needed by compatibility checks
  allConnections: Connection[]; // Kept for context if needed by compatibility checks
}

type PanelTab = 'atomics' | 'components';

const ControlsPanel: React.FC<ControlsPanelProps> = ({
    onAddNode,
    onAddBlueprintNode,
    currentGraphId,
    parentNodeOperationType,
    quickShelfItems,
    addQuickShelfItem,
    removeQuickShelfItem,
    isFocusModeActive,
    selectedNodeOutputsForAffinity,
    allNodes, // Pass through if checkCompatibility relies on it
    allConnections, // Pass through if checkCompatibility relies on it
}) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('atomics');
  const [isDraggingOverShelf, setIsDraggingOverShelf] = useState(false);

  const isRootGraph = currentGraphId === 'root';
  const isInMolecularSubGraph = !isRootGraph && parentNodeOperationType === OperationTypeEnum.MOLECULAR;
  const isInIterateSubGraph = !isRootGraph && parentNodeOperationType === OperationTypeEnum.ITERATE;

  const atomicNodeDefinitionsByCategory = useMemo(() => nodeRegistryService.getGroupedNodeDefinitionsForControls(), []);
  const componentBlueprints = useMemo(() => componentRegistryService.getAllComponentBlueprints(), []);


  const isNodeTypeDisabled = (opType: OperationTypeEnum): boolean => {
    if (opType === OperationTypeEnum.MOLECULAR || opType === OperationTypeEnum.ITERATE) return !isRootGraph;
    if (opType === OperationTypeEnum.INPUT_GRAPH || opType === OperationTypeEnum.OUTPUT_GRAPH) return !isInMolecularSubGraph;
    if (opType === OperationTypeEnum.LOOP_ITEM || opType === OperationTypeEnum.ITERATION_RESULT) return !isInIterateSubGraph;
    return false;
  };

  const getNodeTypeTitle = (opType: OperationTypeEnum, defaultTitle?: string): string => {
    if (isNodeTypeDisabled(opType)) {
        if (opType === OperationTypeEnum.MOLECULAR || opType === OperationTypeEnum.ITERATE) return "Complex nodes (Molecule, Iterate) can only be added to the Root Graph.";
        if (opType === OperationTypeEnum.INPUT_GRAPH || opType === OperationTypeEnum.OUTPUT_GRAPH) return "Graph I/O ports are for Molecular sub-graphs only.";
        if (opType === OperationTypeEnum.LOOP_ITEM || opType === OperationTypeEnum.ITERATION_RESULT) return "Loop/Iteration nodes are for Iterate sub-graphs only.";
    }
    return defaultTitle || `Add ${opType.toString().replace(/_/g, ' ')} node`;
  };

  const handleDragStart = (event: React.DragEvent<HTMLButtonElement>, itemType: 'atomic' | 'blueprint', identifier: OperationTypeEnum | string, label: string, icon: React.FC<React.SVGProps<SVGSVGElement>>) => {
    const dataToTransfer: Omit<QuickShelfItem, 'id'> = {
        type: itemType,
        label: label,
        icon: icon,
    };
    if (itemType === 'atomic') {
        dataToTransfer.operationType = identifier as OperationTypeEnum;
    } else {
        dataToTransfer.blueprintName = identifier as string;
    }
    event.dataTransfer.setData('application/json', JSON.stringify(dataToTransfer));
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleDropOnShelf = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOverShelf(false);
    try {
        const dataRaw = event.dataTransfer.getData('application/json');
        if (dataRaw) {
            const droppedItemData: Omit<QuickShelfItem, 'id' | 'icon'> & { iconName?: string } = JSON.parse(dataRaw);

            let iconComponent: React.FC<React.SVGProps<SVGSVGElement>> = Icons.CogIcon;
            if (droppedItemData.type === 'atomic' && droppedItemData.operationType) {
                const nodeDef = nodeRegistryService.getNodeDefinition(droppedItemData.operationType);
                if(nodeDef) iconComponent = nodeDef.icon;
            } else if (droppedItemData.type === 'blueprint' && droppedItemData.blueprintName) {
                const bpDef = componentRegistryService.getComponentBlueprint(droppedItemData.blueprintName);
                if(bpDef && bpDef.icon) iconComponent = bpDef.icon;
                else iconComponent = Icons.CubeTransparentIcon;
            }
            addQuickShelfItem({ ...droppedItemData, icon: iconComponent });
        }
    } catch (e) {
        console.error("Error processing dropped item on Quick Shelf:", e);
    }
  };

  const handleDragOverShelf = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDraggingOverShelf(true);
  };

  const handleDragLeaveShelf = () => {
    setIsDraggingOverShelf(false);
  };

  const handleQuickShelfItemClick = (item: QuickShelfItem) => {
    if (item.type === 'atomic' && item.operationType) {
        if (!isNodeTypeDisabled(item.operationType)) {
            onAddNode(item.operationType);
        } else {
            alert(getNodeTypeTitle(item.operationType));
        }
    } else if (item.type === 'blueprint' && item.blueprintName) {
        if (!isRootGraph) {
            alert("Component blueprints can only be added to the Root Graph.");
            return;
        }
        const blueprint = componentRegistryService.getComponentBlueprint(item.blueprintName);
        if (blueprint) {
            onAddBlueprintNode(blueprint.creatorFunction);
        }
    }
  };

  const checkCompatibility = useCallback((potentialNodeOpType: OperationTypeEnum): boolean => {
    if (selectedNodeOutputsForAffinity.length === 0) return false;

    const nodeDef = nodeRegistryService.getNodeDefinition(potentialNodeOpType);
    if (!nodeDef) return false;

    // Ensure allNodes and allConnections are passed down if canConnect needs them
    const { inputPorts: potentialInputPorts } = nodeDef.portGenerator('temp-check-id');

    for (const selectedOutput of selectedNodeOutputsForAffinity) {
        for (const potentialInput of potentialInputPorts) {
            // Assuming canConnect can receive undefined/empty for allConnections if only checking port compatibility
            const { Succeeded } = canConnect(selectedOutput, potentialInput, potentialNodeOpType, allConnections || [], 'selected-node-on-canvas', 'potential-node-from-panel');
            if (Succeeded) return true;
        }
    }
    return false;
  }, [selectedNodeOutputsForAffinity, allConnections, allNodes]);


  return (
    <div className="h-full flex flex-col">
        <div
            className={`p-2 border-b border-[rgba(255,255,255,0.08)] ${isDraggingOverShelf ? 'bg-sky-700/30 ring-2 ring-sky-500' : 'bg-[#2A2D34]'}`}
            style={{boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.2)', minHeight: '80px'}}
            onDrop={handleDropOnShelf}
            onDragOver={handleDragOverShelf}
            onDragLeave={handleDragLeaveShelf}
            aria-label="Quick Shelf Drop Zone"
        >
            <h3 className="text-xs font-semibold text-[rgba(255,255,255,0.6)] mb-1.5 tracking-wider uppercase">Quick Shelf</h3>
            {quickShelfItems.length === 0 ? (
                <p className="text-xs text-gray-500 italic text-center py-2">Drag nodes here for quick access.</p>
            ) : (
                <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                    {quickShelfItems.map(item => {
                        const Icon = item.icon;
                        const isCompatible = item.operationType ? checkCompatibility(item.operationType) : false;
                        const isFilteredOut = isFocusModeActive && !isCompatible && selectedNodeOutputsForAffinity.length > 0;
                        return (
                            <div key={item.id} className="relative group" title={`Add ${item.label} to canvas`}>
                                <button
                                    onClick={() => handleQuickShelfItemClick(item)}
                                    className={`flex flex-col items-center p-1.5 rounded-md neumorphic-button hover:bg-sky-600/30 w-16 h-16 text-xs
                                        ${isCompatible && !isFilteredOut ? 'compatible-highlight-pulse' : ''}
                                        ${isFilteredOut ? 'filtered-out-button' : ''}
                                    `}
                                    style={{ background: '#2D3039', boxShadow: '0 -1px 2px rgba(57, 60, 73, 0.4), 0 1px 2px rgba(33, 36, 41, 0.5)'}}
                                    disabled={item.operationType ? isNodeTypeDisabled(item.operationType) || isFilteredOut : isFilteredOut}
                                >
                                    <Icon className="w-5 h-5 mb-1 text-gray-300 group-hover:text-sky-300" />
                                    <span className="truncate w-full text-center text-[10px] text-gray-400 group-hover:text-sky-300">{item.label}</span>
                                </button>
                                <button
                                    onClick={() => removeQuickShelfItem(item.id)}
                                    className="absolute -top-1 -right-1 p-0.5 bg-red-600 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    title={`Remove ${item.label} from shelf`}
                                    aria-label={`Remove ${item.label} from shelf`}
                                >
                                    <XMarkIcon className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

      <div className="flex-shrink-0 border-b border-[rgba(255,255,255,0.08)]">
        <div className="flex space-x-1 p-1 bg-[#2D3039] rounded-t-md"
             style={{boxShadow: 'inset 2px 2px 4px #212429, inset -2px -2px 4px #393c49'}}>
          <button
            onClick={() => setActiveTab('atomics')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md focus:outline-none transition-all duration-150 neumorphic-button ${
              activeTab === 'atomics' ? 'active-tab-style' : 'hover:text-sky-400'
            }`}
          >
            Atomic Nodes
          </button>
          <button
            onClick={() => setActiveTab('components')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md focus:outline-none transition-all duration-150 neumorphic-button ${
              activeTab === 'components' ? 'active-tab-style text-indigo-300' : 'hover:text-indigo-400'
            }`}
          >
            Component Library
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto space-y-4 pr-1 p-1">
        {activeTab === 'atomics' && (
          Object.entries(atomicNodeDefinitionsByCategory)
          .sort(([catA], [catB]) => catA.localeCompare(catB))
          .map(([categoryName, nodesInCategory]) => (
              <div key={categoryName} className="mb-3">
                <h3 className="text-xs font-semibold text-[rgba(255,255,255,0.6)] mb-2 sticky top-0 bg-[#2D3039] py-1 z-10 tracking-wider uppercase">{categoryName}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {nodesInCategory.map(nodeInfo => {
                    const isArchetype = nodeInfo.isArchetype || false;
                    const isCompatible = checkCompatibility(nodeInfo.opType);
                    const isFilteredOut = isFocusModeActive && !isCompatible && selectedNodeOutputsForAffinity.length > 0;

                    return (
                        <NodeButton
                            key={nodeInfo.opType}
                            label={nodeInfo.label}
                            icon={React.createElement(nodeInfo.icon)}
                            onClick={() => { if (!isNodeTypeDisabled(nodeInfo.opType)) onAddNode(nodeInfo.opType); }}
                            disabled={isNodeTypeDisabled(nodeInfo.opType)}
                            title={getNodeTypeTitle(nodeInfo.opType, nodeInfo.title)}
                            draggable={!isNodeTypeDisabled(nodeInfo.opType)}
                            onDragStart={(e) => handleDragStart(e, 'atomic', nodeInfo.opType, nodeInfo.label, nodeInfo.icon)}
                            isArchetype={isArchetype}
                            isCompatible={isCompatible}
                            isFilteredOut={isFilteredOut}
                        />
                    );
                  })}
                </div>
              </div>
            )
          )
        )}

        {activeTab === 'components' && (
          <div>
            <h3 className="text-xs font-semibold text-[rgba(255,255,255,0.6)] mb-2 sticky top-0 bg-[#2D3039] py-1 z-10 tracking-wider uppercase">Reusable Components</h3>
            <div className="grid grid-cols-1 gap-2">
              {componentBlueprints.map((bpEntry) => {
                const isFilteredOut = isFocusModeActive && selectedNodeOutputsForAffinity.length > 0; 
                const IconComp = bpEntry.icon || Icons.CubeTransparentIcon;
                return (
                    <NodeButton
                    key={bpEntry.id || bpEntry.name}
                    label={bpEntry.name}
                    icon={<IconComp />}
                    onClick={() => { if (isRootGraph) onAddBlueprintNode(bpEntry.creatorFunction);}}
                    disabled={!isRootGraph}
                    title={isRootGraph ? (bpEntry.description || `Add ${bpEntry.name} component`) : "Components can only be added to the Root Graph."}
                    draggable={isRootGraph}
                    onDragStart={(e) => handleDragStart(e, 'blueprint', bpEntry.id || bpEntry.name, bpEntry.name, IconComp)}
                    isFilteredOut={isFilteredOut} 
                    />
                );
              })}
            </div>
            {!isRootGraph && (
                <p className="text-xs text-yellow-500/80 italic mt-3 p-2 bg-yellow-700/20 rounded-md border border-yellow-600/30">
                    Component blueprints can only be added to the Root Graph. Navigate to the Root Graph to use them.
                </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlsPanel;
