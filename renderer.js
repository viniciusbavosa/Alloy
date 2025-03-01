import Cache from "./cache/index.js";

const { cacheErrors, setCache, getCache, isCached, deleteCache, clearCache } =
  Cache();

const { handleAddProfile, handleDeleteProfile, handleUpdateEvent } =
  HandleEvents();

const rateLimitStatus = {
  twitter: false,
  bluesky: false,
};
/* 
  TODO:
  - Integrar OAuth

*/

/* 

Menu de Navegação
-------------------------------------------------------------
#   1. Tratamento de eventos
#   2. Tratamento de erros
#   3. Constroi o HTML
#   4. Paginação de postagens
#   5. Tratamento de limites das APIs
#   6. Requisições à APIs externas
#   7. Inserção e remoção de usuários do banco de dados
#   8. Limpa e atualiza o feed pelos posts mais recentes
#   9. Exibição do feed de postagens em tela
-------------------------------------------------------------

*/

/* 

  1. Tratamento de eventos 

  - Lida com os eventos de clique dos 
  botões de adicionar e remover perfil

*/

function HandleEvents() {
  const username = document.getElementById("add-username");

  const handleAddProfile = () => {
    const addButton = document.getElementById("add-profile-button");

    // Lida com os eventos de clique do botão 'Adicionar perfil'
    addButton.addEventListener("click", () => {
      addProfile();
      username.value = "";
    });

    /*
      Realiza a ação de adicionar perfil
      quando o usuário aperta 'ENTER'
    */
    username.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        addProfile();
        username.value = "";
      }
    });
  };

  const handleDeleteProfile = () => {
    const trashButtonList = document.querySelectorAll(".remove-profile-button");
    // Lida com a exclusão de perfis do banco de dados

    for (const trashBttn of trashButtonList) {
      trashBttn.addEventListener("click", (event) => {
        const sucessToast = document.querySelector(".toast-success");
        const text = event.target.nextSibling.parentElement.innerText;
        const [platform, username] = text.split(" - ").map((s) => s.trim());
        removeProfile(platform, username);

        sucessToast.toast();
      });
    }
  };

  const handleUpdateEvent = () => {
    const updateBttn = document.querySelector(".refresh-bttn");
    // Lida com os eventos de clique do botão 'Atualizar'
    updateBttn.addEventListener("click", updateFeed);
  };

  return {
    handleAddProfile,
    handleDeleteProfile,
    handleUpdateEvent,
  };
}

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("click", (event) => {
    const target = event.target;

    if (target.tagName === "a") {
      event.preventDefault();
      window.electron.openExternalLink(target.href);
    }
  });
});

/* 

  2. Tratamento de erros 

  - Exibe erros em tela

*/

async function displayError(errorsArr) {
  if (!errorsArr.length) return;
  const popoverListHTML = document.querySelector(".error-wrapper");

  const errorMessages = {
    400: "Busca inválida. Verifique se o nome de usuário é válido",
    401: "Autenticação necessária",
    403: "Usuário suspenso",
    404: "Usuário não encontrado",
    429: "Limite de buscas atingido",
    INVALIDPLATFORM: "Plataforma não suportada",
    // ERRORCHECKCACHE:
    //   "Não foi possível verificar se os dados foram cacheados. Verifique se a plataforma ou nome de usuário são válidos!",
    // ERRORDATACACHED:
    //   "Não foi possível cachear os dados. Verifique o nome de usuário!",
    // ERRORGETCACHE:
    //   "Não foi possível recuperar os dados cacheados. Verifique se a plataforma ou nome de usuário são válidos",
    // ERRORDELETECACHE:
    //   "Não foi possível deletar os dados cacheados. Verifique se a plataforma ou nome de usuário são válidos",
  };

  for (const error of errorsArr) {
    await window.electronAPI.logger(error);

    if (error.status === 429) {
      rateLimitStatus[error.platform] = true;
      popoverListHTML.insertAdjacentHTML(
        "afterbegin",
        `<sl-alert variant="danger" open closable class="alert-error">
          <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
          <strong>${errorMessages[429]}</strong><br />
          Aguarde até ${new Date(
            error.waitTime * 1000
          ).toLocaleTimeString()} para realizar uma nova busca ao Twitter<br />
          <span style="font-size: 10px">Você pode acessar o log correspondente na pasta de logs do seu sistema operacional.</span>
        </sl-alert>
        `
      );
    } else {
      popoverListHTML.insertAdjacentHTML(
        "afterbegin",
        `<sl-alert variant="danger" open closable class="alert-error">
          <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
          <strong>${
            Object.hasOwn(errorMessages, error.status)
              ? errorMessages[error.status]
              : "Algo de errado aconteceu!"
          }</strong><br />
          <small>Você pode acessar o log correspondente na pasta de logs do seu sistema operacional.</small>
        </sl-alert>
        `
      );
    }
  }
}

/* 

  3. Constroi o HTML dos posts

*/

function templateFn(platform, username, posts) {
  let html = "";
  const platforms = {
    twitter: `
    <sl-card class="card-header">
    <div slot="header" target="_blank">
    <a href="https://x.com/${username}">
    ${platform} - ${username}
    </a>
      <sl-icon-button class="remove-profile-button" name="trash" label="trash" title="Excluir usuário">
      </sl-icon-button>
    </div>

    ${posts}
  </sl-card>
  `,
    bluesky: `
    <sl-card class="card-header">
    <div slot="header">
    <a href="https://bsky.app/profile/${username}" target="_blank">
  ${platform} - ${username}
  </a>
    <sl-icon-button class="remove-profile-button" name="trash" label="trash" title="Excluir usuário"></sl-icon-button>
  </div>

  ${posts}
</sl-card>

`,
  };

  html += Object.hasOwn(platforms, platform)
    ? platforms[platform]
    : "<section><h1>Não há nada para exibir</h1></section>";
  return html;
}

