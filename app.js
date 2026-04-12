const SESSION_KEY = "adminLogado";
const DEFAULT_PAGE = "atendimento";
const ONBOARDING_PAGE = "primeiro-acesso";
const ORDER_STORAGE_KEY = "pedidos";
const STAFF_STORAGE_KEY = "colaboradores";
const PRODUCT_IMAGE_FALLBACK = "assets/bolo-S.png";
const AUTH_ERROR_MESSAGES = {
  "auth/invalid-email": "Digite um e-mail válido.",
  "auth/missing-password": "Digite sua senha.",
  "auth/invalid-credential": "E-mail ou senha inválidos.",
  "auth/invalid-login-credentials": "E-mail ou senha inválidos.",
  "auth/user-not-found": "Usuário não encontrado.",
  "auth/wrong-password": "E-mail ou senha inválidos.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde e tente novamente."
};

let currentTableOrder = [];
let isAuthReady = false;
let appConfirmDialogAction = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeJsString(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

function sanitizeImageSrc(value) {
  const candidate = String(value ?? "").trim();
  if (!candidate) {
    return PRODUCT_IMAGE_FALLBACK;
  }

  const isAllowedSource = /^(https?:\/\/|data:image\/|assets\/|\.\/|\.\.\/|\/)/i.test(candidate);
  return isAllowedSource ? candidate : PRODUCT_IMAGE_FALLBACK;
}

function showAppConfirmDialog(options = {}) {
  const dialog = document.getElementById("appConfirmDialog");
  const title = document.getElementById("appConfirmTitle");
  const message = document.getElementById("appConfirmMessage");
  const icon = document.getElementById("appConfirmIcon");
  const confirmButton = document.getElementById("appConfirmButton");
  const {
    titleText = "Confirmar ação",
    messageText = "Deseja continuar com esta ação?",
    confirmLabel = "Confirmar",
    iconName = "warning_amber",
    onConfirm = null
  } = options;

  if (!dialog || !title || !message || !icon || !confirmButton) {
    return;
  }

  title.textContent = titleText;
  message.textContent = messageText;
  icon.textContent = iconName;
  confirmButton.textContent = confirmLabel;
  appConfirmDialogAction = typeof onConfirm === "function" ? onConfirm : null;

  if (!dialog.open) {
    dialog.showModal();
  }
}

function closeAppConfirmDialog() {
  const dialog = document.getElementById("appConfirmDialog");
  appConfirmDialogAction = null;

  if (dialog?.open) {
    dialog.close();
  }
}

function confirmAppDialogAction() {
  const action = appConfirmDialogAction;
  closeAppConfirmDialog();

  if (typeof action === "function") {
    action();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupLoginForm();
  setupAuthStateListener();
});
