
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

  const instruments = {
    basse: "Basse",
    batterie: "Batterie",
    chant: "Chant",
    guitare: "Guitare",
    piano: "Piano",
    saxophone: "Saxophone",
    trompette: "Trompette",
    violon: "Violon"
  };

  function validConfig() {
    return Boolean(
      cfg.googleApiKey &&
      cfg.audioFolderId &&
      cfg.instrumentFolders &&
      Object.keys(instruments).every(key => cfg.instrumentFolders[key])
    );
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  function formatSize(bytes) {
    if (!bytes) return "Taille non indiquée";
    const n = Number(bytes);
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
    return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${String(sec).padStart(2, "0")}`;
  }

  function driveDownloadUrl(id) {
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  }

  function driveAudioUrl(id) {
    return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&key=${encodeURIComponent(cfg.googleApiKey)}`;
  }

  function drivePreviewUrl(id) {
    return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
  }

  async function listFolder(folderId, kind, instrument = "") {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id,name,mimeType,size,modifiedTime)",
      pageSize: "1000",
      orderBy: "name",
      key: cfg.googleApiKey
    });

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error?.message || `Erreur Google Drive (${response.status})`
      );
    }

    return (data.files || [])
      .filter(file => {
        if (file.mimeType === "application/vnd.google-apps.folder") return false;
        if (kind === "pdf") return file.mimeType === "application/pdf";
        return true;
      })
      .map(file => ({
        ...file,
        kind,
        instrument
      }));
  }

  async function loadFiles() {
    if (!validConfig()) {
      notice.className = "notice error";
      notice.textContent =
        "Configuration incomplète : vérifie config.js.";
      count.textContent = "Configuration requise";
      return;
    }

    notice.className = "notice";
    notice.textContent = "Synchronisation avec Google Drive…";

    try {
      const audioPromise = listFolder(cfg.audioFolderId, "audio");

      const pdfPromises = Object.entries(instruments).map(([key]) =>
        listFolder(cfg.instrumentFolders[key], "pdf", key)
      );

      const [audios, ...partitionLists] = await Promise.all([
        audioPromise,
        ...pdfPromises
      ]);

      const partitions = partitionLists.flat();

      allFiles = [...audios, ...partitions];

      render();

      const now = new Date();
      updated.textContent =
        `Actualisé à ${now.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit"
        })}`;

      notice.textContent = allFiles.length
        ? ""
        : "Aucun fichier trouvé dans les dossiers RITAL.";

    } catch (error) {
      notice.className = "notice error";
      notice.textContent =
        `Impossible de charger les fichiers : ${error.message}. Vérifie le partage des dossiers et la clé API.`;

      grid.innerHTML = "";
      empty.hidden = true;

      console.error("Erreur RITAL :", error);
    }
  }

  function render() {
    const term = search.value.trim().toLocaleLowerCase("fr");

    const filtered = allFiles.filter(file => {
      const matchesKind =
        activeFilter === "all" ||
        (activeFilter === "audio" && file.kind === "audio") ||
        (activeFilter === "pdf" && file.kind === "pdf") ||
        file.instrument === activeFilter;

      const matchesText =
        file.name.toLocaleLowerCase("fr").includes(term) ||
        (instruments[file.instrument] || "")
          .toLocaleLowerCase("fr")
          .includes(term);

      return matchesKind && matchesText;
    });

    count.textContent =
      `${filtered.length} fichier${filtered.length > 1 ? "s" : ""}`;

    grid.innerHTML = filtered.map(file => {
      const isAudio = file.kind === "audio";
      const name = escapeHtml(file.name.replace(/\.[^.]+$/, ""));
      const size = formatSize(file.size);
      const download = driveDownloadUrl(file.id);
      const preview = drivePreviewUrl(file.id);
      const instrument = instruments[file.instrument] || "";

      return `
        <article class="file-card">
          <div class="file-top">
            <div class="file-icon ${file.kind}">
              ${isAudio ? "♫" : "▤"}
            </div>
            <span class="file-type">
              ${isAudio ? "AUDIO MP3" : `PARTITION PDF${instrument ? " · " + escapeHtml(instrument.toUpperCase()) : ""}`}
            </span>
          </div>

          <h3 class="file-name">${name}</h3>
          <div class="file-meta">${size}</div>

          ${isAudio ? `
            <div class="audio-player">
              <audio preload="metadata" src="${driveAudioUrl(file.id)}"></audio>
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
        </article>
      `;
    }).join("");

    grid.querySelectorAll(".audio-player").forEach(player => {
      const audio = player.querySelector("audio");
      const button = player.querySelector(".audio-play");
      const progress = player.querySelector(".audio-progress");
      const time = player.querySelector(".audio-time");

      function updatePlayer() {
        progress.value = audio.duration
          ? (audio.currentTime / audio.duration) * 100
          : 0;

        time.textContent =
          `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
      }

      button.addEventListener("click", async () => {
        if (audio.paused) {
          try {
            await audio.play();
            button.textContent = "Ⅱ";
            button.setAttribute("aria-label", "Pause");
          } catch (error) {
            showToast(`Lecture impossible : erreur ${audio.error?.code || "inconnue"}`);
            console.error("Erreur audio RITAL :", error, audio.error);
          }
        } else {
          audio.pause();
          button.textContent = "▶";
          button.setAttribute("aria-label", "Lire");
        }
      });

      audio.addEventListener("timeupdate", updatePlayer);
      audio.addEventListener("loadedmetadata", updatePlayer);

      audio.addEventListener("ended", () => {
        button.textContent = "▶";
        button.setAttribute("aria-label", "Lire");
      });

      progress.addEventListener("input", () => {
        if (audio.duration) {
          audio.currentTime = (progress.value / 100) * audio.duration;
        }
      });
    });

    empty.hidden = filtered.length !== 0;

    if (!filtered.length) {
      empty.querySelector("h3").textContent =
        allFiles.length ? "Aucun résultat" : "Aucun fichier pour le moment";

      empty.querySelector("p").textContent =
        allFiles.length
          ? "Essaie avec un autre nom de morceau ou change de catégorie."
          : "Les fichiers ajoutés dans les dossiers RITAL de Google Drive apparaîtront ici après actualisation.";
    }
  }

  search.addEventListener("input", render);

  document.querySelectorAll("[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;

      document.querySelectorAll("[data-filter]").forEach(item =>
        item.classList.toggle("active", item === button)
      );

      document.querySelectorAll("[data-view]").forEach(item =>
        item.classList.toggle("active", item.dataset.view === activeFilter)
      );

      render();
    });
  });

  document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.view;

      document.querySelectorAll("[data-view]").forEach(item =>
        item.classList.toggle("active", item === button)
      );

      document.querySelectorAll("[data-filter]").forEach(item =>
        item.classList.toggle(
          "active",
          item.dataset.filter === activeFilter
        )
      );

      render();

      document.getElementById("library").scrollIntoView({
        behavior: "smooth"
      });
    });
  });

  document.getElementById("browseBtn").addEventListener("click", () => {
    document.getElementById("library").scrollIntoView({
      behavior: "smooth"
    });
  });

  loadFiles();

  if (Number(cfg.refreshIntervalMs) > 0) {
    setInterval(loadFiles, Number(cfg.refreshIntervalMs));
  }
})();
