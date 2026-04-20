import * as PIXI from "pixi.js";
import { TimeNode, TimeLineNodeType } from "./timeline";
import { gsap } from "gsap";
import { GaussianRandom } from "./gaussianRandom";
import {
  calculateLineVLayout,
  calculateLineHLayout,
  calculateFadeawayCornerLayout,
  calculateCircleLayout,
  LayoutOption,
  calculateFadeawayLayout,
  calculateSandLayout,
} from "./layout";

type AnimateConfig = SizeAnimateConfig | MoveAnimateConfig;

interface SizeAnimateConfig {
  type: "size";
  value: number;
}

interface MoveAnimateConfig {
  type: "move";
  value: { x: number; y: number };
}

const colors = [
  "#FF5733",
  "#33FF57",
  "#3357FF",
  "#FF33A1",
  "#F3FF33",
  "#33FFF3",
  "#FF33F3",
  "#F333FF",
];

export const Layouts = [
  { name: "lineV", label: "水平布局" },
  { name: "lineH", label: "垂直布局" },
  { name: "circle", label: "螺旋布局" },
  { name: "fadeaway", label: "离散" },
  { name: "fadeaway-c", label: "离散-角落" },
  { name: "sand", label: "沙盘布局" },
] as const;

export type Layout = (typeof Layouts)[number]["name"];

export default class TimeNodeSprite extends PIXI.Sprite {
  public timeNode: TimeNode;
  private radius: number;
  public baseSize: number;

  public targetPosition: { x: number; y: number };
  public manager: TimeNodeSpriteManager | undefined;

  public readonly startSize: number;
  public readonly startZIndex: number;
  public constructor(
    textrue: PIXI.Texture,
    timeNode: TimeNode,
    size: number,
    startZIndex: number
  ) {
    super(textrue);
    this.timeNode = timeNode;
    this.startSize = size;
    this.baseSize = size;
    this.startZIndex = startZIndex;
    this.zIndex = startZIndex;
    this.radius = size / 2;

    this.interactive = true;
    this.anchor.set(0.5);
    this.scale = { x: 1, y: 1 };

    this.x = 0;
    this.y = 0;
    this.width = size;
    this.height = size;
    this.visible = true;
    this.targetPosition = {
      x: 0,
      y: 0,
    };
    this.on("mouseover", this.onMouseOver);
    this.on("mouseout", this.onMouseOut);
    this.on("click", this.onClick);
  }

  public animate(config: AnimateConfig) {
    //确保sprite已经具有x和y属性
    if (config.type === "size") {
      gsap.to(this, {
        width: config.value as number,
        height: config.value as number,
        duration: 0.5,
        ease: "elastic.out(1, 0.3)",
        onUpdate: () => {
          if (this.parent) {
            this.parent.sortChildren(); //重新排序
          }
        },
      });
    } else if (config.type === "move") {
      gsap.to(this, {
        x: config.value.x,
        y: config.value.y,
        duration: 0.5,
        onUpdate: () => {
          if (this.parent) {
            this.parent.sortChildren();
          }
        },
      });
    }
  }

  private onMouseOver = () => {
    this.zIndex = 9999;
    // console.log(this.timeNode.id, this.zIndex);
    this.parent.sortChildren();
    const timeout = setTimeout(() => {
      this.animate({
        type: "size",
        value: this.startSize * 6,
      });
    }, 100);
  };

  private onMouseOut = () => {
    this.zIndex = this.startZIndex;
    // console.log(this.timeNode.id, this.zIndex, this.baseSize);

    this.parent.sortChildren();
    const timeout = setTimeout(() => {
      this.animate({
        type: "size",
        value: this.baseSize,
      });
    }, 100);
  };

  private onClick = () => {
    if (this.manager && this.manager.state === ManagerState.stable) {
      this.manager.selectedNode = this.timeNode;
      this.manager.isInfoVisible = !this.manager.isInfoVisible;
      this.manager.selectNodeCallback?.(this);
    }
  };

  public changeColor(color: string) {
    if (this.manager) {
      const texture = this.manager.createNodeTexture(color);
      if (texture) {
        this.texture = texture;
      }
    }
  }
}

export enum ManagerState {
  loading = "载入",
  moving = "运动",
  stable = "稳态",
}
type LayoutPositions = { [key in Layout]?: LayoutOption[] };
export class TimeNodeSpriteManager {
  public sprites: TimeNodeSprite[] = [];
  public layout: Layout = "lineV";
  public nodeArray: TimeNode[];
  public data: TimeNode[];
  private canvasSize: { width: number; height: number };
  private appRef: React.RefObject<PIXI.Application>;
  private nodeTypes: string[];
  public state: ManagerState = ManagerState.loading;
  public selectedNode: TimeNode | undefined;
  public isInfoVisible: boolean = false;
  public selectNodeCallback?: (node: TimeNodeSprite) => void;

