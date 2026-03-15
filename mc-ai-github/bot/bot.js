'use strict';
/**
 * Minecraft AI Bot — 单文件核心
 * 读取环境变量 / .runtime_config.json 完成配置
 * 自动连接 AI API，自主决策控制角色
 */

const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');
const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

// ── 读取配置 ──────────────────────────────────────────────────────────────────
let CFG = {};
const cfgFile = path.join(__dirname, '.runtime_config.json');
if (fs.existsSync(cfgFile)) {
  try { CFG = JSON.parse(fs.readFileSync(cfgFile, 'utf8')); } catch(e) {}
}

const MC_HOST      = process.env.MC_HOST      || CFG.server_host  || 'localhost';
const MC_PORT      = parseInt(process.env.MC_PORT || CFG.server_port || '25565');
const MC_VERSION   = process.env.MC_VERSION   || CFG.mc_version   || '1.20.1';
const BOT_USERNAME = process.env.BOT_USERNAME || CFG.bot_name     || 'AI_Bot';
const API_KEY      = process.env.API_KEY      || CFG.api_key      || '';
const AI_PROVIDER  = (process.env.AI_PROVIDER || CFG.ai_provider  || 'claude').toLowerCase();
const BOT_GOAL     = process.env.BOT_GOAL     || CFG.bot_goal     || '探索世界，生存下去';
const AUTO_RECONNECT = (process.env.AUTO_RECONNECT || '1') !== '0';

// ── AI 请求 ───────────────────────────────────────────────────────────────────
async function askAI(messages, tools) {
  if (AI_PROVIDER === 'claude') {
    return await callClaude(messages, tools);
  } else if (AI_PROVIDER === 'openai') {
    return await callOpenAI(messages, tools);
  } else {
    throw new Error(`未知的 AI 供应商: ${AI_PROVIDER}`);
  }
}

function httpPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname, path, method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch(e) { reject(new Error(`JSON parse error: ${raw.slice(0,200)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('AI request timed out')); });
    req.write(data);
    req.end();
  });
}

async function callClaude(messages, tools) {
  const res = await httpPost('api.anthropic.com', '/v1/messages', {
    'x-api-key': API_KEY,
    'anthropic-version': '2023-06-01',
  }, {
    model: 'claude-opus-4-5',
    max_tokens: 2048,
    system: buildSystemPrompt(),
    tools,
    messages,
  });
  if (res.status !== 200) throw new Error(`Claude API ${res.status}: ${JSON.stringify(res.body)}`);
  return parseClaude(res.body);
}

async function callOpenAI(messages, tools) {
  // Convert Claude-style tools to OpenAI function format
  const functions = tools.map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  }));
  const oaiMessages = [
    { role: 'system', content: buildSystemPrompt() },
    ...messages.map(m => ({
      role: m.role,
      content: Array.isArray(m.content)
        ? m.content.map(c => c.type === 'text' ? c.text : JSON.stringify(c)).join('\n')
        : m.content,
    }))
  ];
  const res = await httpPost('api.openai.com', '/v1/chat/completions', {
    'Authorization': `Bearer ${API_KEY}`,
  }, {
    model: 'gpt-4o',
    messages: oaiMessages,
    functions,
    function_call: 'auto',
    max_tokens: 2048,
  });
  if (res.status !== 200) throw new Error(`OpenAI API ${res.status}: ${JSON.stringify(res.body)}`);
  return parseOpenAI(res.body);
}

function parseClaude(body) {
  const toolCalls = [];
  let text = '';
  for (const block of (body.content || [])) {
    if (block.type === 'text') text += block.text;
    if (block.type === 'tool_use') toolCalls.push({ id: block.id, name: block.name, input: block.input });
  }
  return { text, toolCalls, stopReason: body.stop_reason };
}

function parseOpenAI(body) {
  const msg = body.choices?.[0]?.message;
  const toolCalls = [];
  if (msg?.function_call) {
    toolCalls.push({ id: 'fc_0', name: msg.function_call.name, input: JSON.parse(msg.function_call.arguments || '{}') });
  }
  return { text: msg?.content || '', toolCalls, stopReason: msg?.function_call ? 'tool_use' : 'end_turn' };
}

// ── 工具定义 ──────────────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'get_status',
    description: '获取机器人当前状态：坐标、血量、饥饿、时间、附近实体',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'get_inventory',
    description: '查看背包里有什么物品',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'move_to',
    description: '走到指定坐标（自动寻路绕过障碍）',
    input_schema: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X 坐标' },
        y: { type: 'number', description: 'Y 坐标' },
        z: { type: 'number', description: 'Z 坐标' }
      },
      required: ['x', 'y', 'z']
    }
  },
  {
    name: 'chat',
    description: '在游戏聊天框发送一条消息',
    input_schema: {
      type: 'object',
      properties: { message: { type: 'string', description: '要发送的消息内容' } },
      required: ['message']
    }
  },
  {
    name: 'mine_block',
    description: '挖掉指定坐标的方块',
    input_schema: {
      type: 'object',
      properties: {
        x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' }
      },
      required: ['x', 'y', 'z']
    }
  },
  {
    name: 'place_block',
    description: '在指定坐标放置手持方块',
    input_schema: {
      type: 'object',
      properties: {
        x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' }
      },
      required: ['x', 'y', 'z']
    }
  },
  {
    name: 'attack_nearest_mob',
    description: '攻击附近最近的怪物或生物',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'equip_best_tool',
    description: '装备背包中最好的工具或武器',
    input_schema: {
      type: 'object',
      properties: { type: { type: 'string', description: '工具类型: sword / pickaxe / axe / shovel / hoe' } },
      required: ['type']
    }
  },
  {
    name: 'eat_food',
    description: '吃掉背包里的食物（血量或饥饿值低时使用）',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'find_and_mine',
    description: '在周围寻找并挖掘指定类型的方块（如 oak_log, coal_ore, iron_ore）',
    input_schema: {
      type: 'object',
      properties: {
        block_name: { type: 'string', description: 'Minecraft 方块 ID，如 oak_log、coal_ore' },
        count:      { type: 'integer', description: '目标数量', default: 5 }
      },
      required: ['block_name']
    }
  },
  {
    name: 'craft',
    description: '合成物品（需要材料在背包里）',
    input_schema: {
      type: 'object',
      properties: {
        item_name: { type: 'string', description: '要合成的物品 ID，如 crafting_table、wooden_pickaxe' },
        count:     { type: 'integer', default: 1 }
      },
      required: ['item_name']
    }
  },
  {
    name: 'look_around',
    description: '查看周围更大范围内的地形、方块和实体信息',
    input_schema: {
      type: 'object',
      properties: { radius: { type: 'integer', default: 20 } }
    }
  },
  {
    name: 'jump',
    description: '跳跃一次',
    input_schema: { type: 'object', properties: {} }
  },
];

// ── 系统提示 ──────────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  return `你是一个在 Minecraft 中自主行动的 AI 机器人。

你的目标：${BOT_GOAL}

行动准则：
- 优先保证生存：血量低时寻找食物，夜晚时建造或躲进洞穴
- 循序渐进：木头→木工具→石工具→收集更多资源→建造
- 每次行动前先用 get_status 了解周围情况
- 通过 chat 工具向玩家汇报你在做什么
- 发现怪物时及时用 attack_nearest_mob 处理
- 遇到错误要换个方式尝试，不要放弃

你可以使用工具执行各种 Minecraft 操作。每次只执行一个行动，然后等待结果再决定下一步。`;
}

// ── 工具执行 ──────────────────────────────────────────────────────────────────
const v3 = v => v ? { x: +v.x.toFixed(1), y: +v.y.toFixed(1), z: +v.z.toFixed(1) } : null;

async function executeTool(bot, name, input) {
  try {
    switch(name) {

      case 'get_status': {
        const pos = v3(bot.entity.position);
        const tod = bot.time.timeOfDay;
        const phase = tod < 6000 ? '清晨' : tod < 12000 ? '下午' : tod < 18000 ? '傍晚' : '夜晚';
        const nearby = Object.values(bot.entities)
          .filter(e => e.id !== bot.entity.id && e.position.distanceTo(bot.entity.position) < 20)
          .map(e => `${e.name||e.username||e.type}(${e.position.distanceTo(bot.entity.position).toFixed(1)}m)`)
          .slice(0, 8);
        return { pos, health: bot.health, food: bot.food, time: phase, nearby_entities: nearby };
      }

      case 'get_inventory': {
        const items = bot.inventory.items().map(i => `${i.displayName||i.name} x${i.count}`);
        return { items, empty_slots: 36 - items.length };
      }

      case 'move_to': {
        const g = new goals.GoalBlock(Math.floor(input.x), Math.floor(input.y), Math.floor(input.z));
        await bot.pathfinder.goto(g);
        return { success: true, now_at: v3(bot.entity.position) };
      }

      case 'chat': {
        bot.chat(String(input.message).slice(0, 256));
        return { sent: true };
      }

      case 'mine_block': {
        const block = bot.blockAt(new Vec3(input.x, input.y, input.z));
        if (!block || block.name === 'air') return { error: '该位置没有方块' };
        await bot.dig(block);
        return { mined: block.name };
      }

      case 'place_block': {
        const ref = bot.blockAt(new Vec3(input.x, input.y - 1, input.z));
        if (!ref) return { error: '参考方块不存在' };
        await bot.placeBlock(ref, new Vec3(0, 1, 0));
        return { placed: true };
      }

      case 'attack_nearest_mob': {
        const mob = bot.nearestEntity(e => e.id !== bot.entity.id && e.type === 'mob');
        if (!mob) return { error: '附近没有怪物' };
        await bot.attack(mob);
        return { attacked: mob.name, distance: mob.position.distanceTo(bot.entity.position).toFixed(1) };
      }

      case 'equip_best_tool': {
        const mcData = require('minecraft-data')(bot.version);
        const toolType = input.type || 'sword';
        const candidates = bot.inventory.items().filter(i => i.name.includes(toolType));
        if (!candidates.length) return { error: `背包里没有 ${toolType}` };
        const tiers = ['netherite','diamond','golden','iron','stone','wooden'];
        candidates.sort((a, b) => tiers.findIndex(t=>a.name.includes(t)) - tiers.findIndex(t=>b.name.includes(t)));
        await bot.equip(candidates[0], 'hand');
        return { equipped: candidates[0].displayName || candidates[0].name };
      }

      case 'eat_food': {
        const foods = bot.inventory.items().filter(i => i.foodPoints || ['bread','apple','carrot','cooked_beef','cooked_porkchop','cooked_chicken','cookie'].some(f=>i.name.includes(f)));
        if (!foods.length) return { error: '背包里没有食物' };
        await bot.equip(foods[0], 'hand');
        await bot.consume();
        return { ate: foods[0].displayName || foods[0].name };
      }

      case 'find_and_mine': {
        const mcData = require('minecraft-data')(bot.version);
        const blockType = mcData.blocksByName[input.block_name];
        if (!blockType) return { error: `未知方块: ${input.block_name}` };
        const count = input.count || 5;
        let mined = 0;
        for (let attempt = 0; attempt < count * 3 && mined < count; attempt++) {
          const blocks = bot.findBlocks({ matching: blockType.id, maxDistance: 32, count: 1 });
          if (!blocks.length) break;
          const target = bot.blockAt(blocks[0]);
          if (!target) break;
          try {
            await bot.pathfinder.goto(new goals.GoalBlock(target.position.x, target.position.y, target.position.z));
            await bot.dig(target);
            mined++;
          } catch(e) { /* 继续尝试 */ }
        }
        return { mined_count: mined, block: input.block_name };
      }

      case 'craft': {
        const mcData = require('minecraft-data')(bot.version);
        const item = mcData.itemsByName[input.item_name];
        if (!item) return { error: `未知物品: ${input.item_name}` };
        const recipe = bot.recipesFor(item.id, null, 1, null)[0];
        if (!recipe) return { error: `没有 ${input.item_name} 的配方，或材料不足` };
        await bot.craft(recipe, input.count || 1, null);
        return { crafted: input.item_name, count: input.count || 1 };
      }

      case 'look_around': {
        const radius = input.radius || 20;
        const pos = bot.entity.position;
        const SKIP = new Set(['air','cave_air','stone','dirt','grass_block','gravel','sand','water','lava','bedrock']);
        const notable = [];
        for (let dx=-radius;dx<=radius;dx+=2) for (let dy=-8;dy<=8;dy+=2) for (let dz=-radius;dz<=radius;dz+=2) {
          const b = bot.blockAt(pos.offset(dx,dy,dz));
          if (b && !SKIP.has(b.name)) notable.push(`${b.name}@(${Math.floor(pos.x+dx)},${Math.floor(pos.y+dy)},${Math.floor(pos.z+dz)})`);
        }
        const entities = Object.values(bot.entities)
          .filter(e => e.id !== bot.entity.id && e.position.distanceTo(pos) <= radius)
          .map(e => `${e.name||e.type}@${e.position.distanceTo(pos).toFixed(0)}m`);
        return { position: v3(pos), notable_blocks: [...new Set(notable)].slice(0,30), entities: entities.slice(0,15) };
      }

      case 'jump': {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 200);
        return { jumped: true };
      }

      default:
        return { error: `未知工具: ${name}` };
    }
  } catch(err) {
    return { error: err.message };
  }
}

// ── AI 决策主循环 ─────────────────────────────────────────────────────────────
async function runAILoop(bot) {
  const messages = [];
  let iteration  = 0;

  while (true) {
    iteration++;
    console.log(`\n[AI] 决策轮次 #${iteration}`);

    // 首轮自动获取状态作为上下文
    if (iteration === 1) {
      const status = await executeTool(bot, 'get_status', {});
      messages.push({
        role: 'user',
        content: `游戏开始！当前状态：${JSON.stringify(status, null, 2)}\n目标：${BOT_GOAL}\n请开始行动。`
      });
    }

    let response;
    try {
      response = await askAI(messages, TOOLS);
    } catch(err) {
      console.error('[AI] API 调用失败:', err.message);
      await sleep(10000);
      continue;
    }

    if (response.text) {
      console.log('[AI 思考]', response.text.slice(0, 200));
    }

    // 没有工具调用 → 休息一下再继续
    if (!response.toolCalls || response.toolCalls.length === 0) {
      console.log('[AI] 本轮无行动，5秒后继续...');
      await sleep(5000);
      messages.push({ role: 'user', content: '继续执行你的目标，使用工具采取行动。' });
      continue;
    }

    // 构建 assistant 消息
    const assistantContent = [];
    if (response.text) assistantContent.push({ type: 'text', text: response.text });
    for (const tc of response.toolCalls) {
      assistantContent.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input });
    }
    messages.push({ role: 'assistant', content: assistantContent });

    // 执行工具
    const toolResults = [];
    for (const tc of response.toolCalls) {
      console.log(`[执行] ${tc.name}(${JSON.stringify(tc.input)})`);
      const result = await executeTool(bot, tc.name, tc.input);
      console.log(`[结果] ${JSON.stringify(result).slice(0, 150)}`);
      toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: JSON.stringify(result) });

      // OpenAI 格式
      if (AI_PROVIDER === 'openai') {
        messages.push({ role: 'function', name: tc.name, content: JSON.stringify(result) });
      }
    }

    if (AI_PROVIDER === 'claude') {
      messages.push({ role: 'user', content: toolResults });
    }

    // 限制历史消息长度（防止上下文溢出）
    if (messages.length > 40) {
      const systemLike = messages.slice(0, 2);
      const recent     = messages.slice(-20);
      messages.length = 0;
      messages.push(...systemLike, { role: 'user', content: '[历史已压缩] 继续你的目标。' }, ...recent);
    }

    await sleep(1500); // 每次行动间隔，避免操作过快
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Bot 启动 ──────────────────────────────────────────────────────────────────
async function startBot() {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🤖  Minecraft AI Bot 启动`);
  console.log(`   服务器  : ${MC_HOST}:${MC_PORT}`);
  console.log(`   版本    : ${MC_VERSION}`);
  console.log(`   名称    : ${BOT_USERNAME}`);
  console.log(`   AI 模型 : ${AI_PROVIDER.toUpperCase()}`);
  console.log(`   目标    : ${BOT_GOAL}`);
  console.log('='.repeat(50));

  if (!API_KEY) {
    console.error('❌ 错误：未设置 API Key！请在启动器中填写你的 API Key。');
    process.exit(1);
  }

  const bot = mineflayer.createBot({
    host: MC_HOST, port: MC_PORT,
    username: BOT_USERNAME, version: MC_VERSION, auth: 'offline',
  });
  bot.loadPlugin(pathfinder);

  bot.once('spawn', async () => {
    console.log(`✅ 已进入游戏！坐标: ${JSON.stringify(v3(bot.entity.position))}`);
    const mcData    = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    movements.allowSprinting = true;
    bot.pathfinder.setMovements(movements);

    bot.chat(`你好！我是 AI 机器人 ${BOT_USERNAME}，我的目标是：${BOT_GOAL}`);

    // 启动 AI 决策循环
    runAILoop(bot).catch(err => {
      console.error('[AI循环] 致命错误:', err);
    });
  });

  bot.on('chat', (username, msg) => {
    if (username === bot.username) return;
    console.log(`💬 [${username}]: ${msg}`);
    // 玩家可以通过聊天改变机器人的目标
    if (msg.startsWith('!goal ')) {
      const newGoal = msg.slice(6).trim();
      console.log(`[目标更新] "${newGoal}"`);
      bot.chat(`好的，我的新目标是：${newGoal}`);
    }
  });

  bot.on('health', () => {
    if (bot.health < 6) {
      console.log(`⚠️ 血量危险: ${bot.health}/20`);
    }
  });

  bot.on('death', () => {
    console.log('💀 机器人死亡，等待重生...');
  });

  bot.on('kicked', reason => {
    console.error(`⛔ 被踢出: ${reason}`);
    if (AUTO_RECONNECT) { console.log('5秒后重连...'); setTimeout(startBot, 5000); }
  });

  bot.on('error', err => {
    console.error(`❌ 连接错误: ${err.message}`);
    if (AUTO_RECONNECT) { console.log('5秒后重连...'); setTimeout(startBot, 5000); }
  });

  bot.on('end', () => {
    console.log('🔌 连接断开');
    if (AUTO_RECONNECT) { console.log('5秒后重连...'); setTimeout(startBot, 5000); }
  });
}

startBot();
