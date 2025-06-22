// external_node_packages/example_echo_pack/module.ts
import {
  LogicalModule,
  AtomicNodeDefinition,
  NodePorts,
  PortTypeEnum,
  LogicalCategoryEnum,
  ResolvedNodeOutput,
  GraphNode,
  NodeInputValues,
  // Assuming these are part of your types, adjust if not or if not needed by this simple node
  // GlobalAgentState,
  // AgentServices
} from '../../../src/types'; // Adjust path based on actual project structure from root

const EchoNodeDefinition: AtomicNodeDefinition = {
  operationType: 'example-echo-pack/echo', // Unique string for this node type
  name: 'Echo Node',
  description: 'A simple node that outputs whatever data it receives.',
  category: 'Example Pack', // Custom category for the UI
  icon: null, // Using default icon
  defaultConfig: {},
  portGenerator: (nodeId: string, config?: any): NodePorts => ({
    inputs: [
      {
        id: `${nodeId}-input`,
        name: 'Input',
        category: LogicalCategoryEnum.ANY, // Accepts any data type
        portType: PortTypeEnum.DATA
      },
    ],
    outputs: [
      {
        id: `${nodeId}-output`,
        name: 'Output',
        category: LogicalCategoryEnum.ANY, // Outputs the same data type as input
        portType: PortTypeEnum.DATA
      },
    ],
  }),
  resolveOutputs: async (
    node: GraphNode,
    inputValues: NodeInputValues,
    // globalState?: GlobalAgentState, // Optional, if needed
    // services?: AgentServices // Optional, if needed
  ): Promise<ResolvedNodeOutput> => {
    const inputValue = inputValues['Input']; // Access input by its 'name'
    return { 'Output': inputValue }; // Output the value under the 'name' of the output port
  },
  processStep: undefined, // This node doesn't use the event-driven push model
};

const exampleEchoModule: LogicalModule = {
  id: 'example-echo-pack-v1', // Unique ID for this module
  name: 'Example Echo Pack',
  description: 'A simple example package containing an Echo node.',
  atomicNodeDefinitions: [
    EchoNodeDefinition,
  ],
  componentBlueprints: [], // No components in this example
  enabledByDefault: true, // Assuming it should be enabled
};

export default exampleEchoModule;
