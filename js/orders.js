let orderRealtimeUnsubscribe = null;

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

function renderAtendimentoCatalog() {
  const list = document.getElementById("serviceCatalogList");
  if (!list) {
    return;
  }

  const items = getItems();
  const search = document.getElementById("atendimentoBusca");
  const term = search ? search.value.trim().toLowerCase() : "";
  const filtered = items
    .map((item) => ({ ...item }))
    .filter((item) => `${item.nome} ${item.descricao}`.toLowerCase().includes(term));

  if (items.length === 0) {
    list.innerHTML = '<div class="card empty-state">Cadastre itens no cardapio para iniciar o atendimento.</div>';
    return;
  }

  if (filtered.length === 0) {
    list.innerHTML = '<div class="card empty-state">Nenhum item encontrado no atendimento.</div>';
    return;
  }

  list.innerHTML = filtered
    .map(
      (item) => `
        <article class="service-card">
          <img class="service-card-image" src="${escapeHtml(sanitizeImageSrc(item.imagem))}" alt="${escapeHtml(item.nome)}" onerror="this.onerror=null;this.src='${PRODUCT_IMAGE_FALLBACK}'">
          <div class="service-card-body">
            <h3>${escapeHtml(item.nome)}</h3>
            <p>${escapeHtml(item.descricao)}</p>
            <div class="service-card-footer">
              <strong>${formatCurrency(parsePriceToNumber(item.preco))}</strong>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}
