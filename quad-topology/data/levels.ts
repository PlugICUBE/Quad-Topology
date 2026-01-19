import { LevelData, GameNode, GameEdge, GameTile } from '../lib/types';

export const GRID_SCALE = 60;
export const OFFSET_X = 100;
export const OFFSET_Y = 100;

// Helper to create node - UNUSED but kept for reference if needed
const createNode = (id: string, x: number, y: number, type: 'start' | 'end' | 'default' = 'default'): GameNode => ({
    id,
    position: { x: OFFSET_X + x * GRID_SCALE, y: OFFSET_Y + y * GRID_SCALE },
    type
});

// Helper for perimeter edges - UNUSED
const createEdge = (s: string, t: string): GameEdge => ({ id: `${s}-${t}`, source: s, target: t });

// Helper to create tiles
function createTile(id: string, points: { x: number, y: number }[], type: 'input' | 'output' | 'default'): GameTile {
    return {
        id,
        type,
        points: points.map(p => ({ x: OFFSET_X + p.x * GRID_SCALE, y: OFFSET_Y + p.y * GRID_SCALE }))
    };
}

// NOTE: All Levels now contain NO implicit nodes or edges. 
// The user starts with a blank canvas + background guides (tiles).

/* -------------------------------------------------------------------------- */
/*                                TUTORIAL: 1 to 2                            */
/* -------------------------------------------------------------------------- */
const l0_tiles: GameTile[] = [
    // Input: 2 units wide (Top) - Single Block
    createTile('in', [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 0, y: 1 }], 'input'),
    // Area: 2 units wide (Middle)
    createTile('area', [{ x: 0, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 3 }, { x: 0, y: 3 }], 'default'),
    // Output: 2 units wide (Bottom)
    createTile('out', [{ x: 0, y: 3 }, { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 0, y: 4 }], 'output')
];

/* -------------------------------------------------------------------------- */
/*                                LEVEL 1: 1 to 1                             */
/* -------------------------------------------------------------------------- */
const l1_tiles: GameTile[] = [
    createTile('in', [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], 'input'),
    createTile('area', [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 3 }, { x: 0, y: 3 }], 'default'),
    createTile('out', [{ x: 0, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 4 }, { x: 0, y: 4 }], 'output')
];

/* -------------------------------------------------------------------------- */
/*                                LEVEL 2: 2 to 1                             */
/* -------------------------------------------------------------------------- */
const l2_tiles: GameTile[] = [
    // Top Inputs (2 blocks)
    createTile('in_t1', [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 1, y: 1 }], 'input'),
    createTile('in_t2', [{ x: 2, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 2, y: 1 }], 'input'),

    // Right Inputs (2 blocks)
    createTile('in_r1', [{ x: 3, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 3, y: 2 }], 'input'),
    createTile('in_r2', [{ x: 3, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 3, y: 3 }], 'input'),

    // Left Output (1 big block spanning 2 height)
    createTile('out_l', [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 3 }, { x: 0, y: 3 }], 'output'),

    // Bottom Output (1 big block spanning 2 width)
    createTile('out_b', [{ x: 1, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 4 }, { x: 1, y: 4 }], 'output'),

    // Center Play Area (2x2)
    createTile('area', [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 3 }, { x: 1, y: 3 }], 'default')
];

/* -------------------------------------------------------------------------- */
/*                                LEVEL 3: 3 to 1                             */
/* -------------------------------------------------------------------------- */
const l3_tiles: GameTile[] = [
    createTile('in', [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 0, y: 1 }], 'input'),
    createTile('area', [{ x: 0, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 3 }, { x: 1, y: 3 }], 'default'),
    createTile('out', [{ x: 1, y: 3 }, { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 1, y: 4 }], 'output')
];

/* -------------------------------------------------------------------------- */
/*                                LEVEL 4: 3 to 2                             */
/* -------------------------------------------------------------------------- */
const l4_tiles: GameTile[] = [
    createTile('in', [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 0, y: 1 }], 'input'),
    createTile('area', [{ x: 0, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 4 }, { x: 0, y: 4 }], 'default'),
    createTile('out', [{ x: 0, y: 4 }, { x: 3, y: 4 }, { x: 3, y: 5 }, { x: 0, y: 5 }], 'output')
];

/* -------------------------------------------------------------------------- */
/*                                LEVEL 5: 4 to 2                             */
/* -------------------------------------------------------------------------- */
const l5_tiles: GameTile[] = [
    createTile('in', [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 1 }, { x: 0, y: 1 }], 'input'),
    createTile('area', [{ x: 0, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 3 }, { x: 0, y: 3 }], 'default'),
    createTile('out', [{ x: 0, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 0, y: 4 }], 'output')
];

