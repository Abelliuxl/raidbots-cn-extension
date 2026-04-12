# Raidbots 中文翻译（Chrome/Edge 扩展）

这是一个面向中文玩家的浏览器扩展，用于将 `https://www.raidbots.com` 里的核心英文内容自动翻译为中文，提升 Top Gear / Raidbots 配装与模拟的可读性。

## 功能概览

当前版本支持：

- 装备名称翻译
- 附魔名称翻译（含页面短名别名）
- 宝石与属性标签翻译（含缩写和全称）
- 消耗品下拉项翻译（药水、食物、合剂、强化符文等）
- Raid Buffs 与常见固定标签翻译
- 装备分区与附魔分区标签翻译（如 `HEAD`、`MAIN HAND`、`ENHANCEMENTS`）
- Top Gear `item search` 中文检索辅助（输入中文可选建议，自动回填英文搜索）

## 工作原理

数据来源是 `lua_chunks/item_names_*.lua` 中的中英文对照表。构建脚本会生成两类索引：

- `id -> 中文名`：优先使用，准确率最高
- `英文名 -> 中文名`：用于无 ID 场景的兜底匹配

同时会生成中文检索索引，用于 Top Gear 的中文搜索辅助。

## 项目结构

- `extension/manifest.json`：扩展清单（MV3，含 i18n 配置）
- `extension/content.js`：页面翻译逻辑与中文搜索辅助逻辑
- `extension/data/item-names.json`：翻译词典
- `extension/data/item-search-index.json`：中文搜索索引
- `extension/_locales/`：扩展名称与描述的多语言资源
- `tools/build_item_data.py`：Lua -> JSON 构建脚本
- `PRIVACY.md`：中英双语隐私政策

## 本地安装（开发者模式）

1. 打开 Chrome 或 Edge 扩展页  
Chrome: `chrome://extensions/`  
Edge: `edge://extensions/`
2. 开启“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择仓库中的 `extension` 目录
5. 打开 `raidbots.com` 页面测试效果

## 更新词典数据

当 `lua_chunks` 数据更新后，在仓库根目录执行：

```powershell
python .\tools\build_item_data.py
```

会重新生成：

- `extension/data/item-names.json`
- `extension/data/item-search-index.json`

## 打包发布

如果需要发布到商店或分享 ZIP 包，请打包 `extension` 目录内容。  
仓库里的 `dist/` 目录可用于存放导出的发布包。

## 隐私说明

扩展仅在 `https://www.raidbots.com/*` 运行，核心处理在本地浏览器完成，不上传用户数据。详见 [PRIVACY.md](./PRIVACY.md)。

## 兼容性与注意事项

- 适配对象：Raidbots 当前前端结构（动态页面）
- 若 Raidbots 页面结构发生较大变更，部分节点可能需要补规则
- 插件优先覆盖“有明确语义的配装/模拟文本”，不会盲目翻译全站所有英文文案