  public constructor(
    appRef: React.RefObject<PIXI.Application>,
    nodeArray: TimeNode[],
    selectNodeCallback?: (node: TimeNodeSprite) => void
  ) {
    this.appRef = appRef;
    this.canvasSize = {
      width: appRef.current?.screen.width ?? 0,
      height: appRef.current?.screen.height ?? 0,
    };
    this.nodeArray = nodeArray;
    this.nodeTypes = Array.from(new Set(nodeArray.map((node) => node.type)));
    this.initializeSprites();
    this.calculateAllLayouts();
    this.data = this.getData(); //此处data被按时间升序sort

    this.selectNodeCallback = selectNodeCallback;
    this.setupListeners();
  }
  private calculateAllLayouts(): void {
    // 检查条件：确保 sprites 和 canvasSize 已经被初始化
    if (
      !this.sprites.length ||
      !this.canvasSize.width ||
      !this.canvasSize.height ||
      !this.data
    ) {
      console.warn(
        "Sprites or canvasSize not initialized properly. Skipping layout calculations."
      );
      return;
    }
    Layouts.forEach((layout) => {
      const positions = this.calculateLayoutPositions(layout.name);
      this.storeLayout(layout.name, positions);
    });
  }
  private getNodeColor(type: TimeLineNodeType): string {
    const index = this.nodeTypes.indexOf(type);
    return colors[index % colors.length];
  }

  public createNodeTexture = (color: string): PIXI.Texture | undefined => {
    if (!this.appRef.current) return undefined;
    const graphics = new PIXI.Graphics();
    graphics.lineStyle(2, PIXI.utils.string2hex("#ffffff"));
    graphics.beginFill(PIXI.utils.string2hex(color));
    graphics.drawCircle(0, 0, 32);
    graphics.endFill();
    return this.appRef.current.renderer.generateTexture(graphics);
  };

