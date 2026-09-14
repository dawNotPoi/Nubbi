import { Button, Card } from "antd";

export default function Talk() {
  const List = [
    {
      id: 1,
      title: "title",
      content: "content",
    },
  ];
  return (
    <div>
      <header>
        <Button>发布动态</Button>
      </header>
      <ul>
        {List.map((item) => (
          <Card title={item.title}>{item.content}</Card>
        ))}
      </ul>
    </div>
  );
}
