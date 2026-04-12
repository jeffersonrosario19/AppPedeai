let catalogRealtimeUnsubscribe = null;

function getCatalogService() {
  return window.catalogService;
}

function refreshCatalogViews() {
  if (document.getElementById("lista")) {
    renderCardapio();
  }

  if (document.getElementById("serviceCatalogList")) {
    renderAtendimentoCatalog();
  }

  if (document.getElementById("tableServiceCatalogList")) {
    renderTableServiceCatalog();
  }
}

async function loadCatalogRecords() {
  const catalogService = getCatalogService();

  if (catalogService?.isConfigured) {
    try {
      const records = await catalogService.list();
      return setItems(records);
    } catch (error) {
      return setItems([]);
    }
  }

  return setItems(getItems());
}

function stopCatalogRealtimeSync() {
  if (typeof catalogRealtimeUnsubscribe === "function") {
    catalogRealtimeUnsubscribe();
    catalogRealtimeUnsubscribe = null;
  }
}

async function ensureCatalogSync() {
  const catalogService = getCatalogService();

  if (catalogService?.isConfigured && typeof catalogService.subscribe === "function") {
    if (!catalogRealtimeUnsubscribe) {
      catalogRealtimeUnsubscribe = catalogService.subscribe(
        (records) => {
          setItems(records);
          refreshCatalogViews();
        },
        async () => {
          await loadCatalogRecords();
          refreshCatalogViews();
        }
      );
    }

    if (!Array.isArray(window.catalogState?.items)) {
      await loadCatalogRecords();
    }

    return;
  }

  setItems(getItems());
}

function setupPriceMask() {
  const priceInput = document.getElementById("itemPreco");
  if (!priceInput) {
    return;
  }

  priceInput.addEventListener("input", handlePriceInput);
  priceInput.addEventListener("blur", handlePriceBlur);
}

function openItemDialog(index = null) {
  const dialog = document.getElementById("itemDialog");
  const dialogTitle = document.getElementById("dialogTitle");
  const submitButton = document.getElementById("dialogSubmitButton");

  resetItemDialog();

  if (index !== null) {
    const item = getItems()[index];
    if (!item) {
      return;
    }

    document.getElementById("itemIndex").value = String(index);
    document.getElementById("itemNome").value = item.nome;
    document.getElementById("itemDescricao").value = item.descricao;
    document.getElementById("itemPreco").value = item.preco;
    document.getElementById("itemImagem").value = item.imagem === PRODUCT_IMAGE_FALLBACK ? "" : item.imagem;
    dialogTitle.textContent = "Atualizar Item";
    submitButton.textContent = "Atualizar";
  } else {
    dialogTitle.textContent = "Novo Cadastro";
    submitButton.textContent = "Cadastrar";
  }

  dialog.showModal();
}

function closeItemDialog() {
  const dialog = document.getElementById("itemDialog");
  if (dialog && dialog.open) {
    dialog.close();
  }
}

function resetItemDialog() {
  const fields = ["itemIndex", "itemNome", "itemDescricao", "itemPreco", "itemImagem"];
  fields.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = "";
    }
  });
}

function handlePriceInput(event) {
  event.target.value = formatPriceInput(event.target.value);
}

function handlePriceBlur(event) {
  event.target.value = normalizePriceValue(event.target.value);
}

function formatPriceInput(value) {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  const numberValue = Number(digits) / 100;
  return numberValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function normalizePriceValue(value) {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  return formatPriceInput(digits);
}

function parsePriceToNumber(value) {
  if (!value) {
    return 0;
  }

  return Number(value.replace(/\./g, "").replace(",", ".")) || 0;
}

function formatCurrency(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

async function saveItemFromDialog() {
  const indexValue = document.getElementById("itemIndex").value;
  const nome = document.getElementById("itemNome").value.trim();
  const descricao = document.getElementById("itemDescricao").value.trim();
  const preco = normalizePriceValue(document.getElementById("itemPreco").value.trim());
  const imagem = document.getElementById("itemImagem").value.trim();

  document.getElementById("itemPreco").value = preco;

  if (!nome || !descricao || !preco) {
    alert("Preencha nome, descrição e preço.");
    return;
  }

  const items = getItems();
  const itemData = {
    id: indexValue ? items[Number(indexValue)]?.id : `item-${Date.now()}`,
    nome,
    descricao,
    preco,
    imagem: imagem || PRODUCT_IMAGE_FALLBACK
  };

  const catalogService = getCatalogService();

  if (catalogService?.isConfigured) {
    try {
      await catalogService.save(itemData);
      closeItemDialog();
      return;
    } catch (error) {
      alert("Nao foi possivel salvar o item no Firebase.");
      return;
    }
  }

  if (indexValue !== "") {
    items[Number(indexValue)] = itemData;
  } else {
    items.push(itemData);
  }

  saveItems(items);
  closeItemDialog();
  renderCardapio();
}

function confirmRemoveItem(index) {
  const itens = getItems();
  const item = itens[index];
  if (!item) {
    return;
  }

  showAppConfirmDialog({
    titleText: "Excluir item",
    messageText: `Tem certeza que deseja excluir "${item.nome}" do cardápio?`,
    confirmLabel: "Excluir",
    iconName: "warning_amber",
    onConfirm: () => {
      removeItem(index);
    }
  });
}

async function removeItem(index) {
  const itens = getItems();
  const item = itens[index];
  if (!item) {
    return;
  }

  const catalogService = getCatalogService();

  if (catalogService?.isConfigured) {
    try {
      await catalogService.remove(item.id);
      return;
    } catch (error) {
      alert("Nao foi possivel excluir o item do Firebase.");
      return;
    }
  }

  itens.splice(index, 1);
  saveItems(itens);
  renderCardapio();
}

function renderCardapio() {
  const lista = document.getElementById("lista");
  if (!lista) {
    return;
  }

  const buscaInput = document.getElementById("buscaProduto");
  const termoBusca = buscaInput ? buscaInput.value.trim().toLowerCase() : "";
  const itens = getItems();
  const itensFiltrados = itens
    .map((item, index) => ({ ...item, index }))
    .filter((item) => {
      const searchBase = `${item.nome} ${item.descricao} ${item.preco}`.toLowerCase();
      return searchBase.includes(termoBusca);
    });

  if (itens.length === 0) {
    lista.innerHTML = '<div class="card empty-state">Nenhum item cadastrado no cardápio.</div>';
    return;
  }

  if (itensFiltrados.length === 0) {
    lista.innerHTML = '<div class="card empty-state">Nenhum produto encontrado para essa busca.</div>';
    return;
  }

  lista.innerHTML = "";

  itensFiltrados.forEach((item) => {
    lista.innerHTML += `
      <article class="product-card">
        <img class="product-image" src="${escapeHtml(sanitizeImageSrc(item.imagem))}" alt="${escapeHtml(item.nome)}" onerror="this.onerror=null;this.src='${PRODUCT_IMAGE_FALLBACK}'">
        <div class="product-content">
          <h3>${escapeHtml(item.nome)}</h3>
          <p>${escapeHtml(item.descricao)}</p>
          <strong class="product-price">${formatCurrency(parsePriceToNumber(item.preco))}</strong>
        </div>
        <div class="product-footer">
          <button class="btn btn-card-secondary material-icons" type="button" onclick="openItemDialog(${item.index})">edit</button>
          <button class="btn btn-card-danger material-icons" type="button" onclick="confirmRemoveItem(${item.index})">delete</button>
        </div>
      </article>
    `;
  });
}
