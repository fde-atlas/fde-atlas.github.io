// 主题切换：默认跟随系统；点按钮在浅色 / 深色之间切换，选择记在 localStorage（页面 <head> 里的脚本负责首屏套用）
document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
  const html = document.documentElement;
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  btn.addEventListener("click", () => {
    const current = html.dataset.theme || (system.matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    html.dataset.theme = next;
    // 手机浏览器地址栏颜色跟着换成页头底色
    const surface = getComputedStyle(html).getPropertyValue("--surface").trim();
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => (m.content = surface));
    try {
      localStorage.setItem("fde-theme", next);
    } catch (e) {
      // 隐私模式等情况下存不了，只在当前页面生效
    }
  });
});

// 导航：放不下时按滚动位置在两端渐隐（提示还能横滑），当前栏目滚到中间
document.querySelectorAll(".nav").forEach((nav) => {
  const fade = () => {
    nav.classList.toggle("fade-l", nav.scrollLeft > 2);
    nav.classList.toggle("fade-r", nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2);
  };
  const current = nav.querySelector("[aria-current]");
  if (current) {
    const offset = current.getBoundingClientRect().left - nav.getBoundingClientRect().left;
    nav.scrollLeft += offset - (nav.clientWidth - current.offsetWidth) / 2;
  }
  fade();
  nav.addEventListener("scroll", fade, { passive: true });
  window.addEventListener("resize", fade);
});

// 页头：手机上往下滚动时收起，往上滚动时出现（style.css 里 .tucked 只在窄屏生效）
(() => {
  const header = document.querySelector(".site-header");
  if (!header) return;
  let last = window.scrollY;
  let queued = false;
  // 带着锚点打开或返回时页面已经滚下去了，先收起，免得挡住跳到的位置
  if (last > header.offsetHeight) header.classList.add("tucked");
  window.addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const y = window.scrollY;
      if (Math.abs(y - last) < 8) return;   // 忽略地址栏伸缩等小幅抖动
      header.classList.toggle("tucked", y > last && y > header.offsetHeight && !header.contains(document.activeElement));
      last = y;
    });
  }, { passive: true });
  header.addEventListener("focusin", () => header.classList.remove("tucked"));
})();

// 手机上折叠的长列表：按钮前面是列表本身（[data-fold]），或包着它的 .table-wrap
document.querySelectorAll("[data-unfold]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const prev = btn.previousElementSibling;
    (prev.matches("[data-fold]") ? prev : prev.querySelector("[data-fold]")).classList.add("open");
    btn.remove();
  });
});

// 正文前的可展开目录：点了某一节就收起
document.querySelectorAll(".toc-inline").forEach((toc) => {
  toc.addEventListener("click", (e) => {
    if (e.target.closest("a")) toc.open = false;
  });
});

// 收录时间：<time data-ago datetime="ISO"> 在 7 天以内换成"3 小时前收录"，超过 7 天保留页面上写的日期；
// data-ago="short" 只显示"3 小时前"
(() => {
  const zh = document.documentElement.lang.startsWith("zh");
  const fmt = new Intl.RelativeTimeFormat(zh ? "zh-CN" : "en", { numeric: "auto" });
  document.querySelectorAll("time[data-ago]").forEach((el) => {
    const minutes = (Date.now() - Date.parse(el.dateTime)) / 60000;
    if (!(minutes >= 0) || minutes > 7 * 24 * 60) return;
    const rel = minutes < 60 ? fmt.format(-Math.max(1, Math.round(minutes)), "minute")
      : minutes < 24 * 60 ? fmt.format(-Math.round(minutes / 60), "hour")
      : fmt.format(-Math.round(minutes / 1440), "day");
    el.textContent = el.dataset.ago === "short" ? rel : zh ? `${rel}收录` : `added ${rel}`;
    el.title = new Date(el.dateTime).toLocaleString();
  });
})();

