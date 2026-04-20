### 框架/工具使用心得

##

## GSAP

    批量操作在官方文档中很多用法没有介绍

# 批量操作

    当输入第一个参数为T[]时，gsap.to第二个参数中大部分属性，既可以传递具体的值，也可以传递一个函数，函数参数为元素索引，这些函数会在每个元数上单独执行

```typescript
    import gsap from 'gsap';

const elements: HTMLElement[] = document.querySelectorAll('.my-elements');

gsap.to(elements, {
duration: (i: number, target: HTMLElement) => {
// 根据索引和目标元素返回不同的持续时间
return i _ 0.5 + 1;
},
x: (i: number, target: HTMLElement) => {
// 根据索引和目标元素返回不同的 x 坐标
return i _ 100;
},
y: (i: number, target: HTMLElement) => {
// 根据索引和目标元素返回不同的 y 坐标
return i \* 50;
},
});

```

    但下列参数虽然可以传递函数，但是不会在元素上单独执行：
    onupdate,onComplete,onStart...待补充

```typescript
import gsap from "gsap";

const elements: HTMLElement[] = document.querySelectorAll(".my-elements");

gsap.to(elements, {
  duration: 1,
  x: 100,
  onUpdate: () => {
    console.log("Animation is updating");
  },
  onComplete: () => {
    console.log("Animation is complete");
  },
  onStart: () => {
    console.log("Animation has started");
  },
});
```

部分属性的回调也不是单独影响这次 gsap 传递的动画，gsap 通过 gsap.timeline()来控制 gsap 的每个动画，
gsap.timeline()的回调会返回一个 gsap.timeline()对象，如果旧的动画 duration 没有结束，新的 gsapto 会将新旧动画合并，新的属性会覆盖旧的属性。
同时，onComplete 也不会在被打断时执行，而是在所有动画完成后依次执行。
