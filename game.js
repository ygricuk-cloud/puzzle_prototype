const GRID_COLS = 7;
const GRID_ROWS = 8;
const CELL_SIZE = 64;

const TIER_DEFS = {
  1: { color: "#8EC5FF", width: 1, height: 1 },
  2: { color: "#3A8DFF", width: 1, height: 1 },
  3: { color: "#38D6C4", width: 2, height: 1 },
  4: { color: "#35C759", width: 2, height: 1 },
  5: { color: "#8CE63C", width: 2, height: 2 },
  6: { color: "#C8E83A", width: 2, height: 2 },
  7: { color: "#FFD93A", width: 2, height: 2 },
  8: { color: "#FFA53A", width: 2, height: 2 },
  9: { color: "#FF7A2F", width: 2, height: 2 },
  10: { color: "#FF4D4D", width: 3, height: 2 },
  11: { color: "#E63A6E", width: 3, height: 2 },
  12: { color: "#8C4DFF", width: 3, height: 3 },
  13: { color: "#FFD700", width: 3, height: 3 }
};

const LEVELS = {
  1: {
    name: "Level 1",
    blocks: [
      { tier: 5, x: 0, y: 0 },
      { tier: 12, x: 2, y: 0 },
      { tier: 9, x: 5, y: 0 },
      { tier: 4, x: 0, y: 2 },
      { tier: 4, x: 5, y: 2 },
      { tier: 2, x: 0, y: 3 },
      { tier: 8, x: 1, y: 3 },
      { tier: 2, x: 3, y: 3 },
      { tier: 11, x: 4, y: 3 },
      { tier: 2, x: 0, y: 4 },
      { tier: 2, x: 3, y: 4 },
      { tier: 4, x: 0, y: 5 },
      { tier: 2, x: 2, y: 5 },
      { tier: 7, x: 4, y: 5 },
      { tier: 1, x: 6, y: 5 },
      { tier: 10, x: 0, y: 6 },
      { tier: 1, x: 6, y: 6 },
      { tier: 2, x: 3, y: 7 },
      { tier: 2, x: 4, y: 7 },
      { tier: 4, x: 5, y: 7 }
    ]
  },
  2: {
    name: "Level 2",
    blocks: [
      { tier: 5, x: 0, y: 0 },
      { tier: 9, x: 5, y: 0 },
      { tier: 4, x: 0, y: 2 },
      { tier: 4, x: 5, y: 2 },
      { tier: 2, x: 0, y: 3 },
      { tier: 8, x: 1, y: 3 },
      { tier: 2, x: 3, y: 3 },
      { tier: 2, x: 0, y: 4 },
      { tier: 2, x: 3, y: 4 },
      { tier: 4, x: 0, y: 5 },
      { tier: 2, x: 2, y: 5 },
      { tier: 7, x: 4, y: 5 },
      { tier: 1, x: 6, y: 5 },
      { tier: 10, x: 0, y: 6 },
      { tier: 1, x: 6, y: 6 },
      { tier: 2, x: 3, y: 7 },
      { tier: 2, x: 4, y: 7 },
      { tier: 4, x: 5, y: 7 }
    ],
    goals: [
      { tier: 7, count: 1 },
      { tier: 9, count: 1 }
    ]
  }
};

class BoardLogic {
  constructor(cols, rows, tierDefs) {
    this.cols = cols;
    this.rows = rows;
    this.tierDefs = tierDefs;
    this.blocks = [];
    this.nextId = 1;
    this.occupancyGrid = this.createEmptyGrid();
  }

  loadFromLevelData(levelData) {
    if (!levelData || !Array.isArray(levelData.blocks)) {
      throw new Error("Invalid level data: expected an object with a blocks array.");
    }

    const nextBlocks = [];
    const loadGrid = this.createEmptyGrid();

    levelData.blocks.forEach((item, index) => {
      const block = this.createBlock(item.id || `seed_${index + 1}`, item.tier, item.x, item.y);
      const canPlace = this.canPlaceOnGrid(loadGrid, block.x, block.y, block.width, block.height);

      if (!canPlace) {
        throw new Error(
          `Invalid level at block #${index + 1}: tier ${block.tier} at (${block.x}, ${block.y}) overlaps or is out-of-bounds.`
        );
      }

      this.markGridCells(loadGrid, block.id, block.x, block.y, block.width, block.height);
      nextBlocks.push(block);
    });

    this.blocks = nextBlocks;
    this.occupancyGrid = loadGrid;
    this.nextId = 1;
  }

