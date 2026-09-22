import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

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
          <Card key={item.id}>
            <CardTitle>{item.title}</CardTitle>
            <CardContent>{item.content}</CardContent>
          </Card>
        ))}
      </ul>
    </div>
  );
}
