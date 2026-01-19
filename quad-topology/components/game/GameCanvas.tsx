"use client";

import React, { useState, useRef, useEffect } from 'react';
import { GameNode, GameEdge, GameTile, Vector2 } from '../../lib/types';
import { cn } from '../../lib/utils';
import { GRID_SCALE, OFFSET_X, OFFSET_Y } from '../../data/levels';

interface GameCanvasProps {
    nodes: GameNode[];
    boundaryEdges: GameEdge[]; // Boundary edges
    userEdges: GameEdge[];
    tiles?: GameTile[];
    invalidFaces?: { x: number, y: number }[][];
    onEdgesChange: (edges: GameEdge[]) => void;
    onEdgeDelete?: (edgeId: string) => void; // NEW: Delete edge callback
    // New unified handler for advanced creation
    onStrokeCreate?: (start: { pos: Vector2, nodeId?: string }, end: { pos: Vector2, nodeId?: string }) => void;
    // New Tutorial Props
    tutorialActive?: boolean;
    activeNodeId?: string | null; // Node to blink
    tutorialPath?: { start: Vector2, end: Vector2 } | null; // Guide line
    tutorialPoint?: Vector2 | null; // Blinking point (no node)
}

export default function GameCanvas({ nodes, boundaryEdges, userEdges, tiles, invalidFaces, onEdgesChange, onEdgeDelete, onStrokeCreate, tutorialActive, activeNodeId, tutorialPath, tutorialPoint }: GameCanvasProps) {
    const [dragStart, setDragStart] = useState<{ pos: Vector2, nodeId?: string } | null>(null);
    const [mousePos, setMousePos] = useState<Vector2 | null>(null);

    const svgRef = useRef<SVGSVGElement>(null);

    // Import constants locally or strictly match what is in data/levels if imports fail in this environment (but I will use imports)
    // To ensure this works without import errors if the previous step failed or relative paths are tricky, I'll hardcode or use props. 
    // Ideally I should import. I will assume the import works.

    // Helper to snap to grid
    const snapToGrid = (raw: Vector2): Vector2 => {
        const gx = Math.round((raw.x - OFFSET_X) / GRID_SCALE);
        const gy = Math.round((raw.y - OFFSET_Y) / GRID_SCALE);
        return {
            x: gx * GRID_SCALE + OFFSET_X,
            y: gy * GRID_SCALE + OFFSET_Y
        };
    };

    // Helper to get relative coordinates
    const getRelativePos = (e: React.MouseEvent | React.TouchEvent): Vector2 | null => {
        if (!svgRef.current) return null;
        const rect = svgRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    };

    // Touch support helper to find node under finger
    const getNodeFromPoint = (clientX: number, clientY: number): string | null => {
        const el = document.elementFromPoint(clientX, clientY);
        if (!el) return null;

        // Traverse up to find group with data-node-id
        let current: Element | null = el;
        while (current && current !== document.body) {
            const nodeId = current.getAttribute('data-node-id');
            if (nodeId) return nodeId;
            current = current.parentElement;
        }
        return null;
    };

    // Helper to find edge near a point (for deletion)
    const findEdgeNearPoint = (pos: Vector2): string | null => {
        const THRESHOLD = 10; // Distance threshold for edge detection

        // Check both user edges and boundary edges, but we'll only allow deleting user edges
        for (const edge of userEdges) {
            const start = getNodePos(edge.source);
            const end = getNodePos(edge.target);

            // Calculate distance from point to line segment
            const lineLen = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            if (lineLen === 0) continue;

            const t = Math.max(0, Math.min(1, ((pos.x - start.x) * (end.x - start.x) + (pos.y - start.y) * (end.y - start.y)) / (lineLen * lineLen)));
            const projX = start.x + t * (end.x - start.x);
            const projY = start.y + t * (end.y - start.y);
            const dist = Math.sqrt(Math.pow(pos.x - projX, 2) + Math.pow(pos.y - projY, 2));

            if (dist < THRESHOLD) {
                return edge.id;
            }
        }
        return null;
    };

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault(); // Prevent scrolling on touch
        const rawPos = getRelativePos(e);
        if (!rawPos) return;

        // Check for Shift key (edge deletion mode)
        const isShiftHeld = 'shiftKey' in e && e.shiftKey;

        if (isShiftHeld && onEdgeDelete) {
            const snappedPos = snapToGrid(rawPos);
            const edgeId = findEdgeNearPoint(snappedPos);
            if (edgeId) {
                onEdgeDelete(edgeId);
                return; // Don't start dragging
            }
        }

        let nodeId: string | undefined = undefined;
        // Check if we started on a node
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        const found = getNodeFromPoint(clientX, clientY);

        let pos = snapToGrid(rawPos);

        if (found) {
            nodeId = found;
            // If on a node, use node pos exactly
            const n = nodes.find(x => x.id === found);
            if (n) pos = n.position;
        }

        setDragStart({ pos, nodeId });
        setMousePos(pos);
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault(); // Prevent scrolling
        const rawPos = getRelativePos(e);
        if (rawPos) {
            let pos = snapToGrid(rawPos);

            // Optional: Check if snapping slightly to existing nodes? 
            // For now, grid snapping is enough as nodes ARE on grid.
            setMousePos(pos);
        }
    };

    const handleMouseUp = (e?: React.MouseEvent | React.TouchEvent) => {
        if (e) e.preventDefault();
        if (!dragStart) return;

        let targetId: string | undefined = undefined;
        let finalPos: Vector2 | null = mousePos; // Default to last known mouse pos

        if (e) {
            const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as React.MouseEvent).clientX;
            const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as React.MouseEvent).clientY;
            const found = getNodeFromPoint(clientX, clientY);
            if (found) targetId = found;

            // Re-calculate final pos from event just in case
            const raw = getRelativePos(e);
            if (raw) finalPos = snapToGrid(raw);
        }

        if (targetId) {
            const n = nodes.find(x => x.id === targetId);
            if (n) finalPos = n.position;
        }

        if (onStrokeCreate && finalPos) {
            // Filter out tiny drags which might be accidental clicks
            // Since we snap, any different grid point is a move. 
            // Distance check should be based on grid units roughly or equality.
            const isSamePoint = finalPos.x === dragStart.pos.x && finalPos.y === dragStart.pos.y;

            if (!isSamePoint) {
                onStrokeCreate(
                    { pos: dragStart.pos, nodeId: dragStart.nodeId },
                    { pos: finalPos, nodeId: targetId }
                );
            } else if (!dragStart.nodeId && !targetId) {
                // Clicked empty space (no drag) -> Create Point
                // Even for a click, we want to create it at the SNAPPED position
                onStrokeCreate(
                    { pos: dragStart.pos, nodeId: undefined },
                    { pos: finalPos, nodeId: undefined }
                );
            }
        }

        setDragStart(null);
        setMousePos(null);
    };

    // Global listeners to handle drag release outside nodes or on mobile
    useEffect(() => {
        // Keyboard listener for Shift indicator
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                const indicator = document.getElementById('shift-indicator');
                if (indicator) indicator.style.opacity = '1';
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                const indicator = document.getElementById('shift-indicator');
                if (indicator) indicator.style.opacity = '0';
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const getNodePos = (id: string) => nodes.find(n => n.id === id)?.position || { x: 0, y: 0 };

    // Generate grid points for visualization
    const gridPoints: Vector2[] = [];
    // We can infer grid bounds from tiles or just generate a large enough field
    // Assuming 10x10 grid based on standard size
    for (let x = 0; x <= 10; x++) {
        for (let y = 0; y <= 10; y++) {
            gridPoints.push({
                x: OFFSET_X + x * GRID_SCALE,
                y: OFFSET_Y + y * GRID_SCALE
            });
        }
    }

    return (
        <div className="relative w-full h-[600px] border border-neutral-800 rounded-lg bg-neutral-900 overflow-hidden shadow-2xl select-none">
            {/* Shift Mode Indicator */}
            <div className="absolute top-2 right-2 px-3 py-1 bg-red-500/80 text-white text-xs font-bold rounded pointer-events-none opacity-0 transition-opacity" id="shift-indicator">
                🗑️ SHIFT: DELETE MODE
            </div>

            <svg
                ref={svgRef}
                className="w-full h-full cursor-crosshair touch-none"
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                onMouseMove={handleMouseMove}
                onTouchMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchEnd={handleMouseUp}
                onMouseLeave={(e) => handleMouseUp(e)}
            >
                {/* SVG Definitions for Arrow Markers and Glow Effects */}
                <defs>
                    {/* Arrow Marker for Tutorial Path */}
                    <marker
                        id="tutorial-arrow"
                        markerWidth="12"
                        markerHeight="12"
                        refX="10"
                        refY="6"
                        orient="auto"
                        markerUnits="userSpaceOnUse"
                    >
                        <path d="M0,0 L0,12 L12,6 Z" fill="#facc15" />
                    </marker>

                    {/* Glow Filter for Tutorial Elements */}
                    <filter id="tutorial-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Animated Dash Pattern */}
                    <style>{`
                        @keyframes dash-flow {
                            0% { stroke-dashoffset: 20; }
                            100% { stroke-dashoffset: 0; }
                        }
                        .tutorial-path-animated {
                            animation: dash-flow 0.8s linear infinite;
                        }
                        @keyframes ring-pulse {
                            0% { transform: scale(1); opacity: 0.8; }
                            50% { transform: scale(1.3); opacity: 0.4; }
                            100% { transform: scale(1); opacity: 0.8; }
                        }
                        .ring-pulse {
                            animation: ring-pulse 1s ease-in-out infinite;
                            transform-origin: center;
                        }
                    `}</style>
                </defs>

                {/* Background Tiles (Yellow/Red/Green areas) */}
                {tiles?.map((tile) => (
                    <polygon
                        key={tile.id}
                        points={tile.points.map(p => `${p.x},${p.y}`).join(' ')}
                        className={cn(
                            "stroke-none",
                            // SWAPPED: Input is now Green (Start), Output is now Red (End) for User Preference
                            tile.type === 'input' && "fill-green-500/20",
                            tile.type === 'output' && "fill-red-500/20",
                            tile.type === 'default' && "fill-amber-400/10"
                        )}
                        style={{ pointerEvents: 'none' }}
                    />
                ))}

                {/* Invalid Faces Error Overlay */}
                {invalidFaces?.map((face, idx) => (
                    <polygon
                        key={`err-face-${idx}`}
                        points={face.map(p => `${p.x},${p.y}`).join(' ')}
                        className="fill-red-500/40 stroke-red-500 stroke-2 animate-pulse"
                        style={{ pointerEvents: 'none' }}
                    />
                ))}

                {/* Grid Dots */}
                {gridPoints.map((p, i) => (
                    <circle
                        key={`grid-${i}`}
                        cx={p.x}
                        cy={p.y}
                        r={2}
                        className="fill-neutral-700 pointer-events-none"
                    />
                ))}

                {/* Tutorial Guide Line with Arrow and Glow */}
                {tutorialActive && tutorialPath && (
                    <>
                        {/* Glow layer (behind) */}
                        <line
                            x1={tutorialPath.start.x}
                            y1={tutorialPath.start.y}
                            x2={tutorialPath.end.x}
                            y2={tutorialPath.end.y}
                            stroke="#facc15"
                            strokeWidth={8}
                            strokeLinecap="round"
                            opacity={0.3}
                            filter="url(#tutorial-glow)"
                            style={{ pointerEvents: 'none' }}
                        />
                        {/* Main dashed line with arrow */}
                        <line
                            x1={tutorialPath.start.x}
                            y1={tutorialPath.start.y}
                            x2={tutorialPath.end.x}
                            y2={tutorialPath.end.y}
                            stroke="#facc15"
                            strokeWidth={4}
                            strokeDasharray="10,5"
                            strokeLinecap="round"
                            markerEnd="url(#tutorial-arrow)"
                            className="tutorial-path-animated"
                            style={{ pointerEvents: 'none' }}
                        />
                        {/* Start Point - Green pulsing ring */}
                        <circle
                            cx={tutorialPath.start.x}
                            cy={tutorialPath.start.y}
                            r={18}
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth={3}
                            className="ring-pulse"
                            style={{ pointerEvents: 'none' }}
                        />
                        <circle
                            cx={tutorialPath.start.x}
                            cy={tutorialPath.start.y}
                            r={10}
                            fill="#22c55e"
                            opacity={0.5}
                            className="animate-pulse"
                            style={{ pointerEvents: 'none' }}
                        />
                        {/* End Point - Yellow pulsing ring */}
                        <circle
                            cx={tutorialPath.end.x}
                            cy={tutorialPath.end.y}
                            r={18}
                            fill="none"
                            stroke="#facc15"
                            strokeWidth={3}
                            className="ring-pulse"
                            style={{ pointerEvents: 'none' }}
                        />
                        <circle
                            cx={tutorialPath.end.x}
                            cy={tutorialPath.end.y}
                            r={10}
                            fill="#facc15"
                            opacity={0.5}
                            className="animate-pulse"
                            style={{ pointerEvents: 'none' }}
                        />
                    </>
                )}

                {/* Tutorial Point Blinker (for single point guidance) */}
                {tutorialActive && tutorialPoint && (
                    <>
                        <circle
                            cx={tutorialPoint.x}
                            cy={tutorialPoint.y}
                            r={20}
                            fill="none"
                            stroke="#facc15"
                            strokeWidth={3}
                            className="ring-pulse"
                            style={{ pointerEvents: 'none' }}
                        />
                        <circle
                            cx={tutorialPoint.x}
                            cy={tutorialPoint.y}
                            r={12}
                            fill="#facc15"
                            opacity={0.6}
                            className="animate-ping"
                            style={{ pointerEvents: 'none' }}
                        />
                    </>
                )}

                {/* Boundary Edges */}
                {boundaryEdges.map((edge) => {
                    const start = getNodePos(edge.source);
                    const end = getNodePos(edge.target);
                    return (
                        <line
                            key={edge.id}
                            x1={start.x}
                            y1={start.y}
                            x2={end.x}
                            y2={end.y}
                            className="stroke-white stroke-2"
                            style={{ pointerEvents: 'none' }}
                        />
                    );
                })}

                {/* User Edges */}
                {userEdges.map((edge) => {
                    const start = getNodePos(edge.source);
                    const end = getNodePos(edge.target);
                    return (
                        <line
                            key={edge.id}
                            x1={start.x}
                            y1={start.y}
                            x2={end.x}
                            y2={end.y}
                            className="stroke-white stroke-[3px]"
                            style={{ pointerEvents: 'none' }}
                        />
                    );
                })}

                {/* Draft Line */}
                {dragStart && mousePos && (
                    <line
                        x1={dragStart.nodeId ? getNodePos(dragStart.nodeId).x : dragStart.pos.x}
                        y1={dragStart.nodeId ? getNodePos(dragStart.nodeId).y : dragStart.pos.y}
                        x2={mousePos.x}
                        y2={mousePos.y}
                        className="stroke-blue-400 stroke-[2px] stroke-dasharray-4" // Made blue for visibility
                        style={{ pointerEvents: 'none' }}
                    />
                )}

                {/* Ghost Node Cursor - Shows where next point will land */}
                {mousePos && !dragStart && (
                    <circle
                        cx={mousePos.x}
                        cy={mousePos.y}
                        r={6}
                        className="fill-blue-500/50 pointer-events-none animate-pulse"
                    />
                )}
                {/* Drag Target Ghost */}
                {dragStart && mousePos && (
                    <circle
                        cx={mousePos.x}
                        cy={mousePos.y}
                        r={6}
                        className="fill-blue-500/50 pointer-events-none "
                    />
                )}

                {/* Nodes */}
                {nodes.map((node) => (
                    <g
                        key={node.id}
                        data-node-id={node.id} // Crucial for elementFromPoint
                        transform={`translate(${node.position.x}, ${node.position.y})`}
                        className="cursor-pointer"
                    >
                        <circle
                            r={20} // Larger hit area
                            fill="transparent"
                        />
                        <circle
                            r={25}
                            fill={tutorialActive && activeNodeId === node.id ? "rgba(255, 255, 0, 0.2)" : "transparent"}
                            className={tutorialActive && activeNodeId === node.id ? "animate-ping" : ""}
                        />
                        <circle
                            r={5}
                            className={cn(
                                "stroke-[1px] fill-white stroke-white pointer-events-none",
                                "transition-all duration-200",
                                (dragStart?.nodeId === node.id) ? "fill-blue-400 scale-125" : "",
                                (tutorialActive && activeNodeId === node.id) ? "fill-yellow-400 stroke-yellow-400 scale-150 shadow-[0_0_10px_yellow]" : ""
                            )}
                        />
                    </g>
                ))}
            </svg>
        </div>
    );
}
