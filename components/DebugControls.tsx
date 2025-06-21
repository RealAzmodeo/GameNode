import React from 'react';
import { PlayIcon as ResumeIcon, StopIcon, ArrowRightIcon as StepOverIcon } from './Icons'; // Assuming icons exist or are aliased

interface DebugControlsProps {
  isPaused: boolean;
  isExecuting: boolean; // To disable controls if overall execution is busy but not specifically paused for stepping
  onResume: () => void;
  onStepOver: () => void;
  onStop: () => void;
}

const DebugControls: React.FC<DebugControlsProps> = ({
  isPaused,
  isExecuting,
  onResume,
  onStepOver,
  onStop,
}) => {
  const baseButtonClass = "flex-1 px-3 py-2 text-sm font-medium rounded-md flex items-center justify-center neumorphic-button";
  const disabledClass = "disabled-look"; // This applies concave + muted styling

  return (
    <div className="p-2 border-t border-[rgba(255,255,255,0.08)] bg-[#2D3039] neumorphic-panel"
         style={{boxShadow: '0 -2px 8px rgba(0,0,0,0.1)'}}> {/* Subtle top shadow */}
      <h3 className="text-xs font-semibold text-[rgba(255,255,255,0.6)] mb-2 tracking-wider uppercase text-center">Debugger</h3>
      <div className="flex space-x-2">
        <button
          onClick={onResume}
          disabled={!isPaused || isExecuting}
          className={`${baseButtonClass} ${(!isPaused || isExecuting) ? disabledClass : 'hover:text-green-400 focus:ring-green-500'}`}
          title="Resume Execution (F8)"
        >
          <ResumeIcon className="w-4 h-4 mr-1.5" />
          Resume
        </button>
        <button
          onClick={onStepOver}
          disabled={!isPaused || isExecuting}
          className={`${baseButtonClass} ${(!isPaused || isExecuting) ? disabledClass : 'hover:text-sky-400 focus:ring-sky-500'}`}
          title="Step Over (F10)"
        >
          <StepOverIcon className="w-4 h-4 mr-1.5" />
          Step Over
        </button>
        <button
          onClick={onStop}
          disabled={!isPaused && !isExecuting} // Can stop if paused or if generally executing (non-debug)
          className={`${baseButtonClass} ${(!isPaused && !isExecuting) ? disabledClass : 'hover:text-red-400 focus:ring-red-500'}`}
          title="Stop Execution (Shift+F5)"
        >
          <StopIcon className="w-4 h-4 mr-1.5" />
          Stop
        </button>
      </div>
       {isPaused && <p className="text-xs text-yellow-400 text-center mt-2 italic">Execution Paused. Use controls to proceed.</p>}
    </div>
  );
};

export default DebugControls;
