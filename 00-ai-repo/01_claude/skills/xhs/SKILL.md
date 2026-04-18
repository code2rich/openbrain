---
name: xhs
description: 提取小红书帖子内容（文字、图片、视频转录），整理为 Markdown 并保存
user-invocable: true
argument-hint: <小红书链接>
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

用户希望提取小红书帖子内容。请按以下步骤处理：

## 常量定义
- Cookies 文件: `~/cookies.json`（从 Chrome 导出的小红书 cookies）
- Obsidian 保存目录: `~/Documents/Obsidian Vault/xhs`
- Whisper 模型: `mlx-community/whisper-large-v3-turbo`

## 输入
用户提供的小红书链接: $ARGUMENTS

## 提取流程

### 步骤 0：检查 Cookies
1. 检查 `~/cookies.json` 是否存在
2. 如果不存在，告知用户需要从 Chrome 导出 cookies：
   - 在 Chrome 打开 xiaohongshu.com 并确认已登录
   - 打开 DevTools Console，运行以下代码将 cookies 复制到剪贴板：
   ```javascript
   copy(JSON.stringify(document.cookie.split('; ').map(c => {
     const [name, ...rest] = c.split('=');
     return { name, value: rest.join('='), domain: '.xiaohongshu.com', path: '/',
       expires: Date.now()/1000 + 86400*30, size: name.length + rest.join('=').length,
       httpOnly: false, secure: false, session: false, priority: 'Medium',
       sameParty: false, sourceScheme: 'Secure', sourcePort: 443 };
   })))
   ```
   - 将剪贴板内容保存到 `~/cookies.json`
   - 然后终止流程，等用户完成后重新运行

### 步骤 1：解析链接
从 URL 中提取帖子 ID（24 位十六进制字符串）和 xsec_token 参数。

### 步骤 2：获取帖子内容
使用 Python 脚本，通过 Cookies 请求帖子页面 HTML，从 `window.__INITIAL_STATE__` 解析全部帖子数据：

```python
import json, urllib.request, ssl, re

with open('<Cookies 文件>') as f:
    cookies = json.load(f)
cookie_str = '; '.join(f"{c['name']}={c['value']}" for c in cookies)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request('<帖子URL>')
req.add_header('Cookie', cookie_str)
req.add_header('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')

resp = urllib.request.urlopen(req, timeout=15, context=ctx)
html = resp.read().decode('utf-8', errors='ignore')

m = re.search(r'window\.__INITIAL_STATE__\s*=\s*(\{.+?\})\s*</script>', html, re.DOTALL)
raw = m.group(1).replace('undefined', 'null')
data = json.loads(raw)

# 帖子数据在: data['note']['noteDetailMap'][<key>]['note']
# 包含: title, desc, type, time, user, imageList, video, interactInfo, ipLocation
```

如果请求失败（被重定向到 404/错误页），说明 cookies 过期，提示用户按步骤 0 重新导出。

### 步骤 3：视频转录（仅视频帖子）
如果帖子 type 为 video，执行以下子步骤：

#### 3a. 提取视频 URL
从步骤 2 获取的数据中解析视频流：
```
note['video']['media']['stream'] -> 按 h264 > h265 > av1 优先级取第一个的 masterUrl
```

#### 3b. 下载视频并提取音频
```bash
curl -L -o /tmp/xhs_{post_id}.mp4 -H "Referer: https://www.xiaohongshu.com/" <视频URL>
ffmpeg -y -i /tmp/xhs_{post_id}.mp4 -vn -acodec pcm_s16le -ar 16000 -ac 1 /tmp/xhs_{post_id}.wav
```

#### 3c. 语音转录
```python
import mlx_whisper
result = mlx_whisper.transcribe("/tmp/xhs_{post_id}.wav",
    path_or_hf_repo="mlx-community/whisper-large-v3-turbo", language="zh", verbose=False)
```

#### 3d. 清理转录文本
- 去除尾部重复字符（背景音乐噪音）
- 按语义断句，添加标点和段落
- 如有步骤/要点结构，用 Markdown 格式化

#### 3e. 清理临时文件
```bash
rm -f /tmp/xhs_{post_id}.mp4 /tmp/xhs_{post_id}.wav
```

### 步骤 4：整理输出并保存
将内容整理为 Markdown 文件，保存到 `<Obsidian 保存目录>/{YYYY-MM-DD} {短标题}.md`。
- 文件名格式：`{发布日期} {短标题}.md`，短标题不超过15个字，是核心洞察的极简概括
- 日期前缀确保按时间排序
- 不创建子目录，所有帖子 md 直接放在 xhs 文件夹下
- 媒体文件统一放在 `<Obsidian 保存目录>/img/` 或 `<Obsidian 保存目录>/video/`

**写作风格：Peter Thiel 式——直接、反直觉、一句话给判断。笔记是决策工具，不是知识库。用户扫一眼就能决定：深挖还是跳过。**

文件结构（**无 YAML frontmatter**）：

```markdown
# 一句话核心洞察（反直觉的判断，不是描述性标题）

核心论点，2-3句话。直接给出"大多数人觉得X，但其实Y"的判断。
不废话，不铺垫，像 Thiel 在董事会上说话。

**与我的关联：** 一句话。读取用户的 memory（~/.claude/projects/*/memory/ 下的
user 和 project 类型记忆）了解用户背景、研究方向和当前工作，据此说清楚
这个内容跟用户有什么关系。如果 memory 不可用，从通用的个人发展/工具/方法论角度切入。

**值得深挖吗：** 是/否。一句话理由。

> [!tip]- 详情
> 帖子核心内容的结构化整理（折叠状态，点开才看到）：
> - 从 desc 和视频转录中提炼，清理 `#xxx[话题]#` 标记
> - 按逻辑结构分节，保留关键数据和结论
> - 图片用 `![图N](urlDefault)` 嵌入
> - 视频帖子在此处放整理后的转录内容

> [!info]- 笔记属性
> - **来源**: 小红书 · 作者名
> - **帖子ID**: xxx
> - **链接**: 原始链接
> - **日期**: YYYY-MM-DD
> - **类型**: image/video
> - **互动**: N赞 / N收藏 / N评论
> - **标签**: 标签1, 标签2, ...
```

关键约束：
- 折叠区域外的可见内容**不超过 6 行**
- 标题必须是洞察/判断，不是"XX帖子的总结"
- 图片使用 `urlDefault` 字段的 URL
