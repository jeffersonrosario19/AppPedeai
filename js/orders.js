let orderRealtimeUnsubscribe = null;
let currentAtendimentoOrder = [];
let currentAtendimentoPaymentMethod = "Pix";
let currentAtendimentoEditingItemId = "";
let currentAtendimentoSummaryItemId = "";

function getOrderService() {
  return window.orderService;
}

async function loadOrderRecords() {
  const orderService = getOrderService();

  if (orderService?.isConfigured) {
    try {
      const orders = await orderService.list();
      return setOrders(orders);
    } catch (error) {
      return setOrders([]);
    }
  }

  return setOrders(getOrders());
}

function stopOrderRealtimeSync() {
  if (typeof orderRealtimeUnsubscribe === "function") {
    orderRealtimeUnsubscribe();
    orderRealtimeUnsubscribe = null;
  }
}

async function ensureOrderSync() {
  const orderService = getOrderService();

  if (orderService?.isConfigured && typeof orderService.subscribe === "function") {
    if (!orderRealtimeUnsubscribe) {
      orderRealtimeUnsubscribe = orderService.subscribe(
        (orders) => {
          setOrders(orders);
          if (document.getElementById("historyDialog")) {
            renderHistorico(document.getElementById("content"));
          }
        },
        async () => {
          await loadOrderRecords();
          if (document.getElementById("historyDialog")) {
            renderHistorico(document.getElementById("content"));
          }
        }
      );
    }

    if (!Array.isArray(window.orderState?.orders)) {
      await loadOrderRecords();
    }

    return;
  }

  setOrders(getOrders());
}

function getAtendimentoCatalogItems() {
  const search = document.getElementById("atendimentoBusca");
  const term = search ? search.value.trim().toLowerCase() : "";

  return getItems()
    .map((item, sourceIndex) => ({ ...item, sourceIndex }))
    .filter((item) => `${item.nome} ${item.descricao}`.toLowerCase().includes(term));
}

