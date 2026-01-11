import React from "react";
import { Rnd } from "react-rnd";
export function FloatingPanel({ title, children, position, size, zIndex, isCollapsed, onToggleCollapse, onDragStop, onResizeStop, onMouseDown, bounds = "parent", className = "" }) {
    const collapsedHeight = 40;
    const currentHeight = isCollapsed ? collapsedHeight : size.height;
    return (<Rnd bounds={bounds} size={{ width: size.width, height: currentHeight }} position={position} onDragStop={(e, d) => {
            onDragStop(d.x, d.y);
        }} onResizeStop={(e, dir, ref, delta, position) => {
            onResizeStop(ref.offsetWidth, ref.offsetHeight, position.x, position.y);
        }} onMouseDown={onMouseDown} dragHandleClassName="drag-handle" enableResizing={isCollapsed ? {
            top: false, right: false, bottom: false, left: false,
            topRight: false, bottomRight: false, bottomLeft: false, topLeft: false
        } : {
            top: true, right: true, bottom: true, left: true,
            topRight: true, bottomRight: true, bottomLeft: true, topLeft: true
        }} style={{ zIndex }} className={`shadow-lg rounded-md bg-white border border-gray-200 overflow-hidden ${className}`}>
      <div className="drag-handle flex items-center justify-between cursor-move select-none px-3 py-2 bg-gray-100 border-b border-gray-200 text-sm font-medium">
        <span>{title}</span>
        <button type="button" className="ml-2 cursor-pointer rounded px-2 py-0.5 text-xs border border-gray-300 bg-white hover:bg-gray-50" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
        }}>
          {isCollapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>
      {!isCollapsed && (<div className="p-3 overflow-y-auto" style={{ maxHeight: size.height ? size.height - 40 : undefined }}>
          {children}
        </div>)}
    </Rnd>);
}
