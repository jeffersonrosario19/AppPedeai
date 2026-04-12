window.catalogState = window.catalogState || { items: null };
window.orderState = window.orderState || { orders: null };

function normalizeItem(item, index) {
  return {
    id: item.id || `item-${Date.now()}-${index}`,
    nome: item.nome || "",
    descricao: item.descricao || "Sem descrição cadastrada.",
    preco: item.preco || "",
    imagem: item.imagem || PRODUCT_IMAGE_FALLBACK
  };
}

function getItems() {
  if (Array.isArray(window.catalogState?.items)) {
    return window.catalogState.items.map(normalizeItem);
  }

  const items = JSON.parse(localStorage.getItem("produtos") || "[]");
  return items.map(normalizeItem);
}

function setItems(items, options = {}) {
  const normalizedItems = Array.isArray(items)
    ? items.map(normalizeItem)
    : [];

  window.catalogState = {
    ...window.catalogState,
    items: normalizedItems
  };

  if (options.persistLocal) {
    localStorage.setItem("produtos", JSON.stringify(normalizedItems));
  }

  return normalizedItems;
}

function saveItems(items) {
  return setItems(items, { persistLocal: true });
}

function getOrders() {
  if (Array.isArray(window.orderState?.orders)) {
    return window.orderState.orders;
  }

  return JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || "[]");
}

function setOrders(orders, options = {}) {
  const normalizedOrders = Array.isArray(orders) ? orders : [];

  window.orderState = {
    ...window.orderState,
    orders: normalizedOrders
  };

  if (options.persistLocal) {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(normalizedOrders));
  }

  return normalizedOrders;
}

function saveOrders(orders) {
  return setOrders(orders, { persistLocal: true });
}

function getStaff() {
  const stored = JSON.parse(localStorage.getItem(STAFF_STORAGE_KEY) || "[]");
  return Array.isArray(stored) ? stored : [];
}

function saveStaff(staff) {
  localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staff));
}
