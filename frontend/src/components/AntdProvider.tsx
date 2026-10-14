"use client";

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';

const theme = {
  token: {
    colorPrimary: '#1a73e8',
    colorSuccess: '#27ae60',
    colorWarning: '#f39c12',
    colorError: '#e74c3c',
    borderRadius: 8,
    fontFamily: 'Tahoma, Verdana, sans-serif',
  },
};

export default function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider theme={theme}>
        {children}
      </ConfigProvider>
    </AntdRegistry>
  );
}