function renderAtendimentoCatalog() {
  const list = document.getElementById("serviceCatalogList");
  if (!list) {
    return;
  }

  const items = getItems();
  const filtered = getAtendimentoCatalogItems();

  if (items.length === 0) {
    list.innerHTML = '<div class="card empty-state">Cadastre itens no cardapio para iniciar o atendimento.</div>';
    renderAtendimentoCheckoutBar();
    return;
  }

  if (filtered.length === 0) {
    list.innerHTML = '<div class="card empty-state">Nenhum item encontrado.</div>';
    renderAtendimentoCheckoutBar();
    return;
  }

  list.innerHTML = filtered
    .map(
      (item) => `
        <article class="service-card service-card-clickable quick-service-card" role="button" tabindex="0" onclick="openAtendimentoItemDialog(${item.sourceIndex})" onkeydown="handleAtendimentoCardKey(event, ${item.sourceIndex})">
          <img class="service-card-image" src="${escapeHtml(sanitizeImageSrc(item.imagem))}" alt="${escapeHtml(item.nome)}" onerror="this.onerror=null;this.src='${PRODUCT_IMAGE_FALLBACK}'">
          <div class="service-card-body quick-service-card-body">
            <span class="quick-service-card-tag">Lancar</span>
            <h3>${escapeHtml(item.nome)}</h3>
            <p>${escapeHtml(item.descricao)}</p>
            <div class="service-card-footer quick-service-card-footer">
              <strong>${formatCurrency(parsePriceToNumber(item.preco))}</strong>
              <button class="btn btn-primary quick-service-card-btn" type="button" onclick="event.stopPropagation(); openAtendimentoItemDialog(${item.sourceIndex})">Somar</button>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  renderAtendimentoCheckoutBar();
}

function handleAtendimentoCardKey(event, index) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openAtendimentoItemDialog(index);
  }
}

function openAtendimentoItemDialog(index) {
  const item = getItems()[index];
  const dialog = document.getElementById("atendimentoItemDialog");

  if (!item || !dialog) {
    return;
  }

  document.getElementById("atendimentoItemIndex").value = String(index);
  document.getElementById("atendimentoItemName").textContent = item.nome;
  document.getElementById("atendimentoItemDescription").textContent = item.descricao;
  document.getElementById("atendimentoItemPrice").textContent = formatCurrency(parsePriceToNumber(item.preco));
  currentAtendimentoEditingItemId = "";
  document.getElementById("atendimentoItemQuantity").value = "1";
  syncAtendimentoItemSubtotal();

  if (!dialog.open) {
    dialog.showModal();
  }
}

function closeAtendimentoItemDialog() {
  const dialog = document.getElementById("atendimentoItemDialog");
  currentAtendimentoEditingItemId = "";
  if (dialog?.open) {
    dialog.close();
  }
}

function adjustAtendimentoDialogQuantity(delta) {
  const quantityField = document.getElementById("atendimentoItemQuantity");
  if (!quantityField) {
    return;
  }

  const nextValue = Math.max(1, (Number(quantityField.value) || 1) + delta);
  quantityField.value = String(nextValue);
  syncAtendimentoItemSubtotal();
}

function syncAtendimentoItemSubtotal() {
  const index = Number(document.getElementById("atendimentoItemIndex")?.value);
  const quantityField = document.getElementById("atendimentoItemQuantity");
  const subtotalField = document.getElementById("atendimentoItemSubtotal");
  const item = getItems()[index];

  if (!quantityField || !subtotalField || !item) {
    return;
  }

  const quantity = Math.max(1, Number(quantityField.value) || 1);
  quantityField.value = String(quantity);
  subtotalField.textContent = formatCurrency(parsePriceToNumber(item.preco) * quantity);
}

function saveAtendimentoItemFromDialog() {
  const index = Number(document.getElementById("atendimentoItemIndex").value);
  const quantity = Math.max(1, Number(document.getElementById("atendimentoItemQuantity").value) || 1);
  const item = getItems()[index];

  if (!item) {
    return;
  }

  if (currentAtendimentoEditingItemId) {
    const editingItem = currentAtendimentoOrder.find((orderItem) => orderItem.id === currentAtendimentoEditingItemId);
    if (editingItem) {
      editingItem.quantidade = quantity;
    }

    closeAtendimentoItemDialog();
    renderAtendimentoCheckoutBar();
    renderAtendimentoPaymentSummary();
    return;
  }

  const existing = currentAtendimentoOrder.find((orderItem) => orderItem.produtoId === item.id);

  if (existing) {
    existing.quantidade += quantity;
  } else {
    currentAtendimentoOrder.push({
      id: `${item.id}-${Date.now()}`,
      produtoId: item.id,
      nome: item.nome,
      preco: item.preco,
      quantidade: quantity
    });
  }

  closeAtendimentoItemDialog();
  renderAtendimentoCheckoutBar();
  renderAtendimentoPaymentSummary();
}

function editAtendimentoOrderItem(itemId) {
  const orderItem = currentAtendimentoOrder.find((item) => item.id === itemId);
  if (!orderItem) {
    return;
  }

  const itemIndex = getItems().findIndex((item) => item.id === orderItem.produtoId);
  if (itemIndex < 0) {
    return;
  }

  openAtendimentoItemDialog(itemIndex);
  currentAtendimentoEditingItemId = itemId;
  document.getElementById("atendimentoItemQuantity").value = String(orderItem.quantidade);
  syncAtendimentoItemSubtotal();
}

function removeAtendimentoOrderItem(itemId) {
  currentAtendimentoOrder = currentAtendimentoOrder.filter((item) => item.id !== itemId);
  renderAtendimentoCheckoutBar();
  renderAtendimentoPaymentSummary();
  closeAtendimentoSummaryItemDialog();
}

function getCurrentAtendimentoOrderTotal() {
  return currentAtendimentoOrder.reduce(
    (total, item) => total + parsePriceToNumber(item.preco) * item.quantidade,
    0
  );
}

function renderAtendimentoCheckoutBar() {
  const bar = document.getElementById("quickCheckoutBar");
  const count = document.getElementById("quickCheckoutItemsCount");
  const total = document.getElementById("quickCheckoutTotal");

  if (!bar || !count || !total) {
    return;
  }

  const itemsCount = currentAtendimentoOrder.reduce((sum, item) => sum + item.quantidade, 0);
  const hasItems = itemsCount > 0;

  bar.hidden = !hasItems;
  count.textContent = `${itemsCount} ${itemsCount === 1 ? "item" : "itens"}`;
  total.textContent = formatCurrency(getCurrentAtendimentoOrderTotal());
}

function openAtendimentoSummaryDialog() {
  if (!currentAtendimentoOrder.length) {
    return;
  }

  const dialog = document.getElementById("atendimentoSummaryDialog");
  if (!dialog) {
    return;
  }

  renderAtendimentoPaymentSummary();

  if (!dialog.open) {
    dialog.showModal();
  }
}

function closeAtendimentoSummaryDialog() {
  const dialog = document.getElementById("atendimentoSummaryDialog");
  if (dialog?.open) {
    dialog.close();
  }
}

function openAtendimentoPaymentDialog() {
  if (!currentAtendimentoOrder.length) {
    return;
  }

  const dialog = document.getElementById("atendimentoPaymentDialog");
  if (!dialog) {
    return;
  }

  closeAtendimentoSummaryDialog();
  renderAtendimentoPaymentSummary();
  selectAtendimentoPaymentMethod(currentAtendimentoPaymentMethod);

  if (!dialog.open) {
    dialog.showModal();
  }
}

function closeAtendimentoPaymentDialog() {
  const dialog = document.getElementById("atendimentoPaymentDialog");
  if (dialog?.open) {
    dialog.close();
  }
}

function renderAtendimentoPaymentSummary() {
  const summary = document.getElementById("atendimentoPaymentSummary");
  const summaryTotal = document.getElementById("atendimentoPaymentTotal");
  const paymentTotal = document.getElementById("atendimentoPaymentStepTotal");

  if (!summary) {
    return;
  }

  summary.innerHTML = currentAtendimentoOrder
    .map((item) => {
      const subtotal = parsePriceToNumber(item.preco) * item.quantidade;
      return `
        <button class="compact-order-line compact-order-line-button" type="button" onclick="openAtendimentoSummaryItemDialog('${escapeJsString(item.id)}')">
          <div class="compact-order-line-copy">
            <strong>${item.quantidade}x ${escapeHtml(item.nome)} <span class="compact-order-line-unit">(${formatCurrency(parsePriceToNumber(item.preco))})</span></strong>
            <span class="compact-order-line-subtotal">${formatCurrency(subtotal)}</span>
          </div>
        </button>
      `;
    })
    .join("");

  if (summaryTotal) {
    summaryTotal.textContent = formatCurrency(getCurrentAtendimentoOrderTotal());
  }

  if (paymentTotal) {
    paymentTotal.textContent = formatCurrency(getCurrentAtendimentoOrderTotal());
  }

  updateAtendimentoCashChange();
}

function openAtendimentoSummaryItemDialog(itemId) {
  const item = currentAtendimentoOrder.find((entry) => entry.id === itemId);
  const dialog = document.getElementById("atendimentoSummaryItemDialog");

  if (!item || !dialog) {
    return;
  }

  currentAtendimentoSummaryItemId = itemId;
  document.getElementById("atendimentoSummaryItemTitle").textContent = item.nome;
  document.getElementById("atendimentoSummaryItemMeta").textContent = `${item.quantidade}x ${formatCurrency(parsePriceToNumber(item.preco))}`;

  if (!dialog.open) {
    dialog.showModal();
  }
}

function closeAtendimentoSummaryItemDialog() {
  const dialog = document.getElementById("atendimentoSummaryItemDialog");
  currentAtendimentoSummaryItemId = "";

  if (dialog?.open) {
    dialog.close();
  }
}

function editSelectedAtendimentoSummaryItem() {
  const itemId = currentAtendimentoSummaryItemId;
  closeAtendimentoSummaryItemDialog();

  if (itemId) {
    editAtendimentoOrderItem(itemId);
  }
}

function removeSelectedAtendimentoSummaryItem() {
  const itemId = currentAtendimentoSummaryItemId;
  closeAtendimentoSummaryItemDialog();

  if (itemId) {
    removeAtendimentoOrderItem(itemId);
  }
}

function selectAtendimentoPaymentMethod(method) {
  currentAtendimentoPaymentMethod = method;

  const methodIds = {
    Pix: "paymentMethodPix",
    Cartao: "paymentMethodCartao",
    Dinheiro: "paymentMethodDinheiro"
  };

  Object.values(methodIds).forEach((id) => {
    document.getElementById(id)?.classList.remove("is-active");
  });

  document.getElementById(methodIds[method])?.classList.add("is-active");

  const cashFields = document.getElementById("atendimentoCashFields");
  if (cashFields) {
    cashFields.hidden = method !== "Dinheiro";
  }

  if (method !== "Dinheiro") {
    const cashReceived = document.getElementById("atendimentoCashReceived");
    if (cashReceived) {
      cashReceived.value = "";
    }
  }

  updateAtendimentoCashChange();
}

function updateAtendimentoCashChange() {
  const changeElement = document.getElementById("atendimentoChangeAmount");
  if (!changeElement) {
    return;
  }

  if (currentAtendimentoPaymentMethod !== "Dinheiro") {
    changeElement.textContent = formatCurrency(0);
    return;
  }

  const received = parsePriceToNumber(document.getElementById("atendimentoCashReceived")?.value || "");
  const total = getCurrentAtendimentoOrderTotal();
  const change = Math.max(0, received - total);
  changeElement.textContent = formatCurrency(change);
}

function getCurrentAtendimentoOrderPayload() {
  const authUser = getAuthService()?.getCurrentUser?.();
  const received = parsePriceToNumber(document.getElementById("atendimentoCashReceived")?.value || "");
  const total = getCurrentAtendimentoOrderTotal();
  const change = currentAtendimentoPaymentMethod === "Dinheiro"
    ? Math.max(0, received - total)
    : 0;

  return {
    id: `ATD-${Date.now()}`,
    cliente: "Atendimento rapido",
    canal: "Atendimento rapido",
    contato: "-",
    observacoes: `Pagamento: ${currentAtendimentoPaymentMethod}`,
    itens: currentAtendimentoOrder.map((item) => ({ ...item })),
    total,
    status: "Finalizado",
    criadoEm: new Date().toLocaleString("pt-BR"),
    criadoPorUid: authUser?.uid || "",
    tipoAtendimento: "atendimento-rapido",
    formaPagamento: currentAtendimentoPaymentMethod,
    valorRecebido: currentAtendimentoPaymentMethod === "Dinheiro" ? received : 0,
    troco: change
  };
}

function clearCurrentAtendimentoOrder() {
  currentAtendimentoOrder = [];
  currentAtendimentoPaymentMethod = "Pix";

  const cashReceived = document.getElementById("atendimentoCashReceived");
  if (cashReceived) {
    cashReceived.value = "";
  }

  renderAtendimentoCheckoutBar();
  renderAtendimentoPaymentSummary();
  closeAtendimentoSummaryItemDialog();
  closeAtendimentoSummaryDialog();
  closeAtendimentoPaymentDialog();
}

function confirmClearCurrentAtendimentoOrder() {
  if (!currentAtendimentoOrder.length) {
    clearCurrentAtendimentoOrder();
    return;
  }

  showAppConfirmDialog({
    titleText: "Limpar pedido",
    messageText: "Deseja limpar os itens deste atendimento rapido?",
    confirmLabel: "Limpar",
    iconName: "warning_amber",
    onConfirm: () => {
      clearCurrentAtendimentoOrder();
    }
  });
}

async function registerAtendimentoOrder() {
  if (currentAtendimentoOrder.length === 0) {
    alert("Adicione pelo menos um item ao pedido.");
    return;
  }

  if (currentAtendimentoPaymentMethod === "Dinheiro") {
    const received = parsePriceToNumber(document.getElementById("atendimentoCashReceived")?.value || "");
    const total = getCurrentAtendimentoOrderTotal();

    if (!received) {
      alert("Informe o valor recebido em dinheiro.");
      return;
    }

    if (received < total) {
      alert("O valor recebido nao pode ser menor que o total.");
      return;
    }
  }

  const order = getCurrentAtendimentoOrderPayload();
  const orderService = getOrderService();

  if (orderService?.isConfigured) {
    try {
      await orderService.save(order);
    } catch (error) {
      alert("Nao foi possivel salvar o pedido no Firebase.");
      return;
    }
  } else {
    const orders = getOrders();
    orders.unshift(order);
    saveOrders(orders);
  }

  alert(`Pedido ${order.id} finalizado em ${order.formaPagamento}.`);
  clearCurrentAtendimentoOrder();
}

document.addEventListener("input", (event) => {
  if (event.target?.id === "atendimentoItemQuantity") {
    syncAtendimentoItemSubtotal();
  }

  if (event.target?.id === "atendimentoCashReceived") {
    event.target.value = formatPriceInput(event.target.value);
    updateAtendimentoCashChange();
  }
});