  createEmptyGrid() {
    return Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
  }

  createBlock(id, tier, x, y) {
    const def = this.tierDefs[tier];
    if (!def) {
      throw new Error(`Invalid tier "${tier}" for block "${id}".`);
    }
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new Error(`Invalid anchor for block "${id}": x and y must be integers.`);
    }

    return {
      id,
      tier,
      x,
      y,
      width: def.width,
      height: def.height,
      color: def.color
    };
  }

  getBlockById(id) {
    return this.blocks.find((block) => block.id === id) || null;
  }

  buildOccupancyGrid(excludedIds = new Set()) {
    const grid = this.createEmptyGrid();

    for (const block of this.blocks) {
      if (excludedIds.has(block.id)) {
        continue;
      }

      for (let y = block.y; y < block.y + block.height; y += 1) {
        for (let x = block.x; x < block.x + block.width; x += 1) {
          if (y < 0 || y >= this.rows || x < 0 || x >= this.cols) {
            continue;
          }
          grid[y][x] = block.id;
        }
      }
    }

    return grid;
  }

  canPlaceOnGrid(grid, x, y, width, height) {
    if (x < 0 || y < 0 || x + width > this.cols || y + height > this.rows) {
      return false;
    }

    for (let cy = y; cy < y + height; cy += 1) {
      for (let cx = x; cx < x + width; cx += 1) {
        if (grid[cy][cx] !== null) {
          return false;
        }
      }
    }

    return true;
  }

  markGridCells(grid, blockId, x, y, width, height) {
    for (let cy = y; cy < y + height; cy += 1) {
      for (let cx = x; cx < x + width; cx += 1) {
        grid[cy][cx] = blockId;
      }
    }
  }

  canPlaceRect(x, y, width, height, excludedIds = new Set()) {
    if (x < 0 || y < 0 || x + width > this.cols || y + height > this.rows) {
      return false;
    }

    const occupancy = this.buildOccupancyGrid(excludedIds);

    for (let cy = y; cy < y + height; cy += 1) {
      for (let cx = x; cx < x + width; cx += 1) {
        if (occupancy[cy][cx] !== null) {
          return false;
        }
      }
    }

    return true;
  }

  moveBlock(blockId, x, y) {
    const block = this.getBlockById(blockId);
    if (!block) {
      return false;
    }

    const excluded = new Set([block.id]);
    if (!this.canPlaceRect(x, y, block.width, block.height, excluded)) {
      return false;
    }

    block.x = x;
    block.y = y;
    this.occupancyGrid = this.buildOccupancyGrid();
    return true;
  }

  clampAnchorForBlock(block, x, y) {
    return {
      x: clamp(x, 0, this.cols - block.width),
      y: clamp(y, 0, this.rows - block.height)
    };
  }

  getOverlapBlockIdsAtAnchor(blockId, x, y, width, height) {
    const occupancy = this.buildOccupancyGrid(new Set([blockId]));
    const overlapIds = new Set();

    if (!this.canPlaceOnGrid(this.createEmptyGrid(), x, y, width, height)) {
      return [...overlapIds];
    }

    for (let cy = y; cy < y + height; cy += 1) {
      for (let cx = x; cx < x + width; cx += 1) {
        const found = occupancy[cy][cx];
        if (found !== null) {
          overlapIds.add(found);
        }
      }
    }

    return [...overlapIds];
  }

  getOverlapCellCountsAtAnchor(blockId, x, y, width, height) {
    const occupancy = this.buildOccupancyGrid(new Set([blockId]));
    const counts = {};

    if (!this.canPlaceOnGrid(this.createEmptyGrid(), x, y, width, height)) {
      return counts;
    }

    for (let cy = y; cy < y + height; cy += 1) {
      for (let cx = x; cx < x + width; cx += 1) {
        const found = occupancy[cy][cx];
        if (found !== null) {
          counts[found] = (counts[found] || 0) + 1;
        }
      }
    }

    return counts;
  }

  traceSlidePath(blockId, fromX, fromY, toX, toY, options = {}) {
    const block = this.getBlockById(blockId);
    if (!block) {
      return { x: fromX, y: fromY, blocked: true, reached: false, blockedByIds: [] };
    }

    const clamped = this.clampAnchorForBlock(block, toX, toY);
    const targetX = clamped.x;
    const targetY = clamped.y;
    const occupancy = this.buildOccupancyGrid(new Set([blockId]));

    let currentX = fromX;
    let currentY = fromY;
    let blockedByIds = [];

    while (currentX !== targetX || currentY !== targetY) {
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      const primaryAxis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      const secondaryAxis = primaryAxis === "x" ? "y" : "x";
      const axes = [primaryAxis, secondaryAxis];
      let stepped = false;

      for (const axis of axes) {
        const step = axis === "x" ? Math.sign(targetX - currentX) : Math.sign(targetY - currentY);
        if (step === 0) {
          continue;
        }

        const nextX = axis === "x" ? currentX + step : currentX;
        const nextY = axis === "y" ? currentY + step : currentY;
        const inBounds = this.canPlaceOnGrid(this.createEmptyGrid(), nextX, nextY, block.width, block.height);

        if (!inBounds) {
          blockedByIds = ["boundary"];
          continue;
        }

        const overlaps = [];
        for (let cy = nextY; cy < nextY + block.height; cy += 1) {
          for (let cx = nextX; cx < nextX + block.width; cx += 1) {
            const found = occupancy[cy][cx];
            if (found !== null && !overlaps.includes(found)) {
              overlaps.push(found);
            }
          }
        }

        const atFinalTarget = nextX === targetX && nextY === targetY;
        const allowFinalOverlapId = options.allowFinalOverlapId || null;
        const canUseFinalOverlap =
          atFinalTarget &&
          allowFinalOverlapId !== null &&
          overlaps.length > 0 &&
          overlaps.every((id) => id === allowFinalOverlapId);

        if (overlaps.length > 0 && !canUseFinalOverlap) {
          blockedByIds = overlaps;
          continue;
        }

        currentX = nextX;
        currentY = nextY;
        stepped = true;
        break;
      }

      if (!stepped) {
        return {
          x: currentX,
          y: currentY,
          blocked: true,
          reached: false,
          blockedByIds
        };
      }
    }

    return {
      x: currentX,
      y: currentY,
      blocked: false,
      reached: true,
      blockedByIds: []
    };
  }

  getOverlapCellCountsFromOccupancy(occupancy, x, y, width, height) {
    const counts = {};
    if (!this.canPlaceOnGrid(this.createEmptyGrid(), x, y, width, height)) {
      return counts;
    }

    for (let cy = y; cy < y + height; cy += 1) {
      for (let cx = x; cx < x + width; cx += 1) {
        const found = occupancy[cy][cx];
        if (found !== null) {
          counts[found] = (counts[found] || 0) + 1;
        }
      }
    }
    return counts;
  }

  getCellsForRect(x, y, width, height) {
    const cells = [];
    for (let cy = y; cy < y + height; cy += 1) {
      for (let cx = x; cx < x + width; cx += 1) {
        cells.push({ x: cx, y: cy });
      }
    }
    return cells;
  }

  resolveDropDeterministic(blockId, startX, startY, intendedX, intendedY) {
    const moved = this.getBlockById(blockId);
    if (!moved) {
      return {
        result: "rejected:missing_block",
        finalOutcome: "reject",
        originalAnchor: { x: startX, y: startY },
        snappedAnchor: { x: startX, y: startY },
        pathValid: false,
        draggedFinalCells: [],
        overlappedBlockIds: [],
        overlappedBlockTiers: [],
        mergeCandidateChosen: false,
        upgradedFootprintValid: null,
        snappedX: startX,
        snappedY: startY
      };
    }

    const snapped = this.clampAnchorForBlock(moved, intendedX, intendedY);
    const draggedFinalCells = this.getCellsForRect(snapped.x, snapped.y, moved.width, moved.height);
    const occupancyWithoutMoved = this.buildOccupancyGrid(new Set([moved.id]));

    let currentX = startX;
    let currentY = startY;
    let lastValidX = startX;
    let lastValidY = startY;
    let pathReachedTarget = currentX === snapped.x && currentY === snapped.y;
    let contactOverlapCounts = {};
    let contactOverlapIds = [];
    let mergeTarget = null;
    let blockedByObstacle = false;

    while (!pathReachedTarget) {
      const dx = snapped.x - currentX;
      const dy = snapped.y - currentY;
      const primaryAxis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      const secondaryAxis = primaryAxis === "x" ? "y" : "x";
      const axes = [primaryAxis, secondaryAxis];
      let stepped = false;

      for (const axis of axes) {
        const step = axis === "x" ? Math.sign(snapped.x - currentX) : Math.sign(snapped.y - currentY);
        if (step === 0) {
          continue;
        }

        const nextX = axis === "x" ? currentX + step : currentX;
        const nextY = axis === "y" ? currentY + step : currentY;

        if (!this.canPlaceOnGrid(this.createEmptyGrid(), nextX, nextY, moved.width, moved.height)) {
          continue;
        }

        const overlapCounts = this.getOverlapCellCountsFromOccupancy(
          occupancyWithoutMoved,
          nextX,
          nextY,
          moved.width,
          moved.height
        );
        const overlapIds = Object.keys(overlapCounts);

        if (overlapIds.length === 0) {
          currentX = nextX;
          currentY = nextY;
          lastValidX = nextX;
          lastValidY = nextY;
          stepped = true;
          break;
        }

        // First contacted obstacle on the chosen step.
        contactOverlapCounts = overlapCounts;
        contactOverlapIds = overlapIds;
        if (overlapIds.length === 1) {
          const candidate = this.getBlockById(overlapIds[0]);
          if (candidate && candidate.tier === moved.tier) {
            mergeTarget = candidate;
            blockedByObstacle = true;
            break;
          }
        }

        // Not mergeable on this axis, try alternate axis.
        continue;
      }

      if (mergeTarget) {
        break;
      }

      if (!stepped) {
        blockedByObstacle = true;
        break;
      }

      pathReachedTarget = currentX === snapped.x && currentY === snapped.y;
    }

    pathReachedTarget = currentX === snapped.x && currentY === snapped.y;

    const overlappedBlockTiers = contactOverlapIds
      .map((id) => this.getBlockById(id))
      .filter(Boolean)
      .map((block) => block.tier);
    const overlapCellCount = Object.values(contactOverlapCounts).reduce((sum, count) => sum + count, 0);

    if (!mergeTarget) {
      moved.x = lastValidX;
      moved.y = lastValidY;
      this.occupancyGrid = this.buildOccupancyGrid();
      return {
        result: "move_success",
        finalOutcome: "move",
        originalAnchor: { x: startX, y: startY },
        snappedAnchor: { x: snapped.x, y: snapped.y },
        pathValid: pathReachedTarget,
        draggedFinalCells,
        overlappedBlockIds: contactOverlapIds,
        overlappedBlockTiers,
        mergeCandidateChosen: false,
        upgradedFootprintValid: null,
        snappedX: snapped.x,
        snappedY: snapped.y,
        overlappedBlockId: contactOverlapIds.length === 1 ? contactOverlapIds[0] : (contactOverlapIds.length > 1 ? `multiple:${contactOverlapIds.join(",")}` : null),
        overlappedBlockTier: contactOverlapIds.length === 1 && overlappedBlockTiers.length === 1 ? overlappedBlockTiers[0] : null,
        overlappedCellCount: overlapCellCount
      };
    }

    const target = mergeTarget;
    const targetId = target.id;
    const nextTier = moved.tier + 1;
    const nextDef = this.tierDefs[nextTier];
    if (!nextDef) {
      moved.x = lastValidX;
      moved.y = lastValidY;
      this.occupancyGrid = this.buildOccupancyGrid();
      return {
        result: "rejected:missing_next_tier",
        finalOutcome: "reject",
        originalAnchor: { x: startX, y: startY },
        snappedAnchor: { x: snapped.x, y: snapped.y },
        pathValid: pathReachedTarget,
        draggedFinalCells,
        overlappedBlockIds: [targetId],
        overlappedBlockTiers: [target.tier],
        mergeCandidateChosen: true,
        upgradedFootprintValid: null,
        snappedX: snapped.x,
        snappedY: snapped.y,
        overlappedBlockId: targetId,
        overlappedBlockTier: target.tier,
        overlappedCellCount: overlapCellCount
      };
    }

    const mergeAnchor = { x: target.x, y: target.y };
    const upgradedCells = this.getCellsForRect(mergeAnchor.x, mergeAnchor.y, nextDef.width, nextDef.height);
    const previousBlocks = this.blocks.slice();
    const sourceCellsRemovedBeforeFitCheck = true;

    // Remove both sources from board state before upgraded fit-check.
    this.blocks = this.blocks.filter((block) => block.id !== moved.id && block.id !== target.id);
    this.occupancyGrid = this.buildOccupancyGrid();

    const mergedFits = this.canPlaceOnGrid(
      this.occupancyGrid,
      mergeAnchor.x,
      mergeAnchor.y,
      nextDef.width,
      nextDef.height
    );
    if (!mergedFits) {
      this.blocks = previousBlocks;
      moved.x = lastValidX;
      moved.y = lastValidY;
      this.occupancyGrid = this.buildOccupancyGrid();
      return {
        result: "rejected:upgraded_does_not_fit",
        finalOutcome: "reject",
        originalAnchor: { x: startX, y: startY },
        snappedAnchor: { x: snapped.x, y: snapped.y },
        pathValid: pathReachedTarget,
        draggedFinalCells,
        overlappedBlockIds: [targetId],
        overlappedBlockTiers: [target.tier],
        mergeCandidateChosen: true,
        upgradedFootprintValid: false,
        mergeDebug: {
          draggedBlockId: moved.id,
          draggedBlockTier: moved.tier,
          draggedAnchor: { x: snapped.x, y: snapped.y },
          targetBlockId: target.id,
          targetBlockTier: target.tier,
          targetAnchor: { x: target.x, y: target.y },
          mergeAnchor,
          sourceCellsRemovedBeforeFitCheck,
          upgradedTier: nextTier,
          upgradedFootprintCells: upgradedCells,
          fitCheckResult: false,
          finalOutcome: "reject"
        },
        snappedX: snapped.x,
        snappedY: snapped.y,
        overlappedBlockId: targetId,
        overlappedBlockTier: target.tier,
        overlappedCellCount: overlapCellCount
      };
    }

    const merged = this.createBlock(`merged_${this.nextId++}`, nextTier, mergeAnchor.x, mergeAnchor.y);
    this.blocks.push(merged);
    this.occupancyGrid = this.buildOccupancyGrid();
    return {
      result: "merge_success",
      finalOutcome: "merge",
      originalAnchor: { x: startX, y: startY },
      snappedAnchor: { x: snapped.x, y: snapped.y },
      pathValid: pathReachedTarget,
      draggedFinalCells,
      overlappedBlockIds: [targetId],
      overlappedBlockTiers: [target.tier],
      mergeCandidateChosen: true,
      upgradedFootprintValid: true,
      mergeDebug: {
        draggedBlockId: moved.id,
        draggedBlockTier: moved.tier,
        draggedAnchor: { x: snapped.x, y: snapped.y },
        targetBlockId: target.id,
        targetBlockTier: target.tier,
        targetAnchor: { x: target.x, y: target.y },
        mergeAnchor,
        sourceCellsRemovedBeforeFitCheck,
        upgradedTier: nextTier,
        upgradedFootprintCells: upgradedCells,
        fitCheckResult: true,
        finalOutcome: "merge"
      },
      snappedX: snapped.x,
      snappedY: snapped.y,
      overlappedBlockId: targetId,
      overlappedBlockTier: target.tier,
      overlappedCellCount: overlapCellCount,
      mergedBlockId: merged.id,
      mergedTier: merged.tier
    };
  }

  tryMergeOnOverlapDrop(movedId, targetId, fromX, fromY, desiredX, desiredY) {
    const moved = this.getBlockById(movedId);
    if (!moved) {
      return { merged: false, reason: "missing_moved" };
    }

    const clamped = this.clampAnchorForBlock(moved, desiredX, desiredY);
    const partner = this.getBlockById(targetId);
    if (!partner || partner.tier !== moved.tier) {
      return { merged: false, reason: "different_tier_overlap" };
    }

    const path = this.traceSlidePath(moved.id, fromX, fromY, clamped.x, clamped.y, {
      allowFinalOverlapId: partner.id
    });
    if (!path.reached) {
      return { merged: false, reason: "path_blocked_before_target" };
    }

    const nextTier = moved.tier + 1;
    const nextDef = this.tierDefs[nextTier];
    if (!nextDef) {
      return { merged: false, reason: "missing_next_tier" };
    }

    const nextWidth = nextDef.width;
    const nextHeight = nextDef.height;
    const excluded = new Set([moved.id, partner.id]);
    const occupancy = this.buildOccupancyGrid(excluded);
    const fitsAtTargetPosition = this.canPlaceOnGrid(occupancy, partner.x, partner.y, nextWidth, nextHeight);

    if (!fitsAtTargetPosition) {
      return { merged: false, reason: "upgraded_does_not_fit" };
    }

    this.blocks = this.blocks.filter((block) => block.id !== moved.id && block.id !== partner.id);
    const merged = this.createBlock(`merged_${this.nextId++}`, nextTier, partner.x, partner.y);
    this.blocks.push(merged);
    this.occupancyGrid = this.buildOccupancyGrid();
    return { merged: true, reason: "merged", mergedBlockId: merged.id, mergedTier: merged.tier };
  }

  removeBlockById(blockId) {
    this.blocks = this.blocks.filter((block) => block.id !== blockId);
    this.occupancyGrid = this.buildOccupancyGrid();
  }

  getTierCounts() {
    const counts = {};
    for (const block of this.blocks) {
      counts[block.tier] = (counts[block.tier] || 0) + 1;
    }
    return counts;
  }

  isWin() {
    return this.blocks.length === 1 && this.blocks[0].tier === 13;
  }
}

