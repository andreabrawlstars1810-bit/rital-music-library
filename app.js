(() => {
  const cfg = window.RITAL_CONFIG || {};
  const grid = document.getElementById("fileGrid");
  const notice = document.getElementById("notice");
  const empty = document.getElementById("emptyState");
  const count = document.getElementById("fileCount");
  const updated = document.getElementById("updatedAt");
  const search = document.getElementById("searchInput");
  const toast = document.getElementById("toast");
  let allFiles = [];
  let activeFilter = "all";
  let toastTimer;

  const validConfig = () =>
    cfg.googleApiKey && cfg.googleApiKey !== "COLLE_TA_CLE_API_ICI" &&
    cfg.audioFolderId && !cfg.audioFolderId.startsWith("ID_DU_") &&
    cfg.pdfFolderId && !cfg.pdfFolderId.startsWith("ID_DU_");

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }
  function formatSize(bytes) {
    if (!bytes) return "Taille non indiquée";
    const n = Number(bytes);
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
    return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
  }
  function driveDownloadUrl(id) {
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  }
  function drivePreviewUrl(id) {
    return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
  }
  async function listFolder(folderId, kind) {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id,name,mimeType,size,modifiedTime)",
      pageSize: "1000",
      orderBy: "name",
      key: cfg.googleApiKey
    });
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    const data = await response.json();
    if (!response.ok) {
      const reason = data?.error?.message || `Erreur Google Drive (${response.status})`;
      throw new Error(reason);
    }
    return (data.files || []).filter(f => f.mimeType !== "application/vnd.google-apps.folder")
      .map(f => ({...f, kind}));
  }
  async function loadFiles() {
    if (!validConfig()) {
      notice.className = "notice";
      notice.textContent = "Configuration à terminer : ajoute la clé API Google et les identifiants des deux dossiers dans config.js.";
      count.textContent = "Configuration requise";
      return;
    }
    notice.className = "notice";
    notice.textContent = "Synchronisation avec Google Drive…";
    try {
      const [audios, pdfs] = await Promise.all([
        listFolder(cfg.audioFolderId, "audio"),
        listFolder(cfg.pdfFolderId, "pdf")
      ]);
      allFiles = [...audios, ...pdfs];
      render();
      const now = new Date();
      updated.textContent = `Actualisé à ${now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}`;
      notice.textContent = allFiles.length ? "" : "Aucun fichier trouvé dans les dossiers RITAL.";
      if (!allFiles.length) empty.hidden = false;
    } catch (error) {
      notice.className = "notice error";
      notice.textContent = `Impossible de charger les fichiers : ${error.message}. Vérifie que les dossiers sont partagés en lecture publique et que la clé API est correcte.`;
      grid.innerHTML = "";
      empty.hidden = true;
    }
  }
  function render() {
    const term = search.value.trim().toLocaleLowerCase("fr");
    const filtered = allFiles.filter(file => {
      const matchesKind = activeFilter === "all" || file.kind === activeFilter;
      const matchesText = file.name.toLocaleLowerCase("fr").includes(term);
      return matchesKind && matchesText;
    });
    count.textContent = `${allFiles.length} fichier${allFiles.length > 1 ? "s" : ""}`;
    grid.innerHTML = filtered.map(file => {
      const isAudio = file.kind === "audio";
      const name = escapeHtml(file.name.replace(/\.[^.]+$/, ""));
      const size = formatSize(file.size);
      const icon = isAudio ? "♫" : "▤";
      const download = driveDownloadUrl(file.id);
      const preview = isAudio ? "" : drivePreviewUrl(file.id);
      return `<article class="file-card">
        <div class="file-top">
          <div class="file-icon ${file.kind}">${icon}</div>
          <span class="file-type">${isAudio ? "AUDIO MP3" : "PARTITION PDF"}</span>
        </div>
        <h3 class="file-name">${name}</h3>
<div class="file-meta">${size}</div>

${isAudio ? `
  <div class="audio-player">
    <audio preload="metadata" src="${download}"></audio>
    <button class="audio-play" type="button" aria-label="Lire">▶</button>
    <input class="audio-progress" type="range" min="0" max="100" value="0">
    <span class="audio-time">0:00 / 0:00</span>
  </div>
` : ""}

<div class="card-actions">
          ${isAudio
            ? `<a class="action-btn" href="${download}" target="_blank" rel="noopener">Ouvrir</a>`
            : `<a class="action-btn" href="${preview}" target="_blank" rel="noopener">Consulter</a>`}
          <a class="action-btn download" href="${download}" target="_blank" rel="noopener">↓ Télécharger</a>
        </div>
      </article>`;
    }).join("");
    empty.hidden = filtered.length !== 0;
    if (!filtered.length && allFiles.length) {
      empty.querySelector("h3").textContent = "Aucun résultat";
      empty.querySelector("p").textContent = "Essaie avec un autre nom de morceau ou change le filtre.";
    } else {
      empty.querySelector("h3").textContent = "Aucun fichier pour le moment";
      empty.querySelector("p").textContent = "Les fichiers ajoutés dans les dossiers RITAL de Google Drive apparaîtront ici après actualisation.";
    }
  }

  search.addEventListener("input", render);
  document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === activeFilter || (activeFilter === "all" && b.dataset.view === "all")));
    render();
  }));
  document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => {
    const view = button.dataset.view;
    activeFilter = view;
    document.querySelectorAll("[data-view]").forEach(b => b.classList.toggle("active", b === button));
    document.querySelectorAll("[data-filter]").forEach(b => b.classList.toggle("active", b.dataset.filter === view));
    render();
    document.getElementById("library").scrollIntoView({behavior:"smooth"});
  }));
  document.getElementById("browseBtn").addEventListener("click", () => document.getElementById("library").scrollIntoView({behavior:"smooth"}));
  loadFiles();
  if (validConfig() && Number(cfg.refreshIntervalMs) > 0) setInterval(loadFiles, Number(cfg.refreshIntervalMs));
})();