// 文章目录：[data-toc] 里的链接对应正文标题，滚动时高亮当前读到的那一节，目录自己也滚到这一项
document.querySelectorAll("[data-toc]").forEach((toc) => {
  const links = [...toc.querySelectorAll('a[href^="#"]')];
  const heads = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))));
  let current = -1;
  function update() {
    let i = -1;
    heads.forEach((h, j) => {
      if (h && h.getBoundingClientRect().top < 120) i = j;
    });
    if (i === current) return;
    current = i;
    links.forEach((a, j) => (j === i ? a.setAttribute("aria-current", "location") : a.removeAttribute("aria-current")));
    const a = links[i];
    if (a && (a.offsetTop < toc.scrollTop || a.offsetTop + a.offsetHeight > toc.scrollTop + toc.clientHeight)) {
      toc.scrollTop = a.offsetTop - toc.clientHeight / 2;
    }
  }
  let queued = false;
  window.addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  }, { passive: true });
  update();
});

// 正文里引用的外站图片加载失败时隐藏，不留破图
document.querySelectorAll(".prose img").forEach((img) => {
  if (img.complete && !img.naturalWidth) img.hidden = true;
  img.addEventListener("error", () => (img.hidden = true));
});

// 标签页：[data-tabs] 里的 [role=tab] 按钮切换对应顺序的 [role=tabpanel]
document.querySelectorAll("[data-tabs]").forEach((root) => {
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panels = [...root.querySelectorAll('[role="tabpanel"]')];
  tabs.forEach((tab, i) =>
    tab.addEventListener("click", () => {
      tabs.forEach((t, j) => t.setAttribute("aria-selected", String(i === j)));
      panels.forEach((p, j) => (p.hidden = i !== j));
    })
  );
});

// 列表筛选：[data-filter] 容器里的搜索框和 select[data-key] 过滤 [data-item] 元素。
// 容器带 data-more 时，页面上只渲染了一部分，其余列表项在第一次筛选时从这个 JSON 加载（{"html": "<li>…"}）
document.querySelectorAll("[data-filter]").forEach((root) => {
  let items = [...root.querySelectorAll("[data-item]")];
  const input = root.querySelector('input[type="search"]');
  const selects = [...root.querySelectorAll("select[data-key]")];
  const count = root.querySelector("[data-count]");
  let more = null;

  function loadMore() {
    if (!root.dataset.more) return Promise.resolve();
    more = more || fetch(root.dataset.more).then((r) => r.json()).then((data) => {
      items[items.length - 1].insertAdjacentHTML("afterend", data.html);
      items = [...root.querySelectorAll("[data-item]")];
    }).catch(() => {});  // 加载失败就只筛选页面上已有的条目
    return more;
  }

  function apply() {
    const terms = (input ? input.value : "").toLowerCase().split(/\s+/).filter(Boolean);
    // fields：单篇条目是它的 dataset，系列里的每一篇是 data-members 里的一项（text / lang / cat / topic）
    const match = (fields) => terms.every((t) => fields.text.includes(t))
      && selects.every((s) => !s.value || ` ${fields[s.dataset.key] || ""} `.includes(` ${s.value} `));
    let shown = 0;
    for (const el of items) {
      let n;
      if (el.dataset.members) {   // 系列入口：有一篇命中就显示，计数只算命中的篇数
        el.members = el.members || JSON.parse(el.dataset.members);
        n = el.members.filter(match).length;
      } else {
        n = match(el.dataset) ? 1 : 0;
      }
      el.hidden = !n;
      shown += n;
    }
    if (count) count.textContent = shown;
  }

  // 手机上列表折叠着：点"显示全部"时把 more.json 里的其余条目也加载进来；一开始筛选就整个展开，筛选结果不被截断
  const unfold = root.querySelector("[data-unfold]");
  if (unfold) unfold.addEventListener("click", () => loadMore());
  const update = () => {
    if (unfold && unfold.isConnected) unfold.click();
    return loadMore().then(apply);
  };
  // 地址里的 ?q= 填进搜索框，?topic= / ?cat= / ?lang= 选中对应的下拉项（专题页的"查看全部"链到这里）
  const params = new URLSearchParams(location.search);
  if (params.get("q") && input) input.value = params.get("q");
  selects.forEach((s) => {
    const v = params.get(s.dataset.key);
    if (v && [...s.options].some((o) => o.value === v)) s.value = v;
  });
  if (input) input.addEventListener("input", update);
  selects.forEach((s) => s.addEventListener("change", update));
  // 没有筛选条件时页面就是完整的初始状态（计数是全部条目数），不用加载其余条目
  if ((input && input.value) || selects.some((s) => s.value)) update();
});
