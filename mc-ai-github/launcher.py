#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Minecraft AI 机器人启动器
双击此文件即可启动图形界面。
首次运行会自动安装所需依赖（需要网络）。
"""

import sys
import os
import subprocess
import threading
import json
import time
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import webbrowser

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(HERE, 'config.json')
BOT_DIR     = os.path.join(HERE, 'bot')

# ── 颜色主题（Minecraft 风格深色）────────────────────────────────────────────
C = {
    'bg':       '#1a1a2e',
    'panel':    '#16213e',
    'card':     '#0f3460',
    'accent':   '#4ade80',   # 绿色
    'accent2':  '#60a5fa',   # 蓝色
    'warn':     '#fbbf24',   # 黄色
    'danger':   '#f87171',   # 红色
    'text':     '#e2e8f0',
    'muted':    '#94a3b8',
    'border':   '#334155',
    'log_bg':   '#0d1117',
    'log_info': '#4ade80',
    'log_warn': '#fbbf24',
    'log_err':  '#f87171',
    'log_msg':  '#93c5fd',
}

DEFAULT_CONFIG = {
    'server_host':   'localhost',
    'server_port':   '25565',
    'mc_version':    '1.20.1',
    'bot_name':      'AI_Bot',
    'api_key':       '',
    'ai_provider':   'claude',   # claude | openai | custom
    'bot_goal':      '探索世界，收集资源，建造一个小屋',
    'auto_reconnect': True,
    'lang':          'zh',
}

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, encoding='utf-8') as f:
                cfg = json.load(f)
            return {**DEFAULT_CONFIG, **cfg}
        except Exception:
            pass
    return dict(DEFAULT_CONFIG)

def save_config(cfg):
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)


# ── 依赖检查 & 自动安装 ──────────────────────────────────────────────────────
def check_node():
    try:
        r = subprocess.run(['node', '--version'], capture_output=True, text=True)
        return r.returncode == 0
    except FileNotFoundError:
        return False

def install_node_deps(log_callback):
    if not os.path.exists(os.path.join(BOT_DIR, 'node_modules')):
        log_callback('⏳ 首次运行：正在安装 Bot 依赖（约 1-2 分钟）...', 'warn')
        result = subprocess.run(
            ['npm', 'install'],
            cwd=BOT_DIR,
            capture_output=True, text=True
        )
        if result.returncode != 0:
            log_callback(f'❌ 安装失败:\n{result.stderr}', 'err')
            return False
        log_callback('✅ 依赖安装完成！', 'info')
    return True


# ── 主窗口 ───────────────────────────────────────────────────────────────────
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.cfg        = load_config()
        self.bot_proc   = None
        self.running    = False
        self._log_queue = []

        self.title('🎮 Minecraft AI 机器人 · 启动器')
        self.configure(bg=C['bg'])
        self.geometry('820x660')
        self.minsize(700, 550)
        self.resizable(True, True)

        self._center_window()
        self._build_ui()
        self._check_env()
        self.protocol('WM_DELETE_WINDOW', self._on_close)

    def _center_window(self):
        self.update_idletasks()
        w, h = 820, 660
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        self.geometry(f'{w}x{h}+{(sw-w)//2}+{(sh-h)//2}')

    # ── UI 构建 ───────────────────────────────────────────────────────────────
    def _build_ui(self):
        # 顶部标题栏
        header = tk.Frame(self, bg=C['card'], pady=12)
        header.pack(fill='x')
        tk.Label(header, text='⛏  Minecraft AI 机器人', font=('Arial', 18, 'bold'),
                 fg=C['accent'], bg=C['card']).pack(side='left', padx=20)
        self.status_label = tk.Label(header, text='● 未运行', font=('Arial', 10),
                                     fg=C['muted'], bg=C['card'])
        self.status_label.pack(side='right', padx=20)

        # 主体区域（左配置 + 右日志）
        body = tk.Frame(self, bg=C['bg'])
        body.pack(fill='both', expand=True, padx=12, pady=8)

        # ── 左：配置面板 ─────────────────────────────────────────────────────
        left = tk.Frame(body, bg=C['panel'], bd=0, relief='flat', width=320)
        left.pack(side='left', fill='y', padx=(0, 8))
        left.pack_propagate(False)

        self._section(left, '🖥  Minecraft 服务器')
        self.f_host    = self._field(left, '服务器地址', self.cfg['server_host'])
        self.f_port    = self._field(left, '端口',       self.cfg['server_port'])
        self.f_version = self._field(left, 'MC 版本',    self.cfg['mc_version'])
        self.f_botname = self._field(left, '机器人名称', self.cfg['bot_name'])

        self._section(left, '🤖  AI 设置')
        # AI 供应商选择
        prov_frame = tk.Frame(left, bg=C['panel'])
        prov_frame.pack(fill='x', padx=12, pady=(0, 4))
        tk.Label(prov_frame, text='AI 供应商', font=('Arial', 9),
                 fg=C['muted'], bg=C['panel']).pack(anchor='w')
        self.prov_var = tk.StringVar(value=self.cfg.get('ai_provider', 'claude'))
        prov_row = tk.Frame(prov_frame, bg=C['panel'])
        prov_row.pack(fill='x')
        for val, label in [('claude', 'Claude (Anthropic)'), ('openai', 'GPT (OpenAI)'), ('custom', '自定义')]:
            tk.Radiobutton(prov_row, text=label, variable=self.prov_var, value=val,
                           bg=C['panel'], fg=C['text'], selectcolor=C['card'],
                           activebackground=C['panel'], font=('Arial', 9),
                           command=self._on_provider_change).pack(side='left', padx=4)

        self.f_apikey = self._field(left, 'API Key', self.cfg['api_key'], show='•')
        self.f_goal   = self._field(left, '机器人目标（用中文描述）', self.cfg['bot_goal'], height=3)

        # 自动重连开关
        rec_frame = tk.Frame(left, bg=C['panel'])
        rec_frame.pack(fill='x', padx=12, pady=4)
        self.auto_reconnect = tk.BooleanVar(value=self.cfg.get('auto_reconnect', True))
        tk.Checkbutton(rec_frame, text='自动重连', variable=self.auto_reconnect,
                       bg=C['panel'], fg=C['text'], selectcolor=C['card'],
                       activebackground=C['panel'], font=('Arial', 9)).pack(side='left')

        # 按钮区域
        btn_frame = tk.Frame(left, bg=C['panel'])
        btn_frame.pack(fill='x', padx=12, pady=(12, 8))

        self.start_btn = tk.Button(
            btn_frame, text='▶  启动 AI 机器人',
            font=('Arial', 12, 'bold'), fg='#000', bg=C['accent'],
            activebackground='#22c55e', relief='flat', bd=0, padx=16, pady=8,
            cursor='hand2', command=self._toggle
        )
        self.start_btn.pack(fill='x', pady=(0, 6))

        tk.Button(
            btn_frame, text='📋  查看 API 文档',
            font=('Arial', 9), fg=C['accent2'], bg=C['panel'],
            activebackground=C['card'], relief='flat', bd=0, pady=4,
            cursor='hand2', command=lambda: webbrowser.open('http://localhost:8080/docs')
        ).pack(fill='x')

        # 环境状态
        self.env_label = tk.Label(left, text='正在检测环境...', font=('Arial', 8),
                                  fg=C['muted'], bg=C['panel'], wraplength=290, justify='left')
        self.env_label.pack(padx=12, pady=4, anchor='w')

        # ── 右：日志面板 ─────────────────────────────────────────────────────
        right = tk.Frame(body, bg=C['panel'])
        right.pack(side='right', fill='both', expand=True)

        log_header = tk.Frame(right, bg=C['card'], pady=6)
        log_header.pack(fill='x')
        tk.Label(log_header, text='📜 运行日志', font=('Arial', 10, 'bold'),
                 fg=C['text'], bg=C['card']).pack(side='left', padx=10)
        tk.Button(log_header, text='清空', font=('Arial', 8),
                  fg=C['muted'], bg=C['card'], relief='flat', bd=0,
                  cursor='hand2', command=self._clear_log).pack(side='right', padx=8)

        self.log_box = scrolledtext.ScrolledText(
            right, bg=C['log_bg'], fg=C['text'],
            font=('Consolas', 9), relief='flat', bd=0,
            wrap='word', state='disabled',
            insertbackground=C['accent']
        )
        self.log_box.pack(fill='both', expand=True, padx=1, pady=1)
        # 颜色标签
        self.log_box.tag_config('info',  foreground=C['log_info'])
        self.log_box.tag_config('warn',  foreground=C['log_warn'])
        self.log_box.tag_config('err',   foreground=C['log_err'])
        self.log_box.tag_config('msg',   foreground=C['log_msg'])
        self.log_box.tag_config('muted', foreground=C['muted'])
        self.log_box.tag_config('ts',    foreground=C['border'])

        # 底部状态栏
        footer = tk.Frame(self, bg=C['card'], pady=5)
        footer.pack(fill='x', side='bottom')
        tk.Label(footer, text='Minecraft AI Bot Launcher  ·  v1.0',
                 font=('Arial', 8), fg=C['muted'], bg=C['card']).pack(side='left', padx=12)
        self.footer_msg = tk.Label(footer, text='', font=('Arial', 8),
                                   fg=C['accent'], bg=C['card'])
        self.footer_msg.pack(side='right', padx=12)

    def _section(self, parent, text):
        f = tk.Frame(parent, bg=C['border'], height=1)
        f.pack(fill='x', padx=12, pady=(10, 0))
        tk.Label(parent, text=text, font=('Arial', 9, 'bold'),
                 fg=C['accent2'], bg=C['panel']).pack(anchor='w', padx=12, pady=(4, 2))

    def _field(self, parent, label, default='', show=None, height=1):
        frame = tk.Frame(parent, bg=C['panel'])
        frame.pack(fill='x', padx=12, pady=2)
        tk.Label(frame, text=label, font=('Arial', 9), fg=C['muted'],
                 bg=C['panel']).pack(anchor='w')
        if height > 1:
            w = tk.Text(frame, height=height, font=('Arial', 10),
                        bg=C['card'], fg=C['text'], relief='flat', bd=4,
                        insertbackground=C['accent'])
            w.insert('1.0', default)
            w.pack(fill='x')
            return w
        else:
            var = tk.StringVar(value=default)
            e = tk.Entry(frame, textvariable=var, font=('Arial', 10),
                         bg=C['card'], fg=C['text'], relief='flat', bd=4,
                         insertbackground=C['accent'],
                         show=show or '')
            e.pack(fill='x')
            return var

    # ── 功能方法 ──────────────────────────────────────────────────────────────
    def _on_provider_change(self):
        prov = self.prov_var.get()
        hints = {
            'claude': 'Anthropic API Key (sk-ant-...)',
            'openai': 'OpenAI API Key (sk-...)',
            'custom': '你的 API Key',
        }
        self.log(f'已切换到 {prov.upper()} 模式。需要 {hints[prov]}', 'msg')

    def _collect_config(self):
        goal = self.f_goal.get('1.0', 'end').strip() if isinstance(self.f_goal, tk.Text) else self.f_goal.get()
        return {
            'server_host':    self.f_host.get().strip(),
            'server_port':    self.f_port.get().strip(),
            'mc_version':     self.f_version.get().strip(),
            'bot_name':       self.f_botname.get().strip(),
            'api_key':        self.f_apikey.get().strip(),
            'ai_provider':    self.prov_var.get(),
            'bot_goal':       goal,
            'auto_reconnect': self.auto_reconnect.get(),
        }

    def _check_env(self):
        def check():
            time.sleep(0.3)
            if check_node():
                self._set_env_label('✅ Node.js 已就绪', C['accent'])
            else:
                self._set_env_label('❌ 未找到 Node.js！请先安装 Node.js 18+\n   https://nodejs.org', C['danger'])
        threading.Thread(target=check, daemon=True).start()

    def _set_env_label(self, text, color):
        self.after(0, lambda: self.env_label.config(text=text, fg=color))

    def _toggle(self):
        if self.running:
            self._stop()
        else:
            self._start()

    def _start(self):
        cfg = self._collect_config()

        # 验证
        if not cfg['server_host']:
            messagebox.showerror('错误', '请填写服务器地址')
            return
        if not cfg['api_key']:
            messagebox.showerror('错误', '请填写 API Key')
            return
        if not check_node():
            messagebox.showerror('错误', '未找到 Node.js！\n请先安装 Node.js 18+\nhttps://nodejs.org/zh-cn')
            return

        save_config(cfg)
        self.running = True
        self._update_ui_state(True)
        self.log('─' * 50, 'muted')
        self.log(f'🚀 正在启动 AI 机器人...', 'info')
        self.log(f'   服务器: {cfg["server_host"]}:{cfg["server_port"]}', 'muted')
        self.log(f'   版本:   {cfg["mc_version"]}', 'muted')
        self.log(f'   名称:   {cfg["bot_name"]}', 'muted')
        self.log(f'   AI:     {cfg["ai_provider"].upper()}', 'muted')
        self.log(f'   目标:   {cfg["bot_goal"][:40]}...', 'muted')

        threading.Thread(target=self._run_bot, args=(cfg,), daemon=True).start()

    def _stop(self):
        self.running = False
        if self.bot_proc and self.bot_proc.poll() is None:
            self.bot_proc.terminate()
            self.log('⏹  已停止机器人', 'warn')
        self._update_ui_state(False)

    def _update_ui_state(self, running):
        if running:
            self.start_btn.config(text='⏹  停止机器人', bg=C['danger'], activebackground='#dc2626')
            self.status_label.config(text='● 运行中', fg=C['accent'])
        else:
            self.start_btn.config(text='▶  启动 AI 机器人', bg=C['accent'], activebackground='#22c55e')
            self.status_label.config(text='● 未运行', fg=C['muted'])

    def _run_bot(self, cfg):
        # 安装依赖（首次）
        if not install_node_deps(lambda msg, t='info': self.after(0, lambda: self.log(msg, t))):
            self.after(0, lambda: self._stop())
            return

        # 写入临时配置供 bot.js 读取
        bot_cfg_path = os.path.join(BOT_DIR, '.runtime_config.json')
        with open(bot_cfg_path, 'w') as f:
            json.dump(cfg, f)

        env = {
            **os.environ,
            'MC_HOST':      cfg['server_host'],
            'MC_PORT':      cfg['server_port'],
            'MC_VERSION':   cfg['mc_version'],
            'BOT_USERNAME': cfg['bot_name'],
            'API_KEY':      cfg['api_key'],
            'AI_PROVIDER':  cfg['ai_provider'],
            'BOT_GOAL':     cfg['bot_goal'],
            'AUTO_RECONNECT': '1' if cfg['auto_reconnect'] else '0',
        }

        while self.running:
            self.log('🤖 Bot 进程启动中...', 'info')
            try:
                self.bot_proc = subprocess.Popen(
                    ['node', 'bot.js'],
                    cwd=BOT_DIR,
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True, encoding='utf-8', errors='replace',
                    bufsize=1
                )
                # 实时读取日志
                for line in self.bot_proc.stdout:
                    if not self.running:
                        break
                    line = line.rstrip()
                    if not line:
                        continue
                    tag = 'err' if any(w in line.lower() for w in ['error','failed','错误']) \
                         else 'warn' if any(w in line.lower() for w in ['warn','disconnect','kicked']) \
                         else 'msg' if '💬' in line or 'chat' in line.lower() \
                         else 'info'
                    self.after(0, lambda l=line, t=tag: self.log(l, t))

                self.bot_proc.wait()
            except Exception as e:
                self.after(0, lambda e=e: self.log(f'❌ 启动失败: {e}', 'err'))

            if self.running and cfg['auto_reconnect']:
                self.after(0, lambda: self.log('🔄 5 秒后自动重连...', 'warn'))
                time.sleep(5)
            else:
                break

        self.after(0, lambda: self._update_ui_state(False))

    def log(self, msg, tag='info'):
        ts = time.strftime('%H:%M:%S')
        self.log_box.config(state='normal')
        self.log_box.insert('end', f'[{ts}] ', 'ts')
        self.log_box.insert('end', msg + '\n', tag)
        self.log_box.see('end')
        self.log_box.config(state='disabled')

    def _clear_log(self):
        self.log_box.config(state='normal')
        self.log_box.delete('1.0', 'end')
        self.log_box.config(state='disabled')

    def _on_close(self):
        if self.running:
            if messagebox.askyesno('确认退出', '机器人正在运行中，确定要退出吗？'):
                self._stop()
                time.sleep(0.5)
                self.destroy()
        else:
            self.destroy()


# ── 入口 ──────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    # 切换到程序目录，确保相对路径正确
    os.chdir(HERE)
    app = App()
    app.mainloop()
