
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { AnyNode, NodeId, OperationTypeEnum, ExecutionContext, NodeResizeEndHandler, Connection, PortTypeEnum, NodeConfig, InputPort, OutputPort, LogicalCategoryEnum, Breakpoints, QuickInspectField, LogicalCategoryEnum as NodeLogicalCategoryEnum } from '../types';
import PortComponent from './PortComponent';
import { useDraggableNode } from '../hooks/useDraggable';
import { useResizableNode } from '../hooks/useResizableNode';
import {
    NODE_WIDTH, NODE_HEADER_HEIGHT, NODE_TYPE_COLORS,
    DEFAULT_COMMENT_WIDTH, DEFAULT_COMMENT_HEIGHT, DEFAULT_FRAME_WIDTH, DEFAULT_FRAME_HEIGHT,
    RESIZE_HANDLE_SIZE, MIN_RESIZABLE_NODE_WIDTH, MIN_RESIZABLE_NODE_HEIGHT, NODE_PORT_HEIGHT,
    NODE_FOOTER_PADDING_Y, NODE_FOOTER_LINE_HEIGHT, NODE_FOOTER_MAX_LINES, NODE_FOOTER_BORDER_HEIGHT,
    SELECTION_COLOR_ACCENT, ERROR_COLOR_ACCENT, BREAKPOINT_MARKER_SIZE, BREAKPOINT_MARKER_COLOR, PAUSED_NODE_HIGHLIGHT_COLOR, BREAKPOINT_MARKER_BORDER_COLOR,
    DEFAULT_DISPLAY_VALUE_CONTENT_HEIGHT, DEFAULT_DISPLAY_MARKDOWN_CONTENT_HEIGHT,
    DEFAULT_PROGRESS_BAR_CONTENT_HEIGHT, DEFAULT_DATA_TABLE_CONTENT_HEIGHT,
    DEFAULT_DISPLAY_VALUE_WIDTH, DEFAULT_DISPLAY_MARKDOWN_WIDTH, DEFAULT_PROGRESS_BAR_WIDTH, DEFAULT_DATA_TABLE_WIDTH
} from '../constants';
import { CogIcon, CubeTransparentIcon, MinusCircleIcon, StopCircleIcon as BreakpointIconActive, CircleIcon as BreakpointIconInactive } from './Icons';
import { canConnect } from '../services/validationService'; // Added for contextual compatibility
import { UseQuickInspectReturn } from '../hooks/useQuickInspect';

interface NodeComponentProps extends Pick<UseQuickInspectReturn,
  'isQuickInspectTargetNode' |
  'showQuickInspectWithDelay' |
  'hideQuickInspect' |
  'resetQuickInspectTimer' |
  'clearQuickInspectTimer' |
  'openQuickInspectImmediately'
> {
  node: AnyNode;
  connections: Connection[];
  onNodeDrag: (nodeId: NodeId, position: { x: number; y: number }) => void;
  onPortMouseDown: (event: React.MouseEvent, nodeId: NodeId, portId: string, portType: 'input' | 'output') => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
  panOffsetRef: React.RefObject<{ x: number; y: number }>;
  zoomLevelRef: React.RefObject<number>;
  isSelected: boolean;
  isHoveredForConnectionPortId?: string | null;
  onNodeSelect: (nodeId: NodeId | null, isCtrlOrMetaPressed: boolean) => void;
  onNodeConfigOpen: (nodeId: NodeId) => void;
  onNodeConfigUpdate: (nodeId: NodeId, newConfig: Partial<NodeConfig>) => void;
  onRemoveNode: (nodeId: NodeId) => void;
  onRemoveConnection: (connectionId: string) => void;
  resolvedStatesForInspection: ExecutionContext | null;
  onEnterMolecularNode?: (nodeId: NodeId, nodeName: string) => void;
  onNodeResizeEnd: NodeResizeEndHandler;
  isNodeInErrorState?: boolean;
  allNodesForConnectionContext: AnyNode[];
  breakpoints: Breakpoints;
  onToggleBreakpoint: (nodeId: NodeId) => void;
  isPausedAtThisNode: boolean;
  pulsingNodeInfo: { nodeId: NodeId; pulseKey: number } | null;
  selectedNodeOutputsForAffinity: OutputPort[];
  thisNodeIdForAffinity: NodeId;
}

const basicMarkdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  return markdown
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>')         // Italic
    .replace(/\n/g, '<br />');                     // Newlines
};

const NodeComponent: React.FC<NodeComponentProps> = ({
  node,
  connections,
  onNodeDrag,
  onPortMouseDown,
  svgRef,
  panOffsetRef,
  zoomLevelRef,
  isSelected,
  isHoveredForConnectionPortId,
  onNodeSelect,
  onNodeConfigOpen,
  onNodeConfigUpdate,
  onRemoveNode,
  onRemoveConnection: propOnRemoveConnection,
  resolvedStatesForInspection,
  onEnterMolecularNode,
  onNodeResizeEnd,
  isNodeInErrorState = false,
  allNodesForConnectionContext,
  breakpoints,
  onToggleBreakpoint,
  isPausedAtThisNode,
  pulsingNodeInfo,
  isQuickInspectTargetNode,
  showQuickInspectWithDelay,
  hideQuickInspect,
  resetQuickInspectTimer,
  clearQuickInspectTimer,
  openQuickInspectImmediately,
  selectedNodeOutputsForAffinity,
  thisNodeIdForAffinity,
}) => {
  const { position, handleMouseDown: handleNodeMouseDown, nodeRef } = useDraggableNode({
    initialPosition: node.position,
    onDrag: (newPos) => onNodeDrag(node.id, newPos),
    svgRef,
    panOffsetRef,
    zoomLevelRef,
  });

  const isDisplayNode = [
    OperationTypeEnum.DISPLAY_VALUE, OperationTypeEnum.DISPLAY_MARKDOWN_TEXT,
    OperationTypeEnum.PROGRESS_BAR, OperationTypeEnum.DATA_TABLE
  ].includes(node.operationType);

  const isCommentOrFrame = node.operationType === OperationTypeEnum.COMMENT || node.operationType === OperationTypeEnum.FRAME;
  const isResizable = isCommentOrFrame || isDisplayNode;


  const isBreakpointActive = breakpoints.has(node.id);

  // Determine initial dimensions for useResizableNode
  let initialResizableWidth: number;
  let initialResizableHeight: number; // This is content height for display nodes, total height for comment/frame

  switch(node.operationType) {
    case OperationTypeEnum.COMMENT:
      initialResizableWidth = node.config?.frameWidth || DEFAULT_COMMENT_WIDTH;
      initialResizableHeight = node.config?.frameHeight || DEFAULT_COMMENT_HEIGHT;
      break;
    case OperationTypeEnum.FRAME:
      initialResizableWidth = node.config?.frameWidth || DEFAULT_FRAME_WIDTH;
      initialResizableHeight = node.config?.frameHeight || DEFAULT_FRAME_HEIGHT;
      break;
    case OperationTypeEnum.DISPLAY_VALUE:
      initialResizableWidth = node.config?.frameWidth || DEFAULT_DISPLAY_VALUE_WIDTH;
      initialResizableHeight = node.config?.frameHeight || DEFAULT_DISPLAY_VALUE_CONTENT_HEIGHT;
      break;
    case OperationTypeEnum.DISPLAY_MARKDOWN_TEXT:
      initialResizableWidth = node.config?.frameWidth || DEFAULT_DISPLAY_MARKDOWN_WIDTH;
      initialResizableHeight = node.config?.frameHeight || DEFAULT_DISPLAY_MARKDOWN_CONTENT_HEIGHT;
      break;
    case OperationTypeEnum.PROGRESS_BAR:
      initialResizableWidth = node.config?.frameWidth || DEFAULT_PROGRESS_BAR_WIDTH;
      initialResizableHeight = node.config?.frameHeight || DEFAULT_PROGRESS_BAR_CONTENT_HEIGHT;
      break;
    case OperationTypeEnum.DATA_TABLE:
      initialResizableWidth = node.config?.frameWidth || DEFAULT_DATA_TABLE_WIDTH;
      initialResizableHeight = node.config?.frameHeight || DEFAULT_DATA_TABLE_CONTENT_HEIGHT;
      break;
    default: // Standard operational nodes (not resizable via this hook)
      initialResizableWidth = NODE_WIDTH;
      initialResizableHeight = 0; 
  }

  const {
    currentDimensions, // For display nodes, currentDimensions.height is content height
    handleResizeMouseDown,
    isHandleVisible,
    resizeHandleRef,
  } = useResizableNode({
    nodeId: node.id,
    initialDimensions: {
        width: Math.max(MIN_RESIZABLE_NODE_WIDTH, initialResizableWidth),
        height: Math.max(isDisplayNode ? MIN_RESIZABLE_NODE_HEIGHT / 2 : MIN_RESIZABLE_NODE_HEIGHT, initialResizableHeight)
    },
    onResizeEnd: onNodeResizeEnd,
    svgRef,
    panOffsetRef,
    zoomLevelRef,
    isSelected,
  });


  const nodeHeaderTextColorClass = (NODE_TYPE_COLORS[node.operationType] || NODE_TYPE_COLORS[OperationTypeEnum.ASSIGN]).headerText;

  let displayWidth: number;
  let displayHeight: number;
  let footerHeight = 0;
  const showFooter = node.config?.showFooterNote && node.config?.footerNoteText && node.config.footerNoteText.trim() !== '';

  if (showFooter && !isCommentOrFrame) {
      const lines = node.config.footerNoteText!.split('\n').length;
      footerHeight = (Math.min(lines, NODE_FOOTER_MAX_LINES) * NODE_FOOTER_LINE_HEIGHT) + (NODE_FOOTER_PADDING_Y * 2);
      if (node.inputPorts.length > 0 || node.outputPorts.length > 0) {
          footerHeight += NODE_FOOTER_BORDER_HEIGHT;
      }
  }

  const contentVisualizationHeightForDisplayNode = isDisplayNode ? currentDimensions.height : 0;

  if (isDisplayNode) {
    displayWidth = currentDimensions.width;
    displayHeight = NODE_HEADER_HEIGHT +
                    (node.inputPorts?.length || 0) * NODE_PORT_HEIGHT +
                    contentVisualizationHeightForDisplayNode +
                    (node.outputPorts?.length || 0) * NODE_PORT_HEIGHT +
                    footerHeight;
  } else if (isCommentOrFrame) {
    displayWidth = currentDimensions.width;
    displayHeight = currentDimensions.height; // For comment/frame, currentDimensions.height is total height
  } else { // Standard operational node
     displayWidth = NODE_WIDTH;
     const validInputs = node.inputPorts?.filter(p => p) || [];
     const validOutputs = node.outputPorts?.filter(p => p) || [];
     displayHeight = NODE_HEADER_HEIGHT +
                     (validInputs.length * NODE_PORT_HEIGHT) +
                     (validOutputs.length * NODE_PORT_HEIGHT) +
                     footerHeight;
  }


  const foreignObjectRef = useRef<SVGForeignObjectElement | null>(null);

  const getImportantConfigFields = useCallback((n: AnyNode): QuickInspectField[] => {
    const fields: QuickInspectField[] = [];
    switch (n.operationType) {
        case OperationTypeEnum.VALUE_PROVIDER:
            fields.push({ key: 'value', label: 'Value', type: typeof n.config?.value === 'boolean' ? 'select' : (typeof n.config?.value === 'number' ? 'number' : (typeof n.config?.value === 'object' ? 'textarea' : 'text')), options: typeof n.config?.value === 'boolean' ? [{value: true, label: 'True'}, {value: false, label: 'False'}] : undefined });
            break;
        case OperationTypeEnum.STATE:
            fields.push({ key: 'stateId', label: 'State ID', type: 'text' });
            fields.push({ key: 'initialValue', label: 'Initial Value', type: typeof n.config?.initialValue === 'boolean' ? 'select' : (typeof n.config?.initialValue === 'number' ? 'number' : (typeof n.config?.initialValue === 'object' ? 'textarea' : 'text')), options: typeof n.config?.initialValue === 'boolean' ? [{value: true, label: 'True'}, {value: false, label: 'False'}] : undefined });
            break;
        case OperationTypeEnum.ON_EVENT:
            fields.push({ key: 'eventName', label: 'Event Name', type: 'text' });
            break;
        case OperationTypeEnum.COMMENT:
            fields.push({ key: 'commentText', label: 'Comment', type: 'textarea' });
            break;
        case OperationTypeEnum.FRAME:
            fields.push({ key: 'frameTitle', label: 'Title', type: 'text' });
            break;
    }
    return fields.slice(0, 3);
  }, []);

  const handleNodeMouseEnterWrapper = () => {
    if (isQuickInspectTargetNode(node.id)) return;
    showQuickInspectWithDelay(node, () => foreignObjectRef.current?.getBoundingClientRect(), getImportantConfigFields);
  };

  const handleNodeMouseLeaveWrapper = () => {
    hideQuickInspect();
  };

  const handleNodeMouseMoveWrapper = () => {
    if (!isQuickInspectTargetNode(node.id)) {
       resetQuickInspectTimer(node, () => foreignObjectRef.current?.getBoundingClientRect(), getImportantConfigFields);
    }
  };

  const isContextuallyCompatible = React.useMemo(() => {
    if (selectedNodeOutputsForAffinity.length === 0 || thisNodeIdForAffinity === node.id) {
      return false;
    }
    for (const selectedOutputPort of selectedNodeOutputsForAffinity) {
      for (const inputPort of node.inputPorts) {
        const { Succeeded } = canConnect(selectedOutputPort, inputPort, node.operationType, connections, thisNodeIdForAffinity, node.id);
        if (Succeeded) return true;
      }
    }
    return false;
  }, [selectedNodeOutputsForAffinity, node.inputPorts, node.id, node.operationType, connections, thisNodeIdForAffinity]);

  const handleWrapperMouseDown = (e: React.MouseEvent) => {
    const target = e.target;
    clearQuickInspectTimer();
    if (isQuickInspectTargetNode(node.id)) hideQuickInspect();

    if (!(target instanceof Element)) {
        onNodeSelect(node.id, e.metaKey || e.ctrlKey);
        handleNodeMouseDown(e);
        return;
    }

    const targetElement = target as Element;

    if (targetElement.closest && targetElement.closest('.breakpoint-toggle')) return;
    if (isResizable && targetElement.closest && targetElement.closest('.resize-handle-rect')) return;
    if (targetElement.tagName.toUpperCase() === 'INPUT' && targetElement.closest(`[id^="${node.id}-input-"]`)) return;
    if (targetElement.closest && targetElement.closest('button[title="Remove connection"]')) return;

    onNodeSelect(node.id, e.metaKey || e.ctrlKey);
    handleNodeMouseDown(e);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (node.type === 'Molecular' && onEnterMolecularNode && !e.metaKey && !e.ctrlKey) {
      e.stopPropagation();
      onEnterMolecularNode(node.id, node.name);
    }
  };

  const hasConfigurableFieldsViaModal =
    node.operationType === OperationTypeEnum.VALUE_PROVIDER ||
    node.type === 'Molecular' ||
    node.operationType === OperationTypeEnum.INPUT_GRAPH ||
    node.operationType === OperationTypeEnum.OUTPUT_GRAPH ||
    node.operationType === OperationTypeEnum.STATE ||
    node.operationType === OperationTypeEnum.ON_EVENT ||
    node.operationType === OperationTypeEnum.RANDOM_NUMBER ||
    node.operationType === OperationTypeEnum.SWITCH ||
    node.operationType === OperationTypeEnum.COMMENT ||
    node.operationType === OperationTypeEnum.FRAME ||
    node.operationType === OperationTypeEnum.SEND_DATA ||
    node.operationType === OperationTypeEnum.RECEIVE_DATA ||
    node.operationType === OperationTypeEnum.ITERATE ||
    node.operationType === OperationTypeEnum.PROGRESS_BAR ||
    node.operationType === OperationTypeEnum.DATA_TABLE;

  const handleLiteralOverrideChange = (portId: string, value: any) => {
    const currentOverrides = node.config?.inputPortOverrides || {};
    let updatedOverrides = { ...currentOverrides };

    if (value === undefined) delete updatedOverrides[portId];
    else updatedOverrides[portId] = value;

    if (Object.keys(updatedOverrides).length === 0) {
      const newConfig = { ...node.config };
      delete newConfig.inputPortOverrides;
      onNodeConfigUpdate(node.id, newConfig as Partial<NodeConfig>);
    } else {
      onNodeConfigUpdate(node.id, { inputPortOverrides: updatedOverrides });
    }
  };

  const handleRemoveConnectionToInputPort = (portId: string) => {
    const connectionToRemove = connections.find(conn => conn.toNodeId === node.id && conn.toPortId === portId);
    if (connectionToRemove && typeof propOnRemoveConnection === 'function') {
      propOnRemoveConnection(connectionToRemove.id);
    }
  };

  const nodeBaseStyle: React.CSSProperties = {
    backgroundColor: isPausedAtThisNode ? PAUSED_NODE_HIGHLIGHT_COLOR :
                     (node.operationType === OperationTypeEnum.COMMENT ? 'rgba(250, 243, 196, 0.9)' :
                     (node.operationType === OperationTypeEnum.FRAME   ? 'rgba(65, 75, 89, 0.7)' :
                     (isDisplayNode ? 'rgba(55, 65, 81, 0.35)' :
                                                                         'rgba(45, 48, 57, 0.25)'))),
    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    borderTop: `1px solid rgba(255, 255, 255, 0.25)`, borderLeft: `1px solid rgba(255, 255, 255, 0.20)`,
    borderBottom: `1px solid rgba(255, 255, 255, 0.05)`, borderRight: `1px solid rgba(255, 255, 255, 0.05)`,
    boxShadow: isSelected
               ? `0px 10px 28px rgba(68, 138, 255, 0.22), 0 0 0 2px ${SELECTION_COLOR_ACCENT}`
               : (isNodeInErrorState
                  ? `0px 8px 20px rgba(211, 47, 47, 0.25), 0 0 0 2px ${ERROR_COLOR_ACCENT}`
                  : `0px 8px 20px rgba(68, 138, 255, 0.12)`),
    transition: 'box-shadow 0.2s ease-out, border-color 0.2s ease-out, outline 0.1s ease-in-out, background-color 0.2s ease-out',
    borderRadius: '1rem', outline: 'none',
  };

  const headerStyle: React.CSSProperties = {
     backgroundColor: node.operationType === OperationTypeEnum.COMMENT ? 'rgba(234, 179, 8, 0.2)' :
                      node.operationType === OperationTypeEnum.FRAME ? 'rgba(107, 114, 128, 0.2)' :
                      (isDisplayNode ? 'rgba(255,255,255,0.08)' :
                      'rgba(255,255,255,0.05)'),
     borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
     borderTopLeftRadius: '0.9rem', borderTopRightRadius: '0.9rem',
  };

  const [showPulseEffect, setShowPulseEffect] = useState(false);
  useEffect(() => {
    if (pulsingNodeInfo && pulsingNodeInfo.nodeId === node.id) {
      setShowPulseEffect(true);
      const timer = setTimeout(() => setShowPulseEffect(false), 500);
      return () => clearTimeout(timer);
    }
  }, [pulsingNodeInfo, node.id]);

  const resolvedInputVal = useCallback((portName: string) => {
      const inputPort = node.inputPorts.find(p => p.name === portName);
      if (!inputPort || !resolvedStatesForInspection) return undefined;
      const connection = connections.find(c => c.toNodeId === node.id && c.toPortId === inputPort.id);
      return connection ? resolvedStatesForInspection[`${connection.fromNodeId}_${connection.fromPortId}`] : node.config?.inputPortOverrides?.[inputPort.id];
  }, [node, connections, resolvedStatesForInspection]);

  const renderNodeCentralContent = useMemo(() => {
    switch(node.operationType) {
      case OperationTypeEnum.COMMENT:
        return <div className="p-2.5 text-xs text-yellow-800 overflow-y-auto flex-grow h-full" style={{fontFamily: "'Courier New', Courier, monospace"}}><pre className="whitespace-pre-wrap break-words h-full">{node.config?.commentText || ''}</pre></div>;
      case OperationTypeEnum.FRAME:
        return <div className="flex-grow h-full"></div>; // Frame is just visual, content is managed by react-flow-renderer implicitly
      case OperationTypeEnum.DISPLAY_VALUE:
        const displayVal = resolvedInputVal('Value');
        let formattedVal = String(displayVal ?? 'N/A');
        if (typeof displayVal === 'object' && displayVal !== null) {
            try { formattedVal = JSON.stringify(displayVal, null, 2); }
            catch (e) { formattedVal = '[Unserializable Object]'; }
        }
        return <div className="p-2.5 text-sm text-on-glass overflow-auto h-full flex items-center justify-center"><pre className="whitespace-pre-wrap break-words text-center">{formattedVal}</pre></div>;
      case OperationTypeEnum.DISPLAY_MARKDOWN_TEXT:
        const markdownInput = resolvedInputVal('Markdown String') || '';
        return <div className="p-2.5 text-sm text-on-glass overflow-y-auto h-full" dangerouslySetInnerHTML={{ __html: basicMarkdownToHtml(String(markdownInput)) }} />;
      case OperationTypeEnum.PROGRESS_BAR:
        const val = parseFloat(String(resolvedInputVal('Value') ?? 0));
        const min = parseFloat(String(resolvedInputVal('Min') ?? node.config?.defaultMin ?? 0));
        const max = parseFloat(String(resolvedInputVal('Max') ?? node.config?.defaultMax ?? 100));
        const percentage = (max > min) ? Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100)) : 0;
        const barColor = node.config?.barColor || '#33C1FF';
        const showPercentageConfig = node.config?.showPercentage !== undefined ? node.config.showPercentage : true;
        return (
            <div className="px-3 py-2 h-full flex flex-col justify-center">
                <div className="w-full bg-gray-700 rounded-full h-5 overflow-hidden border border-gray-500">
                    <div className="h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${percentage}%`, backgroundColor: barColor }}></div>
                </div>
                {showPercentageConfig && <p className="text-center text-xs text-on-glass mt-1">{val.toFixed(1)} ({percentage.toFixed(0)}%)</p>}
            </div>
        );
    case OperationTypeEnum.DATA_TABLE:
        const tableData = resolvedInputVal('Data');
        let columns: string[] = node.config?.dataTableColumns || [];
        if (!Array.isArray(tableData) || tableData.length === 0) {
            return <div className="p-2.5 text-xs text-gray-400 italic h-full flex items-center justify-center">No data or not an array.</div>;
        }
        if (columns.length === 0 && typeof tableData[0] === 'object' && tableData[0] !== null) {
            columns = Object.keys(tableData[0]);
        }
        return (
            <div className="p-1 text-xs text-on-glass overflow-auto h-full">
                <table className="w-full min-w-max table-auto text-left">
                    <thead><tr className="bg-white/10">{columns.map(col => <th key={col} className="p-1.5 border-b border-white/10 text-xs font-semibold truncate">{col}</th>)}</tr></thead>
                    <tbody>{tableData.map((row, rowIndex) => (<tr key={rowIndex} className="even:bg-black/5 hover:bg-white/5 transition-colors">{columns.map(col => (<td key={`${rowIndex}-${col}`} className="p-1.5 border-b border-white/5 text-xs truncate max-w-[100px]">{typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}</td>))}</tr>))}</tbody>
                </table>
            </div>
        );
      default:
        return null; // Operational nodes don't have central content this way
    }
  }, [node, resolvedInputVal, connections]);

  return (
    <foreignObject
      ref={foreignObjectRef}
      x={position.x}
      y={position.y}
      width={displayWidth}
      height={displayHeight}
      onMouseDown={handleWrapperMouseDown}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleNodeMouseEnterWrapper}
      onMouseLeave={handleNodeMouseLeaveWrapper}
      onMouseMove={handleNodeMouseMoveWrapper}
      className={`cursor-grab ${node.operationType === OperationTypeEnum.FRAME ? 'group-frame-node' : ''}
                  ${showPulseEffect ? 'node-executing-pulse-effect' : ''}
                  ${isContextuallyCompatible && !isSelected ? 'node-contextual-affinity-pulse' : ''}`}
      style={{ overflow: 'visible', borderRadius: '1rem' }}
    >
      <div
        className="w-full h-full flex flex-col"
        style={nodeBaseStyle}
      >
        <div
          className={`flex items-center justify-between p-2 h-[${NODE_HEADER_HEIGHT}px] select-none`}
          style={headerStyle}
        >
          <div className="flex items-center space-x-2">
             <button
                onClick={(e) => { e.stopPropagation(); onToggleBreakpoint(node.id); }}
                className={`breakpoint-toggle p-0.5 rounded-full focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-gray-700 ${isBreakpointActive ? 'focus:ring-red-300' : 'focus:ring-gray-400'}`}
                title={isBreakpointActive ? "Remove breakpoint" : "Set breakpoint"} aria-pressed={isBreakpointActive}
              >
                {isBreakpointActive ? <BreakpointIconActive className={`w-3 h-3 text-red-500`} /> : <BreakpointIconInactive className={`w-3 h-3 text-gray-500 hover:text-gray-400`} />}
              </button>
            {node.type === 'Molecular' && !isCommentOrFrame && <CubeTransparentIcon className="w-4 h-4" />}
            <span className={`font-semibold text-sm truncate text-on-glass ${nodeHeaderTextColorClass}`} title={node.name}>
                {node.operationType === OperationTypeEnum.FRAME ? node.config?.frameTitle || node.name : node.name}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            { hasConfigurableFieldsViaModal &&
                <button
                  onClick={(e) => { e.stopPropagation(); onNodeConfigOpen(node.id); }}
                  className="p-1 hover:bg-white/10 rounded text-gray-300 hover:text-white"
                  title="Configure Node (Modal)" aria-label="Configure Node"
                > <CogIcon className="w-4 h-4" /> </button>
            }
             <button
                onClick={(e) => { e.stopPropagation(); onRemoveNode(node.id); }}
                className="p-1 hover:bg-red-500/20 rounded text-gray-300 hover:text-red-400"
                title="Remove Node" aria-label="Remove Node"
            > <MinusCircleIcon className="w-4 h-4" /> </button>
          </div>
        </div>

        <div className={`flex-grow min-h-0 flex flex-col ${isCommentOrFrame ? 'overflow-hidden' : ''}`}>
            {/* Input Ports */}
            {(node.inputPorts || []).filter(p => p).map((port) => {
                const isConnected = connections.some(conn => conn.toNodeId === node.id && conn.toPortId === port.id);
                const literalOverride = node.config?.inputPortOverrides?.[port.id];
                const connectionToPort = connections.find(conn => conn.toNodeId === node.id && conn.toPortId === port.id);
                let connectedOutputCat: LogicalCategoryEnum | undefined = undefined;
                if (isConnected && connectionToPort) {
                    const sourceNode = allNodesForConnectionContext.find(n => n.id === connectionToPort.fromNodeId);
                    const sourceOutputPort = sourceNode?.outputPorts.find(p => p.id === connectionToPort.fromPortId);
                    if (sourceOutputPort) connectedOutputCat = sourceOutputPort.category;
                }
                let resolvedValueForPort: any = undefined;
                if (resolvedStatesForInspection && isConnected && connectionToPort) {
                    resolvedValueForPort = resolvedStatesForInspection[`${connectionToPort.fromNodeId}_${connectionToPort.fromPortId}`];
                }
                return (
                <PortComponent
                    key={port.id} nodeId={node.id} port={port as InputPort} type="input"
                    isHoveredForConnection={isHoveredForConnectionPortId === port.id}
                    isConnected={isConnected} literalOverrideValue={literalOverride}
                    onLiteralOverrideChange={handleLiteralOverrideChange}
                    onRemoveConnectionToPort={handleRemoveConnectionToInputPort}
                    connectionId={connectionToPort?.id} connectedOutputPortCategory={connectedOutputCat}
                    resolvedValue={resolvedValueForPort}
                />
                );
            })}

            {/* Central Content Area (Visualization for display nodes, comment/frame body, or empty for operational) */}
            {(isDisplayNode || isCommentOrFrame) && renderNodeCentralContent && (
                <div
                  className={`central-content-visualization-area ${isCommentOrFrame ? 'flex-grow min-h-0' : ''} ${isDisplayNode ? 'overflow-hidden' : ''}`}
                  style={isDisplayNode ? { height: `${contentVisualizationHeightForDisplayNode}px` } : (isCommentOrFrame ? {flexGrow:1, minHeight:0} : {})}
                >
                     {renderNodeCentralContent}
                </div>
            )}

            {/* Output Ports */}
            {(node.outputPorts || []).filter(p => p).map((port) => {
                const resolvedValueKey = `${node.id}_${port.id}`;
                const resolvedValue = resolvedStatesForInspection ? resolvedStatesForInspection[resolvedValueKey] : undefined;
                const isConnected = connections.some(conn => conn.fromNodeId === node.id && conn.fromPortId === port.id);
                return (
                <PortComponent
                    key={port.id} nodeId={node.id} port={port as OutputPort} type="output"
                    onMouseDown={(e, pId, pType) => onPortMouseDown(e, node.id, pId, pType)}
                    isHoveredForConnection={isHoveredForConnectionPortId === port.id}
                    resolvedValue={resolvedValue} isConnected={isConnected}
                />
                );
            })}
        </div>

        {showFooter && footerHeight > 0 && !isCommentOrFrame && ( // Footer for non-comment/frame, including display nodes
          <div
            className="text-xs text-[rgba(255,255,255,0.75)] p-1 border-t border-white/10"
            style={{ maxHeight: `${footerHeight - NODE_FOOTER_BORDER_HEIGHT}px`, height: `${footerHeight - NODE_FOOTER_BORDER_HEIGHT}px`, overflow: 'hidden' }}
            title={node.config?.footerNoteText}
          >
            <pre className="whitespace-pre-wrap break-words text-[10px] leading-tight font-mono p-0.5 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500/50 scrollbar-track-transparent">
                {node.config?.footerNoteText}
            </pre>
          </div>
        )}
      </div>
      {isResizable && isHandleVisible && (
        <svg
            className="resize-handle"
            x={displayWidth - RESIZE_HANDLE_SIZE / 2}
            y={displayHeight - RESIZE_HANDLE_SIZE / 2}
            width={RESIZE_HANDLE_SIZE} height={RESIZE_HANDLE_SIZE}
            style={{ cursor: 'se-resize', zIndex: 100, overflow: 'visible' }}
        >
            <rect ref={resizeHandleRef} onMouseDown={handleResizeMouseDown}
                className="resize-handle-rect" width={RESIZE_HANDLE_SIZE} height={RESIZE_HANDLE_SIZE}
                fill="rgba(120, 120, 120, 0.5)" stroke="rgba(220, 220, 220, 0.7)" strokeWidth="1" rx="2"
            />
        </svg>
      )}
    </foreignObject>
  );
};

export default React.memo(NodeComponent);
