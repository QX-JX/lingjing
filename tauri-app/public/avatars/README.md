# 自定义头像使用说明

## 如何使用本地头像

### 步骤 1：准备头像图片

1. 将你下载的头像图片文件放在这个文件夹（`public/avatars/`）下
2. 支持的图片格式：`png`, `jpg`, `jpeg`, `svg`, `webp`
3. 建议图片尺寸：150x150 像素或更大（正方形）

### 步骤 2：配置头像映射

打开 `src/config/voiceAvatars.ts` 文件，找到 `customVoiceAvatars` 配置对象：

```typescript
export const customVoiceAvatars: Record<string, string> = {
  // 格式：'发音人ID': '/avatars/文件名.扩展名'
  'zhiwei': '/avatars/zhiwei.png',
  'xiaoyu': '/avatars/xiaoyu.jpg',
  'xiaofeng': '/avatars/xiaofeng.png',
  // ... 添加更多发音人的头像配置
};
```

### 步骤 3：发音人 ID 对照表

| 发音人 ID | 发音人名称 | 性别 |
|---------|-----------|------|
| zhiwei | 云希 (男) | 男 |
| xiaofeng | 云野 (男) | 男 |
| yunjian | 云健 (男) | 男 |
| yunfeng | 云枫 (男) | 男 |
| yunze | 云泽 (男) | 男 |
| xiaoyu | 晓晓 (女) | 女 |
| xiaomei | 晓伊 (女) | 女 |
| xiaochen | 晓辰 (女) | 女 |
| xiaomeng | 晓梦 (女) | 女 |
| xiaomo | 晓墨 (女) | 女 |
| xiaohan | 晓涵 (女) | 女 |
| xiaoxuan | 晓萱 (女) | 女 |

### 示例

假设你想为"云希 (男)"设置自定义头像：

1. **准备图片**：将头像文件命名为 `zhiwei.png`，放在 `public/avatars/` 文件夹下
2. **配置映射**：在 `voiceAvatars.ts` 中添加：
   ```typescript
   export const customVoiceAvatars: Record<string, string> = {
     'zhiwei': '/avatars/zhiwei.png',
   };
   ```
3. **完成**：重启应用后，"云希"就会显示你的自定义头像了！

### 注意事项

- 路径必须以 `/avatars/` 开头（相对于 public 文件夹）
- 文件名区分大小写
- 如果配置了本地头像，会优先使用本地头像，忽略在线 API 生成的头像
- 如果没有配置本地头像，会自动使用在线 API 生成的头像
