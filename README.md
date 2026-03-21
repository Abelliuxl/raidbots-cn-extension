# Raidbots 装备名中文插件

这个仓库现在包含一个可直接加载到 Chrome 的 MV3 插件，用来把 `https://www.raidbots.com` 页面上的装备名称从英文替换成中文。

## 方案说明

- 数据源使用目录里的 `lua_chunks/item_names_*.lua`
- 生成时会产出两套索引：
  - `id -> 中文名`，优先用于带物品 ID 的链接或元素
  - `英文名 -> 中文名`，只保留“英文名唯一对应一个中文名”的条目，作为兜底
- 之所以不把所有英文名都强行做映射，是因为源数据里有一部分英文重名，但中文翻译不完全一致，直接全量替换会引入误译

## 目录

- `tools/build_item_data.py`
  - 把 Lua 数据合并成插件使用的 JSON
- `extension/manifest.json`
  - Chrome 插件清单
- `extension/content.js`
  - 页面内容脚本，负责监听和替换页面中的物品名
- `extension/data/item-names.json`
  - 生成后的词典文件

## 生成数据

在仓库根目录执行：

```powershell
python .\tools\build_item_data.py
```

## 安装插件

1. 打开 Chrome，进入 `chrome://extensions/`
2. 打开右上角“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择仓库里的 `extension` 目录

## 当前替换策略

- 优先从链接、`data-wowhead` 等属性里提取物品 ID，再按 ID 翻译
- 如果页面节点拿不到物品 ID，就按“节点文本完全等于英文装备名”做精确替换
- 插件会监听 Raidbots 的前端动态渲染，页面切换或结果刷新后会继续生效

## 注意

- 这个版本只处理 Raidbots 页面里能稳定识别出的装备名，不会去改整个页面的普通英文文案
- 如果后面你希望显示成 `中文 / English`，或者给插件加开关，我可以在这个基础上继续补
