<div align="center">

<img src="https://img.shields.io/badge/Minecraft-AI%20Bot-4ade80?style=for-the-badge&logo=creativecommons&logoColor=white"/>
<img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
<img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white"/>
<img src="https://img.shields.io/badge/Claude%20%7C%20GPT-Powered-a855f7?style=for-the-badge&logo=anthropic&logoColor=white"/>
<img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge"/>

<br/>
<br/>

# ⛏ Minecraft AI Bot
### 让 AI 自主玩 Minecraft · Let AI Play Minecraft Autonomously

<br/>

*一键启动 · 图形界面 · 无需代码基础*  
*One-click launch · GUI · No coding required*

<br/>

</div>

---

## ✨ 项目简介 · Overview

**中文**

本项目是一个让 AI（Claude / GPT-4）**自主控制 Minecraft 角色**的图形化工具。  
用户无需懂编程，只需填写服务器地址和 API Key，AI 就能自动进入游戏、探索世界、挖矿建造、应对怪物——像一个真正的玩家一样。

**English**

This project lets AI models (Claude / GPT-4) **autonomously control a Minecraft character** through an easy-to-use GUI.  
No programming knowledge required — just enter your server address and API Key, and the AI will join the game, explore, mine, build, and fight mobs like a real player.

<br/>

## 🎬 工作原理 · How It Works

```
你（用户）              图形启动器              AI 大脑                Minecraft 服务器
You (User)         Graphical Launcher        AI Brain              Minecraft Server

   填写配置     →    读取配置，启动 Bot   →   感知游戏状态    →    在游戏里执行动作
 Fill config    →  Launch bot process   →  Perceive world  →   Execute in-game actions

                                         ↑                  ↓
                                    获取结果 · Get result ←←←
```

AI 每一步都会：
1. **观察** — 查看自身坐标、血量、背包、周围实体
2. **思考** — 调用 Claude / GPT API 决定下一步行动
3. **执行** — 移动、挖掘、建造、战斗、聊天
4. **循环** — 看到结果后继续下一轮决策

The AI autonomously cycles through: **observe → think → act → repeat**

<br/>

## 🚀 快速开始 · Quick Start

### 第一步 · Step 1 — 安装依赖 Install Prerequisites