class BoardRenderer {
  constructor(boardElement, cellSize) {
    this.boardElement = boardElement;
    this.cellSize = cellSize;
    this.nodeMap = new Map();
  }

  clear() {
    for (const node of this.nodeMap.values()) {
      node.remove();
    }
    this.nodeMap.clear();
  }

  render(blocks) {
    const nextIds = new Set(blocks.map((block) => block.id));

    for (const [id, node] of this.nodeMap.entries()) {
      if (!nextIds.has(id)) {
        node.remove();
        this.nodeMap.delete(id);
      }
    }

    for (const block of blocks) {
      let node = this.nodeMap.get(block.id);
      if (!node) {
        node = document.createElement("div");
        node.className = "block";
        node.dataset.id = block.id;
        this.boardElement.appendChild(node);
        this.nodeMap.set(block.id, node);
      }

      node.style.backgroundColor = block.color;
      node.style.left = `${block.x * this.cellSize}px`;
      node.style.top = `${block.y * this.cellSize}px`;
      node.style.width = `${block.width * this.cellSize}px`;
      node.style.height = `${block.height * this.cellSize}px`;
      node.textContent = String(block.tier);
    }
  }

  getNode(blockId) {
    return this.nodeMap.get(blockId) || null;
  }
}

const boardElement = document.getElementById("board");
const level1Button = document.getElementById("level1Button");
const level2Button = document.getElementById("level2Button");
const restartButton = document.getElementById("restartButton");
const currentLevelText = document.getElementById("currentLevelText");
const statusText = document.getElementById("statusText");
const blockCountText = document.getElementById("blockCountText");
const tierCountText = document.getElementById("tierCountText");
const goalsText = document.getElementById("goalsText");

