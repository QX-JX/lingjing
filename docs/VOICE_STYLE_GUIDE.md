# 音色风格检索指南

本指南介绍如何使用音色风格检索工具来查询音色对应的风格信息。

## 快速开始

### 1. 在浏览器控制台中使用

在应用运行时，打开浏览器开发者工具（F12），在控制台中输入：

```javascript
// 检索指定音色的风格
voiceStyleHelper.get('zhiwei')

// 搜索包含关键词的音色
voiceStyleHelper.search('专业')

// 查看所有音色的完整报告
voiceStyleHelper.report()
```

### 2. 在代码中使用

```typescript
import { retrieveVoiceStyle, searchVoices, getVoiceStyleReport } from './utils/voiceStyleHelper';
import { useAppStore } from './store/useAppStore';

// 在组件中检索当前音色的风格
function MyComponent() {
  const { currentVoice } = useAppStore();
  const styleInfo = retrieveVoiceStyle(currentVoice.id);
  
  if (styleInfo.found && styleInfo.voice) {
    console.log('当前音色风格:', styleInfo.voice.style);
    console.log('适用场景:', styleInfo.voice.suitableFor);
    console.log('音色特点:', styleInfo.voice.characteristics);
  }
}
```

## 所有音色风格列表

### 男性发音人

| 音色ID | 名称 | 风格 | 适用场景 | 音色特点 |
|--------|------|------|----------|----------|
| `zhiwei` | 云希 (男) | 专业解说风格 | 新闻、教育类内容、日常对话、一般内容 | 年轻自然、声音流畅、专业解说 |
| `xiaofeng` | 云野 (男) | 活泼开朗风格 | 儿童内容、娱乐节目、轻松内容 | 年轻活泼、声音开朗、充满活力 |
| `yunjian` | 云健 (男) | 运动解说风格 | 体育、激励类内容、运动解说 | 充满活力、声音激昂、富有激情 |
| `yunfeng` | 云枫 (男) | 新闻播报风格 | 严肃场合、正式场合、新闻播报 | 成熟稳重、声音专业、庄重严肃 |
| `yunze` | 云泽 (男) | 沉稳成熟风格 | 企业培训、纪录片、正式场合 | 沉稳成熟、声音专业、适合正式内容 |
| `yunxia` | 云霞 (男) | 成熟稳重风格 | 正式场合、培训、纪录片 | 成熟稳重、声音专业、适合正式内容 |

### 女性发音人

| 音色ID | 名称 | 风格 | 适用场景 | 音色特点 |
|--------|------|------|----------|----------|
| `xiaoyu` | 晓晓 (女) | 温柔甜美风格 | 情感类内容、故事类内容、轻松内容、故事讲述 | 活泼可爱、声音甜美、温柔亲切 |
| `xiaomei` | 晓伊 (女) | 知性优雅风格 | 商务、知识类内容、专业内容、知识付费 | 成熟知性、声音优雅、专业稳重 |
| `xiaochen` | 晓辰 (女) | 温柔亲切风格 | 客服、导购类内容、服务类内容 | 温柔亲切、声音友好、适合服务场景 |
| `xiaomeng` | 晓梦 (女) | 儿童音色风格 | 儿童故事、教育内容、儿童内容 | 儿童音色、声音可爱、适合儿童内容 |
| `xiaomo` | 晓墨 (女) | 知性成熟风格 | 知识付费、有声书、专业内容 | 知性成熟、声音优雅、适合知识类内容 |
| `xiaohan` | 晓涵 (女) | 活泼青春风格 | 青少年内容、年轻化内容、娱乐内容 | 活泼青春、声音年轻、充满活力 |
| `xiaoxuan` | 晓萱 (女) | 甜美温柔风格 | 情感类内容、温柔内容、故事类内容 | 甜美温柔、声音柔和、适合情感表达 |

## API 参考

### `retrieveVoiceStyle(voiceId: string)`

检索指定音色的风格信息。

**参数：**
- `voiceId`: 音色ID（如 'zhiwei', 'xiaoyu' 等）

**返回：**
```typescript
{
  found: boolean;
  voice?: VoiceStyle;
  message: string;
}
```

**示例：**
```typescript
const result = retrieveVoiceStyle('zhiwei');
if (result.found) {
  console.log(result.voice?.style); // "专业解说风格"
}
```

### `searchVoices(keyword: string)`

根据关键词搜索相关音色。

**参数：**
- `keyword`: 搜索关键词（如 '专业', '甜美', '活泼' 等）

**返回：**
```typescript
{
  keyword: string;
  results: VoiceStyle[];
  count: number;
}
```

**示例：**
```typescript
const results = searchVoices('专业');
console.log(`找到 ${results.count} 个匹配的音色`);
```

### `getVoiceStyleReport(voiceId?: string)`

获取音色风格报告。

**参数：**
- `voiceId`: 可选，音色ID。如果不提供，则返回所有音色的报告。

**返回：**
格式化的报告字符串。

**示例：**
```typescript
// 获取所有音色的报告
const report = getVoiceStyleReport();
console.log(report);

// 获取指定音色的报告
const singleReport = getVoiceStyleReport('zhiwei');
console.log(singleReport);
```

## 文件位置

- 配置文件：`tauri-app/src/config/voiceStyles.ts`
- 工具函数：`tauri-app/src/utils/voiceStyleHelper.ts`
- 控制台工具：`tauri-app/src/scripts/checkVoiceStyle.ts`

## 使用场景

1. **开发调试**：在开发时快速查看音色风格信息
2. **用户提示**：在UI中显示音色的适用场景和特点
3. **智能推荐**：根据内容类型推荐合适的音色
4. **文档生成**：自动生成音色风格文档

## 注意事项

- 音色ID必须与配置中的ID完全匹配（区分大小写）
- 如果音色不存在，函数会返回 `found: false`
- 所有风格描述都是基于 Azure TTS 官方文档和实际测试结果
