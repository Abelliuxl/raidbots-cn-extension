(async () => {
  const DATA_URL = chrome.runtime.getURL("data/item-names.json");
  const SEARCH_INDEX_URL = chrome.runtime.getURL("data/item-search-index.json");
  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEXTAREA",
    "INPUT",
    "CODE",
    "PRE",
    "KBD",
    "SAMP"
  ]);
  const SKIP_TRANSLATION_SELECTOR = [
    ".ace_editor",
    ".ace_content",
    ".CodeMirror",
    ".cm-editor",
    ".monaco-editor",
    "[data-rbcn-skip]"
  ].join(",");
  const ITEM_ID_PATTERNS = [
    /(?:^|[?&;/])item=(\d+)(?:[&#/]|$)/i,
    /\/item\/(\d+)(?:[/?#]|$)/i,
    /item:(\d+)/i
  ];
  const CJK_PATTERN = /[\u3400-\u9FFF]/;
  const SEARCHABLE_SELECTOR = [
    'input[type="text"]',
    'input[type="search"]',
    "input:not([type])"
  ].join(",");
  const SEARCH_RESULTS_LIMIT = 24;
  const UNTRANSLATED_CAPTURE_LIMIT = 2000;
  const ITEM_OWNER_SELECTOR = "[href],[data-wowhead],[data-wowhead-tt],[data-item-id],[data-href],[title]";
  const GEM_STAT_LABELS = [
    ["Critical Strike", "爆击"],
    ["Versatility", "全能"],
    ["Avoidance", "闪避"],
    ["Mastery", "精通"],
    ["Haste", "急速"],
    ["Leech", "吸血"],
    ["Speed", "速度"],
    ["Crit", "爆击"],
    ["Vers", "全能"],
    ["Mast", "精通"],
    ["Avoid", "闪避"]
  ];
  const STATIC_LABEL_TRANSLATIONS = new Map([
    ["Top Gear", "最佳配装"],
    ["Quick Sim", "快速模拟"],
    ["Quick Nav", "快速导航"],
    ["Quick Nav:", "快速导航："],
    ["INPUT", "输入"],
    ["TALENTS", "天赋"],
    ["Droptimizer", "掉落优化"],
    ["Choose a source and Droptimizer will evaluate all Personal Loot against your currently equipped gear.", "请选择一个来源，Droptimizer 会将所有个人拾取与你当前装备进行评估对比。"],
    ["Choose a source and Droptimizer will evaluate all Personal Loot against your currently equipped gear", "请选择一个来源，Droptimizer 会将所有个人拾取与你当前装备进行评估对比。"],
    ["More info on how Droptimizer works", "了解掉落优化的工作方式"],
    ["SOURCES", "来源"],
    ["Show Previous Tiers", "显示往期赛季"],
    ["Season 1 Raids", "第 1 赛季团队副本"],
    ["March on Quel'Danas", "奎尔达纳斯进军"],
    ["The Dreamrift", "梦境裂隙"],
    ["The Voidspire", "虚空尖塔"],
    ["World Bosses", "世界首领"],
    ["Mythic+ Dungeons", "史诗钥石地下城"],
    ["Normal Dungeons", "普通地下城"],
    ["Delves Season 1", "探究赛季 1"],
    ["Prey Season 1", "猎物赛季 1"],
    ["PVP Season 1 (Conquest)", "PVP 赛季 1（征服）"],
    ["PVP Season 1 (Bloody Tokens)", "PVP 赛季 1（血腥代币）"],
    ["PVP Season 1 (Honor)", "PVP 赛季 1（荣誉）"],
    ["Catalyst Season 1", "套装转化赛季 1"],
    ["Epic Profession Items", "史诗专业制造物品"],
    ["Rare Profession Items", "稀有专业制造物品"],
    ["PVP Profession Items", "PVP 专业制造物品"],
    ["RAID DIFFICULTY", "团队副本难度"],
    ["Raid Finder", "随机团队"],
    ["Normal", "普通"],
    ["Heroic", "英雄"],
    ["Mythic", "史诗"],
    ["Veteran", "老兵"],
    ["Champion", "勇士"],
    ["Hero", "英雄"],
    ["Myth", "神话"],
    ["Gear Compare", "装备对比"],
    ["Stat Weights", "属性权重"],
    ["Advanced", "高级"],
    ["Settings", "设置"],
    ["Summary", "摘要"],
    ["Details", "详情"],
    ["Results", "结果"],
    ["Result", "结果"],
    ["Simulation", "模拟"],
    ["Simulations", "模拟任务"],
    ["Simulation Results", "模拟结果"],
    ["Simulation Error", "模拟错误"],
    ["Character", "角色"],
    ["Characters", "角色"],
    ["Profile", "配置"],
    ["Profiles", "配置"],
    ["Class", "职业"],
    ["Spec", "专精"],
    ["Specialization", "专精"],
    ["Race", "种族"],
    ["Level", "等级"],
    ["Region", "地区"],
    ["Realm", "服务器"],
    ["Name", "名称"],
    ["Item Name", "物品名称"],
    ["Target Error", "目标误差"],
    ["Enemy Count", "敌人数量"],
    ["Fight Style", "战斗风格"],
    ["Fight Length", "战斗时长"],
    ["Number of Bosses", "首领数量"],
    ["SimC Version", "SimC 版本"],
    ["Iterations", "迭代次数"],
    ["Single Target", "单体目标"],
    ["Multi Target", "多目标"],
    ["AoE", "范围伤害"],
    ["Patchwerk", "\u5e15\u5947\u7ef4\u514b"],
    ["Dungeon Slice", "地下城切片"],
    ["Light Movement", "轻度移动"],
    ["Heavy Movement", "重度移动"],
    ["Import", "导入"],
    ["Export", "导出"],
    ["Run Simulation", "运行模拟"],
    ["Run Top Gear", "运行最佳配装"],
    ["Run Quick Sim", "运行快速模拟"],
    ["Show all", "显示全部"],
    ["Show less", "收起显示"],
    ["Select all", "全选"],
    ["Deselect all", "取消全选"],
    ["Enable", "启用"],
    ["Disable", "禁用"],
    ["Enabled", "已启用"],
    ["Disabled", "已禁用"],
    ["Recommended", "推荐"],
    ["Optional", "可选"],
    ["Required", "必选"],
    ["Unavailable", "不可用"],
    ["Loading", "加载中"],
    ["Processing", "处理中"],
    ["Queued", "排队中"],
    ["Pending", "等待中"],
    ["Completed", "已完成"],
    ["Failed", "失败"],
    ["Error", "错误"],
    ["Warning", "警告"],
    ["Success", "成功"],
    ["Weekly", "每周构建"],
    ["Nightly", "每日构建"],
    ["Release", "正式版"],
    ["Yes", "是"],
    ["No", "否"],
    ["Apply", "应用"],
    ["Cancel", "取消"],
    ["Done", "完成"],
    ["Save", "保存"],
    ["Delete", "删除"],
    ["Load from SimC Addon", "从 SimC 插件导入"],
    ["LOAD FROM SIMC ADDON", "从 SimC 插件导入"],
    ["Item Sets", "套装分组"],
    ["ITEM SETS", "套装分组"],
    ["Minimum Set Bonus", "最低套装加成"],
    ["Reign of the Abyssal Immolator", "深渊焚灭者君临"],
    ["Voidlight Bindings", "虚光束缚"],
    ["ITEM UPGRADE CURRENCY", "装备升级货币"],
    ["Veteran Dawncrest", "老兵纹章"],
    ["Champion Dawncrest", "勇士纹章"],
    ["Hero Dawncrest", "英雄纹章"],
    ["Myth Dawncrest", "神话纹章"],
    ["Adventurer Dawncrest", "冒险者纹章"],
    ["Catalyst Charges", "催化转化充能"],
    ["CATALYST CHARGES", "催化转化充能"],
    ["Crafted Item Stats", "制造物品属性"],
    ["Only Seasonal", "仅赛季内容"],
    ["Only Seasonal Item Levels", "仅赛季物品等级"],
    ["Only Usable", "仅可用项"],
    ["Require Sparks/Crests for Crafted Items", "制造物品需要火花/纹章"],
    ["Select Additional Options", "选择附加选项"],
    ["SELECT ADDITIONAL OPTIONS", "选择附加选项"],
    ["Find Top Gear", "寻找最佳配装"],
    ["FIND TOP GEAR", "寻找最佳配装"],
    ["How many Catalyst charges would you like?", "你希望使用多少催化转化充能？"],
    ["How many Catalyst charges do you want to use?", "你希望使用多少催化转化充能？"],
    ["You must use the", "你必须使用"],
    ["CATALYZE SELECTED ITEMS", "转化已选物品"],
    ["Catalyze Selected Items", "转化已选物品"],
    ["Enter an item name above to search for items to add into Top Gear.", "在上方输入物品名称以搜索并添加到 Top Gear。"],
    ["Sign up for Raidbots Premium! Skip the line, run larger sims, and more!", "开通 Raidbots Premium：免排队、支持更大规模模拟等更多功能！"],
    ["SimC Default", "SimC 默认"],
    ["Potion", "药水"],
    ["Food", "食物"],
    ["Flask", "合剂"],
    ["Phial", "药剂"],
    ["Augmentation", "强化符文"],
    ["Weapon Rune", "武器符文"],
    ["Thalassian Phoenix Oil", "萨拉斯凤凰之油"],
    ["Shattered Sun", "破碎残阳"],
    ["Blood Knights", "血骑士"],
    ["Magisters", "魔导师"],
    ["Thalassian Resistance", "萨拉斯抗性"],
    ["Violence", "暴戾"],
    ["Sustenance", "续航"],
    ["Predation", "猎食"],
    ["No movement, single target", "无移动，单体目标"],
    ["Default and best for single target sims", "单体模拟的默认推荐选项"],
    ["By default, fight length will vary up to 20% for each iteration", "默认情况下，战斗时长每次迭代会在 20% 范围内波动"],
    ["Built from source every Monday", "每周一基于源码构建"],
    ["You can use nearly any", "你几乎可以使用任意"],
    ["in the", "在"],
    ["and", "和"],
    ["Buff", "增益"],
    ["Buffs", "增益"],
    ["None", "无"],
    ["NONE", "无"],
    ["DEFAULT", "默认"],
    ["Head", "头部"],
    ["HEAD", "头部"],
    ["Neck", "颈部"],
    ["NECK", "颈部"],
    ["Shoulder", "肩部"],
    ["SHOULDER", "肩部"],
    ["Back", "背部"],
    ["BACK", "背部"],
    ["Chest", "胸部"],
    ["CHEST", "胸部"],
    ["Wrist", "手腕"],
    ["WRIST", "手腕"],
    ["Hands", "手部"],
    ["HANDS", "手部"],
    ["Waist", "腰部"],
    ["WAIST", "腰部"],
    ["Legs", "腿部"],
    ["LEGS", "腿部"],
    ["Feet", "脚部"],
    ["FEET", "脚部"],
    ["Rings", "戒指"],
    ["RINGS", "戒指"],
    ["Trinkets", "饰品"],
    ["TRINKETS", "饰品"],
    ["Main Hand", "主手"],
    ["MAIN HAND", "主手"],
    ["Off Hand", "副手"],
    ["OFF HAND", "副手"],
    ["Dual Wield", "双持"],
    ["DUAL WIELD", "双持"],
    ["Enhancements", "附魔"],
    ["ENHANCEMENTS", "附魔"],
    ["Gems", "宝石"],
    ["GEMS", "宝石"],
    ["Show All Enhancements", "显示全部附魔"],
    ["Replace Existing Gems/Enchants", "替换现有宝石/附魔"],
    ["UPGRADE ALL", "全部升级"],
    ["Bloodlust", "嗜血"],
    ["Arcane Intellect", "奥术智慧"],
    ["Power Word: Fortitude", "真言术：韧"],
    ["Mark of the Wild", "野性印记"],
    ["Battle Shout", "战斗怒吼"],
    ["Mystic Touch", "神秘之触"],
    ["Chaos Brand", "混沌烙印"],
    ["Hunter's Mark", "猎人印记"],
    ["Skyfury", "天怒"],
    ["Power Infusion", "能量灌注"],
    ["Bleeding", "流血"],
    ["RAID BUFFS", "团队增益"],
    ["RAID BUFF PRESETS", "团队增益预设"],
    ["OPTIMAL RAID BUFFS", "最佳团队增益"],
    ["NO BUFFS", "无增益"],
    ["CONSUMABLES", "消耗品"],
    ["MISC OPTIONS", "其他选项"],
    ["SHOW FEWER OPTIONS", "显示更少选项"],
    ["SHOW MORE OPTIONS", "显示更多选项"],
    ["Restore Default Options", "恢复默认选项"],
    ["DUNGEONS", "地下城"],
    ["All Dungeons", "全部地下城"],
    ["Requires Raidbots Premium", "需要 Raidbots 高级订阅"],
    ["Algeth'ar Academy", "艾杰斯亚学院"],
    ["Magisters' Terrace", "魔导师平台"],
    ["Maisara Caverns", "迈萨拉洞窟"],
    ["Nexus-Point Xenas", "节点希纳斯"],
    ["Pit of Saron", "萨隆矿坑"],
    ["Seat of the Triumvirate", "执政团之座"],
    ["Skyreach", "通天峰"],
    ["Windrunner Spire", "风行者之塔"],
    ["DUNGEON LEVEL", "地下城等级"],
    ["Target Dummy", "\u8bad\u7ec3\u5047\u4eba"],
    ["Execute Patchwerk", "\u65a9\u6740\u9636\u6bb5\u5e15\u5947\u7ef4\u514b"],
    ["Hectic Add Cleave", "\u9891\u7e41\u5c0f\u602a\u987a\u5288"],
    ["Casting Patchwerk", "\u65bd\u6cd5\u5e15\u5947\u7ef4\u514b"],
    ["Cleave Add", "\u5c0f\u602a\u987a\u5288"]
  ]);
  const STATIC_LABEL_TRANSLATIONS_LOWER = new Map(
    Array.from(STATIC_LABEL_TRANSLATIONS.entries()).map(([key, value]) => [key.toLowerCase(), value])
  );
  const UI_REGEX_TRANSLATIONS = [
    [/^Max\s+(\d+)\s+selections$/i, "最多 $1 个选项"],
    [/^(\d+)\s*set$/i, "$1 件套"],
    [/^Add up to\s+(\d+)\s+prismatic sockets with$/i, "最多添加 $1 个棱彩插槽，使用"],
    [/^Top Gear will not change your (.+)$/i, "Top Gear 不会更改你的 $1"],
    [/^Top Gear will not change any (.+)$/i, "Top Gear 不会更改任何 $1"],
    [/^Top Gear will use the global\s+(.+?)\s+setting$/i, "Top Gear 将使用全局$1设置"],
    [/^(\d+)\s+Primary\s+Stat$/i, "$1 主属性"],
    [/^(\d+)\s+Highest\s+Secondary$/i, "$1 最高副属性"],
    [/^(\d+)\s+Boss(?:es)?$/i, "$1 首领"],
    [/^(\d+)\s+minutes?$/i, "$1 分钟"],
    [/^Mythic\s+(\d+)$/i, "史诗 $1"],
    [/^\+(\d+)-(\d+)\s+Vault$/i, "+$1-$2 宝库"],
    [/^\+(\d+)\s+Vault$/i, "+$1 宝库"],
    [/^Catalyst\s+Season\s+(\d+)$/i, "套装转化赛季 $1"],
    [/\bQuality\s+(\d+)\b/g, "品质 $1"],
    [/\bRank\s+(\d+)\b/g, "等级 $1"],
    [/\bMax\s+(\d+)\s+Selections\b/g, "最多 $1 个选项"],
    [/\b(\d+)\s*set\b/gi, "$1 件套"],
    [/\bAP\b/g, "攻强"],
    [/\bHoly Damage\b/g, "神圣伤害"],
    [/\bDirect Damage\b/g, "直接伤害"],
    [/\bPhysical Damage\b/g, "物理伤害"],
    [/\bMagic Damage\b/g, "魔法伤害"],
    [/\bBeta\b/g, "测试"]
  ];
  const UI_INLINE_TRANSLATIONS = [
    ["You can use nearly any SimC expansion-specific options in the Custom APL and SimC Options", "你几乎可以在 Custom APL 和 SimC 选项中使用任意与版本相关的 SimC 参数"],
    ["If your character provides one of these buffs, it may be used even if disabled here", "如果你的角色可提供以下增益，即使这里禁用也可能在模拟中生效"],
    ["Warning: Item Search is only intended for max level characters and may return incorrect results.", "警告：物品搜索仅面向满级角色，结果可能存在误差。"],
    ["Warning: Item Search is only intended for max level characters and may allow simming items that cannot be obtained in game.", "警告：物品搜索仅面向满级角色，且可能允许模拟游戏内无法获取的物品。"],
    ["Warning:", "警告："],
    ["Large gem/enchant sims may take a very long time!", "大量宝石/附魔组合模拟可能需要较长时间！"],
    ["More info", "更多信息"],
    ["Item Search", "物品搜索"],
    ["ITEM SEARCH", "物品搜索"],
    ["Item Level", "物品等级"],
    ["Item Levels", "物品等级"],
    ["Crafted With", "制造来源"],
    ["Select...", "选择..."],
    ["head enchants", "头部附魔"],
    ["shoulder enchants", "肩部附魔"],
    ["back enchants", "背部附魔"],
    ["chest enchants", "胸部附魔"],
    ["wrist enchants", "护腕附魔"],
    ["hand enchants", "手部附魔"],
    ["feet enchants", "脚部附魔"],
    ["prismatic gems", "棱彩宝石"],
    ["Always Use", "始终使用"],
    ["Only Max Colors", "仅最大颜色"],
    ["Detailed SimC Report", "详细 SimC 报告"],
    ["No profile loaded", "未加载角色档案"],
    ["Copy/paste the text from the SimulationCraft addon.", "请粘贴 SimulationCraft 插件导出的文本。"],
    ["How to install and use the SimC addon", "如何安装和使用 SimC 插件"],
    ["Input was not copied directly from the SimC addon. Raidbots tools are not guaranteed to work as expected.", "输入内容并非直接来自 SimC 插件，Raidbots 工具可能无法按预期工作。"],
    ["Select multiple pieces of gear and Raidbots will generate all possible combinations and sim them", "选择多件装备后，Raidbots 会生成所有可能组合并进行模拟"],
    ["Current selection requires only invalid combinations. Check itemset warnings, select more options, and/or check gem settings.", "当前选择仅产生无效组合。请检查套装警告、增加可选项，并/或检查宝石设置。"],
    ["This will limit how many Catalyst items are included in a single combination.", "这会限制单个组合中可包含的催化转化物品数量。"],
    ["Copy and Modify menu on items to convert an item.", "使用物品上的“复制并修改”菜单来转化物品。"],
    ["Use the", "使用"],
    ["Copy and Modify menu to add an upgraded item to the sim.", "使用“复制并修改”菜单将升级后的物品加入模拟。"],
    ["Selected items are at max affordable upgrades", "所选物品已达到当前可负担的最高升级"],
    ["Show all", "显示全部"],
    ["Show less", "收起显示"],
    ["Run Top Gear", "运行 Top Gear"],
    ["Run Quick Sim", "运行 Quick Sim"],
    ["Run Simulation", "运行模拟"],
    ["Simulation Results", "模拟结果"],
    ["Simulation Error", "模拟错误"]
  ];
  const UI_PHRASE_TRANSLATIONS = [
    ["Input from SimC Addon", "从 SimC 插件导入"],
    ["Paste in your SimC addon output", "粘贴你的 SimC 插件导出内容"],
    ["Click to import", "点击导入"],
    ["Requires SimulationCraft", "需要 SimulationCraft"],
    ["Saved Loadout", "已保存配置"],
    ["Gear from Bags", "背包装备"],
    ["Additional Character Info", "额外角色信息"],
    ["How many Catalyst charges would you like?", "你希望使用多少催化转化充能？"],
    ["Current selection requires only invalid combinations", "当前选择仅产生无效组合"],
    ["Use different combinations", "使用不同组合"],
    ["sim combinations can take a very long time", "模拟组合可能需要较长时间"],
    ["No profile loaded", "未加载角色档案"],
    ["Max level characters", "满级角色"],
    ["expansion-specific options", "版本专属选项"],
    ["prismatic sockets", "棱彩插槽"],
    ["head enchants", "头部附魔"],
    ["shoulder enchants", "肩部附魔"],
    ["back enchants", "背部附魔"],
    ["chest enchants", "胸部附魔"],
    ["wrist enchants", "护腕附魔"],
    ["hand enchants", "手部附魔"],
    ["feet enchants", "脚部附魔"],
    ["prismatic gems", "棱彩宝石"],
    ["Custom APL", "自定义 APL"],
    ["SimC Options", "SimC 选项"]
  ];
  const UI_WORD_TRANSLATIONS = new Map([
    ["show", "显示"],
    ["hide", "隐藏"],
    ["all", "全部"],
    ["only", "仅"],
    ["seasonal", "赛季"],
    ["less", "更少"],
    ["more", "更多"],
    ["option", "选项"],
    ["options", "选项"],
    ["default", "默认"],
    ["none", "无"],
    ["raid", "团队"],
    ["buff", "增益"],
    ["buffs", "增益"],
    ["consumables", "消耗品"],
    ["potion", "药水"],
    ["food", "食物"],
    ["flask", "合剂"],
    ["phial", "药剂"],
    ["augmentation", "强化"],
    ["rune", "符文"],
    ["weapon", "武器"],
    ["head", "头部"],
    ["neck", "颈部"],
    ["shoulder", "肩部"],
    ["back", "背部"],
    ["chest", "胸部"],
    ["wrist", "手腕"],
    ["hands", "手部"],
    ["waist", "腰部"],
    ["legs", "腿部"],
    ["feet", "脚部"],
    ["rings", "戒指"],
    ["trinkets", "饰品"],
    ["main", "主"],
    ["off", "副"],
    ["hand", "手"],
    ["enhancements", "附魔"],
    ["gems", "宝石"],
    ["item", "物品"],
    ["items", "物品"],
    ["name", "名称"],
    ["level", "等级"],
    ["levels", "等级"],
    ["crafted", "制造"],
    ["with", "使用"],
    ["search", "搜索"],
    ["select", "选择"],
    ["results", "结果"],
    ["result", "结果"],
    ["simulation", "模拟"],
    ["simulations", "模拟任务"],
    ["quick", "快速"],
    ["gear", "配装"],
    ["top", "最佳"],
    ["run", "运行"],
    ["load", "加载"],
    ["profile", "配置"],
    ["character", "角色"],
    ["characters", "角色"],
    ["class", "职业"],
    ["spec", "专精"],
    ["specialization", "专精"],
    ["role", "职责"],
    ["tank", "坦克"],
    ["healer", "治疗"],
    ["dps", "输出"],
    ["monk", "武僧"],
    ["brewmaster", "酒仙"],
    ["mistweaver", "织雾"],
    ["windwalker", "踏风"],
    ["death", "死亡"],
    ["knight", "骑士"],
    ["demon", "恶魔"],
    ["hunter", "猎人"],
    ["havoc", "浩劫"],
    ["vengeance", "复仇"],
    ["druid", "德鲁伊"],
    ["balance", "平衡"],
    ["feral", "野性"],
    ["guardian", "守护"],
    ["restoration", "恢复"],
    ["evoker", "唤魔师"],
    ["devastation", "湮灭"],
    ["preservation", "恩护"],
    ["mage", "法师"],
    ["arcane", "奥术"],
    ["fire", "火焰"],
    ["frost", "冰霜"],
    ["paladin", "圣骑士"],
    ["holy", "神圣"],
    ["protection", "防护"],
    ["retribution", "惩戒"],
    ["priest", "牧师"],
    ["discipline", "戒律"],
    ["shadow", "暗影"],
    ["rogue", "潜行者"],
    ["assassination", "刺杀"],
    ["outlaw", "狂徒"],
    ["subtlety", "敏锐"],
    ["shaman", "萨满祭司"],
    ["elemental", "元素"],
    ["enhancement", "增强"],
    ["warlock", "术士"],
    ["affliction", "痛苦"],
    ["demonology", "恶魔学识"],
    ["destruction", "毁灭"],
    ["warrior", "战士"],
    ["arms", "武器"],
    ["fury", "狂怒"],
    ["night", "暗夜"],
    ["elf", "精灵"],
    ["human", "人类"],
    ["orc", "兽人"],
    ["undead", "亡灵"],
    ["tauren", "牛头人"],
    ["troll", "巨魔"],
    ["blood", "鲜血"],
    ["draenei", "德莱尼"],
    ["goblin", "地精"],
    ["worgen", "狼人"],
    ["pandaren", "熊猫人"],
    ["void", "虚空"],
    ["highmountain", "至高岭"],
    ["lightforged", "光铸"],
    ["dark", "黑铁"],
    ["iron", "黑铁"],
    ["kul", "库尔"],
    ["tiran", "提拉斯"],
    ["maghar", "玛格汉"],
    ["zandalari", "赞达拉"],
    ["vulpera", "狐人"],
    ["dracthyr", "龙希尔"],
    ["earthen", "土灵"],
    ["race", "种族"],
    ["region", "地区"],
    ["realm", "服务器"],
    ["target", "目标"],
    ["enemy", "敌人"],
    ["enemies", "敌人"],
    ["fight", "战斗"],
    ["style", "风格"],
    ["length", "时长"],
    ["iterations", "迭代次数"],
    ["warning", "警告"],
    ["error", "错误"],
    ["success", "成功"],
    ["enabled", "已启用"],
    ["disabled", "已禁用"],
    ["recommended", "推荐"],
    ["optional", "可选"],
    ["required", "必选"],
    ["loading", "加载中"],
    ["processing", "处理中"],
    ["queued", "排队中"],
    ["pending", "等待中"],
    ["completed", "已完成"],
    ["failed", "失败"],
    ["mythic", "史诗"],
    ["dungeon", "地下城"],
    ["dungeons", "地下城"],
    ["vault", "宝库"],
    ["requires", "需要"],
    ["premium", "高级订阅"],
    ["tier", "赛季"],
    ["tiers", "赛季"],
    ["add", "添加"],
    ["up", "最多"],
    ["to", "到"],
    ["max", "最多"],
    ["quality", "品质"],
    ["rank", "等级"],
    ["physical", "物理"],
    ["magic", "魔法"],
    ["damage", "伤害"],
    ["beta", "测试"]
  ]);

  let dictionary = null;
  let normalizedNameLookup = new Map();
  let searchIndex = null;
  let searchIndexPromise = null;
  let pendingRoots = new Set();
  let flushScheduled = false;

  let helperRoot = null;
  let helperList = null;
  let helperEmpty = null;
  let activeSearchTarget = null;
  let activeSearchResults = [];
  let activeResultIndex = -1;
  let helperHideTimer = null;
  const untranslatedUiTexts = new Set();

  const inputValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )?.set;
  const textareaValueSetter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value"
  )?.set;

  try {
    const response = await fetch(DATA_URL);
    dictionary = await response.json();
    rebuildNormalizedNameLookup();
  } catch (error) {
    console.error("[raidbots-item-cn] Failed to load item dictionary.", error);
    return;
  }

  function scheduleFlush(root) {
    if (!root) {
      return;
    }

    pendingRoots.add(root);
    if (flushScheduled) {
      return;
    }

    flushScheduled = true;
    queueMicrotask(flushPendingRoots);
  }

  function flushPendingRoots() {
    flushScheduled = false;
    const roots = Array.from(pendingRoots);
    pendingRoots = new Set();

    for (const root of roots) {
      translateRoot(root);
    }
  }

  function parseItemId(value) {
    if (!value) {
      return null;
    }

    for (const pattern of ITEM_ID_PATTERNS) {
      const match = value.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  function extractItemId(element) {
    if (!(element instanceof Element)) {
      return null;
    }

    const candidates = [
      element.getAttribute("href"),
      element.getAttribute("data-wowhead"),
      element.getAttribute("data-wowhead-tt"),
      element.getAttribute("data-item-id"),
      element.getAttribute("data-href"),
      element.getAttribute("title")
    ];

    for (const candidate of candidates) {
      const itemId = parseItemId(candidate);
      if (itemId) {
        return itemId;
      }
    }

    return null;
  }

  function findNearbyItemId(element) {
    if (!(element instanceof Element)) {
      return null;
    }

    const owner = element.closest(ITEM_OWNER_SELECTOR);
    if (owner) {
      const itemId = extractItemId(owner);
      if (itemId) {
        return itemId;
      }
    }

    let current = element;
    for (let depth = 0; current && depth < 4; depth += 1, current = current.parentElement) {
      const candidates = [
        current,
        current.querySelector?.(ITEM_OWNER_SELECTOR) || null,
        current.previousElementSibling,
        current.nextElementSibling
      ];

      for (const candidate of candidates) {
        if (!(candidate instanceof Element)) {
          continue;
        }

        const itemId =
          extractItemId(candidate) ||
          extractItemId(candidate.querySelector?.(ITEM_OWNER_SELECTOR) || null);
        if (itemId) {
          return itemId;
        }
      }
    }

    return null;
  }

  function translateStatLabel(text) {
    if (!text || !(/[&+]/.test(text) || /\b(Critical Strike|Crit|Haste|Mastery|Mast|Versatility|Vers|Leech|Avoidance|Avoid|Speed)\b/.test(text))) {
      return null;
    }

    let translated = text;
    for (const [source, target] of GEM_STAT_LABELS) {
      translated = translated.replace(
        new RegExp(`\\b${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"),
        target
      );
    }

    if (translated !== text) {
      translated = translated.replace(/\s*&\s*/g, " + ");
      return translated;
    }

    return null;
  }

  function translateUiText(text) {
    if (!text || !/[A-Za-z]/.test(text)) {
      return null;
    }

    if (isMachineProfileText(text)) {
      return null;
    }

    const directTranslation = lookupStaticLabel(text);
    if (directTranslation) {
      return directTranslation;
    }

    let translated = text;

    for (const [pattern, replacement] of UI_REGEX_TRANSLATIONS) {
      translated = translated.replace(pattern, replacement);
    }

    for (const [source, target] of UI_INLINE_TRANSLATIONS) {
      if (translated.includes(source)) {
        translated = translated.split(source).join(target);
      }
    }

    for (const [source, target] of UI_PHRASE_TRANSLATIONS) {
      if (translated.includes(source)) {
        translated = translated.split(source).join(target);
      }
    }

    const tokenTranslation = translateUiTextByTokens(translated);
    if (tokenTranslation) {
      translated = tokenTranslation;
    }

    return translated !== text ? translated : null;
  }

  function lookupStaticLabel(text) {
    if (!text) {
      return null;
    }

    const direct = STATIC_LABEL_TRANSLATIONS.get(text);
    if (direct) {
      return direct;
    }

    const normalized = text.trim().replace(/\s+/g, " ");
    const normalizedDirect = STATIC_LABEL_TRANSLATIONS.get(normalized);
    if (normalizedDirect) {
      return normalizedDirect;
    }

    return STATIC_LABEL_TRANSLATIONS_LOWER.get(normalized.toLowerCase()) || null;
  }

  function translateUiTextByTokens(text) {
    let hasWord = false;
    let translatedAny = false;
    let unknownWords = 0;

    const translated = text.replace(/[A-Za-z][A-Za-z'-]*/g, (word) => {
      hasWord = true;
      const mapped = UI_WORD_TRANSLATIONS.get(word.toLowerCase());
      if (!mapped) {
        unknownWords += 1;
        return word;
      }

      translatedAny = true;
      return mapped;
    });

    if (!hasWord || !translatedAny || unknownWords > 0) {
      return null;
    }

    return translated;
  }

  function shouldCaptureUntranslated(text) {
    if (!text) {
      return false;
    }

    if (text.length > 120) {
      return false;
    }

    if (!/[A-Za-z]/.test(text)) {
      return false;
    }

    if (/^[\d\s:,.()%+\-/'"&!?]+$/.test(text)) {
      return false;
    }

    return true;
  }

  function captureUntranslatedText(text) {
    if (untranslatedUiTexts.size >= UNTRANSLATED_CAPTURE_LIMIT) {
      return;
    }

    if (shouldCaptureUntranslated(text)) {
      untranslatedUiTexts.add(text);
    }
  }

  function isMachineProfileText(text) {
    if (!text) {
      return false;
    }

    if (/^\s*#/.test(text)) {
      return true;
    }

    if (/^\s*[a-z_][a-z0-9_]*\s*=.*$/i.test(text)) {
      return true;
    }

    if (/\b(?:id|bonus_id|gem_id|enchant_id|crafted_stats|crafting_quality|drop_level|talents|spec|race|region|server|role|professions|level)\s*=/i.test(text)) {
      return true;
    }

    if (/[a-z_]+\d*\s*=,id=\d+/i.test(text)) {
      return true;
    }

    return false;
  }

  function normalizeLookupText(text) {
    if (!text) {
      return "";
    }

    return text
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\u00A0/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function canonicalEnglishKey(text) {
    const normalized = normalizeLookupText(text).toLowerCase();
    if (!normalized || !/[a-z]/.test(normalized)) {
      return "";
    }

    return normalized
      .replace(/['’]/g, "'")
      .replace(/[^a-z0-9'+]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function rebuildNormalizedNameLookup() {
    normalizedNameLookup = new Map();

    const sources = [dictionary?.byName || {}, dictionary?.byAlias || {}];
    for (const source of sources) {
      for (const [enName, zhName] of Object.entries(source)) {
        const key = canonicalEnglishKey(enName);
        if (!key || !zhName || normalizedNameLookup.has(key)) {
          continue;
        }
        normalizedNameLookup.set(key, zhName);
      }
    }
  }

  function translateWeaponSlotLabel(slotRaw) {
    const normalizedSlot = normalizeLookupText(slotRaw);
    if (!normalizedSlot) {
      return null;
    }

    const mapped =
      translateBareLabel(normalizedSlot) ||
      translateUiText(normalizedSlot);
    if (mapped) {
      return mapped;
    }

    if (/^main\s*hand$/i.test(normalizedSlot)) {
      return "主手";
    }
    if (/^off\s*hand$/i.test(normalizedSlot)) {
      return "副手";
    }
    if (/^dual\s*wield$/i.test(normalizedSlot)) {
      return "双持";
    }

    return normalizedSlot;
  }

  function translateSuffixLabel(text) {
    if (!text) {
      return null;
    }

    const normalizedText = normalizeLookupText(text);
    let translated = normalizedText;
    const statTranslated = translateStatLabel(normalizedText);
    if (statTranslated) {
      translated = statTranslated;
    }
    translated = translated.replace(/\bMax\s+(\d+)\s+selections\b/g, "最多 $1 个选项");
    translated = translateUiText(translated) || translated;

    return translated !== normalizedText ? translated : null;
  }

  function translateBareLabel(text) {
    const normalizedText = normalizeLookupText(text);
    if (!normalizedText) {
      return null;
    }

    const canonicalKey = canonicalEnglishKey(normalizedText);
    const normalizedFallback = canonicalKey ? normalizedNameLookup.get(canonicalKey) : null;

    return (
      dictionary.byName[normalizedText] ||
      dictionary.byAlias?.[normalizedText] ||
      normalizedFallback ||
      lookupStaticLabel(normalizedText) ||
      translateUiText(normalizedText) ||
      translateStatLabel(normalizedText) ||
      null
    );
  }

  function translateCompositeLabel(text) {
    const normalizedText = normalizeLookupText(text);
    if (!normalizedText) {
      return null;
    }

    const directTranslation = translateBareLabel(normalizedText);
    if (directTranslation) {
      return directTranslation;
    }

    const weaponRuneTranslation = translateWeaponRuneComposite(normalizedText);
    if (weaponRuneTranslation) {
      return weaponRuneTranslation;
    }

    const match = normalizedText.match(/^(.*?)(\s*\(([^()]*)\))+$/);
    if (!match) {
      return null;
    }

    const baseText = match[1].trim();
    const suffixes = Array.from(normalizedText.matchAll(/\(([^()]*)\)/g), (entry) => entry[1]);
    const translatedBase = translateBareLabel(baseText);
    if (!translatedBase) {
      return null;
    }

    const translatedSuffixes = suffixes.map((suffix) => translateSuffixLabel(suffix) || suffix);
    return `${translatedBase} (${translatedSuffixes.join(") (")})`;
  }

  function splitWeaponRuneSegments(text) {
    const segments = [];
    let current = "";
    let parenDepth = 0;
    let bracketDepth = 0;

    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];

      if (ch === "(") {
        parenDepth += 1;
        current += ch;
        continue;
      }
      if (ch === ")") {
        parenDepth = Math.max(0, parenDepth - 1);
        current += ch;
        continue;
      }
      if (ch === "[") {
        bracketDepth += 1;
        current += ch;
        continue;
      }
      if (ch === "]") {
        bracketDepth = Math.max(0, bracketDepth - 1);
        current += ch;
        continue;
      }

      if (ch === "/" && parenDepth === 0 && bracketDepth === 0) {
        const piece = normalizeLookupText(current);
        if (piece) {
          segments.push(piece);
        }
        current = "";
        continue;
      }

      current += ch;
    }

    const tail = normalizeLookupText(current);
    if (tail) {
      segments.push(tail);
    }

    return segments;
  }

  function translateWeaponRuneComposite(text) {
    if (!text || !text.includes("[") || !/[A-Za-z]/.test(text)) {
      return null;
    }

    const segments = splitWeaponRuneSegments(text);
    let translatedAny = false;

    const translatedSegments = segments.map((segment) => {
      const translated = translateWeaponRuneSegment(segment);
      if (translated && translated !== segment) {
        translatedAny = true;
        return translated;
      }
      return segment;
    });

    return translatedAny ? translatedSegments.join(" / ") : null;
  }

  function translateWeaponRuneSegment(segment) {
    if (!segment || !/[A-Za-z]/.test(segment)) {
      return null;
    }

    const originalSegment = normalizeLookupText(segment);
    let rest = originalSegment;
    let prefix = "";
    let changed = false;

    const twwMatch = rest.match(/^TWW\s*-\s*/i);
    if (twwMatch) {
      prefix += "TWW - ";
      rest = rest.slice(twwMatch[0].length).trim();
    }

    const slotMatch = rest.match(/^\[([^\]]+)\]\s*/);
    if (slotMatch) {
      const slotRaw = slotMatch[1];
      const slotTranslated = translateWeaponSlotLabel(slotRaw) || normalizeLookupText(slotRaw);
      if (slotTranslated !== normalizeLookupText(slotRaw)) {
        changed = true;
      }
      prefix += `[${slotTranslated}] `;
      rest = rest.slice(slotMatch[0].length).trim();
    }

    const parenBlocks = [];
    let base = rest;
    const parenRegex = /\(([^()]*)\)\s*$/;
    while (true) {
      const m = base.match(parenRegex);
      if (!m) {
        break;
      }
      parenBlocks.unshift(m[1]);
      base = base.slice(0, m.index).trim();
    }

    const normalizedBase = normalizeLookupText(base);
    const baseTranslated =
      translateBareLabel(normalizedBase) ||
      translateUiText(normalizedBase) ||
      normalizedBase;
    if (baseTranslated !== normalizedBase) {
      changed = true;
    }

    const suffix = parenBlocks
      .map((part) => {
        const normalizedPart = normalizeLookupText(part);
        const translatedPart =
          translateSuffixLabel(normalizedPart) ||
          translateUiText(normalizedPart) ||
          normalizedPart;
        if (translatedPart !== normalizedPart) {
          changed = true;
        }
        return `(${translatedPart})`;
      })
      .join(" ");

    if (!changed) {
      return null;
    }

    return `${prefix}${baseTranslated}${suffix ? ` ${suffix}` : ""}`.trim();
  }

  function findTranslationFromElement(element, fallbackText) {
    const itemId = findNearbyItemId(element);
    if (itemId && dictionary.byId[itemId]) {
      return dictionary.byId[itemId];
    }

    return translateCompositeLabel(fallbackText) || null;
  }

  function replaceTrimmedText(rawText, translatedText) {
    const leadingWhitespace = rawText.match(/^\s*/)?.[0] || "";
    const trailingWhitespace = rawText.match(/\s*$/)?.[0] || "";
    return `${leadingWhitespace}${translatedText}${trailingWhitespace}`;
  }

  function translateTextNode(node) {
    const parent = node.parentElement;
    if (!parent || SKIP_TAGS.has(parent.tagName)) {
      return;
    }

    if (parent.closest("[data-rbcn-helper-root]")) {
      return;
    }

    if (parent.closest(SKIP_TRANSLATION_SELECTOR)) {
      return;
    }

    const rawText = node.nodeValue || "";
    const trimmedText = rawText.trim();
    if (!trimmedText) {
      return;
    }

    if (isMachineProfileText(trimmedText)) {
      return;
    }

    const translatedText = findTranslationFromElement(parent, trimmedText);
    if (!translatedText || translatedText === trimmedText) {
      captureUntranslatedText(trimmedText);
      return;
    }

    if (!parent.dataset.rbcnOriginalText) {
      parent.dataset.rbcnOriginalText = trimmedText;
    }

    node.nodeValue = replaceTrimmedText(rawText, translatedText);
  }

  function translateAttributes(element) {
    if (SKIP_TAGS.has(element.tagName)) {
      return;
    }

    if (element.closest("[data-rbcn-helper-root]")) {
      return;
    }

    if (element.closest(SKIP_TRANSLATION_SELECTOR)) {
      return;
    }

    const itemId = extractItemId(element);
    const itemTranslation = itemId ? dictionary.byId[itemId] : null;

    for (const attrName of ["title", "aria-label", "placeholder"]) {
      const currentValue = element.getAttribute(attrName);
      if (!currentValue) {
        continue;
      }

      const trimmedValue = currentValue.trim();
      if (!trimmedValue) {
        continue;
      }

      const translatedValue = itemTranslation || translateCompositeLabel(trimmedValue);
      if (!translatedValue || translatedValue === trimmedValue) {
        captureUntranslatedText(trimmedValue);
        continue;
      }

      element.setAttribute(
        attrName,
        replaceTrimmedText(currentValue, translatedValue)
      );
    }

    if (element instanceof HTMLInputElement && ["button", "submit", "reset"].includes(element.type)) {
      const translatedValue = translateCompositeLabel(element.value?.trim() || "");
      if (translatedValue && translatedValue !== element.value) {
        element.value = translatedValue;
      }
    }
  }

  function translateRoot(root) {
    if (!dictionary || !document.body) {
      return;
    }

    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }

    if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) {
      return;
    }

    if (root instanceof Element) {
      translateAttributes(root);
    }

    const elementWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    while (elementWalker.nextNode()) {
      translateAttributes(elementWalker.currentNode);
    }

    const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (textWalker.nextNode()) {
      translateTextNode(textWalker.currentNode);
    }
  }

  function isTopGearPage() {
    return location.pathname.startsWith("/simbot/topgear");
  }

  function ensureHelperUi() {
    if (helperRoot) {
      return;
    }

    helperRoot = document.createElement("div");
    helperRoot.dataset.rbcnHelperRoot = "true";
    helperRoot.style.position = "fixed";
    helperRoot.style.zIndex = "2147483647";
    helperRoot.style.minWidth = "320px";
    helperRoot.style.maxWidth = "520px";
    helperRoot.style.maxHeight = "360px";
    helperRoot.style.overflow = "hidden";
    helperRoot.style.display = "none";
    helperRoot.style.border = "1px solid rgba(255,255,255,0.14)";
    helperRoot.style.borderRadius = "10px";
    helperRoot.style.background = "#20222a";
    helperRoot.style.boxShadow = "0 18px 40px rgba(0,0,0,0.42)";
    helperRoot.style.fontFamily = 'Lato, "Noto Sans SC", sans-serif';

    helperList = document.createElement("div");
    helperList.style.maxHeight = "360px";
    helperList.style.overflowY = "auto";

    helperEmpty = document.createElement("div");
    helperEmpty.style.display = "none";
    helperEmpty.style.padding = "12px 14px";
    helperEmpty.style.color = "#c8ccd7";
    helperEmpty.style.fontSize = "13px";
    helperEmpty.textContent = "没有匹配到中文装备名";

    helperRoot.append(helperList, helperEmpty);
    document.body.appendChild(helperRoot);
  }

  async function loadSearchIndex() {
    if (searchIndex) {
      return searchIndex;
    }

    if (!searchIndexPromise) {
      searchIndexPromise = fetch(SEARCH_INDEX_URL)
        .then((response) => response.json())
        .then((payload) => {
          searchIndex = payload.entries || [];
          return searchIndex;
        })
        .catch((error) => {
          console.error("[raidbots-item-cn] Failed to load item search index.", error);
          return [];
        });
    }

    return searchIndexPromise;
  }

  function isSearchableTarget(target) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    if (!target.matches(SEARCHABLE_SELECTOR)) {
      return false;
    }

    if (target.getAttribute("type") === "hidden") {
      return false;
    }

    return true;
  }

  function getEditableValue(target) {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      return target.value || "";
    }

    return target.textContent || "";
  }

  function setEditableValue(target, value) {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const setter = target instanceof HTMLInputElement ? inputValueSetter : textareaValueSetter;
      const previousValue = target.value;
      if (setter) {
        setter.call(target, value);
      } else {
        target.value = value;
      }
      const valueTracker = target._valueTracker;
      if (valueTracker && typeof valueTracker.setValue === "function") {
        valueTracker.setValue(previousValue);
      }
      return;
    }

    target.textContent = value;
  }

  function dispatchEditableInput(target, inputType = "insertText", data = null) {
    target.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType, data }));
    target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType, data }));
    target.dispatchEvent(new Event("search", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function replaySearchInput(target, nextValue) {
    setEditableValue(target, "");
    dispatchEditableInput(target, "deleteContentBackward", null);

    await new Promise((resolve) => setTimeout(resolve, 0));

    setEditableValue(target, nextValue);
    dispatchEditableInput(target, "insertText", nextValue);

    const lastChar = nextValue.slice(-1) || " ";
    target.dispatchEvent(new KeyboardEvent("keydown", { key: lastChar, bubbles: true }));
    target.dispatchEvent(new KeyboardEvent("keyup", { key: lastChar, bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 30));

    if (getEditableValue(target) !== nextValue) {
      setEditableValue(target, nextValue);
      dispatchEditableInput(target, "insertReplacementText", nextValue);
    }

  }

  function hideSearchHelper() {
    activeSearchResults = [];
    activeResultIndex = -1;
    activeSearchTarget = null;

    if (helperRoot) {
      helperRoot.style.display = "none";
    }
  }

  function scheduleHideSearchHelper() {
    clearTimeout(helperHideTimer);
    helperHideTimer = setTimeout(hideSearchHelper, 120);
  }

  function cancelHideSearchHelper() {
    clearTimeout(helperHideTimer);
  }

  function positionSearchHelper(target) {
    if (!helperRoot || !target || !document.body.contains(target)) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const top = Math.min(rect.bottom + 6, window.innerHeight - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - 540));
    const width = Math.max(320, Math.min(rect.width, 520));

    helperRoot.style.top = `${top}px`;
    helperRoot.style.left = `${left}px`;
    helperRoot.style.width = `${width}px`;
  }

  function renderSearchHelper() {
    ensureHelperUi();

    helperList.replaceChildren();

    if (!activeSearchTarget || activeSearchResults.length === 0) {
      helperEmpty.style.display = "block";
      helperRoot.style.display = activeSearchTarget ? "block" : "none";
      if (activeSearchTarget) {
        positionSearchHelper(activeSearchTarget);
      }
      return;
    }

    helperEmpty.style.display = "none";

    activeSearchResults.forEach((result, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.dataset.rbcnIndex = String(index);
      item.style.display = "block";
      item.style.width = "100%";
      item.style.padding = "10px 14px";
      item.style.border = "0";
      item.style.borderBottom = "1px solid rgba(255,255,255,0.06)";
      item.style.background = "transparent";
      item.style.color = "#ffffff";
      item.style.cursor = "pointer";
      item.style.textAlign = "left";

      const primary = document.createElement("div");
      primary.style.fontSize = "14px";
      primary.style.fontWeight = "700";
      primary.textContent = result.zh;

      const secondary = document.createElement("div");
      secondary.style.marginTop = "2px";
      secondary.style.fontSize = "12px";
      secondary.style.color = "#b3bac8";
      secondary.textContent = result.en;

      item.append(primary, secondary);

      helperList.appendChild(item);
    });

    helperRoot.style.display = "block";
    positionSearchHelper(activeSearchTarget);
    syncActiveResultStyles();
  }

  function syncActiveResultStyles() {
    if (!helperList) {
      return;
    }

    const items = helperList.querySelectorAll("[data-rbcn-index]");
    items.forEach((item) => {
      const isActive = Number(item.dataset.rbcnIndex) === activeResultIndex;
      item.style.background = isActive ? "#2d313d" : "transparent";
    });
  }

  async function applySearchResult(result) {
    if (!activeSearchTarget || !result) {
      return;
    }

    const target = activeSearchTarget;
    cancelHideSearchHelper();
    if (target instanceof HTMLElement) {
      target.focus();
    }

    await replaySearchInput(target, result.en);

    if (target instanceof HTMLElement) {
      target.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
      target.dispatchEvent(new KeyboardEvent("keyup", { key: "End", bubbles: true }));
      target.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
      target.dispatchEvent(new KeyboardEvent("keypress", { key: "Enter", code: "Enter", bubbles: true }));
      target.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));
    }

    const form = target.closest("form");
    if (form) {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      }
    }

    hideSearchHelper();
  }

  function buildSearchResults(entries, query) {
    const exact = [];
    const prefix = [];
    const contains = [];

    for (const [zh, en] of entries) {
      if (!zh.includes(query)) {
        continue;
      }

      const result = { zh, en };
      if (zh === query) {
        exact.push(result);
      } else if (zh.startsWith(query)) {
        prefix.push(result);
      } else {
        contains.push(result);
      }

      if (exact.length + prefix.length + contains.length >= SEARCH_RESULTS_LIMIT * 3) {
        break;
      }
    }

    return exact
      .concat(prefix, contains)
      .sort((left, right) => left.zh.length - right.zh.length || left.en.localeCompare(right.en))
      .slice(0, SEARCH_RESULTS_LIMIT);
  }

  async function updateSearchHelper(target) {
    if (!isTopGearPage() || !isSearchableTarget(target)) {
      hideSearchHelper();
      return;
    }

    const query = getEditableValue(target).trim();
    if (!query || !CJK_PATTERN.test(query)) {
      hideSearchHelper();
      return;
    }

    activeSearchTarget = target;
    const entries = await loadSearchIndex();

    if (target !== activeSearchTarget) {
      return;
    }

    activeSearchResults = buildSearchResults(entries, query);
    activeResultIndex = activeSearchResults.length > 0 ? 0 : -1;
    renderSearchHelper();
  }

  function handleSearchTargetInput(event) {
    const target = event.target;
    if (!isSearchableTarget(target)) {
      return;
    }

    updateSearchHelper(target);
  }

  function handleSearchTargetFocus(event) {
    const target = event.target;
    if (!isSearchableTarget(target)) {
      return;
    }

    updateSearchHelper(target);
  }

  function handleSearchTargetBlur(event) {
    const target = event.target;
    if (target === activeSearchTarget) {
      scheduleHideSearchHelper();
    }
  }

  function moveSelection(step) {
    if (activeSearchResults.length === 0) {
      return;
    }

    activeResultIndex = (activeResultIndex + step + activeSearchResults.length) % activeSearchResults.length;
    syncActiveResultStyles();
  }

  function handleSearchTargetKeydown(event) {
    if (event.target !== activeSearchTarget || activeSearchResults.length === 0 || helperRoot?.style.display !== "block") {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
      return;
    }

    if (event.key === "Enter" && activeResultIndex >= 0) {
      event.preventDefault();
      applySearchResult(activeSearchResults[activeResultIndex]);
      return;
    }

    if (event.key === "Escape") {
      hideSearchHelper();
    }
  }

  function installChineseSearchHelper() {
    ensureHelperUi();

    helperRoot.addEventListener("mouseenter", cancelHideSearchHelper);
    helperRoot.addEventListener("mouseleave", scheduleHideSearchHelper);
    helperRoot.addEventListener("mousedown", (event) => {
      const item = event.target.closest("[data-rbcn-index]");
      if (!item) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const index = Number(item.dataset.rbcnIndex);
      if (!Number.isNaN(index)) {
        activeResultIndex = index;
        syncActiveResultStyles();
        applySearchResult(activeSearchResults[index]);
      }
    });
    helperRoot.addEventListener("mousemove", (event) => {
      const item = event.target.closest("[data-rbcn-index]");
      if (!item) {
        return;
      }

      const index = Number(item.dataset.rbcnIndex);
      if (Number.isNaN(index) || index === activeResultIndex) {
        return;
      }

      activeResultIndex = index;
      syncActiveResultStyles();
    });

    document.addEventListener("focusin", handleSearchTargetFocus, true);
    document.addEventListener("focusout", handleSearchTargetBlur, true);
    document.addEventListener("input", handleSearchTargetInput, true);
    document.addEventListener("keydown", handleSearchTargetKeydown, true);

    window.addEventListener("scroll", () => positionSearchHelper(activeSearchTarget), true);
    window.addEventListener("resize", () => positionSearchHelper(activeSearchTarget));
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        scheduleFlush(mutation.target);
      }

      for (const node of mutation.addedNodes) {
        scheduleFlush(node);
      }
    }
  });

  installChineseSearchHelper();
  window.__rbcnGetUntranslatedTexts = () => Array.from(untranslatedUiTexts).sort();
  window.__rbcnClearUntranslatedTexts = () => untranslatedUiTexts.clear();
  scheduleFlush(document.body);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();
