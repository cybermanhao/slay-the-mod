import { TimeLineNodeType, TimeNode } from "./timeline"; // 假设 TimeNode 定义在 TimeLine 文件中

function getRandomDate(start: Date, end: Date): Date {
  const date = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
  return date;
}

const mockNodeTypes: TimeLineNodeType[] = [
  "资金",
  "工程",
  "备注",
  "调整",
  "其它",
];

export function mockTimeLineData(numNodes: number): TimeNode[] {
  const startDate = new Date(2020, 0, 1); // 开始日期
  const endDate = new Date(2025, 0, 1); // 结束日期

  const data: TimeNode[] = [];
  for (let i = 0; i < numNodes; i++) {
    const nodeType =
      mockNodeTypes[Math.floor(Math.random() * mockNodeTypes.length)];
    const date = getRandomDate(startDate, endDate);

    const node: TimeNode = {
      id: `node-${i}`,
      title: `节点 ${i}`,
      type: nodeType,
      content: `这是节点 ${i} 的内容`,
      date: date,
      img: `https://example.com/img${i}.png`,
      additionalData: {
        info: `额外信息 ${i}`,
      },
    };

    data.push(node);
  }

  // 按日期排序
  data.sort((a, b) => a.date.getTime() - b.date.getTime());

  return data;
}

// 示例调用生成mock数据
const mockData = mockTimeLineData(1000);
console.log(mockData);

export default mockData;
