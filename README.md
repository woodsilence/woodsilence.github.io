# 游戏合集

一个纯 HTML、CSS、JavaScript 实现的单页面小游戏合集，不依赖构建工具，也不需要安装包。

## 当前游戏

- 2048
- 扫雷
- 数独
- 贪吃蛇

## 运行方式

直接打开 `index.html` 即可运行。

如果浏览器对本地脚本或资源有额外限制，也可以在项目目录启动一个静态服务器，例如：

```bash
python3 -m http.server 8123
```

然后访问 `http://127.0.0.1:8123/`。

## 项目结构

```text
web_game/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── audio.js
│   ├── storage.js
│   ├── game-2048.js
│   ├── game-minesweeper.js
│   ├── game-sudoku.js
│   └── game-snake.js
└── README.md
```

## 说明

- 菜单通过左右切换进入不同游戏
- 最佳成绩使用 `localStorage` 持久化
- 音效由 Web Audio API 动态生成
- 项目为静态 SPA，视图切换通过不同 `section` 控制
