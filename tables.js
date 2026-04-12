function renderTableServiceCatalog() {
  const list = document.getElementById("tableServiceCatalogList");
  if (!list) {
    return;
  }

  const items = getItems();
  const search = document.getElementById("tableServiceSearch");
  const term = search ? search.value.trim().toLowerCase() : "";
  const filtered = items
    .map((item, index) => ({ ...item, index }))
    .filter((item) => `${item.nome} ${item.descricao}`.toLowerCase().includes(term));

  if (items.length === 0) {
    list.innerHTML = '<div class="card empty-state">Cadastre itens no cardápio para iniciar o atendimento de mesas.</div>';
    return;
  }

  if (filtered.length === 0) {
    list.innerHTML = '<div class="card empty-state">Nenhum item encontrado para atendimento de mesas.</div>';
    return;
  }

  list.innerHTML = "";

  filtered.forEach((item) => {
    list.innerHTML += `
      <article class="service-card">
        <img class="service-card-image" src="${escapeHtml(sanitizeImageSrc(item.imagem))}" alt="${escapeHtml(item.nome)}" onerror="this.onerror=null;this.src='${PRODUCT_IMAGE_FALLBACK}'">
        <div class="service-card-body">
          <h3>${escapeHtml(item.nome)}</h3>
          <p>${escapeHtml(item.descricao)}</p>
          <div class="service-card-footer">
            <strong>${formatCurrency(parsePriceToNumber(item.preco))}</strong>
            <button class="btn btn-primary" type="button" onclick="addToTableOrder(${item.index})">Adicionar</button>
          </div>
        </div>
      </article>
    `;
  });
}

function addToTableOrder(index) {
  const item = getItems()[index];
  if (!item) {
    return;
  }

  const existing = currentTableOrder.find((orderItem) => orderItem.id === item.id);
  if (existing) {
    existing.quantidade += 1;
  } else {
    currentTableOrder.push({
      id: item.id,
      nome: item.nome,
      preco: item.preco,
      imagem: item.imagem,
      quantidade: 1
    });
  }

  renderCurrentTableOrder();
}

function updateTableOrderQuantity(itemId, delta) {
  const orderItem = currentTableOrder.find((item) => item.id === itemId);
  if (!orderItem) {
    return;
  }

  orderItem.quantidade += delta;

  if (orderItem.quantidade <= 0) {
    currentTableOrder = currentTableOrder.filter((item) => item.id !== itemId);
  }

  renderCurrentTableOrder();
}

function removeTableOrderItem(itemId) {
  currentTableOrder = currentTableOrder.filter((item) => item.id !== itemId);
  renderCurrentTableOrder();
}

function getCurrentTableOrderTotal() {
  return currentTableOrder.reduce(
    (total, item) => total + parsePriceToNumber(item.preco) * item.quantidade,
    0
  );
}

function getCurrentTableOrderPayload() {
  const authUser = getAuthService()?.getCurrentUser?.();
  const tableNumber = document.getElementById("tableNumber")?.value.trim() || "Não informada";

  return {
    id: `MESA-${Date.now()}`,
    cliente: document.getElementById("tableCustomerName")?.value.trim() || "Cliente não informado",
    canal: "Atendimento de mesas",
    contato: document.getElementById("tableCustomerContact")?.value.trim() || "-",
    observacoes: document.getElementById("tableOrderNotes")?.value.trim() || "-",
    itens: currentTableOrder.map((item) => ({ ...item })),
    total: getCurrentTableOrderTotal(),
    criadoEm: new Date().toLocaleString("pt-BR"),
    criadoPorUid: authUser?.uid || "",
    status: document.getElementById("tableStatus")?.value.trim() || "Em atendimento",
    mesa: tableNumber,
    tipoAtendimento: "mesa"
  };
}

function renderCurrentTableOrder() {
  const list = document.getElementById("currentTableOrderList");
  const total = document.getElementById("currentTableOrderTotal");
  const badge = document.getElementById("tableOrderItemsCount");

  if (!list || !total || !badge) {
    return;
  }

  const itemsCount = currentTableOrder.reduce((sum, item) => sum + item.quantidade, 0);
  badge.textContent = `${itemsCount} ${itemsCount === 1 ? "item" : "itens"}`;
  total.textContent = formatCurrency(getCurrentTableOrderTotal());

  if (currentTableOrder.length === 0) {
    list.innerHTML = '<div class="service-empty">Nenhum item adicionado ao pedido da mesa.</div>';
    return;
  }

  list.innerHTML = "";

  currentTableOrder.forEach((item) => {
    const subtotal = parsePriceToNumber(item.preco) * item.quantidade;
    list.innerHTML += `
      <div class="order-line">
        <div class="order-line-info">
          <strong>${escapeHtml(item.nome)}</strong>
          <span>${formatCurrency(parsePriceToNumber(item.preco))} cada</span>
        </div>
        <div class="order-line-controls">
          <button class="btn btn-qty" type="button" onclick="updateTableOrderQuantity('${escapeJsString(item.id)}', -1)">-</button>
          <span>${item.quantidade}</span>
          <button class="btn btn-qty" type="button" onclick="updateTableOrderQuantity('${escapeJsString(item.id)}', 1)">+</button>
        </div>
        <div class="order-line-meta">
          <strong>${formatCurrency(subtotal)}</strong>
          <button class="btn btn-link-danger" type="button" onclick="removeTableOrderItem('${escapeJsString(item.id)}')">Remover</button>
        </div>
      </div>
    `;
  });
}

function clearCurrentTableOrder() {
  currentTableOrder = [];
  const fields = [
    "tableCustomerName",
    "tableNumber",
    "tableCustomerContact",
    "tableOrderNotes"
  ];

  fields.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = "";
    }
  });

  renderCurrentTableOrder();
}

function confirmClearCurrentTableOrder() {
  const hasItems = currentTableOrder.length > 0;
  const hasFormData = [
    "tableCustomerName",
    "tableNumber",
    "tableCustomerContact",
    "tableOrderNotes"
  ].some((fieldId) => {
    const field = document.getElementById(fieldId);
    return Boolean(field?.value.trim());
  });

  if (!hasItems && !hasFormData) {
    clearCurrentTableOrder();
    return;
  }

  showAppConfirmDialog({
    titleText: "Limpar pedido",
    messageText: "Deseja limpar os itens e os dados preenchidos deste pedido de mesa?",
    confirmLabel: "Limpar",
    iconName: "warning_amber",
    onConfirm: () => {
      clearCurrentTableOrder();
    }
  });
}

async function registerTableOrder() {
  if (currentTableOrder.length === 0) {
    alert("Adicione pelo menos um item ao pedido da mesa.");
    return;
  }

  const tableNumber = document.getElementById("tableNumber")?.value.trim();
  if (!tableNumber) {
    alert("Informe o número da mesa antes de registrar o pedido.");
    return;
  }

  const order = getCurrentTableOrderPayload();
  const orderService = getOrderService();

  if (orderService?.isConfigured) {
    try {
      await orderService.save(order);
    } catch (error) {
      alert("Não foi possível salvar o pedido da mesa no Firebase.");
      return;
    }
  } else {
    const orders = getOrders();
    orders.unshift(order);
    saveOrders(orders);
  }

  alert(`Pedido da mesa ${order.mesa} registrado com sucesso!`);
  clearCurrentTableOrder();
}
