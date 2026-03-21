# 隐私政策 / Privacy Policy

最后更新 / Last Updated: 2026-03-21

---

## 中文版

`Raidbots 中文翻译` 扩展重视用户隐私。本扩展的设计目标是在本地浏览器中，将 `https://www.raidbots.com` 页面上的部分英文内容替换为中文显示。

### 1. 扩展会访问哪些网站

本扩展仅在以下网站范围内运行：

- `https://www.raidbots.com/*`

扩展不会主动在其他网站注入脚本或读取页面内容。

### 2. 扩展会收集哪些数据

本扩展 **不会收集、保存、出售或上传** 以下信息：

- 个人身份信息
- 账号信息
- 浏览历史
- 输入内容
- Cookie
- 身份验证令牌
- 支付信息
- 设备唯一标识

### 3. 扩展如何处理数据

本扩展的主要功能包括：

- 在本地读取扩展内置的中英文对照数据
- 在 `raidbots.com` 页面中识别装备、附魔、宝石、消耗品、增益等文本
- 在用户浏览器本地将对应英文显示替换为中文
- 在 Top Gear 的物品搜索中提供本地中文检索辅助

以上处理均在用户本地浏览器内完成，不会将页面内容发送到扩展作者或第三方服务器。

### 4. 网络请求说明

本扩展本身不提供独立后端服务，也不主动向作者服务器发送任何数据。

扩展运行时读取的词典文件和搜索索引文件均来自扩展安装包自身，例如：

- `extension/data/item-names.json`
- `extension/data/item-search-index.json`

扩展对 `raidbots.com` 的访问仅用于在该站点页面上执行翻译功能。

### 5. 数据存储说明

本扩展当前版本不使用以下浏览器持久化存储能力来保存个人数据：

- `chrome.storage`
- IndexedDB
- LocalStorage

如果未来版本增加设置项、缓存或同步能力，本隐私政策会同步更新。

### 6. 第三方服务

本扩展不集成广告、统计分析、埋点上报或远程用户行为跟踪服务。

`raidbots.com` 网站自身可能有其独立的数据处理行为，这些行为不属于本扩展控制范围，请以 `raidbots.com` 自身的条款和隐私政策为准。

### 7. 儿童隐私

本扩展不面向儿童收集个人信息，也不具备单独的用户注册或数据提交功能。

### 8. 隐私政策更新

如果本扩展的权限范围、数据处理方式或功能发生实质变化，本文件会同步更新，并在仓库中发布最新版本。

### 9. 联系方式

项目仓库：

- `https://github.com/Abelliuxl/raidbots-cn-extension`

如需反馈隐私相关问题，请通过仓库 Issue 联系。

---

## English Version

The `Raidbots Chinese Translation` extension respects user privacy. Its purpose is to locally translate selected English content on `https://www.raidbots.com` into Chinese inside the user's browser.

### 1. Websites This Extension Runs On

This extension only runs on:

- `https://www.raidbots.com/*`

It does not intentionally inject scripts into or read content from other websites.

### 2. Data Collection

This extension does **not collect, store, sell, or transmit** any of the following:

- Personally identifiable information
- Account credentials
- Browsing history
- User input content
- Cookies
- Authentication tokens
- Payment information
- Unique device identifiers

### 3. How Data Is Processed

The main functions of this extension are:

- Reading built-in English-Chinese translation data packaged with the extension
- Detecting item names, enchants, gems, consumables, buffs, and similar text on `raidbots.com`
- Replacing supported English display text with Chinese locally in the browser
- Providing local Chinese search assistance for Top Gear item search

All processing happens locally in the user's browser. No page content is sent to the extension author or to third-party servers.

### 4. Network Requests

This extension does not operate its own backend service and does not send user data to any author-controlled server.

The dictionary and search index files used by the extension are loaded from the extension package itself, for example:

- `extension/data/item-names.json`
- `extension/data/item-search-index.json`

The extension accesses `raidbots.com` only to perform its translation features on that website.

### 5. Data Storage

This version of the extension does not use the following persistent browser storage mechanisms to save personal data:

- `chrome.storage`
- IndexedDB
- LocalStorage

If a future version adds settings, caching, or sync features, this privacy policy will be updated accordingly.

### 6. Third-Party Services

This extension does not include advertising, analytics, telemetry, or remote user behavior tracking services.

`raidbots.com` itself may have its own independent data practices. Those are outside the control of this extension and should be governed by the policies of `raidbots.com`.

### 7. Children's Privacy

This extension is not designed to collect personal information from children and does not provide standalone account registration or user data submission features.

### 8. Policy Updates

If the extension's permissions, data handling behavior, or core features change materially, this file will be updated and the latest version will be published in the repository.

### 9. Contact

Project repository:

- `https://github.com/Abelliuxl/raidbots-cn-extension`

For privacy-related questions, please open an Issue in the repository.
