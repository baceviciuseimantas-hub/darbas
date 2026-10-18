const API_URL = "https://genshin.jmp.blue";

const grid = document.querySelector("#character-grid");
const searchInput = document.querySelector("#search-input");
const filters = document.querySelector("#element-filters");
const statusMessage = document.querySelector("#status-message");
const resultCount = document.querySelector("#result-count");
const pagination = document.querySelector("#pagination");
const previousPage = document.querySelector("#previous-page");
const nextPage = document.querySelector("#next-page");
const pageIndicator = document.querySelector("#page-indicator");
const dialog = document.querySelector("#detail-dialog");
const detailContent = document.querySelector("#detail-content");
const closeDialog = document.querySelector("#close-dialog");

const CHARACTERS_PER_PAGE = 16;
let characters = [];
let selectedElement = "all";
let currentPage = 1;

const elementColors = {
  anemo: "#b7dcca",
  cryo: "#b8dfeb",
  dendro: "#c9dba5",
  electro: "#d0c3e6",
  geo: "#e7d39a",
  hydro: "#a9cbe8",
  pyro: "#edaa8d"
};

function formatName(id) {
  return id
    .replaceAll("-", " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function getImage(id, type = "icon") {
  return `${API_URL}/characters/${id}/${type}`;
}

function setStatus(message, show = true) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("hidden", !show);
}

function createFilters(elements) {
  filters.innerHTML = "";

  ["all", ...elements].forEach(element => {
    const button = document.createElement("button");

    button.className = "filter-button";
    button.dataset.element = element;
    button.textContent =
      element === "all"
        ? "All"
        : element.charAt(0).toUpperCase() + element.slice(1);

    if (element === selectedElement) {
      button.classList.add("active");
    }

    filters.appendChild(button);
  });
}

function displayCharacters() {
  const search = searchInput.value.trim().toLowerCase();

  const results = characters.filter(character => {
    const name = character.name.toLowerCase();
    const id = character.id.toLowerCase();
    const element = character.vision?.toLowerCase();

    const matchesSearch =
      name.includes(search) || id.includes(search);

    const matchesElement =
      selectedElement === "all" || element === selectedElement;

    return matchesSearch && matchesElement;
  });

  resultCount.textContent =
    `${results.length} character${results.length === 1 ? "" : "s"}`;

  grid.innerHTML = "";

  if (results.length === 0) {
    pagination.hidden = true;
    setStatus("No characters found. Try another search.");
    return;
  }

  setStatus("", false);

  const pageCount = Math.ceil(results.length / CHARACTERS_PER_PAGE);
  currentPage = Math.min(currentPage, pageCount);
  const pageStart = (currentPage - 1) * CHARACTERS_PER_PAGE;
  const pageResults = results.slice(pageStart, pageStart + CHARACTERS_PER_PAGE);

  pagination.hidden = pageCount <= 1;
  previousPage.disabled = currentPage === 1;
  nextPage.disabled = currentPage === pageCount;
  pageIndicator.textContent = `Page ${currentPage} of ${pageCount}`;

  pageResults.forEach((character, index) => {
    const element = character.vision?.toLowerCase();
    const background = elementColors[element] || "#dceae0";

    const card = document.createElement("button");
    card.type = "button";
    card.className = "character-card";
    card.style.animationDelay = `${Math.min(index * 35, 300)}ms`;
    card.setAttribute("aria-label", `View ${character.name}`);

    card.innerHTML = `
      <div class="card-art" style="background: linear-gradient(145deg, ${background}, #dceae0)">
        <img
          src="${getImage(character.id)}"
          alt=""
          loading="lazy"
          onerror="this.remove(); this.nextElementSibling.hidden = false"
        >
        <span class="fallback-avatar" hidden>
          ${character.name.charAt(0)}
        </span>
      </div>

      <div class="card-meta">
        <span>${character.vision || "Unknown"}</span>
        <span class="rarity">${"★".repeat(character.rarity || 0)}</span>
      </div>

      <div class="card-info">
        <h3>${character.name}</h3>
        <p>${character.weapon || "Unknown weapon"} · ${character.nation || "Unknown nation"}</p>
      </div>
    `;

    card.addEventListener("click", () => showDetails(character));
    grid.appendChild(card);
  });
}

