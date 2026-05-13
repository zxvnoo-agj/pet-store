import React, { Component, ReactNode } from "react";
import { View, Text, Button } from "@tarojs/components";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    // In production, you could log to a service like Sentry
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50">
          <Text className="text-6xl mb-4">⚠️</Text>
          <Text className="text-xl font-bold text-gray-800 mb-2">
            页面出错了
          </Text>
          <Text className="text-sm text-gray-500 mb-6 text-center">
            {this.state.error?.message || "发生了未知错误"}
          </Text>
          <Button
            className="px-6 py-3 bg-blue-500 text-white rounded-lg text-base"
            onClick={this.handleReset}
          >
            重试
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
