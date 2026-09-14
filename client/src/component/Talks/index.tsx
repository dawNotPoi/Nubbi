// src/components/DynamicManager.js
import { Button, Input, List, Modal, Typography } from "antd";
import { useState } from "react";

const { Title } = Typography;

const TalksManage = () => {
  const [dynamics, setDynamics] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentDynamic, setCurrentDynamic] = useState(null);
  const [inputValue, setInputValue] = useState("");

  const showModal = (dynamic) => {
    setCurrentDynamic(dynamic);
    setInputValue(dynamic ? dynamic.text : "");
    setIsModalVisible(true);
  };

  const handleOk = () => {
    if (currentDynamic) {
      // 编辑动态
      setDynamics(
        dynamics.map((d) =>
          d.id === currentDynamic.id ? { ...d, text: inputValue } : d
        )
      );
    } else {
      // 发布新动态
      setDynamics([...dynamics, { id: Date.now(), text: inputValue }]);
    }
    setInputValue("");
    setIsModalVisible(false);
    setCurrentDynamic(null);
  };

  const handleCancel = () => {
    setInputValue("");
    setIsModalVisible(false);
    setCurrentDynamic(null);
  };

  const deleteDynamic = (id) => {
    setDynamics(dynamics.filter((dynamic) => dynamic.id !== id));
  };

  return (
    <div>
      <Title level={2} style={{ textAlign: "center" }}>
        动态管理
      </Title>
      <Button
        type="primary"
        onClick={() => showModal(null)}
        style={{ marginBottom: "20px" }}
      >
        发布动态
      </Button>
      <List
        bordered
        dataSource={dynamics}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Button type="link" onClick={() => showModal(item)}>
                编辑
              </Button>,
              <Button type="link" onClick={() => deleteDynamic(item.id)}>
                删除
              </Button>,
            ]}
          >
            {item.text}
          </List.Item>
        )}
      />
      <Modal
        title={currentDynamic ? "编辑动态" : "发布动态"}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="请输入动态内容"
        />
      </Modal>
    </div>
  );
};

export default TalksManage;