| 软件 Software | 版本 Version | 下载 Download |
|---|---|---|
| Python | 3.10 + | [python.org](https://www.python.org/downloads/) |
| Node.js | 18 LTS + | [nodejs.org](https://nodejs.org/zh-cn) |

> ⚠️ **Windows 用户**：安装 Python 时务必勾选 **"Add Python to PATH"**  
> ⚠️ **Windows users**: Make sure to check **"Add Python to PATH"** during installation

<br/>

### 第二步 · Step 2 — 下载本项目 Download

```bash
git clone https://github.com/your-username/minecraft-ai-bot.git
cd minecraft-ai-bot
```

或直接点击页面右上角 **Code → Download ZIP** 解压即可  
Or click **Code → Download ZIP** on this page

<br/>

### 第三步 · Step 3 — 启动 Launch

| 系统 OS | 操作 Action |
|---|---|
| 🪟 Windows | 双击 `启动器.bat` · Double-click `启动器.bat` |
| 🍎 macOS | 双击 `启动器.command` · Double-click `启动器.command` |
| 🐧 Linux | `python3 launcher.py` |

> 首次启动会自动安装 Bot 组件（约 1-2 分钟），之后无需等待  
> First launch auto-installs bot components (~1-2 min). Subsequent launches are instant.

<br/>

## 🖥 图形界面说明 · GUI Guide

```
┌─────────────────────────────────────────────────────────────┐
│  ⛏ Minecraft AI 机器人 · 启动器              ● 运行中       │
├──────────────────────┬──────────────────────────────────────┤
│                      │  📜 运行日志                         │
│  🖥 Minecraft 服务器  │                                      │
│  ─────────────────   │  [10:23:01] ✅ 已进入游戏！          │
│  服务器地址  ______   │  [10:23:02] 🤖 正在查看周围环境...  │
│  端口        ______   │  [10:23:04] [执行] find_and_mine     │
│  MC 版本     ______   │  [10:23:08] 🌲 找到橡木，开始砍树   │
│  机器人名称  ______   │  [10:23:15] 💬 已收集 5 块木头！    │
│                      │  [10:23:16] [执行] craft              │
│  🤖 AI 设置           │  [10:23:17] 🔨 合成了工作台          │
│  ─────────────────   │                                      │
│  ● Claude  ○ GPT     │                                      │
│  API Key   ______    │                                      │
│  目标      ______    │                                      │
│            ______    │                                      │
│                      │                                      │
│  [▶ 启动 AI 机器人]  │                                      │
└──────────────────────┴──────────────────────────────────────┘
```

<br/>

## 🔑 获取 API Key · Getting an API Key

### Claude (Anthropic) — 推荐 Recommended

1. 访问 [console.anthropic.com](https://console.anthropic.com/)
2. 注册账号 → 进入 **API Keys** → **Create Key**
3. 复制以 `sk-ant-api03-...` 开头的 Key

### GPT (OpenAI)

1. 访问 [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. 登录 → **API Keys** → **Create new secret key**
3. 复制以 `sk-proj-...` 开头的 Key

<br/>

## 🎯 目标示例 · Goal Examples

在启动器的「机器人目标」栏里，**用中文自由描述**你想让机器人做什么：  
In the "Bot Goal" field, describe freely in Chinese what you want the bot to do:

| 目标描述 Goal | AI 会做什么 What the AI does |
|---|---|
| 收集木头，建造一个小木屋 | 砍树 → 合成工具 → 选地基 → 逐块建造 |
| 探索地下，挖掘所有矿石 | 找洞穴 → 下矿 → 挖铁/煤/钻石 |
| 在游戏里生存尽可能久 | 找食物 → 造庇护所 → 夜晚躲避怪物 |
| 跟随玩家 Steve 并帮助他 | 跟随移动 → 分享物品 → 协助战斗 |

<br/>

## 💬 游戏内控制 · In-Game Control

在 Minecraft 聊天框输入以下指令可以实时控制机器人：  
Type these commands in the Minecraft chat to control the bot in real time:

```
!goal 去挖矿          → 立即改变机器人目标
!goal 跟着我走        → 让机器人跟随你
!goal 停下来          → 暂停行动
```

<br/>

## 📁 项目结构 · Project Structure

```
minecraft-ai-bot/
│
├── 📄 launcher.py          # 图形界面启动器 · GUI Launcher (main entry)
│
├── 🤖 bot/
│   ├── bot.js              # AI 控制核心 · AI control core
│   └── package.json        # Node.js 依赖 · Node.js dependencies
│
├── ⚙️ config.json          # 用户配置（自动生成）· User config (auto-generated)
│
├── 🪟 启动器.bat            # Windows 一键启动
├── 🍎 启动器.command        # macOS 一键启动
└── 📖 安装说明.txt          # 详细安装指南 · Detailed install guide
```

<br/>

## 🛠 AI 可执行的游戏操作 · Available AI Actions

| 工具 Tool | 描述 Description |
|---|---|
| `get_status` | 获取坐标、血量、时间、周围实体 · Position, health, time, nearby entities |
| `get_inventory` | 查看背包物品 · View inventory items |
| `move_to` | 自动寻路移动到坐标 · Pathfind to coordinates |
| `find_and_mine` | 搜索并挖掘指定方块 · Search and mine specific blocks |
| `craft` | 合成物品 · Craft items |
| `place_block` | 放置方块 · Place a block |
| `attack_nearest_mob` | 攻击最近的怪物 · Attack nearest mob |
| `equip_best_tool` | 装备最好的工具 · Equip the best tool |
| `eat_food` | 吃背包里的食物 · Eat food from inventory |
| `look_around` | 扫描周围地形与实体 · Scan surroundings |
| `chat` | 发送游戏聊天消息 · Send chat message |
| `jump` | 跳跃 · Jump |

<br/>

## ⚙️ 服务器配置要求 · Server Requirements

Minecraft 服务器需要在 `server.properties` 中设置：  
Set the following in your Minecraft server's `server.properties`:

```properties
online-mode=false    # 允许机器人免正版登录 · Allow offline-mode bots
```

推荐使用 **Paper** 或 **Fabric** 服务端，版本 **1.19.x – 1.20.x**。  
Recommended: **Paper** or **Fabric** server, version **1.19.x – 1.20.x**.

<br/>

## ❓ 常见问题 · FAQ

<details>
<summary><b>Q: 双击启动器没有反应 / Launcher doesn't open</b></summary>

检查是否安装了 Python 并添加到 PATH。  
打开命令提示符（cmd）输入 `python --version`，如果没有输出请重新安装 Python。

Check if Python is installed and added to PATH.  
Open a terminal and run `python --version`. If nothing shows, reinstall Python with "Add to PATH" checked.
</details>

<details>
<summary><b>Q: 机器人连接不上服务器 / Bot can't connect to server</b></summary>

1. 确认服务器地址和端口填写正确  
2. 确认 `server.properties` 中 `online-mode=false`  
3. 检查防火墙是否阻止了 25565 端口  

1. Verify server address and port are correct  
2. Confirm `online-mode=false` in `server.properties`  
3. Check firewall isn't blocking port 25565
</details>

<details>
<summary><b>Q: AI 返回错误 / AI returns errors</b></summary>

- 检查 API Key 是否正确粘贴（无多余空格）  
- 确认 API 账户余额充足  
- Claude Key 格式：`sk-ant-api03-...` / OpenAI Key 格式：`sk-proj-...`

- Check the API Key is pasted correctly (no extra spaces)  
- Ensure your API account has sufficient credits  
- Claude format: `sk-ant-api03-...` / OpenAI format: `sk-proj-...`
</details>

<details>
<summary><b>Q: 首次安装太慢 / First install is slow</b></summary>

首次运行需要下载 Node.js 依赖包（mineflayer 等），大小约 50MB，视网速需要 1-3 分钟。  
之后每次启动无需等待。

First run downloads Node.js packages (~50MB). This takes 1-3 minutes depending on your connection speed.  
All subsequent launches are instant.
</details>

<br/>

## 🗺 开发路线图 · Roadmap

- [x] 图形化启动器 · Graphical launcher
- [x] Claude + GPT 双支持 · Claude & GPT support
- [x] 自动寻路移动 · Pathfinding movement
- [x] 挖矿 / 建造 / 战斗 · Mining / building / combat
- [x] 自动重连 · Auto-reconnect
- [ ] 多机器人协作 · Multi-bot cooperation
- [ ] 截图与视觉感知 · Screenshot & visual perception
- [ ] 预设目标模板库 · Preset goal template library
- [ ] 机器人行为回放 · Bot action replay
- [ ] Web 远程控制面板 · Web remote control panel

<br/>

## 🤝 贡献指南 · Contributing

欢迎 PR 和 Issue！  
PRs and Issues are welcome!

```bash
# Fork 后本地开发
git checkout -b feature/your-feature
git commit -m "feat: add something cool"
git push origin feature/your-feature
# 然后提交 Pull Request · Then open a Pull Request
```

<br/>

## 📄 许可证 · License

MIT License — 自由使用、修改、分发 · Free to use, modify, and distribute.

---

<div align="center">

**如果这个项目对你有帮助，请点个 ⭐ Star！**  
**If this project helped you, please give it a ⭐ Star!**

<br/>

Made with ❤️ and powered by [Anthropic Claude](https://anthropic.com) · [Mineflayer](https://github.com/PrismarineJS/mineflayer)

</div>
