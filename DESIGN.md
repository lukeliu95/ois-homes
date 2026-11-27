---
name: OIS附近住
description: 白底、清楚数字和真实房屋资料组成的找房操作界面
colors:
  ink: "#22211f"
  muted: "#686661"
  paper: "#ffffff"
  wash: "#f5f5f2"
  line: "#e8e7e2"
  red: "#a52b2f"
  image-ground: "#eeede8"
  control-line: "#d3d1cb"
  action-secondary: "#f1f0ec"
typography:
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    fontSize: "36px"
    fontWeight: 680
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    fontSize: "24px"
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: "-0.025em"
  rent:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    fontSize: "32px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    lineHeight: 1.6
  action:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    fontWeight: 550
rounded:
  surface: "12px"
  control: "5px"
  action: "7px"
  icon: "6px"
  image: "10px"
spacing:
  compact: "8px"
  control-gap: "10px"
  item: "14px"
  inset: "16px"
  section: "20px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.action}"
    rounded: "{rounded.action}"
    padding: "9px 16px"
  button-primary-hover:
    backgroundColor: "#44413b"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "{colors.action-secondary}"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.action}"
    padding: "9px 16px"
  button-secondary-hover:
    backgroundColor: "#e9e7e1"
  input-rent:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "4px 8px"
    height: "35px"
    width: "61px"
  comparison-chip:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "7px 9px"
  listing-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
---

# Design System: OIS附近住

## Overview

**Creative North Star: "日光下的找房资料桌"**

这是对现有页面的描述：白色页面像摆在桌上的资料，黑灰文字负责读清事实，真实房屋照片、完整户型和地图负责帮助判断。界面是可以持续操作的找房工具，沿用已有资料册的材料和用户确认的黑灰、少量红色偏好。

视觉系统从实际实现提取，依据是 `src/styles.css`、`src/App.tsx` 和 `.impeccable/review/` 中的最终页面截图。产品事实在 `PRODUCT.md`；首页的具体编排及方向契约在 `.impeccable/surfaces/src-app-tsx.md` 与 `index.html`，不把这一个页面的编排当成所有未来页面的模板。

**Key Characteristics:**

- 白底和浅灰工具区，层次靠对齐、间距与细分隔。
- 日常操作字体，租金数字比辅助说明醒目。
- 真实图片保留内容，户型和地图可看完整原图。
- 红色用于品牌、收藏、待核提醒和交互焦点，主要按钮保持深色。

## Colors

颜色以温和的黑灰和白色为主；红色是局部提示，不承担整片底色。

### Primary

- **克制红**：对应 `red`，用于品牌方块、收藏状态、待核提醒、部分链接与键盘焦点。
- **正文深灰**：对应 `ink`，既是主要文字颜色，也是主要操作按钮的底色与已选标签的下划线颜色。

### Neutral

- **页面白**：对应 `paper`，作为页面、卡片、弹层及输入框背景。
- **辅助灰**：对应 `muted`，用于字段名、观测时间、单位及次要说明。
- **工具浅灰**：对应 `wash`，用于筛选区、对比托盘标签和缺图状态。
- **细分隔灰**：对应 `line`，分隔资料行、页头、标签栏和卡片。
- **图片底灰**：对应 `image-ground`，承接图片完整显示时的留白，也用于图标按钮悬停。
- **控件边线灰**：对应 `control-line`，让白色输入框在浅灰工具区内保持清楚边界。
- **次操作灰**：对应 `action-secondary`，用于加入对比等次要操作。

**The 克制点色 Rule.** 主操作用深灰，红色只强调局部身份、状态和焦点；不把所有可点击项都改成红色。

## Typography

**Display Font:** 沿用正文的系统无衬线字体，无独立展示字体。

**Body Font:** 使用前置令牌中的字体栈；随设备选择可用字体，不加载展示字库。

**Character:** 文字服务日常判断，中文说明与原始房名保持直接可读。粗细和字号承担层级，不用全大写眉题或装饰性字距制造层级。

### Hierarchy

- **Headline**：页面主题；窄于900px时降到30px，窄于640px时为29px。
- **Title**：所选房屋名称；窄于1180px时为21px，窄于640px时为22px。
- **Rent**：详情租金；列表租金为23px，核心事实为20px。租金、面积等可比较数字使用等宽数字特性，单位保持小字。
- **Body**：全局基线。实际资料面板主要使用12px正文、1.9行高；概况说明常在85～90ch以内。
- **Action**：主要和次要按钮的紧凑操作文字；移动端为11px。标签、来源与时间使用较小字号，但不据此要求新增重要说明也缩小。

**The 数字先读 Rule.** 同组信息先突出租金和可比较事实，单位与解释降一级；不要让单位与数字争抢视觉重量。

## Layout

桌面容器最大宽度1440px，两侧合计保留80px。1180px以下两侧合计48px，640px以下合计32px。当前找房首页采用左列表、右详情：常规桌面左栏350px、栏间30px；1600px以上左栏370px、栏间34px；较窄桌面依次收为300px与270px左栏。

