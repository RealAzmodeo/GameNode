
import { OperationTypeEnum, RegisteredAtomicNodeDefinition, LogicalModule } from '../types'; // Removed unused AtomicNodeDefinition as InitialAtomicNodeDefinitionFromFile
import * as Icons from '../components/Icons'; // For fallback icon

// Helper to check if an operationType belongs to an internal module
// This assumes OperationTypeEnum contains all internal node types.
function isInternalOperationType(opType: string): boolean {
  return Object.values(OperationTypeEnum).includes(opType as OperationTypeEnum);
}

class NodeRegistryService {
  private registeredNodes: Map<string, RegisteredAtomicNodeDefinition> = new Map(); // Key is string
  private internalNodeTypes: Set<string> = new Set(Object.values(OperationTypeEnum));

  public registerNode(definition: RegisteredAtomicNodeDefinition, isExternalModule: boolean): void {
    const opType = definition.operationType;

    // Rule 1: Internals have priority. Externals cannot overwrite internals.
    if (this.internalNodeTypes.has(opType) && isExternalModule) {
      console.error(`NodeRegistryService: External module attempted to register a reserved internal operationType '${opType}'. Registration Canceled.`);
      return;
    }

    // Rule 2: For external modules, first one wins if opType is already registered by another external.
    if (this.registeredNodes.has(opType)) {
      if (isExternalModule && !this.internalNodeTypes.has(opType)) { // Already registered by another external
        console.warn(`NodeRegistryService: Node type '${opType}' from an external module is already registered by another external module. Registration Canceled.`);
        return;
      } else if (!isExternalModule && !this.internalNodeTypes.has(opType)) {
        // This case implies an internal module is trying to register a type
        // that an external module (somehow loaded first, which shouldn't happen with current plan) already did.
        // Or, an internal module trying to re-register something not in OperationTypeEnum (should not happen).
        // For safety, internal non-enum registrations also overwrite.
         console.warn(`NodeRegistryService: Internal module is re-registering operationType '${opType}' which was previously registered (possibly by an external module or an internal module not using OperationTypeEnum). Overwriting.`);
      } else if (!isExternalModule && this.internalNodeTypes.has(opType)) {
        // Internal module re-registering an internal type. This is allowed (e.g. HMR or multiple internal modules defining same, though less ideal)
        console.warn(`NodeRegistryService: Internal module is re-registering internal operationType '${opType}'. Overwriting.`);
      }
    }

    this.registeredNodes.set(opType, definition);
    if (!isExternalModule && !this.internalNodeTypes.has(opType)) {
      // If an internal module registers a type not in OperationTypeEnum, add it to internal types for protection.
      // This is a fallback, ideally all internal types are in OperationTypeEnum.
      this.internalNodeTypes.add(opType);
       console.warn(`NodeRegistryService: Internal module registered a new operationType '${opType}' not found in OperationTypeEnum. It will be treated as an internal type.`);
    }
  }

  // Updated to accept isExternalModule flag
  public loadFromInitialModuleDefinition(moduleDef: LogicalModule, isExternalModule: boolean): void {
    moduleDef.atomicNodeDefinitions?.forEach(initialDef => {
      // Type assertion for initialDef.operationType will be implicitly handled by TypeScript
      // as AtomicNodeDefinition.operationType is now string.
      const registeredDef: RegisteredAtomicNodeDefinition = {
        operationType: initialDef.operationType, // This is now string
        name: initialDef.name,
        description: initialDef.description,
        category: initialDef.category, // This is string
        isArchetype: initialDef.isArchetype,
        icon: initialDef.icon,
        defaultConfig: initialDef.defaultConfig,
        portGenerator: initialDef.portGenerator,
        resolveOutputs: initialDef.resolveOutputs,
        processStep: initialDef.processStep,
      };
      this.registerNode(registeredDef, isExternalModule);
    });
  }

  public getNodeDefinition(opType: string): RegisteredAtomicNodeDefinition | undefined { // opType is string
    return this.registeredNodes.get(opType);
  }

  public getAllNodeDefinitions(): RegisteredAtomicNodeDefinition[] {
    return Array.from(this.registeredNodes.values());
  }

  public getGroupedNodeDefinitionsForControls(): Record<string, {
    opType: string; // Changed to string
    label: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    title?: string;
    isArchetype?: boolean;
  }[]> {
    const grouped: Record<string, any[]> = {};
    this.registeredNodes.forEach(def => {
      // def.category is already string
      if (!grouped[def.category]) {
        grouped[def.category] = [];
      }
      grouped[def.category].push({
        opType: def.operationType, // This is now string
        label: def.name,
        icon: def.icon || Icons.CogIcon, // Fallback icon
        title: def.description,
        isArchetype: def.isArchetype,
      });
    });
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => a.label.localeCompare(b.label));
    });
    return grouped;
  }
}

export const nodeRegistryService = new NodeRegistryService();
