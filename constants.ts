
import { LogicalCategoryEnum, OperationTypeEnum, PortTypeEnum } from './types'; 

export const MAX_CYCLE_DEPTH_LIMIT = 10;
export const MAX_EXECUTION_STEPS = 1000; 
export const DEFAULT_MAX_ITERATIONS = 100; 

export const NODE_WIDTH = 200;
export const NODE_HEADER_HEIGHT = 40;
export const NODE_PORT_HEIGHT = 28;
export const NODE_PORT_WIDTH = NODE_WIDTH; 
export const NODE_PORT_MARKER_SIZE = 10; 
export const EXECUTION_PORT_MARKER_SIZE = 12; 

export const EXECUTION_PORT_COLOR_BG = 'bg-[#FFFFFF]'; // White for execution port markers
export const EXECUTION_CONNECTION_STROKE = '#FFFFFF'; // White for execution connection lines

export const DEFAULT_COMMENT_WIDTH = 200;
export const DEFAULT_COMMENT_HEIGHT = 100;
export const DEFAULT_FRAME_WIDTH = 300;
export const DEFAULT_FRAME_HEIGHT = 200;

// Defaults for the content area of display nodes (excluding header/footer)
export const DEFAULT_DISPLAY_VALUE_CONTENT_HEIGHT = 40;
export const DEFAULT_DISPLAY_MARKDOWN_CONTENT_HEIGHT = 100;
export const DEFAULT_PROGRESS_BAR_CONTENT_HEIGHT = 40; // Enough for padding, bar, and text
export const DEFAULT_DATA_TABLE_CONTENT_HEIGHT = 150;

// Default widths for display nodes (can be overridden by node.config.frameWidth)
export const DEFAULT_DISPLAY_VALUE_WIDTH = NODE_WIDTH;
export const DEFAULT_DISPLAY_MARKDOWN_WIDTH = NODE_WIDTH;
export const DEFAULT_PROGRESS_BAR_WIDTH = NODE_WIDTH;
export const DEFAULT_DATA_TABLE_WIDTH = NODE_WIDTH;


export const RESIZE_HANDLE_SIZE = 12; 
export const MIN_RESIZABLE_NODE_WIDTH = 100;
export const MIN_RESIZABLE_NODE_HEIGHT = 60; // Min total height for comment/frame
// Min content height for display nodes might be different, e.g., MIN_RESIZABLE_NODE_HEIGHT / 2

export const NODE_FOOTER_PADDING_Y = 4; 
export const NODE_FOOTER_LINE_HEIGHT = 14; 
export const NODE_FOOTER_MAX_LINES = 3; 
export const NODE_FOOTER_BORDER_HEIGHT = 1; 

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3.0;

// Debugger UI constants
export const BREAKPOINT_MARKER_SIZE = 8;
export const BREAKPOINT_MARKER_COLOR = 'bg-red-500';
export const BREAKPOINT_MARKER_BORDER_COLOR = 'border-white';
export const PAUSED_NODE_HIGHLIGHT_COLOR = 'rgba(255, 255, 0, 0.3)'; // Yellowish semi-transparent