  private initializeSprites() {
    const dateGroups = new Map<number, TimeNode[]>();
    this.nodeArray.forEach((node) => {
      const dateKey = node.date.getTime();
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, []);
      }
      dateGroups.get(dateKey)?.push(node);
    });

    const orderedSprites = Array.from(dateGroups).flatMap(
      ([dateKey, nodes], groupIndex) => {
        return nodes
          .map((node, index) => {
            const color = this.getNodeColor(node.type);
            const texture = this.createNodeTexture(color);
            const totalIndex = index + groupIndex * nodes.length;
            if (texture) {
              const sprite = new TimeNodeSprite(texture, node, 8, totalIndex);
              sprite.manager = this;
              sprite.on("pointerdown", () => {
                // 处理选中节点的逻辑
              });

              if (this.appRef.current) {
                this.appRef.current.stage.addChild(
                  sprite as PIXI.DisplayObject
                );
                this.appRef.current.stage.sortableChildren = true;
              }

              return sprite;
            }
            return null;
          })
          .filter((sprite) => sprite !== null); // 过滤掉 null 的精灵
      }
    );

    if (orderedSprites !== null) {
      this.sprites = orderedSprites as TimeNodeSprite[];
    }

    this.state = ManagerState.stable;
  }
  private setupListeners() {
    window.addEventListener("resize", this.onResize.bind(this));
  }

  private onResize() {
    if (!this.appRef.current) return;
    this.canvasSize = {
      width: this.appRef.current.view.width,
      height: this.appRef.current.view.height,
    };
    // 可以在这里触发布局或者其他处理
  }

  private getData(): TimeNode[] {
    return this.sprites
      .map((sprite) => sprite.timeNode)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  public add(sprite: TimeNodeSprite) {
    this.sprites.push(sprite);
  }

  public remove(sprite: TimeNodeSprite) {
    const index = this.sprites.indexOf(sprite);
    if (index !== -1) {
      this.sprites.splice(index, 1);
    }
  }

  private layoutPositions: { [key in Layout]?: LayoutOption[] } = {};

  public changeLayout(layout: Layout) {
    this.layout = layout;
    const positions = this.calculateLayoutPositions(layout);
    this.storeLayout(layout, positions);
    this.animateLayout(layout, positions);
  }

  private calculateLayoutPositions(layout: Layout): LayoutOption[] {
    switch (layout) {
      case "lineV":
        return calculateLineVLayout(this.sprites, this.canvasSize, this.data);
      case "lineH":
        return calculateLineHLayout(this.sprites, this.canvasSize, this.data);
      case "circle":
        return calculateCircleLayout(this.sprites, this.canvasSize);

      case "fadeaway":
        return calculateFadeawayLayout(this.sprites, this.canvasSize);
      case "fadeaway-c":
        return calculateFadeawayCornerLayout(this.sprites, this.canvasSize);
      case "sand":
        return calculateSandLayout(this.sprites, this.canvasSize);
      default:
        return [];
    }
  }

  private storeLayout(layout: Layout, positions: LayoutOption[]) {
    const newLayoutPositions: LayoutPositions = { ...this.layoutPositions };
    this.layoutPositions[layout] = positions;
    newLayoutPositions[layout as Layout] = positions;
    positions.forEach(({ sprite, x, y, size, display }) => {
      sprite.targetPosition.x = x;
      sprite.targetPosition.y = y;
      sprite.baseSize = size;
      sprite.visible = display;
    });
    return newLayoutPositions;
  }
  private calculateAndStoreLayout(layoutName: Layout) {
    const positions = calculateFadeawayLayout(this.sprites, this.canvasSize);
    this.layoutPositions = this.storeLayout(layoutName, positions);
  }

  private animateLayout(layout: Layout, positions: LayoutOption[]) {
    switch (layout) {
      case "lineV":
        this.calculateAndStoreLayout("fadeaway");
        this.animateSprites(this.layoutPositions["fadeaway"] as LayoutOption[]);
        this.animateSprites(
          this.layoutPositions["lineV"] as LayoutOption[],
          1000
        );
        break;
      case "lineH":
        this.calculateAndStoreLayout("fadeaway");
        this.animateSprites(this.layoutPositions["fadeaway"] as LayoutOption[]);
        this.animateSprites(
          this.layoutPositions["lineH"] as LayoutOption[],
          1000
        );
        break;
      case "fadeaway":
        this.animateSprites(positions);
        break;
      case "fadeaway-c":
        this.animateSprites(positions);
        break;
      case "circle":
        this.calculateAndStoreLayout("fadeaway");
        this.animateSprites(this.layoutPositions["fadeaway"] as LayoutOption[]);

        // 传递 1000 毫秒的 delay 值
        this.animateCircleLayout(positions, 500);
        break;
      case "sand":
        this.animateSprites(positions);
        break;
    }
  }

  private async animateSprites(positions: LayoutOption[], delay: number = 0) {
    const initializedSprites = this.sprites.filter((sprite) => sprite.position);
    console.log(positions);
    const initializedPositions = positions.slice(0, initializedSprites.length);

    if (delay > 0) {
      await this.delayPromise(delay);
    }
    const timeline = gsap.timeline();

    timeline.to(initializedSprites, {
      x: (i) => initializedPositions[i].x,
      y: (i) => initializedPositions[i].y,
      width: (i) => initializedPositions[i].size,
      height: (i) => initializedPositions[i].size,

      duration: (i: number) => 2 * Math.pow(i / initializedSprites.length, 2),
      onStart: () => {
        // this.state = ManagerState.moving;
      },
    });
  }
  private async delayPromise(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  private async animateCircleLayout(
    positions: LayoutOption[],
    delay: number = 0
  ) {
    if (delay > 0) {
      await this.delayPromise(delay);
    }

    const initializedSprites = this.sprites.filter((sprite) => sprite.position);
    const initializedPositions = positions.slice(0, initializedSprites.length);
    // 使用 gsap.timeline 实现顺序动画
    const timeline = gsap.timeline();

    // 再进行位置和尺寸的动画
    timeline.to(initializedSprites, {
      x: (i) => initializedPositions[i].x,
      y: (i) => initializedPositions[i].y,
      width: (i) => initializedPositions[i].size,
      height: (i) => initializedPositions[i].size,
      baseSzie: (i: number) => {
        return initializedPositions[i].size;
      },
      duration: (i: number) => 2 * Math.pow(i / initializedSprites.length, 2),
      onUpdate: () => {
        //确保其它动画打断时，其他动画的可见性不影响此布局动画
        initializedSprites.forEach((sprite, index) => {
          const posX = sprite.x;
          const posY = sprite.y;
          const isVisible =
            !(
              posX < 0 ||
              posX > this.canvasSize.width ||
              posY < 0 ||
              posY > this.canvasSize.height
            ) && initializedPositions[index].display;
          sprite.visible = isVisible;
        });
      },
      onStart: () => {
        // this.state = ManagerState.moving;
      },
      onComplete: () => {
        // this.state = ManagerState.stable;
      },
    });
  }
}
