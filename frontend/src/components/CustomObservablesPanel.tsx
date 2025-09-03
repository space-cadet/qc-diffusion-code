import React, { useState, useEffect } from "react";
import { useAppStore } from "../stores/appStore";
import { TextObservable } from "../physics/observables/TextObservable";
import type { RandomWalkSimulator } from "../physics/RandomWalkSimulator";

interface CustomObservablesPanelProps {
  simulatorRef: React.RefObject<RandomWalkSimulator | null>;
  simReady?: boolean;
}

interface CustomObservableItemProps {
  observable: string;
  index: number;
  onEdit: (index: number, text: string) => void;
  onRemove: (index: number) => void;
}

function CustomObservableItem({ observable, index, onEdit, onRemove }: CustomObservableItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(observable);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const observableName = observable.split('\n')[0].replace(/observable\s+"([^"]+)".*/, '$1');

  const handleSaveEdit = () => {
    const validation = TextObservable.validate(editText);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    onEdit(index, editText);
    setIsEditing(false);
    setValidationErrors([]);
  };

  const handleCancelEdit = () => {
    setEditText(observable);
    setIsEditing(false);
    setValidationErrors([]);
  };

  if (isEditing) {
    return (
      <div className="space-y-2 bg-gray-50 p-3 rounded border">
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="w-full text-xs font-mono border rounded p-2 h-20 resize-none"
        />
        {validationErrors.length > 0 && (
          <div className="text-xs text-red-500">
            {validationErrors.map((error, i) => (
              <div key={i}>{error}</div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSaveEdit}
            className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
          >
            Save
          </button>
          <button
            onClick={handleCancelEdit}
            className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded">
      <div className="font-mono text-gray-700 truncate flex-1 mr-2">
        {observableName}
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => setIsEditing(true)}
          className="text-blue-500 hover:text-blue-700 px-1"
        >
          Edit
        </button>
        <button
          onClick={() => onRemove(index)}
          className="text-red-500 hover:text-red-700 px-1"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export function CustomObservablesPanel({ simulatorRef, simReady }: CustomObservablesPanelProps) {
  const {
    customObservables,
    addCustomObservable,
    removeCustomObservable,
    updateCustomObservable
  } = useAppStore();

  const [newObservableText, setNewObservableText] = useState(`observable "my_observable" {
  source: particles
  filter: speed > 2.0
  select: velocity.magnitude
  reduce: mean
}`);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load custom observables when simulator is ready
  useEffect(() => {
    if (simReady && simulatorRef.current && customObservables.length > 0) {
      simulatorRef.current.getObservableManager().loadTextObservables(customObservables);
    }
  }, [simReady, customObservables]);

  const handleAddCustomObservable = () => {
    const validation = TextObservable.validate(newObservableText);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    addCustomObservable(newObservableText);
    setNewObservableText(`observable "my_observable" {
  source: particles
  filter: speed > 2.0
  select: velocity.magnitude
  reduce: mean
}`);
    setValidationErrors([]);
  };

  const handleEditCustomObservable = (index: number, text: string) => {
    updateCustomObservable(index, text);
  };

  const handleRemoveCustomObservable = (index: number) => {
    removeCustomObservable(index);
  };

  return (
    <div className="space-y-4">
      {/* Add New Observable */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-700">Add New Observable</div>
        <div>
          <textarea
            value={newObservableText}
            onChange={(e) => setNewObservableText(e.target.value)}
            className="w-full text-xs font-mono border rounded p-2 h-24 resize-none"
          />
          {validationErrors.length > 0 && (
            <div className="text-xs text-red-500 mt-1">
              {validationErrors.map((error, i) => (
                <div key={i}>{error}</div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleAddCustomObservable}
          className="text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
        >
          Add Observable
        </button>
      </div>

      {/* Saved Observables */}
      {customObservables.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">
            Saved Observables ({customObservables.length})
          </div>
          <div className="space-y-2">
            {customObservables.map((obs, index) => (
              <CustomObservableItem
                key={index}
                observable={obs}
                index={index}
                onEdit={handleEditCustomObservable}
                onRemove={handleRemoveCustomObservable}
              />
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500 border-t pt-3 space-y-1">
        <div className="font-medium">Format:</div>
        <div>• Each line: key: value (no commas)</div>
        <div>• Keys: source | filter | select | reduce | interval</div>
        <div>• Reduce functions: sum, mean, count, min, max, std</div>
        <div className="font-medium pt-2">Properties you can use:</div>
        <div>• position.x, position.y</div>
        <div>• velocity.vx, velocity.vy, speed</div>
        <div>• radius, id, collisionCount, interparticleCollisionCount</div>
        <div>• lastCollisionTime, nextCollisionTime, waitingTime</div>
        <div>• bounds.width, bounds.height, time</div>
        <div className="font-medium pt-2">Examples:</div>
        <div>• Kinetic energy avg: select: 0.5 * (velocity.vx^2 + velocity.vy^2), reduce: mean</div>
        <div>• Fast particles count: filter: speed &gt; 2.0, select: 1, reduce: count</div>
        <div>• Left momentum (x&lt;width/2): filter: position.x &lt; bounds.width/2, select: velocity.vx, reduce: sum</div>
      </div>
    </div>
  );
}
