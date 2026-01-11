import React from "react";
import { useAppStore } from "../stores/appStore";
export function RandomWalkHeader() {
    const { useNewEngine, setUseNewEngine, useStreamingObservables, setUseStreamingObservables, useGPU, setUseGPU, } = useAppStore();
    return (<div className="p-4 flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold mb-2">
          Random Walk → Telegraph Equation
        </h1>
        <p className="text-gray-600">
          Interactive simulation showing stochastic particle motion converging
          to telegraph equation
        </p>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">
          Physics Engine:
        </label>
        <button onClick={() => setUseStreamingObservables(!useStreamingObservables)} className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${useStreamingObservables
            ? 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200'
            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'}`}>
          {useStreamingObservables ? 'STREAM' : 'POLL'}
        </button>
        <button onClick={() => setUseNewEngine(!useNewEngine)} className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${useNewEngine
            ? 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200'
            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'}`}>
          {useNewEngine ? 'NEW' : 'LEGACY'}
        </button>
        <button onClick={() => {
            console.log('[GPU Toggle] Current useGPU:', useGPU, '-> New value:', !useGPU);
            setUseGPU(!useGPU);
        }} className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${useGPU
            ? 'bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200'
            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'}`}>
          {useGPU ? 'GPU' : 'CPU'}
        </button>
      </div>
    </div>);
}
