"use strict";
(() => {
  // src/picker/picker.ts
  var { sessionId: SESSION, multiSelect: MULTI, allowUpload: UPLOAD, items: ITEMS } = window.__PICKER_CONFIG__;
  var selected = /* @__PURE__ */ new Set();
  var uploaded = [];
  var nextIdx = ITEMS.length;
  var grid = document.getElementById("grid");
  var count = document.getElementById("count");
  var btnOk = document.getElementById("btn-confirm");
  var btnX = document.getElementById("btn-cancel");
  var zone = document.getElementById("upload-zone");
  var status = document.getElementById("upload-status");
  ITEMS.forEach((item, i) => addCard(item, i));
  btnOk.addEventListener("click", confirm_);
  btnX.addEventListener("click", cancel_);
  if (UPLOAD) {
    zone.style.display = "flex";
    const fi = document.getElementById("fi");
    zone.addEventListener("click", () => fi.click());
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("over"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("over");
      if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
    });
    fi.addEventListener("change", () => {
      if (fi.files) handleFiles(fi.files);
    });
  }
  function el(tag, attrs = {}, text) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text !== void 0) node.textContent = text;
    return node;
  }
  function addCard(item, idx) {
    const isHistory = item.metadata?.["_src"] === "history";
    const card = el("div", {
      class: "card" + (isHistory ? " history" : ""),
      "data-idx": String(idx)
    });
    card.addEventListener("click", () => toggle(idx));
    const img = el("img", {
      class: "card-img",
      src: "/picker-image?path=" + encodeURIComponent(item.imagePath),
      alt: item.label
    });
    img.addEventListener("error", () => {
      img.style.opacity = "0.2";
    });
    card.append(
      el("div", { class: "badge" }, String(idx + 1)),
      img,
      el("div", { class: "label" }, item.label)
    );
    if (isHistory) {
      card.append(el("div", { class: "hist-badge" }, "\u5386\u53F2"));
    }
    if (item.metadata) {
      const meta = el("div", { class: "meta" });
      for (const [k, v] of Object.entries(item.metadata)) {
        if (k === "_src") continue;
        const row = el("div", { class: "meta-row" });
        row.append(el("span", { class: "mk" }, k), el("span", {}, v));
        meta.append(row);
      }
      if (meta.children.length) card.append(meta);
    }
    card.append(el("div", { class: "check" }, "\u2713"));
    grid.appendChild(card);
  }
  function toggle(idx) {
    if (!MULTI) selected.clear();
    selected.has(idx) ? selected.delete(idx) : selected.add(idx);
    render();
  }
  function render() {
    grid.querySelectorAll(".card").forEach((card) => {
      const idx = Number(card.dataset["idx"]);
      card.classList.toggle("selected", selected.has(idx));
    });
    const n = selected.size;
    count.textContent = `${n} selected` + (uploaded.length ? ` \xB7 ${uploaded.length} uploaded` : "");
    btnOk.disabled = n === 0;
  }
  var IMAGE_EXTS = /\.(png|jpe?g|webp|gif|bmp)$/i;
  function readB64(file) {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result.split(",")[1]);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }
  async function handleFiles(fileList) {
    const files = [...fileList].filter(
      (f) => f.type.startsWith("image/") || IMAGE_EXTS.test(f.name)
    );
    if (!files.length) {
      setStatus("\u26A0 No image files detected");
      return;
    }
    setStatus(`Uploading ${files.length} file(s)...`);
    let ok = 0, fail = 0;
    for (const f of files) {
      try {
        const b64 = await readB64(f);
        const res = await fetch(`/api/picker-upload/${SESSION}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: f.name, data: b64, mime: f.type || "image/png", size: f.size })
        });
        if (res.ok) {
          const { item } = await res.json();
          const idx = nextIdx++;
          addCard(item, idx);
          uploaded.push({ name: item.label, path: item.imagePath });
          grid.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          ok++;
        } else {
          console.error("Upload failed:", res.status, await res.text());
          fail++;
        }
      } catch (e) {
        console.error("Upload error:", e);
        fail++;
      }
    }
    setStatus(
      fail ? `\u26A0 ${fail} failed, ${ok} uploaded` : `\u2713 ${ok} uploaded \u2014 click to select`
    );
    render();
  }
  function setStatus(msg) {
    status.textContent = msg;
  }
  async function confirm_() {
    btnOk.disabled = true;
    await fetch(`/api/pick/${SESSION}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ indices: [...selected], uploaded, cancelled: false })
    });
    document.body.innerHTML = '<div style="text-align:center;padding:80px;color:#c8a2e8;font-size:1.2rem">\u2713 Confirmed \u2014 you can close this tab</div>';
  }
  async function cancel_() {
    await fetch(`/api/pick/${SESSION}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ indices: [], uploaded: [], cancelled: true })
    });
    document.body.innerHTML = '<div style="text-align:center;padding:80px;color:#666;font-size:1.2rem">Cancelled</div>';
  }
})();