/* 

  4. Paginação de postagens 

*/

// Iterates over an array. Returns 1 element every time 'next()' is called
function* paginate(data) {
  for (let i = 0; i < data.length; i++) {
    yield data[i];
  }
}

/*
  Calls 'next()' when the button is clicked

  It takes the references of the generator function,
  the HTML, and the 'profile' object as arguments. 
  This is needed so the 'next()' method can continue 
  from where the generator function left off last time
  it was called

  Calls 'templateFn' to build the HTML and appends it as the last child.
*/
function getMorePosts(generatorRef, HTMLRef, profileRef) {
  const button = document.querySelector(".more-bttn");
  const { platform, username } = profileRef;

  button.addEventListener("click", () => {
    const { value, done } = generatorRef.next();
    if (done) {
      button.setAttribute("disabled", true);

      return;
    }

    HTMLRef.insertAdjacentHTML(
      "beforeend",
      templateFn(platform, username, value.text)
    );
  });
}

/* 

  5. Tratamento de limites das APIs

  - Informa o usuário sobre os limites de
    requisições de cada API

*/

function displayLimits(limitArr) {
  const limitListHTML = document.querySelector(".api-limits-wrapper");

  for (const limit of limitArr) {
    if (limit.remaining) rateLimitStatus[limit.platform] = false;
    limitListHTML.insertAdjacentHTML(
      "afterbegin",
      `<sl-alert variant="warning" open closable class="alert-limit">
          <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
          <strong>Limite de buscas</strong><br />
          ${limit.message}
        </sl-alert>`
    );
  }
}

/* 

  6. Requisições a APIs externas 

  - Realiza as requisições para as APIs.

*/

async function fetchSocial(profile) {
  const { platform, username } = profile;

  switch (platform) {
    case "twitter":
      if (rateLimitStatus["twitter"]) return;
      const { twitterErrors, twitterLimits, data } =
        await window.electronAPI.getTwitterPosts(username);

      twitterLimits.length && displayLimits(twitterLimits);

      if (twitterErrors.length) {
        // Deletes user from DB if invalid
        twitterErrors.forEach(async (e) => {
          e.status === 400 && removeProfile(platform, username);
        });
        displayError(twitterErrors);
        return;
      }

      return data;

    case "bluesky":
      if (rateLimitStatus["bluesky"]) return;

      const { feed, bskyErrors } = await window.electronAPI.getBSkyPosts(
        username
      );

      if (bskyErrors.length) {
        // Deletes user from DB if invalid
        bskyErrors.forEach(
          async (e) => e.status === 400 && removeProfile(platform, username)
        );
        displayError(bskyErrors);
        return;
      }

      let postContent = [];

      for (const post of feed) {
        const { record } = post.post;

        postContent.push(record);
      }
      return postContent;

    default:
      displayError([{ status: "INVALIDPLATFORM" }]);
  }
}

/* 

  7. Inserção e remoção de usuários do banco de dados

  - Lida com os eventos de clique dos 
  botões de adicionar e remover perfil

*/

// Insere o usuário novo no banco de dados. Atualiza o feed.
async function addProfile() {
  const platform = document.getElementById("add-platform").value;
  const username = document.getElementById("add-username").value;

  if (!username) return;
  const regex = /[\^@]/g;
  const formatUsername = username.replace(regex, "").trim();

  await window.electronAPI.addProfile({ platform, formatUsername });
  clearFeed();
  loadFeed();
}

// Remove o usuário do banco de dados. Atualiza o feed.
async function removeProfile(platform, username) {
  deleteCache(platform, username);

  await window.electronAPI.removeProfile({ platform, username });
  clearFeed();
  loadFeed();
}

/* 

  8. Limpa e atualiza o feed pelos posts mais recentes

*/

function updateFeed() {
  clearFeed();
  clearCache();
  loadFeed();
}

function clearFeed() {
  const feed = document.getElementById("feed");
  feed.innerHTML = "";
}

/* 

  9. Exibição do feed de postagens em tela

*/

/* 
  Renderiza o feed.
  Busca os usuários no banco de dados.
  Chama 'fetchSocial' para buscar posts.
*/

async function loadFeed() {
  handleAddProfile();

  handleUpdateEvent();
  const profiles = await window.electronAPI.getProfiles();
  const feed = document.getElementById("feed");

  profiles.forEach(async (profile) => {
    if (!isCached(profile.platform, profile.username)) {
      const posts = await fetchSocial(profile);

      if (!posts) return;

      setCache({
        platform: profile.platform,
        username: profile.username,
        posts,
      });

      const generator = paginate(posts);
      const { text } = generator.next().value; // Load first post, after first loading 'getMorePosts' will handle
      getMorePosts(generator, feed, profile);

      feed.innerHTML += templateFn(profile.platform, profile.username, text);
      handleDeleteProfile();
    } else {
      const cachedPosts = getCache(profile.platform, profile.username);

      if (!cachedPosts) return;

      const generator = paginate(cachedPosts);
      const { text } = generator.next().value; // Load first post, after that 'getMorePosts' will handle
      getMorePosts(generator, feed, profile);

      feed.innerHTML += templateFn(profile.platform, profile.username, text);
      handleDeleteProfile();
    }
  });
  handleDeleteProfile();
}

window.onload = loadFeed;
