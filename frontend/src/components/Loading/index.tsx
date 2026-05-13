import React from "react";
import { View, Text } from "@tarojs/components";

interface LoadingProps {
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  text = "加载中...",
  fullScreen = false,
  className = "",
}) => {
  const baseClasses = "flex flex-col items-center justify-center";
  const sizeClasses = fullScreen ? "min-h-screen" : "py-8";

  return (
    <View className={`${baseClasses} ${sizeClasses} ${className}`}>
      <View className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-3" />
      <Text className="text-sm text-gray-500">{text}</Text>
    </View>
  );
};

export const SkeletonLoading: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <View className="w-full">
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} className="flex items-center p-4 mb-2 bg-white rounded-lg animate-pulse">
          <View className="w-16 h-16 bg-gray-200 rounded-lg mr-4" />
          <View className="flex-1">
            <View className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <View className="h-3 bg-gray-200 rounded w-1/2" />
          </View>
        </View>
      ))}
    </View>
  );
};

export default Loading;
