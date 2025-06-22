
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url'; // Import pathToFileURL
import { allModules } from '../modules';
import { nodeRegistryService } from './NodeRegistryService';
import { componentRegistryService } from './ComponentRegistryService';
import { LogicalModule } from '../types';

const EXTERNAL_PACKAGES_DIR = 'external_node_packages';

class ModuleLoaderService {
  private hasLoaded: boolean = false;

  private loadInternalModules(): void {
    console.log("ModuleLoaderService: Loading internal modules...");
    for (const moduleDefinition of allModules) {
      try {
        console.log(`ModuleLoaderService: Processing internal module "${moduleDefinition.name}" (ID: ${moduleDefinition.id})`);
        if (moduleDefinition.atomicNodeDefinitions) {
          nodeRegistryService.loadFromInitialModuleDefinition(moduleDefinition, false); // false for isExternalModule
        }
        if (moduleDefinition.componentBlueprints) {
          componentRegistryService.loadFromInitialModuleDefinition(moduleDefinition); // Assuming this service doesn't need isExternalModule or handles it internally
        }
        console.log(`ModuleLoaderService: Successfully processed internal module "${moduleDefinition.name}".`);
      } catch (error) {
        console.error(`ModuleLoaderService: Failed to load internal module "${moduleDefinition.name}". Error:`, error);
      }
    }
    console.log("ModuleLoaderService: Internal modules processing complete.");
  }

  private async loadExternalModules(externalPackagesDir: string): Promise<void> {
    console.log(`ModuleLoaderService: Scanning for external modules in "${externalPackagesDir}"...`);
    try {
      if (!fs.existsSync(externalPackagesDir)) {
        console.log(`ModuleLoaderService: External packages directory "${externalPackagesDir}" not found. Skipping external module loading.`);
        return;
      }

      const packageNames = fs.readdirSync(externalPackagesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      if (packageNames.length === 0) {
        console.log(`ModuleLoaderService: No external packages found in "${externalPackagesDir}".`);
        return;
      }

      console.log(`ModuleLoaderService: Found ${packageNames.length} potential external package(s).`);

      for (const packageName of packageNames) {
        const packagePath = path.resolve(externalPackagesDir, packageName); // Use resolve for absolute path
        const moduleFilePath = path.join(packagePath, 'module.ts'); // path.join for cross-platform compatibility

        console.log(`ModuleLoaderService: Attempting to load external package "${packageName}" from "${moduleFilePath}"...`);

        try {
          if (!fs.existsSync(moduleFilePath)) {
            console.error(`ModuleLoaderService: Error loading package "${packageName}". File "module.ts" not found in "${packagePath}". Skipping.`);
            continue;
          }

          // Dynamically import the module.
          // Vite handles .ts imports out of the box in dev. For production, ensure build processes are correct.
          // Using pathToFileURL for robust ESM dynamic imports in Node.js environments.
          const moduleFileUrl = pathToFileURL(moduleFilePath).href;
          const externalModuleImport = await import(/* @vite-ignore */ moduleFileUrl);
          const externalModule = externalModuleImport.default;
          // The /* @vite-ignore */ comment is to prevent Vite from trying to bundle this dynamic import path at build time in a way that breaks.

          if (!externalModule || typeof externalModule !== 'object') {
            console.error(`ModuleLoaderService: Error loading package "${packageName}". Module "module.ts" does not have a default export or the default export is not an object. Skipping.`);
            continue;
          }

          const moduleDefinition = externalModule as LogicalModule;

          // Basic validation (can be expanded)
          if (!moduleDefinition.id || !moduleDefinition.name || !Array.isArray(moduleDefinition.atomicNodeDefinitions)) {
            console.error(`ModuleLoaderService: Error loading package "${packageName}". Invalid module structure in "module.ts" (missing id, name, or atomicNodeDefinitions array). Skipping.`);
            continue;
          }

          console.log(`ModuleLoaderService: Processing external module "${moduleDefinition.name}" (ID: ${moduleDefinition.id}) from package "${packageName}".`);

          if (moduleDefinition.atomicNodeDefinitions) {
            nodeRegistryService.loadFromInitialModuleDefinition(moduleDefinition, true); // true for isExternalModule
          }
          if (moduleDefinition.componentBlueprints) {
            // Assuming componentRegistryService doesn't need isExternalModule or handles it internally
            // If it does, it would need similar modification to NodeRegistryService
            componentRegistryService.loadFromInitialModuleDefinition(moduleDefinition);
          }
          console.log(`ModuleLoaderService: Successfully processed external module "${moduleDefinition.name}" from package "${packageName}".`);

        } catch (error) {
          console.error(`ModuleLoaderService: Failed to load or process external package "${packageName}" from "${packagePath}". Error:`, error);
          // Continue to the next package
        }
      }
    } catch (error) {
      console.error(`ModuleLoaderService: Error while scanning or loading external modules from "${externalPackagesDir}". Error:`, error);
    }
    console.log("ModuleLoaderService: External modules processing complete.");
  }

  public async loadModules(): Promise<void> {
    if (this.hasLoaded) {
      console.warn("ModuleLoaderService: Modules already loaded.");
      return;
    }

    console.log("ModuleLoaderService: Starting all module loading...");

    this.loadInternalModules();
    await this.loadExternalModules(EXTERNAL_PACKAGES_DIR);

    this.hasLoaded = true;
    console.log("ModuleLoaderService: All modules processed.");
    console.log("Registered Atomic Nodes:", nodeRegistryService.getAllNodeDefinitions().map(n => `${n.name} (${n.operationType})`));
    console.log("Registered Components:", componentRegistryService.getAllComponentBlueprints().map(c => c.name));
  }
}

export const moduleLoaderService = new ModuleLoaderService();
