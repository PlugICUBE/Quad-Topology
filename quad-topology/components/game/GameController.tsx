"use client";

import React, { useState } from 'react';
import GameCanvas from './GameCanvas';
import { levels } from '../../data/levels';
import { GameEdge, GameNode } from '../../lib/types';
import { audioManager } from '../../lib/audio';
import { RefreshCw, CheckCircle, Volume2, ChevronLeft, Settings } from 'lucide-react';
import StartScreen from './StartScreen';
import LevelComplete from './LevelComplete';
import SettingsDialog from './SettingsDialog';
import { validateQuadTopology, autoRepairTopology } from '../../lib/topology';

export default function GameController() {
    const [currentLevelId, setCurrentLevelId] = useState(levels[0].id);
    const [userEdges, setUserEdges] = useState<GameEdge[]>([]);
    const [userNodes, setUserNodes] = useState<GameNode[]>([]);
    const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'LEVEL_COMPLETE'>('MENU');
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
    const [invalidFaces, setInvalidFaces] = useState<{ x: number, y: number }[][]>([]);
    const [showSettings, setShowSettings] = useState(false);

    const currentLevelIndex = levels.findIndex(l => l.id === currentLevelId);
    const currentLevel = levels[currentLevelIndex] || levels[0];

    // Tutorial State
    const [tutorialStep, setTutorialStep] = useState(0);
    const isTutorial = currentLevel.id === 'tutorial-1-to-2';

    // Reset when level changes
    React.useEffect(() => {
        setUserEdges([]);
        setUserNodes([]);
        setInvalidFaces([]);
        setFeedback({ message: '', type: null });
        setTutorialStep(0);
    }, [currentLevelId]);

    // Tutorial Logic - Step by Step Guide (Complete First Quad)
    React.useEffect(() => {
        if (!isTutorial) return;

        const allNodes = [...currentLevel.nodes, ...userNodes];
        const allEdges = [...currentLevel.edges, ...userEdges];

        // Helper to check if edge exists between two positions
        const hasEdge = (x1: number, y1: number, x2: number, y2: number) => allEdges.some(e => {
            const s = allNodes.find(n => n.id === e.source);
            const t = allNodes.find(n => n.id === e.target);
            if (!s || !t) return false;
            return (Math.abs(s.position.x - x1) < 5 && Math.abs(s.position.y - y1) < 5 && Math.abs(t.position.x - x2) < 5 && Math.abs(t.position.y - y2) < 5) ||
                (Math.abs(t.position.x - x1) < 5 && Math.abs(t.position.y - y1) < 5 && Math.abs(s.position.x - x2) < 5 && Math.abs(s.position.y - y2) < 5);
        });

        // Helper to check if node exists at position
        const hasNode = (x: number, y: number) => allNodes.some(n => Math.abs(n.position.x - x) < 5 && Math.abs(n.position.y - y) < 5);

        // Step 0: Draw diagonal from top-right (220,160) to center (160,220)
        const diagExists = hasNode(160, 220) && hasEdge(220, 160, 160, 220);
        if (tutorialStep === 0 && diagExists) {
            setTutorialStep(1);
            setFeedback({ message: "✓ ดีมาก! ต่อไปลากจาก Center → Left", type: null });
        }

        // Step 1: Draw horizontal from center (160,220) to left (100,220)
        const leftEdgeExists = hasNode(100, 220) && hasEdge(160, 220, 100, 220);
        if (tutorialStep === 1 && leftEdgeExists) {
            setTutorialStep(2);
            setFeedback({ message: "✓ เยี่ยม! ลากจาก Left ลงไปข้างล่าง", type: null });
        }

        // Step 2: Draw vertical from left (100,220) down to bottom-left (100,280)
        const leftDownExists = hasEdge(100, 220, 100, 280);
        if (tutorialStep === 2 && leftDownExists) {
            setTutorialStep(3);
            setFeedback({ message: "✓ สุดยอด! ลากจาก Center ลงไปข้างล่าง", type: null });
        }

        // Step 3: Draw vertical from center (160,220) down to bottom-center (160,280)
        const centerDownExists = hasEdge(160, 220, 160, 280);
        if (tutorialStep === 3 && centerDownExists) {
            setTutorialStep(4);
            setFeedback({ message: "🎉 สร้าง Quad แรกสำเร็จ! กด CHECK!", type: 'success' });
        }

    }, [userNodes, userEdges, isTutorial, tutorialStep]);

    // Computed Tutorial Props
    const tutorialActive = isTutorial;
    let activeNodeId: string | null = null;
    let tutorialPath: { start: { x: number, y: number }, end: { x: number, y: number } } | null = null;
    let tutorialPoint: { x: number, y: number } | null = null;

    if (isTutorial) {
        if (tutorialStep === 0) {
            // Step 0: Diagonal - Top-Right to Center
            tutorialPath = { start: { x: 220, y: 160 }, end: { x: 160, y: 220 } };
        } else if (tutorialStep === 1) {
            // Step 1: Center to Left
            tutorialPath = { start: { x: 160, y: 220 }, end: { x: 100, y: 220 } };
        } else if (tutorialStep === 2) {
            // Step 2: Left down to Bottom-Left
            tutorialPath = { start: { x: 100, y: 220 }, end: { x: 100, y: 280 } };
        } else if (tutorialStep === 3) {
            // Step 3: Center down to Bottom-Center
            tutorialPath = { start: { x: 160, y: 220 }, end: { x: 160, y: 280 } };
        }
        // Step 4: No path, just press CHECK
    }

    const handleStartGame = () => {
        audioManager.playBGM();
        audioManager.playSFX('click');
        setGameState('PLAYING');
    };

    const handleReset = () => {
        audioManager.playSFX('click');
        setUserEdges([]);
        setUserNodes([]);
        setInvalidFaces([]);
        setFeedback({ message: '', type: null });
        setTutorialStep(0);
    };

    const handleStrokeCreate = (start: { pos: { x: number, y: number }, nodeId?: string }, end: { pos: { x: number, y: number }, nodeId?: string }) => {
        let sourceId = start.nodeId;
        let targetId = end.nodeId;

        if (feedback.type === 'error') {
            setFeedback({ message: '', type: null });
            setInvalidFaces([]);
        }

        const findNodeAt = (pos: { x: number, y: number }) => {
            const allNodes = [...currentLevel.nodes, ...userNodes];
            return allNodes.find(n => Math.abs(n.position.x - pos.x) < 2 && Math.abs(n.position.y - pos.y) < 2);
        };

        if (!sourceId) {
            const existing = findNodeAt(start.pos);
            if (existing) {
                sourceId = existing.id;
            } else {
                sourceId = `u_${Date.now()}_1`;
                const newNode: GameNode = { id: sourceId, position: start.pos, type: 'default' };
                setUserNodes(prev => [...prev, newNode]);
            }
        }

        if (!targetId) {
            const isDrag = Math.abs(start.pos.x - end.pos.x) > 5 || Math.abs(start.pos.y - end.pos.y) > 5;
            if (isDrag || (!start.nodeId && !end.nodeId)) {
                const existing = findNodeAt(end.pos);
                if (existing) {
                    targetId = existing.id;
                } else {
                    targetId = `u_${Date.now()}_2`;
                    const newNode: GameNode = { id: targetId, position: end.pos, type: 'default' };
                    setUserNodes(prev => [...prev, newNode]);
                }
            }
        }

        if (!targetId && !start.nodeId && !end.nodeId) {
            audioManager.playSFX('click');
            return;
        }

        if (sourceId && targetId && sourceId !== targetId) {
            const edgeId = `${sourceId}-${targetId}`;
            const exist = [...currentLevel.edges, ...userEdges].some(e =>
                (e.source === sourceId && e.target === targetId) || (e.source === targetId && e.target === sourceId)
            );

            if (!exist) {
                const newEdge: GameEdge = { id: edgeId, source: sourceId, target: targetId };
                setUserEdges(prev => [...prev, newEdge]);
                audioManager.playSFX('connect');
            }
        }
    };

    const handleCheck = () => {
        const allNodes = [...currentLevel.nodes, ...userNodes];
        const allEdges = [...currentLevel.edges, ...userEdges];

        const repaired = autoRepairTopology(allNodes, allEdges);

        const newUserNodes = repaired.nodes.filter(n => n.id.startsWith('u_'));
        const levelEdgeIds = new Set(currentLevel.edges.map(e => e.id));
        const newUserEdges = repaired.edges.filter(e => !levelEdgeIds.has(e.id));

        setUserNodes(newUserNodes);
        setUserEdges(newUserEdges);

        // Tutorial Check - Validate EXACT TOPOLOGY
        if (isTutorial) {
            const finalNodes = repaired.nodes;
            const finalEdges = repaired.edges;

            // Helper
            const hasNode = (x: number, y: number) => finalNodes.some(n => Math.abs(n.position.x - x) < 5 && Math.abs(n.position.y - y) < 5);
            const hasEdge = (x1: number, y1: number, x2: number, y2: number) => finalEdges.some(e => {
                const s = finalNodes.find(n => n.id === e.source);
                const t = finalNodes.find(n => n.id === e.target);
                if (!s || !t) return false;
                return (Math.abs(s.position.x - x1) < 5 && Math.abs(s.position.y - y1) < 5 && Math.abs(t.position.x - x2) < 5 && Math.abs(t.position.y - y2) < 5) ||
                    (Math.abs(t.position.x - x1) < 5 && Math.abs(t.position.y - y1) < 5 && Math.abs(s.position.x - x2) < 5 && Math.abs(s.position.y - y2) < 5);
            });

            // Required Nodes (user must create center at row 2)
            const n_1_2 = hasNode(160, 220);

            // Required Edges (user must draw these - others are pre-filled)
            const e_diag = hasEdge(220, 160, 160, 220);        // Diagonal from top-right
            const e_toLeft2 = hasEdge(160, 220, 100, 220);     // Center to left at row 2
            const e_v1 = hasEdge(160, 220, 160, 280);           // Center vertical to row 3

            const isValid = n_1_2 && e_diag && e_toLeft2 && e_v1;

            if (isValid) {
                audioManager.playSFX('win');
                setGameState('LEVEL_COMPLETE');
                setInvalidFaces([]);
            } else {
                audioManager.playSFX('error');
                setFeedback({
                    type: 'error',
                    message: "❌ Incorrect pattern. Follow the exact topology!"
                });
            }
            return;
        }

        const result = validateQuadTopology(repaired.nodes, repaired.edges);

        if (result.isValid) {
            audioManager.playSFX('win');
            setGameState('LEVEL_COMPLETE');
            setInvalidFaces([]);
        } else {
            audioManager.playSFX('error');
            setFeedback({
                type: 'error',
                message: `❌ ${result.message}`
            });
            setInvalidFaces(result.invalidFaces || []);
        }
    };

    const handleEdgeDelete = (edgeId: string) => {
        setUserEdges(prev => prev.filter(e => e.id !== edgeId));
        audioManager.playSFX('click');
        if (feedback.type === 'error') {
            setFeedback({ message: '', type: null });
            setInvalidFaces([]);
        }
    };

    const handleNextLevel = () => {
        audioManager.playSFX('click');
        const nextIndex = currentLevelIndex + 1;
        if (nextIndex < levels.length) {
            setCurrentLevelId(levels[nextIndex].id);
            setGameState('PLAYING');
        } else {
            setGameState('MENU');
        }
    };

    const handleReplay = () => {
        audioManager.playSFX('click');
        setUserEdges([]);
        setUserNodes([]);
        setInvalidFaces([]);
        setGameState('PLAYING');
        setTutorialStep(0);
    };

    const handlePrevLevel = () => {
        audioManager.playSFX('click');
        const prevIndex = currentLevelIndex - 1;
        if (prevIndex >= 0) {
            setCurrentLevelId(levels[prevIndex].id);
            setGameState('PLAYING');
        }
    };

    if (gameState === 'MENU') {
        return <StartScreen onStart={handleStartGame} />;
    }

    return (
        <div className="flex flex-col w-full h-screen max-w-7xl relative">
            <SettingsDialog
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />

            {gameState === 'LEVEL_COMPLETE' && (
                <LevelComplete
                    levelName={currentLevel.name}
                    faces={currentLevel.targetFaces}
                    onNext={handleNextLevel}
                    onReplay={handleReplay}
                    hasNextLevel={currentLevelIndex < levels.length - 1}
                />
            )}

            <header className="flex items-center w-full justify-between p-4 bg-neutral-900/90 border-b border-neutral-800 backdrop-blur-md z-10 rounded-t-xl mt-4 mx-4 border">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-widest uppercase">{currentLevel.name}</h2>
                    <p className="text-xs text-neutral-400">Target: {isTutorial ? "Draw the EXACT pattern" : "All faces must be Triangles or Quads"}</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setShowSettings(true)} className="text-neutral-500 hover:text-white transition-colors">
                        <Settings size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrevLevel}
                            disabled={currentLevelIndex === 0}
                            className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <div className="px-3 py-1 bg-neutral-800 rounded text-xs text-neutral-400 border border-neutral-700 whitespace-nowrap">
                            {currentLevelIndex + 1} / {levels.length}
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 relative w-full overflow-hidden bg-neutral-900 mx-4 border-x border-neutral-800">
                <GameCanvas
                    nodes={[...currentLevel.nodes, ...userNodes]}
                    boundaryEdges={currentLevel.edges}
                    userEdges={userEdges}
                    tiles={currentLevel.tiles}
                    invalidFaces={invalidFaces}
                    onEdgesChange={(edges) => {
                        if (edges.length > userEdges.length) {
                            audioManager.playSFX('connect');
                        }
                        setUserEdges(edges);
                    }}
                    onEdgeDelete={handleEdgeDelete}
                    onStrokeCreate={handleStrokeCreate}
                    tutorialActive={isTutorial}
                    activeNodeId={activeNodeId}
                    tutorialPath={tutorialPath}
                    tutorialPoint={tutorialPoint}
                />

                {isTutorial && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-neutral-800/90 text-white px-4 py-2 rounded-lg pointer-events-none border border-yellow-500/50 text-sm font-bold shadow-lg animate-bounce">
                        {tutorialStep === 0 && "① ลากเส้นทแยง: มุมบนขวา → กลาง"}
                        {tutorialStep === 1 && "② ลากแนวนอน: กลาง → ซ้าย"}
                        {tutorialStep === 2 && "③ ลากลง: ซ้าย → ล่างซ้าย"}
                        {tutorialStep === 3 && "④ ลากลง: กลาง → ล่างกลาง"}
                        {tutorialStep === 4 && "✅ สร้าง Quad สำเร็จ! กด CHECK!"}
                    </div>
                )}
            </div>

            <div className="p-4 bg-neutral-900/90 border-t w-full border-neutral-800 backdrop-blur-md z-10 mb-4 mx-4 rounded-b-xl border flex flex-col gap-2">
                <div className="flex gap-4">
                    <button
                        onClick={handleReset}
                        className="flex-1 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white py-3 px-4 rounded-xl transition-all font-bold active:scale-95"
                    >
                        <RefreshCw size={20} />
                        RESET
                    </button>
                    <button
                        onClick={handleCheck}
                        className="flex-[2] flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-black py-3 px-4 rounded-xl transition-all font-black uppercase tracking-wider active:scale-95 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                    >
                        <CheckCircle size={24} />
                        CHECK
                    </button>
                </div>

                {feedback.type && gameState === 'PLAYING' && (
                    <div className="text-center text-sm font-medium text-red-400 animate-in fade-in slide-in-from-bottom-2">
                        {feedback.message}
                    </div>
                )}
            </div>

            <div className="absolute top-20 left-6 text-[10px] text-neutral-500 pointer-events-none opacity-50 flex flex-col gap-1">
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full" /> Input</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full" /> Output</div>
            </div>
        </div>
    );
}