640px以下变成单列：房源列表为255px宽的横向卡片带，之后显示当前详情，保留同一组资料和操作。900px以下隐藏侧缩略图，对比表在自己的容器内横向滚动，不压缩到无法逐项读清。

间距没有单独的CSS变量体系。前置令牌只记录反复出现的常用步长，不声明严格的八像素网格。局部控件紧凑，资料组之间通过留白和一条细分隔建立关系。

**The 操作不埋 Rule.** 当前桌面找房页在1280×720首屏内，选中房名、租金、紧凑核心事实与原广告/对比操作先于大图出现。维护时保留这个已实现的可见性，不把大图重新推到身份与主要操作之前。

## Elevation & Depth

页面没有阴影词汇。卡片靠细边线和浅灰选中底色区分，资料靠细分隔组织。原图与对比采用白色弹层和深色半透明遮罩；遮罩用于集中当前任务，不制造材质。选中缩略图使用深灰描边，键盘焦点使用红色外轮廓，两者职责不同。

**The 平面优先 Rule.** 常态容器保持平面；需要区分状态时先用底色、边线、文字和明确的焦点轮廓。

## Shapes

大容器使用温和圆角：筛选区与房源卡片采用surface圆角，主图采用image圆角。按钮用action圆角，输入框和对比标签用control圆角，图标按钮用icon圆角。边线保持细而轻，不给每一组正文加封闭框。

原图与对比弹层桌面圆角13px，窄屏为9px。图标来自相同线条SVG语言，默认描边宽1.65，圆端点与圆连接；收藏可用同色填充表达状态。

## Components

### Buttons

主要操作是深色实心按钮，次操作是浅灰实心按钮。桌面最小高度41px，图文间距9px；悬停只加深底色。图标按钮常规为36px见方的点击区，悬停加图片底灰，收藏态使用红色。禁用态降低不透明度并停用指针手势。

所有可交互控件的键盘焦点使用红色2px轮廓，外移4px，不依赖只改变颜色。移动端主要/次要按钮仍保持41px最小高度。

### Chips

已选对比标签用浅灰底、小圆角和关闭图标，不使用胶囊形大色块。桌面显示房名，900px以下隐藏房名标签，保留已选数量和对比操作。

### Cards / Containers

房源卡片是白底、细边线、surface圆角；选中时改为较深浅灰底和更清楚的灰色边线，不使用侧边高亮竖线。常规桌面内部为图片与文字两列，主体内边距14px；收藏与对比处于卡片底部。空结果使用工具浅灰底、居中说明与一个重置入口。

### Inputs / Fields

租金数字框与选择框使用白底、细灰边和control圆角。桌面高度35px，移动为36px；字段名在上方，单位贴在数值组旁。复选框沿用原生形态，选中色为正文深灰。

### Navigation

资料分类与详情标签都用横向文字导航。当前项以深灰文字、较高字重与2px下划线同时标明，未选项保持克制。详情标签具有键盘左右切换与对应内容面板；图像类别使用独立按钮组，不制造二级导航外壳。

### 图片与原图

详情主图、完整户型、地图与比较表中的图片使用contain保留完整内容；列表和普通实拍缩略图可以cover帮助辨认，图纸缩略图仍保持contain。图片容器提供浅灰留白。原图弹层提供适合窗口/原始尺寸、上一张/下一张与原来源入口，不以修图填满画框。

### 事实条与比较

核心事实使用一行四组数字，上下细分隔，标签置于数字下方。比较表每套房占一列，按相同顺序对齐资料，表头固定；图片同尺寸容器内完整显示。最多三套的数量限制来自当前功能，不据此扩展出新的品牌图形。

图片切换使用短暂亮度过渡，对比托盘使用短暂裁剪显现；不添加持续循环动效。减弱动态偏好下禁用动画与过渡。具体时长与断点记录在 `.impeccable/design.json`。

## Do's and Don'ts

### Do:

- **Do** 以白色页面、黑灰事实和少量红色状态保持既有视觉语言。
- **Do** 把数字、单位、说明分级，让比较内容在同一位置出现。
- **Do** 让完整户型和路线保留全图，并提供原图与来源入口。
- **Do** 保留明确的键盘焦点、标签选中状态和减弱动态适配。
- **Do** 在当前首页验证1280×720下的房名、租金、紧凑事实与主要操作仍可见。

### Don't:

- **Don't** 加入蓝紫渐变、表情图标、装饰性眉题或与日常操作无关的展示字体。
- **Don't** 用阴影、侧边高亮竖线和多层封闭框替代已有的间距与细分隔。
- **Don't** 为填满主图画框裁掉户型或地图；不要生成、拼接或改变房屋实拍内容。
- **Don't** 把来源、观测日期和待核说明处理成装饰，或把未知值做成确定的绿色成功状态。
- **Don't** 把本次首页的列宽和资料顺序当成所有未来页面必须照搬的构图。
