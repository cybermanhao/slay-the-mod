# React+PixiJS 性能与状态管理最佳实践

## 1. PixiJS 实例生命周期管理
- 只在组件挂载时初始化 PixiJS 实例（用 useRef 保存），卸载时销毁。
- 不要在 render/JSX 或每次 props 变化时重建 PixiJS。

## 2. 数据与动画的驱动方式
- 组件 props/state 只用于外部参数（如数据、布局、配置等），不要用来驱动 PixiJS 内部渲染细节。
- 数据变化时，通过命令式 API（如 updateNodes、setLayout、playAnimation）通知 PixiJS 层更新，而不是 setState 触发 React 重渲染。

## 3. useEffect/useLayoutEffect 使用
- 初始化 PixiJS 实例的 effect 依赖数组应为空（[]），只执行一次。
- 监听数据/布局等必要 props 变化时，调用 PixiJS 的 update 方法，不重建实例。
- 不要让 effect 依赖无关 props 或函数，避免无意义的刷新。

## 4. 事件与回调
- 交互事件（如点击、hover）通过 PixiJS 层回调传递到 React，React 只处理 UI 层逻辑。
- 用 useCallback 包裹回调，避免每次渲染都生成新函数。

## 5. 父组件优化
- 父组件用 React.memo 包裹，避免无关 re-render 传递到 canvas 组件。
- 只在真正需要时才传递新 props。

## 6. 状态管理
- 不引入全局状态管理库。
- PixiJS 内部状态（节点位置、动画状态等）全部由 PixiJS/GSAP 自己管理。
- React 只管理 UI 控件、参数输入等轻量状态。

## 7. 典型代码结构
```tsx
const TimelineCanvas = React.memo(function TimelineCanvas({ data, layout }) {
  const pixiRef = useRef<PIXI.Application | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pixiRef.current && containerRef.current) {
      pixiRef.current = new PIXI.Application({ ... });
      containerRef.current.appendChild(pixiRef.current.view);
      // 初始化 PixiJS 场景
    }
    return () => {
      pixiRef.current?.destroy(true, { children: true });
    };
  }, []);

  useEffect(() => {
    if (pixiRef.current) {
      // 只命令式更新，不重建
      updatePixiScene(pixiRef.current, data, layout);
    }
  }, [data, layout]);

  return <div ref={containerRef} />;
});
```

## 8. 其它建议
- 组件间通信、动画流程全部用回调/命令式 API，不用 React state 驱动。
- 只在必要时 setState，避免影响 PixiJS 性能。
- 充分利用 useRef、useCallback、memo 等 React 性能优化手段。

---

本规范适用于高性能 PixiJS/canvas 场景下的 React 工程，最大限度发挥底层渲染性能，避免 React 渲染周期干扰。