function showDetails(character) {
  const element = character.vision?.toLowerCase();
  const background = elementColors[element] || "#dceae0";

  detailContent.innerHTML = `
    <div class="detail-layout">
      <div class="detail-art" style="background: linear-gradient(145deg, ${background}, #dceae0)">
        <img
          src="${getImage(character.id, "portrait")}"
          alt="Portrait of ${character.name}"
          onerror="this.onerror=null; this.src='${getImage(character.id)}'"
        >
      </div>

      <div class="detail-copy">
        <p class="eyebrow">
          ${character.vision || "Unknown"} · ${"★".repeat(character.rarity || 0)}
        </p>

        <h2>${character.name}</h2>

        <p class="detail-title">
          ${character.title || "Genshin Impact character"}
        </p>

        <p class="detail-description">
          ${character.description || "No description available."}
        </p>

        <div class="detail-stats">
          <div class="detail-stat">
            <span>Nation</span>
            <strong>${character.nation || "Unknown"}</strong>
          </div>

          <div class="detail-stat">
            <span>Weapon</span>
            <strong>${character.weapon || "Unknown"}</strong>
          </div>

          <div class="detail-stat">
            <span>Affiliation</span>
            <strong>${character.affiliation || "Unknown"}</strong>
          </div>

          <div class="detail-stat">
            <span>Release</span>
            <strong>${character.release || "Unknown"}</strong>
          </div>
        </div>

        <p class="detail-description">
          <strong>${character.skillTalents?.length || 0}</strong>
          talents available
        </p>
      </div>
    </div>
  `;

  dialog.showModal();
}

async function getCharacters() {
  try {
    setStatus("Loading characters...");

    const [characterResponse, elementResponse] = await Promise.all([
      fetch(`${API_URL}/characters`),
      fetch(`${API_URL}/elements`)
    ]);

    if (!characterResponse.ok || !elementResponse.ok) {
      throw new Error("Could not load the API data.");
    }

    const [ids, elements] = await Promise.all([
      characterResponse.json(),
      elementResponse.json()
    ]);

    createFilters(elements);

    const records = await Promise.all(
      ids.map(async id => {
        try {
          const response = await fetch(`${API_URL}/characters/${id}`);

          if (!response.ok) return null;

          const character = await response.json();

          return {
            ...character,
            id: character.id || id,
            name: character.name || formatName(id)
          };
        } catch {
          return null;
        }
      })
    );
        

    characters = records
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));

    displayCharacters();
  } catch (error) {
    console.error("Failed to load characters:", error);

    resultCount.textContent = "Couldn't load characters";
    setStatus("Something went wrong while loading characters. Try refreshing the page.");
  }
}

filters.addEventListener("click", event => {
  const button = event.target.closest("button[data-element]");

  if (!button) return;

  selectedElement = button.dataset.element;
  currentPage = 1;

  filters.querySelectorAll("button").forEach(item => {
    item.classList.toggle("active", item === button);
  });

  displayCharacters();
});

searchInput.addEventListener("input", () => {
  currentPage = 1;
  displayCharacters();
});

previousPage.addEventListener("click", () => {
  if (currentPage === 1) return;

  currentPage -= 1;
  displayCharacters();
});

nextPage.addEventListener("click", () => {
  currentPage += 1;
  displayCharacters();
});

closeDialog.addEventListener("click", () => {
  dialog.close();
});

dialog.addEventListener("click", event => {
  if (event.target === dialog) {
    dialog.close();
  }
});

getCharacters();