boardElement.style.setProperty("--cols", GRID_COLS);
boardElement.style.setProperty("--rows", GRID_ROWS);
boardElement.style.setProperty("--cell-size", `${CELL_SIZE}px`);

const logic = new BoardLogic(GRID_COLS, GRID_ROWS, TIER_DEFS);
const renderer = new BoardRenderer(boardElement, CELL_SIZE);

let activeDrag = null;
let currentLevelId = 1;
let currentGoals = [];

renderDebugGrid();
level1Button.addEventListener("click", () => switchLevel(1));
level2Button.addEventListener("click", () => switchLevel(2));
restartButton.addEventListener("click", resetLevel);
resetLevel();

function switchLevel(levelId) {
  if (!LEVELS[levelId]) {
    return;
  }
  currentLevelId = levelId;
  resetLevel();
}

function renderDebugGrid() {
  const overlay = document.createElement("div");
  overlay.className = "grid-overlay";

  for (let y = 0; y < GRID_ROWS; y += 1) {
    for (let x = 0; x < GRID_COLS; x += 1) {
      const cell = document.createElement("div");
      cell.className = "grid-cell";
      cell.textContent = `(${x},${y})`;
      overlay.appendChild(cell);
    }
  }

  boardElement.appendChild(overlay);
}

function resetLevel() {
  activeDrag = null;
  try {
    const levelDef = LEVELS[currentLevelId];
    const levelData = { blocks: levelDef.blocks.map((block) => ({ ...block })) };
    logic.loadFromLevelData(levelData);
    currentGoals = (levelDef.goals || []).map((goal) => ({ tier: goal.tier, count: goal.count }));
    renderer.clear();
    renderer.render(logic.blocks);
    bindPointers();
    updateLevelButtons();
    renderDebugInfo();
  } catch (error) {
    renderer.clear();
    updateLevelButtons();
    currentGoals = [];
    statusText.textContent = `Status: Level load failed (${error.message})`;
    blockCountText.textContent = "Blocks: 0";
    tierCountText.textContent = "Tier counts: -";
    currentLevelText.textContent = `Current level: ${currentLevelId}`;
    goalsText.hidden = true;
    console.error(error);
  }
}

