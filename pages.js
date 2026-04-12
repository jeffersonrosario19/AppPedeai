const pageTemplateCache = {};
let pageRenderRequestId = 0;

function getPageTemplatePath(page) {
  const map = {
    [ONBOARDING_PAGE]: "forms/onboarding.html",
    cardapio: "forms/cardapio.html",
    atendimento: "forms/atendimento.html",
    mesas: "forms/mesas.html",
    colaboradores: "forms/colaboradores.html"
  };

  return map[page] || "";
}

async function fetchPageTemplate(path) {
  if (!path) {
    return "";
  }

  if (!pageTemplateCache[path]) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Nao foi possivel carregar ${path}.`);
    }

    pageTemplateCache[path] = await response.text();
  }

  return pageTemplateCache[path];
}

async function getExternalPageMarkup(page) {
  const templatePath = getPageTemplatePath(page);
  if (!templatePath) {
    return "";
  }

  const pageMarkup = await fetchPageTemplate(templatePath);

  if (page === ONBOARDING_PAGE || page === "colaboradores") {
    const staffFormMarkup = await fetchPageTemplate("forms/staff-form.html");
    return pageMarkup.replace("{{staffForm}}", staffFormMarkup);
  }

  return pageMarkup;
}

function renderStaticPage(page, content) {
  if (page === "empresa") {
    content.innerHTML = `
      <h2>Estabelecimento</h2>
      <div class="card">
        <h3>Lanchonete do Jefferson</h3>
        <p><b>Endereço:</b> Rua Principal, 123</p>
        <p><b>Telefone:</b> (91) 99999-9999</p>
        <p><b>Descrição:</b> Especializada em lanches e delivery.</p>
      </div>
    `;
    return true;
  }

  if (page === "historico") {
    renderHistorico(content);
    return true;
  }

  if (page === "horario") {
    content.innerHTML = `
      <h2>Horário</h2>
      <div class="card">
        <p><b>Segunda a sexta:</b> 08:00 as 18:00</p>
        <p><b>Sábado:</b> 09:00 as 14:00</p>
        <p><b>Domingo:</b> Fechado</p>
      </div>
    `;
    return true;
  }

  return false;
}

async function initializeDynamicPage(page) {
  if (page === ONBOARDING_PAGE) {
    if (typeof prepareSelfOnboardingPage === "function") {
      prepareSelfOnboardingPage();
    }
    return;
  }

  if (page === "cardapio") {
    if (typeof ensureCatalogSync === "function") {
      await ensureCatalogSync();
    }
    setupPriceMask();
    renderCardapio();
    return;
  }

  if (page === "atendimento") {
    if (typeof ensureCatalogSync === "function") {
      await ensureCatalogSync();
    }
    renderAtendimentoCatalog();
    return;
  }

  if (page === "mesas") {
    if (typeof ensureCatalogSync === "function") {
      await ensureCatalogSync();
    }
    renderTableServiceCatalog();
    renderCurrentTableOrder();
    return;
  }

  if (page === "colaboradores") {
    renderStaff();
  }
}

async function loadPage(page) {
  if (!isAuthenticated()) {
    return;
  }

  if (page !== "colaboradores" && typeof stopStaffRealtimeSync === "function") {
    stopStaffRealtimeSync();
  }

  if (page !== "cardapio" && page !== "atendimento" && page !== "mesas" && typeof stopCatalogRealtimeSync === "function") {
    stopCatalogRealtimeSync();
  }

  if (page !== "historico" && typeof stopOrderRealtimeSync === "function") {
    stopOrderRealtimeSync();
  }

  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  const requestId = ++pageRenderRequestId;

  if (renderStaticPage(page, content)) {
    closeMenu();
    return;
  }

  const templatePath = getPageTemplatePath(page);
  if (!templatePath) {
    content.innerHTML = '<div class="card empty-state">Pagina nao encontrada.</div>';
    closeMenu();
    return;
  }

  content.innerHTML = '<div class="card empty-state">Carregando tela...</div>';

  try {
    const markup = await getExternalPageMarkup(page);
    if (requestId !== pageRenderRequestId) {
      return;
    }

    content.innerHTML = markup;
    await initializeDynamicPage(page);
  } catch (error) {
    if (requestId !== pageRenderRequestId) {
      return;
    }

    content.innerHTML = '<div class="card empty-state">Nao foi possivel carregar esta tela.</div>';
  }

  closeMenu();
}
