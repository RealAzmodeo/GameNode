
import React, { useState, useEffect, useCallback } from 'react';
import { AnyNode, NodeConfig, QuickInspectData } from '../types';
import { XMarkIcon } from './Icons';

interface QuickInspectPopoverProps {
  data: QuickInspectData | null;
  onClose: () => void;
  onConfigUpdate: (nodeId: string, newConfig: Partial<NodeConfig>) => void;
}

const QuickInspectPopover: React.FC<QuickInspectPopoverProps> = ({ data, onClose, onConfigUpdate }) => {
  const [localValues, setLocalValues] = useState<Record<string, any>>({});
  const popoverRef = React.useRef<HTMLDivElement>(null);

  // Initialize local state for form fields when new inspection data is provided.
  useEffect(() => {
    if (data?.node.config) {
      const initialValues: Record<string, any> = {};
      data.fields.forEach(field => {
        // Handle potentially nested keys if needed in the future
        initialValues[field.key as string] = data.node.config![field.key as keyof NodeConfig];
      });
      setLocalValues(initialValues);
    }
  }, [data]);

  const handleValueChange = (key: string, value: any, type: QuickInspectData['fields'][0]['type']) => {
    let processedValue = value;
    if (type === 'number') {
      processedValue = parseFloat(value);
      if (isNaN(processedValue)) processedValue = localValues[key]; // Revert if not a number
    } else if (type === 'boolean') {
      processedValue = value === 'true';
    }
    setLocalValues(prev => ({ ...prev, [key]: processedValue }));
  };

  const handleBlur = (key: string) => {
    if (data?.node) {
      const newConfigPart = { [key]: localValues[key] };
      onConfigUpdate(data.node.id, newConfigPart);
    }
  };
  
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (data) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [data, handleClickOutside]);


  if (!data) return null;

  const { node, position, fields } = data;

  return (
    <div
      ref={popoverRef}
      className="quick-inspect-popover fixed shadow-xl"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()} // Prevent node deselection
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-sky-300 truncate" title={node.name}>
          Quick Edit: {node.name}
        </h3>
        <button
          onClick={onClose}
          className="popover-close-button text-gray-400 hover:text-white"
          aria-label="Close quick inspect"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        {fields.map(field => (
          <div key={field.key as string}>
            <label htmlFor={`qinspect-${node.id}-${field.key}`} className="block text-xs font-medium text-gray-300 mb-0.5">
              {field.label}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                id={`qinspect-${node.id}-${field.key}`}
                rows={2}
                value={localValues[field.key as string] !== undefined ? String(localValues[field.key as string]) : ''}
                onChange={(e) => handleValueChange(field.key as string, e.target.value, field.type)}
                onBlur={() => handleBlur(field.key as string)}
                className="w-full text-xs"
              />
            ) : field.type === 'select' && field.options ? (
                 <select
                    id={`qinspect-${node.id}-${field.key}`}
                    value={String(localValues[field.key as string] ?? (field.options[0]?.value ?? ''))}
                    onChange={(e) => {
                         handleValueChange(field.key as string, e.target.value, field.type);
                         // For select, apply change immediately for better UX
                         const processedValue = e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value;
                         onConfigUpdate(node.id, { [field.key as string]: processedValue });
                    }}
                    className="w-full text-xs"
                 >
                    {field.options.map(opt => (
                        <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                    ))}
                 </select>
            ) : (
              <input
                id={`qinspect-${node.id}-${field.key}`}
                type={field.type === 'boolean' ? 'checkbox' : field.type} // Checkbox might need different handling or use select
                checked={field.type === 'boolean' ? Boolean(localValues[field.key as string]) : undefined}
                value={field.type !== 'boolean' && localValues[field.key as string] !== undefined ? String(localValues[field.key as string]) : ''}
                onChange={(e) =>
                  handleValueChange(field.key as string, field.type === 'boolean' ? e.target.checked : e.target.value, field.type)
                }
                onBlur={() => handleBlur(field.key as string)}
                className="w-full text-xs"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickInspectPopover;