function updateLevelButtons() {
  level1Button.classList.toggle("active-level", currentLevelId === 1);
  level2Button.classList.toggle("active-level", currentLevelId === 2);
}

function isGoalLevel() {
  return currentGoals.length > 0;
}

function isGoalsComplete() {
  return currentGoals.every((goal) => goal.count <= 0);
}

function tryCollectGoalFromMergedBlock(mergeResult) {
  if (!mergeResult || !mergeResult.merged || !isGoalLevel()) {
    return;
  }

  const goal = currentGoals.find((item) => item.tier === mergeResult.mergedTier && item.count > 0);
  if (!goal) {
    return;
  }

  goal.count -= 1;
  logic.removeBlockById(mergeResult.mergedBlockId);
  statusText.textContent = `Status: Collected Tier ${mergeResult.mergedTier} goal`;
}

function bindPointers() {
  for (const block of logic.blocks) {
    const node = renderer.getNode(block.id);
    if (!node) {
      continue;
    }
    node.onpointerdown = (event) => onPointerDown(event, block.id);
  }
}

function onPointerDown(event, blockId) {
  if (activeDrag) {
    return;
  }

  const block = logic.getBlockById(blockId);
  const node = renderer.getNode(blockId);
  if (!block || !node) {
    return;
  }

  const boardRect = boardElement.getBoundingClientRect();
  activeDrag = {
    blockId,
    pointerId: event.pointerId,
    startX: block.x,
    startY: block.y,
    currentX: block.x,
    currentY: block.y,
    lastDesiredX: block.x,
    lastDesiredY: block.y,
    offsetX: event.clientX - (boardRect.left + block.x * CELL_SIZE),
    offsetY: event.clientY - (boardRect.top + block.y * CELL_SIZE)
  };

  node.classList.add("dragging");
  node.setPointerCapture(event.pointerId);
  node.addEventListener("pointermove", onPointerMove);
  node.addEventListener("pointerup", onPointerUp);
  node.addEventListener("pointercancel", onPointerCancel);
}

