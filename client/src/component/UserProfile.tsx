import { useAuth } from "@/hooks/useAuth";
import AccountDeletionModal from "./AccountDeletionModal";
import {
  DeleteOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Dropdown, Menu, Modal } from "antd";
import React, { useState } from "react";

const UserProfile: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      // 可以在这里添加登出后的处理逻辑
      console.log("登出成功");
    }
  };

  const handleRequestAccountDeletion = () => {
    Modal.confirm({
      title: "确认注销账号？",
      content: "注销会删除账号、登录会话以及个人数据。继续后需要邮箱验证码验证。",
      okText: "继续验证",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => setDeletionModalOpen(true),
    });
  };

  const menu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        个人资料
      </Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        设置
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="delete-account"
        danger
        icon={<DeleteOutlined />}
        onClick={handleRequestAccountDeletion}
      >
        注销账号
      </Menu.Item>
      <Menu.Item
        key="logout"
        icon={<LogoutOutlined />}
        onClick={handleLogout}
        disabled={loading}
      >
        退出登录
      </Menu.Item>
    </Menu>
  );

  if (!user) {
    return (
      <Button type="primary" href="/login">
        登录
      </Button>
    );
  }

  return (
    <>
      <Dropdown overlay={menu} placement="bottomRight">
        <div className="flex items-center cursor-pointer">
          <Avatar src={user.image} alt={user.name} size="small" />
          <span className="ml-2 text-sm">{user.name}</span>
        </div>
      </Dropdown>
      <AccountDeletionModal
        open={deletionModalOpen}
        userEmail={user.email}
        onClose={() => setDeletionModalOpen(false)}
      />
    </>
  );
};

export default UserProfile;
