import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import dataset from "./data/listings.json";
import {
  ageYears,
  dateLabel,
  DEFAULT_FILTERS,
  filterHomes,
  money,
} from "./domain";
import type { Filters, Home, Media } from "./domain";

const homes = dataset.homes as Home[];
type IconName =
  | "home"
  | "pin"
  | "heart"
  | "external"
  | "compare"
  | "close"
  | "bike"
  | "arrow-left"
  | "arrow-right"
  | "expand"
  | "check"
  | "reset"
  | "plus"
  | "link";
function Icon({
  name,
  size = 18,
  filled = false,
}: {
  name: IconName;
  size?: number;
  filled?: boolean;
}) {
  const paths: Record<IconName, ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7M5 9v12h14V9" />
        <path d="M9 21v-8h6v8" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
    ),
    external: (
      <>
        <path d="M14 3h7v7M21 3 10 14" />
        <path d="M10 4H4v16h16v-6" />
      </>
    ),
    compare: (
      <>
        <rect x="3" y="4" width="7" height="16" rx="1" />
        <rect x="14" y="4" width="7" height="16" rx="1" />
        <path d="M6 9h1M17 9h1M6 13h1M17 13h1" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    bike: (
      <>
        <circle cx="5" cy="17" r="4" />
        <circle cx="19" cy="17" r="4" />
        <path d="m5 17 5-10 6 10H5l5-10h5M9 4h4M16 4h3l2 5" />
      </>
    ),
    "arrow-left": <path d="m14 6-6 6 6 6" />,
    "arrow-right": <path d="m10 6 6 6-6 6" />,
    expand: <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5" />,
    check: <path d="m5 12 4 4L19 6" />,
    reset: (
      <>
        <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    link: (
      <>
        <path d="m10 14 4-4M9 7l2-2a5 5 0 0 1 7 7l-2 2M15 17l-2 2a5 5 0 0 1-7-7l2-2" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Picture({
  image,
  className = "",
  eager = false,
}: {
  image: Media;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span
      className={`image-unavailable ${className}`}
      role="img"
      aria-label={`${image.caption}暂时无法显示`}
    >
      图片暂时无法显示
      <br />
      <small>可在原始房源中查看</small>
    </span>
  ) : (
    <img
      className={className}
      src={image.src}
      alt={image.caption}
      width={image.width}
      height={image.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

function readSaved(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value)
      ? value.filter(
          (id): id is string =>
            typeof id === "string" && homes.some((h) => h.id === id),
        )
      : [];
  } catch {
    return [];
  }
}

function initialFilters(): Filters {
  const q = new URLSearchParams(location.search);
  const bounded = (name: string, fallback: number) =>
    q.has(name) && Number.isFinite(Number(q.get(name)))
      ? Math.max(15, Math.min(30, Number(q.get(name))))
      : fallback;
  const min = bounded("min", 15),
    max = bounded("max", 30);
  return {
    ...DEFAULT_FILTERS,
    min: Math.min(min, max),
    max: Math.max(min, max),
    age: q.get("age") === "any" ? null : q.get("age") === "10" ? 10 : 20,
    commute:
      q.get("commute") === "any" ? null : q.get("commute") === "15" ? 15 : 20,
    includePending: q.get("pending") === "1",
  };
}

function PriceNumber({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (raw: string) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <input
      type="number"
      inputMode="decimal"
      min="15"
      max="30"
      step="0.5"
      value={draft}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);
        if (raw.trim() && Number(raw) >= 15 && Number(raw) <= 30) onCommit(raw);
      }}
      onBlur={() => {
        const raw = draft.trim() ? draft : String(value);
        onCommit(raw);
        setDraft(String(Math.min(30, Math.max(15, Number(raw)))));
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}

function PhotoDialog({
  images,
  start,
  title,
  onClose,
}: {
  images: Media[];
  start: number;
  title: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(start);
  const [actualSize, setActualSize] = useState(false);
  const image = images[index];
  const step = (by: number) => {
    setIndex((current) => (current + by + images.length) % images.length);
    setActualSize(false);
  };
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
      prior?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="photo-dialog"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          step(1);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          step(-1);
        }
      }}
      aria-label={`${title}原图`}
    >
      <div className="dialog-header">
        <div>
          <strong>{title}</strong>
          <span>
            {image.caption} · {index + 1} / {images.length}
          </span>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="关闭原图">
          <Icon name="close" size={22} />
        </button>
      </div>
      <div className={`photo-stage ${actualSize ? "actual-size" : ""}`}>
        <Picture key={image.src} image={image} eager />
      </div>
      <div className="photo-dialog-footer">
        <div className="photo-links">
          <a href={image.sourceUrl} target="_blank" rel="noreferrer">
            原图片来源 <Icon name="external" size={13} />
          </a>
          <a href={image.src} target="_blank" rel="noreferrer">
            打开原图
          </a>
        </div>
        <div className="photo-tools">
          <button
            className="text-button"
            onClick={() => setActualSize(!actualSize)}
          >
            {actualSize ? "适合窗口" : "原始尺寸"}
          </button>
          <button
            className="icon-button"
            onClick={() => step(-1)}
            aria-label="上一张"
          >
            <Icon name="arrow-left" />
          </button>
          <button
            className="icon-button"
            onClick={() => step(1)}
            aria-label="下一张"
          >
            <Icon name="arrow-right" />
          </button>
        </div>
      </div>
    </dialog>
  );
}

function Gallery({ home }: { home: Home }) {
  const [category, setCategory] = useState<"photos" | "floorplan" | "route">(
    "photos",
  );
  const [index, setIndex] = useState(0);
  const [full, setFull] = useState<number | null>(null);
  const photos = home.photos.filter((p) => p.kind !== "floorplan");
  const plans = home.photos.filter((p) => p.kind === "floorplan");
  const images =
    category === "floorplan"
      ? plans
      : category === "route"
        ? home.commute
          ? [home.commute.image]
          : []
        : photos;
  const image = images[Math.min(index, images.length - 1)];
  const change = (next: typeof category) => {
    setCategory(next);
    setIndex(0);
  };
  return (
    <section className="gallery" aria-label={`${home.name}照片与图纸`}>
      <div className="gallery-controls" role="group" aria-label="图片类别">
        <button
          aria-pressed={category === "photos"}
          onClick={() => change("photos")}
        >
          房屋实拍 <span>{photos.length}</span>
        </button>
        <button
          aria-pressed={category === "floorplan"}
          onClick={() => change("floorplan")}
        >
          户型图 <span>{plans.length}</span>
        </button>
        <button
          aria-pressed={category === "route"}
          onClick={() => change("route")}
        >
          到校路线
        </button>
        <span className="image-hint">点击看原图</span>
      </div>
      <div
        className={`gallery-main ${category !== "photos" ? "document-view" : ""}`}
      >
        {image ? (
          <>
            <button
              className="hero-photo"
              onClick={() => setFull(Math.min(index, images.length - 1))}
              aria-label={`放大${image.caption}`}
            >
              <Picture key={image.src} image={image} eager />
              <span className="expand-label">
                <Icon name="expand" size={14} />
                查看原图
              </span>
            </button>
            <div className="gallery-thumbs" aria-label="选择照片">
              {images.slice(0, 4).map((photo, i) => (
                <button
                  key={photo.src}
                  className={index === i ? "chosen-thumb" : ""}
                  aria-pressed={index === i}
                  onClick={() => setIndex(i)}
                  aria-label={`查看${photo.caption}第${i + 1}张`}
                >
                  <Picture image={photo} />
                  {i === 3 && images.length > 4 && (
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        setFull(3);
                      }}
                    >
                      共{images.length}张
                    </span>
                  )}
                </button>
              ))}
            </div>
            {images.length > 4 && (
              <button className="all-photos" onClick={() => setFull(0)}>
                查看全部{images.length}张实拍
              </button>
            )}
          </>
        ) : (
          <div className="route-pending">
            <Icon name="pin" size={30} />
            <strong>完整门牌与到校路线待核</strong>
            <p>现有广告只公开到丁目，不能给出准确导航时间。</p>
          </div>
        )}
      </div>
      {category === "route" && home.commute && (
        <div className="route-caption">
          <span>
            <Icon name="bike" size={16} />
            <strong>{home.commute.minutes}分钟</strong> ·{" "}
            {home.commute.distanceKm}公里 · 爬升{home.commute.ascentM}米
          </span>
          <a href={home.commute.url} target="_blank" rel="noreferrer">
            打开导航 <Icon name="external" size={13} />
          </a>
          <p>
            完整公开门牌地址点至OIS，未实骑。{home.commute.note}慢骑情景约
            {home.commute.slowMinutes}分钟。
          </p>
        </div>
      )}
      {full !== null && (
        <PhotoDialog
          images={images}
          start={full}
          title={home.name}
          onClose={() => setFull(null)}
        />
      )}
    </section>
  );
}

