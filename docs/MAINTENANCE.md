# OIS网站持续维护

当前入口：[ois-homes.vercel.app](https://ois-homes.vercel.app)。用户已在2026年11月7日授权：持续找房，符合条件且素材齐全后直接更新此网站、个人公开GitHub仓库与现有Vercel项目。每天日本时间09:00的原生任务`ois`沿用同一聊天；不创建第二个任务或后台常驻进程。

## 本轮先确认

- 月租150,000～300,000日元，含边界。管理费、停车及其他费用分列，不能把未知填0，也不能把管理费加到租金上再套30万上限。
- 真独栋、整栋出租；公寓、连排、分层或类型冲突不进入合格列表。
- 日本当天滚动房龄不超过20年；只有建月且卡在边界月时待核，装修年不能代替建年。
- 具体出租栋对应的完整公开门牌至正确OIS：自行车导航不超过20分钟，或上学日公交全程不超过20分钟。公交须包含步行、候车、换乘和下车后至校步行。
- 完整有效的当前广告、真实外观及室内照片、原始户型、实际路线截图和逐项来源。搜索摘要、遮罩价格、参考页、结束广告不算当前库存。

学校以[校方地址](https://sois.kwansei.ac.jp/osaka-international-school/about/contacts-location)为准：大阪府箕面市小野原西4-4-16。地图是公开地址点至学校的估计，不能写成实骑、玄关或到教室实测。官方明确绑定出租栋的共用门牌可以使用，但要写明具体入口未实地核。未能把门牌唯一对应出租栋，继续待核。

## 数据和素材

私人研究目录中的`active-house-candidates.json`为主数据；同目录的`search-criteria.json`、`MAINTENANCE.md`、`update-state.json`、`update-log.md`记录证据、范围及实际检查时刻。它们不提交公开仓库。

公开仓库维护这些文件：

|文件|用途|
|---|---|
|`content/curation.json`|人工复核的中文摘要、费用、冲突提示与事实快照|
|`scripts/listing_catalog.py`|准入、去重、素材与公开字段检查|
|`scripts/import-listings.py`|从指定研究目录导入，不联网抓取|
|`src/data/listings.json`|网站实际读取的数据，只含公开字段|
|`public/media/attribution.json`|逐图原始来源、采集时间及内容指纹|
|`docs/updates/`|每轮可公开的研究结论，不含私人记录|

新增房源分配稳定ASCII编号，按完整地址、栋号及出租单元去重，多家中介合并来源。不能仅按同价、同面积猜为同栋。每条合格记录须有`dedupe_key`以及六项`verification`证据：独栋、整栋、建年、现价、当前广告、通学。每项保留真实URL、观测日期及说明。照片和地图保持各自真实旧日期，不能随构建日期刷新。

合格状态为`verified_match`；`pending`需显式设置`publishPending`才会作为待核展示，不能满足默认合格筛选。`ended`、`withdrawn`、`excluded`移出当前列表并保留归档及原素材。超时、403不能当作结束；某中介广告结束不能推断全市场已租。

每个新ID先补`curation.json`的摘要、费用、入住、租期、风险与图片说明，再核`reviewedFacts`。租金、房龄、费用、状态、路线等事实有变化，导入会停止，须先核对并更新文案和事实快照。不要仅改快照绕过审核。

照片必须来自该房，户型与地图完整显示，保留版权署名。导入前确认本地实际文件存在、来源正确、采集时间真实。原图内容变化使用新文件名，旧文件保留；不生成或借用其他房屋照片。私人路径、客户资料、账号与密钥不能进入公开文件。

## 每轮更新与发布

1. 先复核现有合格房的当前广告和价格，再搜新房与补查待核。将事实和证据原子更新至私人主数据，追加研究记录。没有实际读取不能刷新检查时间；重复旧房不能计新增。
2. 更新人工文案与事实快照，再导入：

```sh
python3 -B scripts/import-listings.py --source /path/to/reviewed-research
npm test
npm run test:data
npm run build
```

`--as-of YYYY-MM-DD`用于明确采用任务给定的日本日期或重现审计；未指定时按日本当天计算。默认素材旁写来源信息文件，可用`--provenance-script`同时写原生元数据。没有新增合格房也不填演示数据。

3. 检查实际数据、全部引用的图片/户型/路线存在且可读，来源日期真实。数据更新做一轮电脑版页面验收；布局变化再按既有Impeccable设计检查。保持首屏能看到房名、价格、核心事实及主要操作。确保待核、空结果、对比及路线方式显示正确。截图和测试输出放本项目目录，不提交私人浏览记录。
4. 提交前查看`git status`与差异，保留其他会话的改动，只提交本轮文件。当前开发分支为`codex/ois-homes-site`，沿用[PR #1](https://github.com/lukeliu95/ois-homes/pull/1)，不直接改main、不合并、不打标签。
5. Vercel已连接GitHub，先推送分支并等该提交SHA的部署为READY。不要执行`vercel deploy`重复上传本地代码。当前开发分支生成Preview；使用[官方提升流程](https://vercel.com/docs/deployments/promote-preview-to-production)，把已核部署对应的同一GitHub提交发布到Production：

```sh
vercel promote <verified-deployment-id> --yes --scope <existing-project-scope> --timeout 50s
```

平台会为Preview源码生成新的Production构建，须等待新部署READY并再次核对SHA。Preview不能直接使用promote REST接口原地切换，本轮该做法返回422。仅已按Production环境构建的部署可通过`POST /v10/projects/{projectId}/promote/{deploymentId}?teamId={teamId}`直接提升而不重建。先记录旧正式部署以便回滚，使用现有授权账号及明确项目/团队范围，不泄露本地认证信息。当前持续发布授权覆盖此步骤；连接或权限变化时先报告真实阻塞，不新开收费服务或降低保护。

6. 匿名验证正式域名返回200、页面加载本轮提交的数据、图片和路线可打开，再记录实际部署ID、SHA、检查时间和新增数量。PR说明用中文，更新为最终变化；无新增要明确写0，不把复核算新增。

没有新合格项或实质变化时，保留本地研究记录即可，不为每天刷新日期制造发布。只有新增、实质变动、完成交付或需要用户决定时通知。持续授权不包含联系中介、预约、申请、付费、删资料、合并PR、改全局设置或安全设置。