function onPointerMove(event) {
  if (!activeDrag) {
    return;
  }

  const block = logic.getBlockById(activeDrag.blockId);
  const node = renderer.getNode(activeDrag.blockId);
  if (!block || !node) {
    return;
  }

  const desired = getSnappedAnchorFromPointer(event, block, activeDrag);
  activeDrag.lastDesiredX = desired.x;
  activeDrag.lastDesiredY = desired.y;

  const traced = logic.traceSlidePath(block.id, activeDrag.currentX, activeDrag.currentY, desired.x, desired.y);
  activeDrag.currentX = traced.x;
  activeDrag.currentY = traced.y;

  node.style.left = `${activeDrag.currentX * CELL_SIZE}px`;
  node.style.top = `${activeDrag.currentY * CELL_SIZE}px`;
  node.classList.toggle("blocked", traced.blocked || traced.x !== desired.x || traced.y !== desired.y);
}

function onPointerUp(event) {
  if (!activeDrag) {
    return;
  }

  const block = logic.getBlockById(activeDrag.blockId);
  if (!block) {
    cleanupDrag();
    return;
  }

  const desired = getSnappedAnchorFromPointer(event, block, activeDrag);
  const resolution = logic.resolveDropDeterministic(
    block.id,
    activeDrag.startX,
    activeDrag.startY,
    desired.x,
    desired.y
  );

  if (resolution.result === "merge_success") {
    tryCollectGoalFromMergedBlock({
      merged: true,
      mergedBlockId: resolution.mergedBlockId,
      mergedTier: resolution.mergedTier
    });
  }

  console.log(
    `[DROP] dragged_id=${block.id} dragged_tier=${block.tier} snapped=(${resolution.snappedX},${resolution.snappedY}) overlapped_id=${resolution.overlappedBlockId ?? "none"} overlapped_tier=${resolution.overlappedBlockTier ?? "none"} overlapped_cells=${resolution.overlappedCellCount ?? 0} result=${resolution.result}`
  );
  console.log("[DROP_DEBUG]", {
    draggedBlockId: block.id,
    draggedBlockTier: block.tier,
    originalAnchor: resolution.originalAnchor,
    snappedAnchor: resolution.snappedAnchor,
    pathValid: resolution.pathValid,
    draggedFinalOccupiedCells: resolution.draggedFinalCells,
    overlappedBlockIds: resolution.overlappedBlockIds,
    overlappedBlockTiers: resolution.overlappedBlockTiers,
    mergeCandidateChosen: resolution.mergeCandidateChosen,
    upgradedFootprintValid: resolution.upgradedFootprintValid,
    finalOutcome: resolution.finalOutcome
  });
  if (resolution.mergeDebug) {
    console.log("[MERGE_ATTEMPT]", resolution.mergeDebug);
  }

  cleanupDrag(event.pointerId);
  renderer.render(logic.blocks);
  bindPointers();
  renderDebugInfo();
}