// Node header text colors. Background and border are now glassmorphic.
// Text classes will be applied to header text.
// Using lighter, more vibrant text colors for contrast on the dark glass.
export const NODE_TYPE_COLORS: Record<OperationTypeEnum | 'MOLECULAR_WRAPPER' | 'COMPONENT_BLUEPRINT', { headerText: string }> = {
  [OperationTypeEnum.VALUE_PROVIDER]: { headerText: 'text-sky-300' },
  [OperationTypeEnum.ADDITION]: { headerText: 'text-green-300' },
  [OperationTypeEnum.CONCATENATE]: { headerText: 'text-amber-300' },
  [OperationTypeEnum.LOGICAL_AND]: { headerText: 'text-purple-300' },
  [OperationTypeEnum.LOGICAL_OR]: { headerText: 'text-purple-300' },
  [OperationTypeEnum.LOGICAL_XOR]: { headerText: 'text-purple-300' },
  [OperationTypeEnum.ASSIGN]: { headerText: 'text-gray-300' },
  [OperationTypeEnum.UNION]: { headerText: 'text-indigo-300' },
  [OperationTypeEnum.TO_STRING]: { headerText: 'text-cyan-300' },
  
  [OperationTypeEnum.EQUALS]: { headerText: 'text-lime-300' },
  [OperationTypeEnum.GREATER_THAN]: { headerText: 'text-lime-300' },
  [OperationTypeEnum.LESS_THAN]: { headerText: 'text-lime-300' },
  [OperationTypeEnum.IS_EMPTY]: { headerText: 'text-lime-300' },
  [OperationTypeEnum.NOT]: { headerText: 'text-purple-300' },
  
  [OperationTypeEnum.BRANCH]: { headerText: 'text-orange-300' },
  [OperationTypeEnum.ON_EVENT]: { headerText: 'text-pink-300' }, 

  [OperationTypeEnum.INPUT_GRAPH]: { headerText: 'text-pink-400' },
  [OperationTypeEnum.OUTPUT_GRAPH]: { headerText: 'text-fuchsia-400' },
  [OperationTypeEnum.MOLECULAR]: { headerText: 'text-rose-300' }, // For the generic molecular node type
  MOLECULAR_WRAPPER: { headerText: 'text-teal-300' }, // Actual molecular instances
  COMPONENT_BLUEPRINT: { headerText: 'text-blue-300' },


  [OperationTypeEnum.ITERATE]: { headerText: 'text-yellow-300' }, 
  [OperationTypeEnum.LOOP_ITEM]: { headerText: 'text-yellow-200' }, 
  [OperationTypeEnum.ITERATION_RESULT]: { headerText: 'text-yellow-200' },

  [OperationTypeEnum.STATE]: { headerText: 'text-red-300' },

  [OperationTypeEnum.RANDOM_NUMBER]: { headerText: 'text-teal-300' },
  [OperationTypeEnum.ROUND]: { headerText: 'text-emerald-300' },
  [OperationTypeEnum.FLOOR]: { headerText: 'text-emerald-300' },
  [OperationTypeEnum.CEIL]: { headerText: 'text-emerald-300' },
  [OperationTypeEnum.SUBTRACT]: { headerText: 'text-green-300' },
  [OperationTypeEnum.MULTIPLY]: { headerText: 'text-green-300' },
  [OperationTypeEnum.DIVIDE]: { headerText: 'text-green-300' },
  [OperationTypeEnum.MODULO]: { headerText: 'text-green-300' },

  [OperationTypeEnum.GET_ITEM_AT_INDEX]: { headerText: 'text-blue-300' },
  [OperationTypeEnum.COLLECTION_LENGTH]: { headerText: 'text-blue-300' },
  [OperationTypeEnum.GET_PROPERTY]: { headerText: 'text-indigo-300' },
  [OperationTypeEnum.SET_PROPERTY]: { headerText: 'text-indigo-300' },
  [OperationTypeEnum.STRING_LENGTH]: { headerText: 'text-cyan-300' },
  [OperationTypeEnum.SPLIT_STRING]: { headerText: 'text-cyan-300' },
  [OperationTypeEnum.SWITCH]: { headerText: 'text-orange-300' },
  [OperationTypeEnum.LOG_VALUE]: { headerText: 'text-slate-300' },
  [OperationTypeEnum.CONSTRUCT_OBJECT]: { headerText: 'text-purple-300' },

  [OperationTypeEnum.COMMENT]: { headerText: 'text-yellow-700' }, // Specific for comment node header text
  [OperationTypeEnum.FRAME]: { headerText: 'text-gray-200' }, 
  [OperationTypeEnum.SEND_DATA]: { headerText: 'text-rose-300' },
  [OperationTypeEnum.RECEIVE_DATA]: { headerText: 'text-emerald-300' },

  // Manifestation Nodes
  [OperationTypeEnum.DISPLAY_VALUE]: { headerText: 'text-teal-200' },
  [OperationTypeEnum.DISPLAY_MARKDOWN_TEXT]: { headerText: 'text-lime-200' },
  [OperationTypeEnum.PROGRESS_BAR]: { headerText: 'text-sky-200' },
  [OperationTypeEnum.DATA_TABLE]: { headerText: 'text-fuchsia-200' },
};


// Axiom 2: Color Funcional (El Lenguaje de los Puertos) - Tailwind BG Classes
export const PORT_CATEGORY_COLORS: Record<LogicalCategoryEnum, string> = {
    [LogicalCategoryEnum.NUMBER]: 'bg-[#33C1FF]', // Blue Cyan
    [LogicalCategoryEnum.STRING]: 'bg-[#FFAB40]', // Orange
    [LogicalCategoryEnum.BOOLEAN]: 'bg-[#E040FB]',// Magenta/Purple
    [LogicalCategoryEnum.OBJECT]: 'bg-[#FFD600]', // Gold Yellow
    [LogicalCategoryEnum.ARRAY]: 'bg-[#00E676]',  // Emerald Green
    [LogicalCategoryEnum.ANY]: 'bg-[#9E9E9E]',    // Neutral Grey
    [LogicalCategoryEnum.VOID]: 'bg-[#78909C]',   // Blue Grey (for VOID Data ports)
};

// Raw HEX values for CSS variables (e.g., light beam effect)
export const PORT_CATEGORY_HEX_COLORS: Record<LogicalCategoryEnum, string> = {
    [LogicalCategoryEnum.NUMBER]: '#33C1FF',
    [LogicalCategoryEnum.STRING]: '#FFAB40',
    [LogicalCategoryEnum.BOOLEAN]: '#E040FB',
    [LogicalCategoryEnum.OBJECT]: '#FFD600',
    [LogicalCategoryEnum.ARRAY]: '#00E676',
    [LogicalCategoryEnum.ANY]: '#9E9E9E',
    [LogicalCategoryEnum.VOID]: '#78909C',
};


// Axiom 3: Contraste de Estado
export const SELECTION_COLOR_ACCENT = '#448AFF'; // Cobalt Blue
export const ERROR_COLOR_ACCENT = '#D32F2F';     // Deep Red
        