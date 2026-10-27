# GitHub Pages 部署

本项目只有静态前端。GitHub Pages 提供页面、JavaScript 和资源；课程模拟、3D 与本地进度在访问者的浏览器运行。这里不运行 Node.js 服务，也不会在云端编译或控制 ESP32。

## 首次发布

1. 创建 GitHub 仓库，将本项目内容放在仓库根目录。必须包含 `package.json`、`package-lock.json`、`src/`、`public/`、`.github/`、许可证和配置文件。
2. 保留 `.gitignore`，不要上传 `node_modules/`、`dist/`、`output/`、本地凭据和编译日志。`private: true` 只防止误发 npm 包，不妨碍 GitHub 开源或 Pages 发布。
3. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
4. 确认 Actions 已启用。进入 **Actions → Deploy to GitHub Pages → Run workflow**，选择仓库默认分支。
5. 工作流依次测试、构建、检查资源与许可、上传 `dist/` 并发布。成功后查看 `github-pages` deployment 的站点地址。

只允许从默认分支发布；从其他分支手动触发会跳过部署。工作流不会因为普通 push 或 PR 自动发布。

公开仓库可使用 GitHub Free 的 Pages；其他仓库类型和套餐以 [GitHub Pages 文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) 为准。

## 地址与资源路径

普通项目地址通常为 `https://<owner>.github.io/<repository>/`；用户主页仓库对应站点根路径。自定义域名由仓库的 Pages 设置管理。

`vite.config.ts` 使用 `base: './'`。Vite 构建后的入口与 CSS 资源相对当前目录解析，同一份产物无需写死用户名或仓库名。课程使用 `#display` 等 hash 标识，不需要服务器路由重写或 404 跳转文件。

`npm run check:dist` 检查构建产物在 `/` 和 `/learn-esp32/` 下的资源解析，以及许可和单文件脚本语法。这是本地检查，不等同于 GitHub 实际部署已经成功。

## 访问统计

正式站（`dist/`）由 `index.html` 加载 Umami Cloud 脚本，只记录不含个人信息的访问汇总，不使用 cookie。`data-domains` 限定为 `aigeekops.github.io`，本地 `npm run dev` 与 `npm run preview` 不会上报；每个项目应使用各自独立的 `data-website-id`，不要与其他项目共用。

单文件版 `output/learn-esp32.html` 打包时会剔除该脚本，保持完全离线、自包含；`npm run check:dist` 校验这一分离。更换统计站点或停用时，修改或删除 `index.html` 中的该标签。

## 更新与验证

源码 push 和 PR 触发 `.github/workflows/ci.yml`；CI 只读仓库，执行基本测试、静态构建、单文件检查和示例导出。固件工具链体积较大，默认 CI 不安装或运行它。

更新站点时先合并代码到默认分支，再手动运行 Pages 工作流。发布后至少检查：首页 3D、任一课程切换、一次调参、运行/停止、浏览器刷新和静态背景。

工作流只在发布 job 使用 `pages: write` 与 `id-token: write`，不配置个人访问令牌、不发布 npm 包、不自动创建仓库。Actions 固定到上游 release 的完整 commit SHA；更新时核对上游发行记录。

## 本地预览与其他静态托管

```bash
npm ci
npm run build
npm run preview
```

`vite preview` 用于本地验收。托管时上传完整 `dist/`，包括许可证文件；不要把项目根目录或源码当作已构建站点。部署到子目录时，站点 URL 末尾应保留 `/`。

学习进度只保存在浏览器的 localStorage。不同域名、协议、端口或设备的数据不会自动同步；同一 origin 下的副本共享当前存储键，因此不要假设它们的进度相互独立。

## 当前验证范围

已经有本地构建、模型测试和历史默认固件编译记录。Pages 工作流尚未在目标 GitHub 仓库运行；仓库创建、Pages 开启和首次线上发布需由维护者完成。部署前后均不得把模拟结果写成真机验证结果。

参考：[GitHub 自定义 Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[Vite 静态部署](https://vite.dev/guide/static-deploy.html)。