function onPointerCancel(event) {
  if (!activeDrag) {
    return;
  }

  const block = logic.getBlockById(activeDrag.blockId);
  if (block) {
    logic.moveBlock(block.id, activeDrag.currentX, activeDrag.currentY);
  }

  cleanupDrag(event.pointerId);
  renderer.render(logic.blocks);
  bindPointers();
  renderDebugInfo();
}

function cleanupDrag(pointerId) {
  if (!activeDrag) {
    return;
  }

  const node = renderer.getNode(activeDrag.blockId);
  if (node) {
    node.classList.remove("dragging");
    node.classList.remove("blocked");
    node.removeEventListener("pointermove", onPointerMove);
    node.removeEventListener("pointerup", onPointerUp);
    node.removeEventListener("pointercancel", onPointerCancel);

    const releasePointerId = pointerId ?? activeDrag.pointerId;
    if (node.hasPointerCapture(releasePointerId)) {
      node.releasePointerCapture(releasePointerId);
    }
  }

  activeDrag = null;
}

function getSnappedAnchorFromPointer(event, block, dragState) {
  const boardRect = boardElement.getBoundingClientRect();
  const rawLeft = event.clientX - boardRect.left - dragState.offsetX;
  const rawTop = event.clientY - boardRect.top - dragState.offsetY;
  const snappedX = clamp(Math.round(rawLeft / CELL_SIZE), 0, GRID_COLS - block.width);
  const snappedY = clamp(Math.round(rawTop / CELL_SIZE), 0, GRID_ROWS - block.height);
  return { x: snappedX, y: snappedY };
}function renderDebugInfo() {
  const tierCounts = logic.getTierCounts();
  const tierLabels = Object.keys(TIER_DEFS)
    .map((tier) => `${tier}:${tierCounts[tier] || 0}`)
    .join(" | ");

  currentLevelText.textContent = `Current level: ${currentLevelId}`;
  blockCountText.textContent = `Blocks: ${logic.blocks.length}`;
  tierCountText.textContent = `Tier counts: ${tierLabels}`;

  if (isGoalLevel()) {
    goalsText.hidden = false;
    const goalsLabel = currentGoals.map((goal) => `T${goal.tier} x${Math.max(goal.count, 0)}`).join(" | ");
    goalsText.textContent = `Goals: ${goalsLabel}`;
    if (isGoalsComplete()) {
      statusText.textContent = "Status: WIN (all goals collected)";
    } else if (!statusText.textContent.startsWith("Status: Collected")) {
      statusText.textContent = "Status: In progress";
    }
  } else {
    goalsText.hidden = true;
    statusText.textContent = logic.isWin() ? "Status: WIN (single Tier 13 block)" : "Status: In progress";
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

