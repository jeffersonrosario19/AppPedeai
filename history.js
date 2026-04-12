async function renderHistorico(content) {
  if (!content) {
    return;
  }

  if (typeof ensureOrderSync === "function") {
    await ensureOrderSync();
  }

  const orders = getOrders();

  if (orders.length === 0) {
    content.innerHTML = `
      <h2>Historico</h2>
      <div class="card empty-state">Nenhum pedido registrado ate o momento.</div>
    `;
    return;
  }

  content.innerHTML = `
    <h2>Historico</h2>
    <div class="history-list">
      ${orders
        .map(
          (order, index) => `
            <article class="history-card" role="button" tabindex="0" onclick="openOrderDetails(${index})" onkeydown="handleHistoryCardKey(event, ${index})">
              <div class="history-card-top">
                <div>
                  <strong>${escapeHtml(order.id)}</strong>
                  <p>${escapeHtml(order.cliente)} - ${escapeHtml(order.canal)}</p>
                </div>
                <span>${escapeHtml(order.status)}</span>
              </div>
              <div class="history-meta">
                ${order.mesa ? `<p><b>Mesa:</b> ${escapeHtml(order.mesa)}</p>` : ""}
                <p><b>Contato:</b> ${escapeHtml(order.contato)}</p>
                <p><b>Observacoes:</b> ${escapeHtml(order.observacoes)}</p>
                <p><b>Itens:</b> ${order.itens.map((item) => `${item.quantidade}x ${escapeHtml(item.nome)}`).join(", ")}</p>
              </div>
              <div class="history-card-bottom">
                <small>${escapeHtml(order.criadoEm)}</small>
                <div class="history-card-actions">
                  <strong>${formatCurrency(order.total)}</strong>
                  <button class="btn btn-card-secondary" type="button" onclick="event.stopPropagation(); openOrderDetails(${index})">Ver</button>
                  <button class="btn btn-dialog-primary" type="button" onclick="event.stopPropagation(); printOrder80mm(${index})">Imprimir 80mm</button>
                </div>
              </div>
            </article>
          `
        )
        .join("")}
    </div>

    <dialog class="item-dialog" id="historyDialog">
      <div class="dialog-shell">
        <div class="dialog-header">
          <h3>Detalhes do Pedido</h3>
          <button type="button" class="btn-icon-ghost" onclick="closeOrderDetails()">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="dialog-body" id="historyDialogBody"></div>
        <div class="dialog-footer">
          <button type="button" class="btn btn-dialog-secondary" onclick="closeOrderDetails()">Fechar</button>
          <button type="button" class="btn btn-submit btn-dialog-primary" id="historyPrintButton">Imprimir 80mm</button>
        </div>
      </div>
    </dialog>
  `;
}

function handleHistoryCardKey(event, index) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openOrderDetails(index);
  }
}

function openOrderDetails(index) {
  const orders = getOrders();
  const order = orders[index];
  const dialog = document.getElementById("historyDialog");
  const body = document.getElementById("historyDialogBody");
  const printButton = document.getElementById("historyPrintButton");

  if (!order || !dialog || !body || !printButton) {
    return;
  }

  body.innerHTML = `
    <div class="history-detail">
      <div class="history-detail-row">
        <strong>Pedido</strong>
        <span>${escapeHtml(order.id)}</span>
      </div>
      <div class="history-detail-row">
        <strong>Cliente</strong>
        <span>${escapeHtml(order.cliente)}</span>
      </div>
      <div class="history-detail-row">
        <strong>Canal</strong>
        <span>${escapeHtml(order.canal)}</span>
      </div>
      ${order.mesa ? `
        <div class="history-detail-row">
          <strong>Mesa</strong>
          <span>${escapeHtml(order.mesa)}</span>
        </div>
      ` : ""}
      <div class="history-detail-row">
        <strong>Contato</strong>
        <span>${escapeHtml(order.contato)}</span>
      </div>
      <div class="history-detail-row">
        <strong>Status</strong>
        <span>${escapeHtml(order.status)}</span>
      </div>
      <div class="history-detail-row">
        <strong>Criado em</strong>
        <span>${escapeHtml(order.criadoEm)}</span>
      </div>
      <div class="history-detail-notes">
        <strong>Observacoes</strong>
        <p>${escapeHtml(order.observacoes)}</p>
      </div>
      <div class="history-detail-items">
        <strong>Itens do pedido</strong>
        ${order.itens
          .map((item) => {
            const subtotal = parsePriceToNumber(item.preco) * item.quantidade;
            return `
              <div class="history-detail-item">
                <span>${item.quantidade}x ${escapeHtml(item.nome)}</span>
                <strong>${formatCurrency(subtotal)}</strong>
              </div>
            `;
          })
          .join("")}
      </div>
      <div class="history-detail-total">
        <span>Total</span>
        <strong>${formatCurrency(order.total)}</strong>
      </div>
    </div>
  `;

  printButton.onclick = () => printOrder80mm(index);
  dialog.showModal();
}

function closeOrderDetails() {
  const dialog = document.getElementById("historyDialog");
  if (dialog && dialog.open) {
    dialog.close();
  }
}

function printOrder80mm(index) {
  const orders = getOrders();
  const order = orders[index];
  if (!order) {
    return;
  }

  const printWindow = window.open("", "_blank", "width=420,height=700");
  if (!printWindow) {
    alert("Nao foi possivel abrir a janela de impressao.");
    return;
  }

  const itemsHtml = order.itens
    .map((item) => {
      const subtotal = parsePriceToNumber(item.preco) * item.quantidade;
      return `
        <div class="line">
          <div>${item.quantidade}x ${escapeHtml(item.nome)}</div>
          <div>${formatCurrency(subtotal)}</div>
        </div>
      `;
    })
    .join("");

  const receiptHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(order.id)}</title>
      <style>
        @page { size: 80mm auto; margin: 4mm; }
        body { width: 72mm; margin: 0 auto; font-family: Arial, sans-serif; color: #000; font-size: 12px; }
        .ticket { padding: 4mm 0; }
        .center { text-align: center; }
        .title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
        .muted { font-size: 11px; margin-bottom: 2px; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .line { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
        .line div:last-child { text-align: right; }
        .total { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; margin-top: 8px; }
        .section-title { font-weight: 700; margin-bottom: 4px; }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="center">
          <div class="title">Pedido ${escapeHtml(order.id)}</div>
          <div class="muted">${escapeHtml(order.criadoEm)}</div>
        </div>
        <div class="divider"></div>
        <div class="muted"><b>Cliente:</b> ${escapeHtml(order.cliente)}</div>
        <div class="muted"><b>Canal:</b> ${escapeHtml(order.canal)}</div>
        ${order.mesa ? `<div class="muted"><b>Mesa:</b> ${escapeHtml(order.mesa)}</div>` : ""}
        <div class="muted"><b>Contato:</b> ${escapeHtml(order.contato)}</div>
        <div class="muted"><b>Status:</b> ${escapeHtml(order.status)}</div>
        <div class="divider"></div>
        <div class="section-title">Itens</div>
        ${itemsHtml}
        <div class="divider"></div>
        <div class="muted"><b>Observacoes:</b> ${escapeHtml(order.observacoes)}</div>
        <div class="total">
          <span>Total</span>
          <span>${formatCurrency(order.total)}</span>
        </div>
      </div>
      <script>
        window.onload = () => {
          window.print();
          window.onafterprint = () => window.close();
        };
      <\/script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(receiptHtml);
  printWindow.document.close();
}
