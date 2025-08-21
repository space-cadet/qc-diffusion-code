import React, { useState } from "react";
import { DndContext, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

function DraggableItem({ id, children, className }: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${className}`}
    >
      {children}
    </div>
  );
}

interface DroppableZoneProps {
  id: string;
  children: React.ReactNode;
  items: string[];
}

function DroppableZone({ id, children, items }: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-32 p-4 border-2 border-dashed rounded-lg transition-colors ${
        isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
    >
      <div className="text-sm font-medium text-gray-700 mb-2">{children}</div>
      <div className="space-y-2">
        {items.map(itemId => (
          <div key={itemId} className="text-xs text-gray-500">Item: {itemId}</div>
        ))}
      </div>
    </div>
  );
}

interface ContainersType {
  toolbox: string[];
  workspace: string[];
  results: string[];
  [key: string]: string[];
}

export default function RandomWalkPage() {
  const [containers, setContainers] = useState<ContainersType>({
    'toolbox': ['param1', 'param2', 'param3'],
    'workspace': [],
    'results': []
  });
  
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find which container the active item is currently in
    const activeContainer = Object.keys(containers).find(key =>
      containers[key as keyof typeof containers].includes(activeId)
    );

    if (!activeContainer || activeContainer === overId) return;

    // Move item between containers
    setContainers(prev => ({
      ...prev,
      [activeContainer]: prev[activeContainer as keyof typeof prev].filter(id => id !== activeId),
      [overId]: [...prev[overId as keyof typeof prev], activeId]
    }));
  };

  const getItemColor = (itemId: string) => {
    if (itemId === 'param1') return 'bg-red-200 border-red-300';
    if (itemId === 'param2') return 'bg-green-200 border-green-300';
    if (itemId === 'param3') return 'bg-blue-200 border-blue-300';
    return 'bg-gray-200 border-gray-300';
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col">
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4">Random Walk Simulation</h1>
          <p className="text-gray-600 mb-4">Drag parameters between areas to configure simulation</p>
        </div>
        
        <div className="flex-1 p-4 grid grid-cols-3 gap-4">
          <DroppableZone id="toolbox" items={containers.toolbox}>
            Parameter Toolbox
          </DroppableZone>
          
          <DroppableZone id="workspace" items={containers.workspace}>
            Active Parameters
          </DroppableZone>
          
          <DroppableZone id="results" items={containers.results}>
            Results Config
          </DroppableZone>
        </div>

        {/* Render draggable items in their containers */}
        {Object.entries(containers).map(([containerId, items]) => (
          <div key={containerId} className="absolute">
            {items.map((itemId) => (
              <DraggableItem
                key={itemId}
                id={itemId}
                className={`p-3 m-1 border rounded-lg shadow-sm ${getItemColor(itemId)}`}
              >
                {itemId === 'param1' && '🎯 Collision Rate'}
                {itemId === 'param2' && '⚡ Velocity'}
                {itemId === 'param3' && '🌊 Diffusion'}
              </DraggableItem>
            ))}
          </div>
        ))}

        <DragOverlay>
          {activeId ? (
            <div className={`p-3 border rounded-lg shadow-lg ${getItemColor(activeId)}`}>
              {activeId === 'param1' && '🎯 Collision Rate'}
              {activeId === 'param2' && '⚡ Velocity'}
              {activeId === 'param3' && '🌊 Diffusion'}
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
