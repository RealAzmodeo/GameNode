import React, { useState, useCallback, useRef, RefObject, useEffect } from 'react';
import { NodeId, NodeResizeEndHandler } from '../types';
import { MIN_RESIZABLE_NODE_WIDTH, MIN_RESIZABLE_NODE_HEIGHT, RESIZE_HANDLE_SIZE } from '../constants';

interface ResizableNodeOptions {
  nodeId: NodeId;
  initialDimensions: { width: number; height: number };
  onResizeEnd: NodeResizeEndHandler;
  svgRef: RefObject<SVGSVGElement | null>;
  panOffsetRef: RefObject<{ x: number; y: number }>;
  zoomLevelRef: RefObject<number>;
  isSelected: boolean; // To control visibility of the handle
}

interface ResizeState {
  isResizing: boolean;
  startMousePos: { x: number; y: number }; // Screen coordinates
  startDimensions: { width: number; height: number }; // World dimensions
}

export function useResizableNode(options: ResizableNodeOptions) {
  const { nodeId, initialDimensions, onResizeEnd, svgRef, panOffsetRef, zoomLevelRef, isSelected } = options;
  const [currentDimensions, setCurrentDimensions] = useState(initialDimensions);
  
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    startMousePos: { x: 0, y: 0 },
    startDimensions: { width: initialDimensions.width, height: initialDimensions.height },
  });

  const resizeHandleRef = useRef<SVGRectElement | null>(null);

  // Refs for callback and frequently changing values to stabilize useCallback dependencies
  const onResizeEndRef = useRef(onResizeEnd);
  const nodeIdRef = useRef(nodeId);
  const currentDimensionsRef = useRef(currentDimensions);
  const zoomLevelRefInternal = useRef(zoomLevelRef.current); // Capture initial zoom, or update if needed

  useEffect(() => {
    onResizeEndRef.current = onResizeEnd;
  }, [onResizeEnd]);

  useEffect(() => {
    nodeIdRef.current = nodeId;
  }, [nodeId]);

  useEffect(() => {
    currentDimensionsRef.current = currentDimensions;
  }, [currentDimensions]);

  useEffect(() => {
    if (zoomLevelRef?.current !== undefined) {
        zoomLevelRefInternal.current = zoomLevelRef.current;
    }
  }, [zoomLevelRef?.current]);


  // Update local dimensions if the initialDimensions prop changes externally.
  useEffect(() => {
    setCurrentDimensions(initialDimensions);
  }, [initialDimensions]);

  const handleMouseDown = useCallback((event: React.MouseEvent<SVGRectElement>) => {
    event.stopPropagation();
    event.preventDefault();

    if (!svgRef.current || !panOffsetRef.current || zoomLevelRefInternal.current === undefined) return;
    
    // Use currentDimensionsRef.current here to ensure the latest state is captured at mousedown
    setResizeState({
      isResizing: true,
      startMousePos: { x: event.clientX, y: event.clientY },
      startDimensions: currentDimensionsRef.current,
    });
  }, [svgRef, panOffsetRef]); // zoomLevelRefInternal is a ref, currentDimensionsRef is a ref

  const handleMouseMove = useCallback((event: MouseEvent) => {
    // Access resizeState directly, not from deps as it's part of the closure from addEventListener
    setResizeState(prevResizeState => {
        if (!prevResizeState.isResizing || zoomLevelRefInternal.current === undefined || zoomLevelRefInternal.current === 0) return prevResizeState;
        event.stopPropagation();

        const deltaScreenX = event.clientX - prevResizeState.startMousePos.x;
        const deltaScreenY = event.clientY - prevResizeState.startMousePos.y;

        const deltaWorldX = deltaScreenX / zoomLevelRefInternal.current;
        const deltaWorldY = deltaScreenY / zoomLevelRefInternal.current;

        let newWidth = prevResizeState.startDimensions.width + deltaWorldX;
        let newHeight = prevResizeState.startDimensions.height + deltaWorldY;

        newWidth = Math.max(MIN_RESIZABLE_NODE_WIDTH, newWidth);
        newHeight = Math.max(MIN_RESIZABLE_NODE_HEIGHT, newHeight);

        setCurrentDimensions({ width: newWidth, height: newHeight });
        return prevResizeState; // mousemove doesn't change resizeState itself, only currentDimensions
    });
  }, []); // No dependencies needed as it uses refs or state setters

  const handleMouseUp = useCallback((event: MouseEvent) => {
    setResizeState(prevResizeState => {
        if (!prevResizeState.isResizing) return prevResizeState;
        event.stopPropagation();

        // Use refs for values that might have changed
        onResizeEndRef.current(nodeIdRef.current, currentDimensionsRef.current);
        return { ...prevResizeState, isResizing: false };
    });
  }, []); // No dependencies needed as it uses refs

  useEffect(() => {
    // Only add/remove listeners if resizeState.isResizing changes
    if (resizeState.isResizing) {
      // handleMouseMove and handleMouseUp are now stable
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizeState.isResizing, handleMouseMove, handleMouseUp]); // handleMouseMove and handleMouseUp are stable

  return {
    currentDimensions, // Still return currentDimensions for rendering
    handleResizeMouseDown: handleMouseDown,
    resizeHandleRef,
    isHandleVisible: isSelected, // Only show handle if selected (or always if preferred)
  };
}
