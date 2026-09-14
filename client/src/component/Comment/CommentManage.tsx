import { Button, List, message, Modal } from "antd";
import { PropsWithChildren, useCallback, useEffect, useState } from "react";
import { deleteComment, getAllComment } from "../../api/Comment";
import { BaseComment } from "../../type/Comment";

const CommentManage = ({ children }: PropsWithChildren) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<BaseComment[]>();
  const getCommentMutate = useCallback(async () => {
    const res = await getAllComment();
    if (res.code == 1) {
      setData(res.data);
    } else {
      messageApi.error(res.message);
    }
  }, [open]);

  useEffect(() => {
    getCommentMutate();
  }, [open]);
  const deleteCommentMutate = useCallback(
    async (id: string) => {
      const res = await deleteComment(id);
      if (res.code == 1) {
        setData((v) => {
          return v?.filter((item) => item._id != id);
        });
        messageApi.success("操作成功");
      } else {
        messageApi.error(res.message);
      }
    },
    [open]
  );
  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        onCancel={() => {
          setOpen(false);
        }}
        footer={null}
        title="评论管理"
      >
        <List
          style={{ maxHeight: "400px", overflow: "auto" }}
          dataSource={data}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button onClick={() => deleteCommentMutate(item._id)}>
                  删除
                </Button>,
              ]}
            >
              {/* <Skeleton avatar title={false} loading={item.loading} active /> */}
              <List.Item.Meta
                title={item.name}
                description={
                  <div>
                    <p>{item.content}</p>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
      <div className="inline-block" onClick={() => setOpen(true)}>
        {children}
      </div>
    </>
  );
};

export default CommentManage;