/* -------------------------------------------------------------------------- */
/*                                LEVEL 6: 5 to 3                             */
/* -------------------------------------------------------------------------- */
const l6_tiles: GameTile[] = [
    createTile('in', [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 1 }, { x: 0, y: 1 }], 'input'),
    createTile('area', [{ x: 0, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 3 }, { x: 0, y: 3 }], 'default'),
    createTile('out', [{ x: 0, y: 3 }, { x: 5, y: 3 }, { x: 5, y: 4 }, { x: 0, y: 4 }], 'output')
];

// Re-export levels with EMPTY nodes/edges
export const levels: LevelData[] = [
    {
        id: 'tutorial-1-to-2',
        name: 'Tutorial: 1 to 2',
        description: 'Learn the basics: 1 Start to 2 Ends.',
        nodes: [
            // Top Row (y=160) - Input "1"
            { id: 'n_0_1', position: { x: 100, y: 160 }, type: 'default' },
            { id: 'n_2_1', position: { x: 220, y: 160 }, type: 'default' },
            // Row 3 (y=280) - Output "2" top edge with center split
            { id: 'n_0_3', position: { x: 100, y: 280 }, type: 'default' },
            { id: 'n_1_3', position: { x: 160, y: 280 }, type: 'default' }, // Center of row 3
            { id: 'n_2_3', position: { x: 220, y: 280 }, type: 'default' },
            // Bottom Row (y=340) - Output "2" bottom edge with center
            { id: 'n_0_4', position: { x: 100, y: 340 }, type: 'default' },
            { id: 'n_1_4', position: { x: 160, y: 340 }, type: 'default' },
            { id: 'n_2_4', position: { x: 220, y: 340 }, type: 'default' }
        ],
        edges: [
            // Input Frame - Top (just frame for "1")
            { id: 'e_t', source: 'n_0_1', target: 'n_2_1' },

            // Output Frame - Left wall (from row 3 to row 4)
            { id: 'e_l03', source: 'n_0_3', target: 'n_0_4' },
            // Output Frame - Right wall
            { id: 'e_r03', source: 'n_2_3', target: 'n_2_4' },
            // Output Frame - Top (row 3) WITH center split for "2"
            { id: 'e_h3l', source: 'n_0_3', target: 'n_1_3' },
            { id: 'e_h3r', source: 'n_1_3', target: 'n_2_3' },
            // Output Frame - Bottom (row 4)
            { id: 'e_b1', source: 'n_0_4', target: 'n_1_4' },
            { id: 'e_b2', source: 'n_1_4', target: 'n_2_4' },
            // Output Vertical Split (showing "2")
            { id: 'e_v34', source: 'n_1_3', target: 'n_1_4' }
        ],
        tiles: l0_tiles,
        gridSize: { width: 400, height: 600 },
        targetFaces: 0
    },
    {
        id: '1-to-1',
        name: '1 to 1',
        description: 'Basic Strip',
        nodes: [],
        edges: [],
        tiles: l1_tiles,
        gridSize: { width: 500, height: 600 },
        targetFaces: 5
    },
    {
        id: '2-to-1',
        name: '2 to 1',
        description: 'Merge two flows into one.',
        nodes: [],
        edges: [],
        tiles: l2_tiles,
        gridSize: { width: 500, height: 600 },
        targetFaces: 0
    },
    {
        id: '3-to-1',
        name: '3 to 1',
        description: 'Merge three flows into one.',
        nodes: [],
        edges: [],
        tiles: l3_tiles,
        gridSize: { width: 500, height: 600 },
        targetFaces: 0
    },
    {
        id: '3-to-2',
        name: '3 to 2',
        description: 'Reduce 3 columns to 2 columns.',
        nodes: [],
        edges: [],
        tiles: l4_tiles,
        gridSize: { width: 500, height: 600 },
        targetFaces: 0
    },
    {
        id: '4-to-2',
        name: '4 to 2',
        description: 'Reduce 4 columns to 2 columns.',
        nodes: [],
        edges: [],
        tiles: l5_tiles,
        gridSize: { width: 600, height: 600 },
        targetFaces: 0
    },
    {
        id: '5-to-3',
        name: '5 to 3',
        description: 'Reduce 5 columns to 3 columns.',
        nodes: [],
        edges: [],
        tiles: l6_tiles,
        gridSize: { width: 650, height: 600 },
        targetFaces: 0
    }
];