function HomeDetail({
  home,
  favorite,
  onFavorite,
  compared,
  onCompare,
  compareFull,
}: {
  home: Home;
  favorite: boolean;
  onFavorite: () => void;
  compared: boolean;
  onCompare: () => void;
  compareFull: boolean;
}) {
  const [tab, setTab] = useState<"overview" | "fees" | "commute" | "sources">(
    "overview",
  );
  const [copyStatus, setCopyStatus] = useState("");
  const tabs = [
    { id: "overview", label: "房屋概况" },
    { id: "fees", label: "费用与租约" },
    { id: "commute", label: "通学信息" },
    { id: "sources", label: "核对来源" },
  ] as const;
  return (
    <article className="home-detail" aria-labelledby="detail-title">
      <div className="detail-context">
        <span>
          <Icon name="pin" size={14} />
          {home.neighborhood}
        </span>
        <span
          className={`listing-status ${home.status === "pending" ? "pending" : ""}`}
        >
          <Icon name={home.status === "verified" ? "check" : "pin"} size={13} />
          {home.status === "verified" ? "广告与路线已核" : "门牌和路线待核"}
        </span>
      </div>
      <div className="detail-heading">
        <div>
          <h2 id="detail-title">{home.name}</h2>
          <p className="headline-facts">
            <strong>{home.layout}</strong> · {home.sizeM2}㎡ · 约
            {Math.floor(ageYears(home.built))}年 ·{" "}
            {home.commute
              ? `骑车导航${home.commute.minutes}分钟`
              : "到校路线待核"}
          </p>
        </div>
        <div className="detail-rent">
          <strong>
            {home.rentYen / 10000}
            <span>万日元</span>
          </strong>
          <small>每月租金 · 管理费{money(home.managementFeeYen)}</small>
        </div>
      </div>
      <div className="detail-actions">
        <a
          className="primary-button"
          href={home.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          查看原始房源 <Icon name="external" size={15} />
        </a>
        <button
          className={`secondary-button ${compared ? "is-compared" : ""}`}
          onClick={onCompare}
          disabled={compareFull && !compared}
        >
          <Icon name={compared ? "check" : "compare"} size={16} />
          {compared ? "已加入对比" : "加入对比"}
        </button>
        <button
          className={`icon-button favorite-button ${favorite ? "is-favorite" : ""}`}
          onClick={onFavorite}
          aria-label={favorite ? "取消收藏此房" : "收藏此房"}
          aria-pressed={favorite}
        >
          <Icon name="heart" filled={favorite} />
        </button>
        <span className="ad-observed">
          广告核对 {dateLabel(home.checkedAt, true)}
        </span>
      </div>
      <Gallery key={home.id} home={home} />
      <div className="key-facts">
        <div>
          <strong>{home.layout}</strong>
          <span>{home.bedrooms}间卧室</span>
        </div>
        <div>
          <strong>
            {home.sizeM2}
            <small>㎡</small>
          </strong>
          <span>
            {home.id === "N001" ? "广告面积，车库范围待核" : "广告面积"}
          </span>
        </div>
        <div>
          <strong>
            {Math.floor(ageYears(home.built))}
            <small>年</small>
          </strong>
          <span>{home.built.replace("-", "年")}月建</span>
        </div>
        <div>
          <strong>
            {home.commute ? (
              <>
                {home.commute.minutes}
                <small>分钟</small>
              </>
            ) : (
              "待核"
            )}
          </strong>
          <span>{home.commute ? "骑车导航至OIS" : "到OIS的路线"}</span>
        </div>
      </div>
      <div className="detail-tabs" role="tablist" aria-label="房源详细资料">
        {tabs.map((item, i) => (
          <button
            role="tab"
            id={`tab-${item.id}`}
            aria-controls="detail-panel"
            aria-selected={tab === item.id}
            tabIndex={tab === item.id ? 0 : -1}
            key={item.id}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                const next =
                  tabs[
                    (i + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
                      tabs.length
                  ];
                setTab(next.id);
                document.getElementById(`tab-${next.id}`)?.focus();
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <section
        className="detail-panel"
        id="detail-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
        {tab === "overview" && (
          <>
            <p className="panel-intro">{home.summary}</p>
            <div className="overview-row">
              <div>
                <h3>入住与停车</h3>
                <p>{home.moveIn}</p>
                <p>{home.parking}</p>
              </div>
              <div>
                <h3>公开地址</h3>
                <p>{home.address}</p>
                <p className="muted">{home.statusNote}</p>
              </div>
            </div>
            <h3>看房前留意</h3>
            <ul className="attention-list">
              {home.attention.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </>
        )}
        {tab === "fees" && (
          <>
            <h3>月租以外，也要看清这些费用</h3>
            <p className="panel-intro">
              {home.lease}
              。下表为各来源已披露项目，是否必选及最终金额需取得正式报价；不是全包总价。
            </p>
            <dl className="fee-list">
              {home.fees.map((fee) => (
                <div key={fee.label}>
                  <dt>{fee.label}</dt>
                  <dd>{fee.value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
        {tab === "commute" &&
          (home.commute ? (
            <>
              <div className="commute-heading">
                <Icon name="bike" size={25} />
                <div>
                  <h3>
                    骑车导航 {home.commute.minutes}分钟 ·{" "}
                    {home.commute.distanceKm}公里
                  </h3>
                  <p>目的地：箕面市小野原西4-4-16，OIS学校地点</p>
                </div>
              </div>
              <p>
                {home.commute.note}
                这是地图导航估计，未实骑，也不包括停好自行车后的校内步行。
              </p>
              <p>
                按12公里/小时加3分钟缓冲估算，慢骑约
                <strong>{home.commute.slowMinutes}分钟</strong>
                ；返程上坡、上学日路口等候需另核。
              </p>
              <p>
                本套尚未核到包含家到站、候车、换乘和下车步行的20分钟公交方案。
              </p>
              <a
                className="inline-link"
                href={home.commute.url}
                target="_blank"
                rel="noreferrer"
              >
                打开这套房到OIS的骑车导航 <Icon name="external" size={14} />
              </a>
              <small className="source-time">
                地图观测：{dateLabel(home.commute.observedAt, true)}，日本时间
              </small>
            </>
          ) : (
            <>
              <h3>到校时间仍待核实</h3>
              <p>
                当前广告没有对应这套出租房的完整公开门牌，不能用街区中心或车站代替家门口。取得门牌后再核路线。
              </p>
            </>
          ))}
        {tab === "sources" && (
          <>
            <h3>看得到依据，再决定看房</h3>
            <p className="panel-intro">
              正式房名：{home.formalName}
              。网页挂牌不等于中介已确认空室；价格、入住日期和费用以最新原广告及正式合同为准。
            </p>
            <div className="source-list">
              {home.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>
                    {source.label}
                    <small>
                      实际读取：{dateLabel(source.observedAt, true)}，日本时间
                    </small>
                  </span>
                  <Icon name="external" size={15} />
                </a>
              ))}
            </div>
            <p className="muted">
              实拍与户型归原权利人所有，每张原图均附来源。本站独立整理，与学校及中介没有隶属关系。
            </p>
            <button
              className="text-button copy-link"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(location.href);
                  setCopyStatus("房源链接已复制");
                } catch {
                  setCopyStatus("复制未成功，可复制浏览器地址栏的链接");
                }
              }}
            >
              <Icon name="link" size={15} />
              复制此房链接
            </button>
            <span role="status" className="copy-status">
              {copyStatus}
            </span>
          </>
        )}
      </section>
    </article>
  );
}

function CompareDialog({
  selected,
  onClose,
}: {
  selected: Home[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    ref.current!.showModal();
    return () => {
      ref.current?.close();
      prior?.focus();
    };
  }, []);
  const row = (label: string, render: (home: Home) => ReactNode) => (
    <tr>
      <th scope="row">{label}</th>
      {selected.map((home) => (
        <td key={home.id}>{render(home)}</td>
      ))}
    </tr>
  );
  return (
    <dialog
      className="compare-dialog"
      ref={ref}
      onCancel={onClose}
      aria-labelledby="compare-title"
    >
      <div className="dialog-header">
        <div>
          <strong id="compare-title">把这{selected.length}套放在一起看</strong>
          <span>同一顺序，比较月租、房间和每天到校的路。</span>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="关闭对比">
          <Icon name="close" size={22} />
        </button>
      </div>
      <div className="compare-scroll">
        <table className="compare-table">
          <caption className="sr-only">选中房源的横向对比</caption>
          <thead>
            <tr>
              <th scope="col">房源</th>
              {selected.map((home) => (
                <th key={home.id} scope="col">
                  <h3>{home.name}</h3>
                  <p>
                    {home.rentYen / 10000}
                    <small>万日元 / 月</small>
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {row("实拍", (home) => (
              <Picture
                image={home.photos.find((p) => p.kind === "exterior")!}
              />
            ))}
            {row("户型图", (home) => (
              <a
                href={home.photos.find((p) => p.kind === "floorplan")!.src}
                target="_blank"
                rel="noreferrer"
                aria-label={`打开${home.name}完整户型图`}
              >
                <Picture
                  className="compare-plan"
                  image={home.photos.find((p) => p.kind === "floorplan")!}
                />
                <span className="tiny-link">
                  打开完整户型 <Icon name="external" size={11} />
                </span>
              </a>
            ))}
            {row("面积 / 户型", (home) => (
              <>
                {home.sizeM2}㎡ · {home.layout}
                <p>
                  {home.id === "N001"
                    ? "仅1间卧室，面积是否含车库待核"
                    : `${home.bedrooms}间卧室`}
                </p>
              </>
            ))}
            {row(
              "建成年月",
              (home) =>
                `${home.built} · 约${Math.floor(ageYears(home.built))}年`,
            )}
            {row("到OIS", (home) =>
              home.commute ? (
                <>
                  <strong>骑车导航{home.commute.minutes}分钟</strong>
                  <p>
                    {home.commute.distanceKm}公里；慢骑情景约
                    {home.commute.slowMinutes}分钟
                  </p>
                  <a
                    className="tiny-link"
                    href={home.commute.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    打开导航 <Icon name="external" size={11} />
                  </a>
                </>
              ) : (
                "门牌与路线待核"
              ),
            )}
            {row("入住", (home) => home.moveIn)}
            {row("停车", (home) => home.parking)}
            {row("押金与契约费用", (home) =>
              home.fees
                .filter((fee) => /押金|契约金/.test(fee.label))
                .map((fee) => (
                  <p key={fee.label}>
                    {fee.label}：{fee.value}
                  </p>
                )),
            )}
            {row("租约", (home) => home.lease)}
            {row("原始广告", (home) => (
              <a
                className="inline-link"
                href={home.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                查看原始房源 <Icon name="external" size={13} />
              </a>
            ))}
          </tbody>
        </table>
      </div>
      <p className="compare-note">
        路线为完整公开地址点至学校的导航估计，未实骑；实际空室、入口、费用与入住时间仍需确认。
      </p>
    </dialog>
  );
}

export default function App() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selectedId, setSelectedId] = useState(
    () => new URLSearchParams(location.search).get("house") ?? homes[0].id,
  );
  const [favorites, setFavorites] = useState(() =>
    readSaved("ois-homes-favorites-v1"),
  );
  const [compared, setCompared] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const results = useMemo(
    () => filterHomes(homes, filters, favorites),
    [filters, favorites],
  );
  const selected = results.find((home) => home.id === selectedId) ?? results[0];
  const picked = homes.filter((home) => compared.includes(home.id));
  const pendingCount = homes.filter((home) => home.status === "pending").length;
  useEffect(() => {
    try {
      localStorage.setItem("ois-homes-favorites-v1", JSON.stringify(favorites));
    } catch {
      /* The current session remains usable when storage is unavailable. */
    }
  }, [favorites]);
  useEffect(() => {
    const q = new URLSearchParams();
    if (selected) q.set("house", selected.id);
    if (filters.min !== 15) q.set("min", String(filters.min));
    if (filters.max !== 30) q.set("max", String(filters.max));
    if (filters.age !== 20)
      q.set("age", filters.age === null ? "any" : String(filters.age));
    if (filters.commute !== 20)
      q.set(
        "commute",
        filters.commute === null ? "any" : String(filters.commute),
      );
    if (filters.includePending) q.set("pending", "1");
    history.replaceState(
      null,
      "",
      `${location.pathname}${q.size ? "?" + q : ""}`,
    );
  }, [filters, selected?.id]);
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const toggleFavorite = (id: string) =>
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const toggleCompare = (id: string) =>
    setCompared((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 3
          ? [...current, id]
          : current,
    );
  const reset = () => setFilters({ ...DEFAULT_FILTERS });
  function priceInput(key: "min" | "max", raw: string) {
    const number = Number(raw);
    if (!Number.isFinite(number)) return;
    const value = Math.min(30, Math.max(15, number));
    setFilters((current) =>
      key === "min"
        ? { ...current, min: value, max: Math.max(value, current.max) }
        : { ...current, max: value, min: Math.min(value, current.min) },
    );
  }
  return (
    <>
      <a className="skip-link" href="#results">
        跳到房源
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="/" aria-label="OIS附近住首页">
            <span className="brand-icon">
              <Icon name="home" size={21} />
            </span>
            OIS <span>附近住</span>
          </a>
          <div className="header-actions">
            <span className="updated">
              资料核对 {dateLabel(dataset.dataAsOf)}
            </span>
            <button
              className={`text-button favorites-filter ${filters.favoritesOnly ? "active" : ""}`}
              onClick={() => update("favoritesOnly", !filters.favoritesOnly)}
              aria-pressed={filters.favoritesOnly}
            >
              <Icon name="heart" filled={filters.favoritesOnly} />
              我的收藏<span>{favorites.length}</span>
            </button>
            <a
              className="source-code-link"
              href="https://github.com/lukeliu95/ois-homes"
              target="_blank"
              rel="noreferrer"
            >
              开源代码 <Icon name="external" size={13} />
            </a>
          </div>
        </div>
      </header>
      <main className="container">
        <section className="intro">
          <div>
            <h1>住在 OIS 附近。</h1>
            <p>从月租、房间到每天的上学路，找到更适合的一户建。</p>
          </div>
          <a
            className="school-anchor"
            href={dataset.school.url}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="pin" size={21} />
            <span>
              <strong>Osaka International School</strong>
              <small>箕面市小野原西4-4-16</small>
            </span>
            <Icon name="external" size={13} />
          </a>
        </section>
        <section className="filter-bar" aria-label="筛选房源">
          <fieldset className="price-field">
            <legend>每月租金</legend>
            <div className="price-inputs">
              <label>
                <span className="sr-only">最低月租，万日元</span>
                <PriceNumber
                  value={filters.min}
                  onCommit={(raw) => priceInput("min", raw)}
                />
              </label>
              <span className="price-to">至</span>
              <label>
                <span className="sr-only">最高月租，万日元</span>
                <PriceNumber
                  value={filters.max}
                  onCommit={(raw) => priceInput("max", raw)}
                />
              </label>
              <span>万日元</span>
            </div>
          </fieldset>
          <label className="select-field">
            <span>房龄</span>
            <select
              aria-label="房龄"
              value={filters.age ?? "any"}
              onChange={(event) =>
                update(
                  "age",
                  event.target.value === "any"
                    ? null
                    : Number(event.target.value),
                )
              }
            >
              <option value="20">20年以内</option>
              <option value="10">10年以内</option>
              <option value="any">不限房龄</option>
            </select>
          </label>
          <label className="select-field">
            <span>到OIS的导航时间</span>
            <select
              aria-label="到OIS的导航时间"
              value={filters.commute ?? "any"}
              onChange={(event) =>
                update(
                  "commute",
                  event.target.value === "any"
                    ? null
                    : Number(event.target.value),
                )
              }
            >
              <option value="20">20分钟以内</option>
              <option value="15">15分钟以内</option>
              <option value="any">不限，含路线待核</option>
            </select>
          </label>
          <label className="pending-filter">
            <input
              type="checkbox"
              checked={filters.includePending}
              onChange={(event) =>
                update("includePending", event.target.checked)
              }
            />
            <span>包含待核房源</span>
          </label>
          <button className="text-button reset-filter" onClick={reset}>
            <Icon name="reset" size={15} />
            重置
          </button>
        </section>
        <div className="results-toolbar" id="results">
          <div>
            <strong aria-live="polite">{results.length}套房源</strong>
            <span>整栋一户建 · 月租15万～30万</span>
          </div>
          <label>
            <span className="sr-only">排序方式</span>
            <select
              aria-label="排序方式"
              value={filters.sort}
              onChange={(event) =>
                update("sort", event.target.value as Filters["sort"])
              }
            >
              <option value="rent">月租从低到高</option>
              <option value="commute">到校时间优先</option>
              <option value="area">面积从大到小</option>
              <option value="newest">建年从新到旧</option>
            </select>
          </label>
        </div>
        <div className={`workspace ${!selected ? "no-results" : ""}`}>
          <aside className="listing-rail" aria-label="房源列表">
            {results.length ? (
              <>
                {results.map((home) => (
                  <article
                    key={home.id}
                    className={`listing-item ${selected?.id === home.id ? "selected" : ""}`}
                  >
                    <button
                      className="listing-select"
                      onClick={() => setSelectedId(home.id)}
                      aria-pressed={selected?.id === home.id}
                      aria-label={`查看${home.name}`}
                    >
                      <Picture
                        image={home.photos.find(
                          (photo) => photo.kind === "exterior",
                        )!}
                      />
                      <span className="listing-info">
                        <span className="listing-price">
                          {home.rentYen / 10000}
                          <small>万 / 月</small>
                        </span>
                        <strong>{home.name}</strong>
                        <span>
                          {home.layout} · {home.sizeM2}㎡ · 约
                          {Math.floor(ageYears(home.built))}年
                        </span>
                        <span
                          className={
                            home.commute ? "list-commute" : "list-pending"
                          }
                        >
                          <Icon
                            name={home.commute ? "bike" : "pin"}
                            size={14}
                          />
                          {home.commute
                            ? `到OIS ${home.commute.minutes}分钟`
                            : "到校路线待核"}
                        </span>
                      </span>
                    </button>
                    <div className="listing-foot">
                      <label>
                        <input
                          type="checkbox"
                          aria-label={`对比${home.name}`}
                          checked={compared.includes(home.id)}
                          onChange={() => toggleCompare(home.id)}
                          disabled={
                            compared.length >= 3 && !compared.includes(home.id)
                          }
                        />
                        加入对比
                      </label>
                      <button
                        className={`icon-button ${favorites.includes(home.id) ? "is-favorite" : ""}`}
                        aria-pressed={favorites.includes(home.id)}
                        aria-label={`${favorites.includes(home.id) ? "取消收藏" : "收藏"}${home.name}`}
                        onClick={() => toggleFavorite(home.id)}
                      >
                        <Icon
                          name="heart"
                          size={17}
                          filled={favorites.includes(home.id)}
                        />
                      </button>
                    </div>
                  </article>
                ))}
                {!filters.includePending && pendingCount > 0 && (
                  <div className="pending-tip">
                    <strong>还有{pendingCount}套待核线索</strong>
                    <p>有实际广告和图片，尚缺完整门牌或到校路线。</p>
                    <button
                      className="text-button"
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          includePending: true,
                          commute: null,
                        }))
                      }
                    >
                      查看待核房源，暂不限制通学时间{" "}
                      <Icon name="arrow-right" size={13} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-results">
                <Icon
                  name={filters.favoritesOnly ? "heart" : "home"}
                  size={32}
                />
                <h2>
                  {filters.favoritesOnly
                    ? "收藏里还没有符合的房子"
                    : "暂时没有符合条件的房子"}
                </h2>
                <p>
                  {filters.favoritesOnly
                    ? "点击房源旁的爱心收藏，或放宽当前筛选条件。"
                    : "换一个预算或房龄范围试试。资料不够的房源会明确标为待核。"}
                </p>
                <button className="primary-button" onClick={reset}>
                  重置筛选，查看房源
                </button>
              </div>
            )}
            <p className="listing-disclaimer">
              网页仍展示招租广告，不代表中介已确认空室。到校时间为导航估计，未实骑。
            </p>
          </aside>
          {selected ? (
            <HomeDetail
              key={selected.id}
              home={selected}
              favorite={favorites.includes(selected.id)}
              onFavorite={() => toggleFavorite(selected.id)}
              compared={compared.includes(selected.id)}
              onCompare={() => toggleCompare(selected.id)}
              compareFull={compared.length >= 3}
            />
          ) : (
            <section className="empty-detail">
              <h2>合适的房子，值得慢慢选。</h2>
              <p>先调整左侧筛选，再看真实照片、户型和每天的上学路。</p>
            </section>
          )}
        </div>
        <footer className="site-footer">
          <p>OIS附近住 · 独立整理的找房资料，与学校及中介无隶属关系。</p>
          <p>
            资料观测：{new Date(dataset.dataAsOf).getFullYear()}年
            {dateLabel(dataset.dataAsOf)}
            ，日本时间。实拍、户型与地图均保留原来源。
          </p>
          <a href="/media/attribution.json" target="_blank" rel="noreferrer">
            图片来源清单 <Icon name="external" size={12} />
          </a>
        </footer>
      </main>
      {picked.length > 0 && (
        <div className="compare-tray" aria-label="已选对比房源">
          <div className="container compare-tray-inner">
            <div className="tray-homes">
              <Icon name="compare" size={19} />
              <strong>已选{picked.length}套</strong>
              {picked.map((home) => (
                <button
                  key={home.id}
                  className="tray-chip"
                  onClick={() => toggleCompare(home.id)}
                  aria-label={`移除对比${home.name}`}
                >
                  {home.name}
                  <Icon name="close" size={12} />
                </button>
              ))}
            </div>
            <div className="tray-actions">
              <button className="text-button" onClick={() => setCompared([])}>
                清空
              </button>
              <button
                className="primary-button"
                disabled={picked.length < 2}
                onClick={() => setComparing(true)}
              >
                {picked.length < 2
                  ? "再选1套开始对比"
                  : `比较这${picked.length}套`}
                <Icon name="arrow-right" size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
      {comparing && (
        <CompareDialog selected={picked} onClose={() => setComparing(false)} />
      )}
    </>
  );
}
