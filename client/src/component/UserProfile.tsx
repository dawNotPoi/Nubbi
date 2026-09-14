import { useAuth } from "@/hooks/useAuth";
import {
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Dropdown, Menu } from "antd";
import React from "react";

const UserProfile: React.FC = () => {
  const { user, logout, loading } = useAuth();

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      // 可以在这里添加登出后的处理逻辑
      console.log("登出成功");
    }
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
    <Dropdown overlay={menu} placement="bottomRight">
      <div className="flex items-center cursor-pointer">
        <Avatar src={user.image} alt={user.name} size="small" />
        <span className="ml-2 text-sm">{user.name}</span>
      </div>
    </Dropdown>
  );
};

export default UserProfile;
