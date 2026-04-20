import React, { useRef, useEffect, useState } from "react";
import * as PIXI from "pixi.js";

import TimeNodeSprite, {
  TimeNodeSpriteManager,
  ManagerState,
  Layouts,
  Layout,
} from "./timenodesprite";
export interface TimeLineConfig<T> {
  width: number;
  height: number;
  data: T[];
  isStable?: boolean;
  duration?: number;
  fps?: number;
}

export type TimeLineNodeType = string;

export interface TimeNode {
  id: string; // 每个节点的唯一标识符
  title: string; // 节点标题
  type: TimeLineNodeType; // 节点类型
  content: string; // 节点内容
  date: Date; // 节点日期
  img?: string; // 节点图片
  children?: TimeNode[]; // 子节点
  additionalData?: { [key: string]: any }; // 额外的数据
}

const TimeLine: React.FC<TimeLineConfig<any>> = (props) => {
  const {
    width,
    height,
    data,
    isStable = false,
    duration = 1000,
    fps = 60,
  } = props;
  const [selectedNode, setSelectedNode] = useState<TimeNodeSprite | null>(null);
  const [canvasPosition, setCanvasPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const nodeTypes = Array.from(new Set(data.map((node) => node.type)));
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const [layout, setLayout] = useState<Layout | undefined>(undefined);
  const managerRef = useRef<TimeNodeSpriteManager | null>(null);
  const [activated, setActivated] = useState<boolean>(false);

  useEffect(() => {
    if (canvasRef.current) {
      const canvasElement = canvasRef.current;
      const canvasRect = canvasElement.getBoundingClientRect();
      setCanvasPosition({ top: canvasRect.top, left: canvasRect.left });

      const app = new PIXI.Application({
        width,
        height,
        backgroundColor: 0xeeeeee,
      });
      appRef.current = app;

      const spriteManager = new TimeNodeSpriteManager(
        appRef,
        data,
        (node: TimeNodeSprite) => {
          setSelectedNode(node);
        }
      );
      managerRef.current = spriteManager;

      canvasRef.current.appendChild(app.view as HTMLCanvasElement);

      return () => {
        app.destroy(true, { children: true }); // 确保正确销毁
      };
    }
  }, [canvasRef, width, height, data, isStable, duration, fps]);

  useEffect(() => {
    setTimeout(() => {
      setActivated(true);
      console.log("activated", activated);
    }, 2000);
  }, []);

  useEffect(() => {
    console.log("layout", layout);
    console.log(activated);
    if (
      activated &&
      managerRef.current &&
      managerRef.current.state === ManagerState.stable &&
      layout !== undefined
    ) {
      managerRef.current.changeLayout(layout);
    }
  }, [layout]);

  const handleLayoutChange = (newLayout: Layout) => {
    setLayout(newLayout);
  };

  return (
    <>
      <div>
        {Layouts.map((layout) => (
          <button
            key={layout.name}
            onClick={() => handleLayoutChange(layout.name)}
            disabled={
              !activated && managerRef.current?.state === ManagerState.stable
            }
          >
            {layout.label}
          </button>
        ))}
      </div>
      <div ref={canvasRef} />
      {selectedNode &&
        selectedNode.position &&
        managerRef.current?.state === ManagerState.stable && (
          <div
            style={{
              position: "absolute",
              top: selectedNode.position.y - 52 + canvasPosition.top,
              left: selectedNode.position.x + 52 + canvasPosition.left,
              padding: 10,
              background: "gray",
            }}
          >
            <h3>{selectedNode.timeNode.title}</h3>
            <p>{selectedNode.timeNode.content}</p>
            <p>{selectedNode.timeNode.date.toLocaleString()}</p>
          </div>
        )}
    </>
  );
};

export default TimeLine;
