# OIS 附近住

[在线使用](https://ois-homes.vercel.app) · [代码分支](https://github.com/lukeliu95/ois-homes/tree/codex/ois-homes-site) · [PR](https://github.com/lukeliu95/ois-homes/pull/1)

围绕大阪箕面 **Osaka International School** 的一户建找房网站。先按月租、房龄与到校时间筛选，再看真实照片、户型、费用和通学路线，最后把选中的房子放在一起比较。

本站独立整理公开资料，与学校及中介无隶属关系，不接收租房申请或代发咨询。

## 现有功能

- 月租15万～30万日元筛选，房龄及导航时间筛选，价格/通学/面积/建年排序。
- 左侧选择房源，右侧查看真实照片、户型原图、路线、费用与来源。
- 最多3套横向比较；收藏只保存在本机浏览器。
- 筛选与选中房源写入网址，可直接分享。
- 待核房源明确标记；未知通学时间不会满足20分钟筛选。
- 键盘操作、原图放大、方向键翻图及窄屏布局。

首批资料的实际观测日期为 **2026-11-07（日本时间）**：3套广告与完整地址到OIS导航已核，1套完整门牌/路线待核。这是研究快照，不是实时库存；网页挂牌不等于中介确认空室。导航未实骑，也不包含校内停放自行车后的步行。

## 本地运行

Node.js 22.12或以上，建议使用维护中的LTS版本。

```sh
npm ci
npm run dev
```

```sh
npm test
npm run test:data
npm run build
npm run preview
```

## 数据与维护

`src/data/listings.json` 是经过整理的公开房源数据，`public/media/attribution.json` 是逐图来源。原始私人研究和浏览器记录不在仓库内。

从自己的研究目录导入：

```sh
python3 scripts/import-listings.py --source /path/to/reviewed-research
```

导入器只读取白名单字段和对应真实图片；新增ID须先补人工核过的中文概要与费用，不能把未经核实的门户摘要自动发布。价格、状态、建年月、入住日期、费用变更时，同步更新概要并重新验证。已有图片不表示广告仍然有效；核查失败不能刷新观测时间。

完整准入、每日找房和直接发布步骤见[持续维护说明](docs/MAINTENANCE.md)，实际研究变化见[更新记录](docs/updates/)。

## 发布

使用Vite静态构建，Vercel输出目录为`dist`。优先通过GitHub连接触发构建，避免重复命令行部署。不需要数据库、环境密钥或收费接口。

## 许可与来源

项目代码以MIT许可开源。第三方房屋照片、户型图、地图截图、商标与房源资料不包含在MIT授权范围内，权利属于原权利人；逐图出处随网站保留。地图截图保留原始署名，房屋图片没有生成或改变像素内容。

学校信息来自[校方地址与交通说明](https://sois.kwansei.ac.jp/osaka-international-school/about/contacts-location)。具体房源的经纪来源与实际观测日期见网站“核对来源”。
