
import React from 'react';
import { NodeId } from '../types';
import { ChevronRightIcon, HomeIcon } from './Icons'; 

interface BreadcrumbItem {
  id: NodeId | 'root';
  name: string;
}

interface BreadcrumbsProps {
  scopeStack: BreadcrumbItem[];
  onNavigateToScope: (targetScopeId: NodeId | 'root', indexInStack: number) => void;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ scopeStack, onNavigateToScope }) => {
  return (
    <nav className="flex items-center space-x-1 text-sm font-medium text-[rgba(255,255,255,0.75)] p-1.5 bg-[rgba(0,0,0,0.05)] rounded-md border border-[rgba(255,255,255,0.05)]" 
         aria-label="Breadcrumb"
         style={{boxShadow: 'inset 2px 2px 4px rgba(33,36,41,0.4), inset -2px -2px 4px rgba(57,60,73,0.3)'}} /* Concave style */
    >
      {scopeStack.map((scope, index) => (
        <React.Fragment key={scope.id}>
          {index > 0 && <ChevronRightIcon className="w-4 h-4 text-gray-500" />}
          <button
            onClick={() => onNavigateToScope(scope.id, index)}
            disabled={index === scopeStack.length - 1}
            className={`flex items-center px-2 py-1 rounded ${
              index === scopeStack.length - 1
                ? 'text-sky-300 font-semibold cursor-default'
                : 'hover:bg-[rgba(255,255,255,0.05)] hover:text-sky-200 transition-colors'
            }`}
            aria-current={index === scopeStack.length - 1 ? 'page' : undefined}
          >
            {scope.id === 'root' && <HomeIcon className="w-4 h-4 mr-1.5 flex-shrink-0" />}
            <span className="truncate max-w-[150px] xs:max-w-[200px]" title={scope.name}>
              {scope.name}
            </span>
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;