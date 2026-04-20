import { GaussianRandom } from "./gaussianRandom";
import TimeNodeSprite from "./timenodesprite";
import { TimeNode } from "./timeline";

export interface LayoutOption {
  sprite: TimeNodeSprite;
  x: number;
  y: number;
  size: number;
  display: boolean;
  [key: string]: any; // 允许动态添加属性
}

function calculateGridSize(canvasWidth: number, rows: number): number {
  return Math.floor(canvasWidth / rows);
}

function calculateDateIndex(date: Date, startDate: Date): number {
  return Math.floor(
    (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
  );
}

function calculatePositions(
  sprites: TimeNodeSprite[],
  canvasSize: { width: number; height: number },
  data: TimeNode[],
  isHorizontal: boolean
): LayoutOption[] {
  const positions: LayoutOption[] = [];
  const rows = Math.max(
    Math.floor(
      (data[data.length - 1].date.getTime() - data[0].date.getTime()) /
        (1000 * 60 * 60 * 24 * 7)
    ) + 1,
    12
  );

  const gridSize = calculateGridSize(canvasSize.width, rows);
  const usedDateIndexCounter: { [key: number]: number } = {};

  sprites.forEach((sprite) => {
    const dateIndex = calculateDateIndex(sprite.timeNode.date, data[0].date);
    if (!usedDateIndexCounter[dateIndex]) {
      usedDateIndexCounter[dateIndex] = 0;
    }
    let x: number, y: number;
    if (isHorizontal) {
      x = 20 + usedDateIndexCounter[dateIndex] * (gridSize + 16) + gridSize / 2;
      y = 20 + dateIndex * (gridSize + 16) + gridSize / 2;
    } else {
      x = 20 + dateIndex * (gridSize + 16) + gridSize / 2;
      y =
        canvasSize.height / 2 -
        100 +
        usedDateIndexCounter[dateIndex] * (gridSize + 16) +
        gridSize / 2;
    }

    positions.push({ sprite, x, y, size: sprite.startSize, display: true });
    usedDateIndexCounter[dateIndex]++;
  });

  return positions;
}
export function calculateSandLayout(
  sprites: TimeNodeSprite[],
  canvasSize: { width: number; height: number }
): LayoutOption[] {
  const gaussRNG = new GaussianRandom();
  const random = () => gaussRNG.random0to1();

  return sprites.map((sprite) => ({
    sprite,
    x: random() * canvasSize.width,
    y: random() * canvasSize.height,
    size: sprite.startSize,
    display: true,
  }));
}
export function calculateLineVLayout(
  sprites: TimeNodeSprite[],
  canvasSize: { width: number; height: number },
  data: TimeNode[]
): LayoutOption[] {
  return calculatePositions(sprites, canvasSize, data, false);
}

export function calculateLineHLayout(
  sprites: TimeNodeSprite[],
  canvasSize: { width: number; height: number },
  data: TimeNode[]
): LayoutOption[] {
  return calculatePositions(sprites, canvasSize, data, true);
}
export function calculateCircleLayout(
  sprites: TimeNodeSprite[],
  canvasSize: { width: number; height: number }
): LayoutOption[] {
  const options: LayoutOption[] = [];
  const maxArc = 1000;
  const start = 10000; // 起始位置，与螺旋方向上的间距有关
  const end = sprites.length + start;
  const disabled = 900;
  const visiblelimit = end - disabled;
  const maxSize = 32;
  const vpx = canvasSize.width / 2 + 300;
  const vpy = canvasSize.height / 2 - 100;
  const minScale = 0.5;
  const maxScale = 1;
  const circleRadius = Math.min(canvasSize.width, canvasSize.height) / 2 - 40;

  for (let i = start; i < end; i++) {
    let x = canvasSize.width / 2 + Math.cos((i / end) * maxArc) * circleRadius;
    let y = canvasSize.height / 2 + Math.sin((i / end) * maxArc) * circleRadius;
    const z = (i - start) / (visiblelimit - start);
    const scale = minScale + (maxScale - minScale) * z;
    const projectedX = vpx + (x - vpx) * scale;
    const projectedY = vpy + (y - vpy) * scale;
    const visible = i < visiblelimit;
    const size = Math.max(z * maxSize, 4);

    options.push({
      sprite: sprites[i - start],
      x: projectedX,
      y: projectedY,
      size: size,
      display: visible,
    });
  }

  return options;
}
export function calculateFadeawayLayout(
  sprites: TimeNodeSprite[],
  canvasSize: { width: number; height: number }
): LayoutOption[] {
  const positions: LayoutOption[] = [];
  const gaussRNG = new GaussianRandom();
  const random = () => gaussRNG.random0to1();

  for (let i = 0; i < sprites.length; i++) {
    const sprite = sprites[i];
    const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let x = 0,
      y = 0;
    switch (edge) {
      case 0:
        x = random() * canvasSize.width;
        y = -sprite.height * 3;
        break;
      case 1:
        x = canvasSize.width + sprite.width * 3;
        y = random() * canvasSize.height;
        break;
      case 2:
        x = random() * canvasSize.width;
        y = canvasSize.height + sprite.height * 3;
        break;
      case 3:
        x = -sprite.width * 3;
        y = random() * canvasSize.height;
        break;
    }
    positions.push({ sprite, x, y, size: sprite.startSize, display: true });
  }

  return positions;
}

export function calculateFadeawayCornerLayout(
  sprites: TimeNodeSprite[],
  canvasSize: { width: number; height: number }
): LayoutOption[] {
  const positions: LayoutOption[] = [];
  const corners = [
    { x: 0, y: 0 }, // 左上
    { x: canvasSize.width, y: 0 }, // 右上
    { x: canvasSize.width, y: canvasSize.height }, // 右下
    { x: 0, y: canvasSize.height }, // 左下
  ];

  const cornerCounts = [0, 0, 0, 0]; // 初始化每个角落的统计计数器

  for (let i = 0; i < sprites.length; i++) {
    const sprite = sprites[i];
    const distances = corners.map((corner) =>
      Math.sqrt(
        Math.pow(sprite.x - corner.x, 2) + Math.pow(sprite.y - corner.y, 2)
      )
    );

    const totalDistance = distances.reduce(
      (acc, distance) => acc + distance,
      0
    );
    const averageProbability = 1 / corners.length;
    const influenceFactor = 0.2;

    const probabilities = distances.map(
      (distance) =>
        (1 - influenceFactor) * averageProbability +
        influenceFactor * (distance / totalDistance)
    );

    console.log("Distances:", distances);
    console.log("Total Distance:", totalDistance);
    console.log("Probabilities:", probabilities);

    let sum = 0;
    const rand = Math.random();
    let chosenIndex = 0;
    for (let j = 0; j < probabilities.length; j++) {
      sum += probabilities[j];
      if (rand < sum) {
        chosenIndex = j;
        break;
      }
    }

    // 更新选中角落的计数
    cornerCounts[chosenIndex]++;

    console.log("Chosen Index:", chosenIndex, "Random Value:", rand);

    const range = 50;
    const targetCorner = corners[chosenIndex];
    let movex = 0;
    let movey = 0;
    switch (chosenIndex) {
      case 0: // 左上
        movex = -Math.random() * range - sprite.baseSize * 4;
        movey = -Math.random() * range - sprite.baseSize * 4;
        break;
      case 1: // 右上
        movex = Math.random() * range + sprite.baseSize * 4;
        movey = -Math.random() * range - sprite.baseSize * 4;
        break;
      case 2: // 右下
        movex = Math.random() * range + sprite.baseSize * 4;
        movey = Math.random() * range + sprite.baseSize * 4;
        break;
      case 3: // 左下
        movex = -Math.random() * range - sprite.baseSize * 4;
        movey = Math.random() * range + sprite.baseSize * 4;
        console.log("Moving towards bottom-left corner", { movex, movey });
        break;
    }
    const x = targetCorner.x + movex;
    const y = targetCorner.y + movey;

    positions.push({
      sprite,
      x: x,
      y: y,
      size: sprite.startSize,
      display: true,
    });
  }

  // 打印每个角落的统计结果
  console.log("Corner Counts:", {
    topLeft: cornerCounts[0],
    topRight: cornerCounts[1],
    bottomRight: cornerCounts[2],
    bottomLeft: cornerCounts[3],
  });

  return positions;
}
