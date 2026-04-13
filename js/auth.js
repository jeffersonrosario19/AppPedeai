function getAuthService() {
  return window.authService;
}

let currentUserProfile = null;
let currentOnboardingState = null;

function getCurrentUserProfile() {
  return currentUserProfile;
}

function getCurrentOnboardingState() {
  return currentOnboardingState;
}

function setSessionState(authenticated) {
  if (authenticated) {
    localStorage.setItem(SESSION_KEY, "true");
    return;
  }

  localStorage.removeItem(SESSION_KEY);
}

function isAuthenticated() {
  const authService = getAuthService();
  if (authService?.getCurrentUser) {
    return Boolean(authService.getCurrentUser());
  }

  return localStorage.getItem(SESSION_KEY) === "true";
}

function setupLoginForm() {
  const loginForm = document.getElementById("loginForm");

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    login();
  });
}

function setupAuthStateListener() {
  const authService = getAuthService();

  if (!authService?.onAuthStateChanged) {
    isAuthReady = true;
    updateAppState();
    return;
  }

  authService.onAuthStateChanged((user) => {
    setSessionState(Boolean(user));
    isAuthReady = true;
    updateAppState();
  });
}

async function refreshAuthenticatedUserContext(user = getAuthService()?.getCurrentUser?.()) {
  currentUserProfile = null;
  currentOnboardingState = null;

  if (!user) {
    return;
  }

  const collaboratorService = window.collaboratorService;
  if (!collaboratorService?.isConfigured) {
    return;
  }

  try {
    const onboardingState = await collaboratorService.getOnboardingState(user);
    currentOnboardingState = onboardingState;
    currentUserProfile = onboardingState?.profile || null;
  } catch (error) {
    currentOnboardingState = null;
    currentUserProfile = null;
  }
}

async function updateAppState() {
  if (!isAuthReady && getAuthService()?.isConfigured) {
    return;
  }

  const authenticated = isAuthenticated();
  document.body.classList.toggle("app-locked", !authenticated);

  if (authenticated) {
    const user = getAuthService()?.getCurrentUser?.();
    await refreshAuthenticatedUserContext(user);

    const needsOnboarding = Boolean(currentOnboardingState?.needsOnboarding);
    const nextPage = needsOnboarding ? ONBOARDING_PAGE : DEFAULT_PAGE;

    document.body.classList.toggle("profile-onboarding", needsOnboarding);
    loadPage(nextPage);

    if (!needsOnboarding) {
      activateMenuByPage(DEFAULT_PAGE);
    } else {
      activateMenuByPage();
    }

    updateSidebarUserInfo(user);
  } else {
    document.body.classList.remove("profile-onboarding");
    resetLoginForm();
    closeMenu();
    currentUserProfile = null;
    currentOnboardingState = null;
    updateSidebarUserInfo(null);
  }
}

function setLoginLoading(isLoading) {
  const submitButton = document.querySelector("#loginForm button[type='submit']");
  const userInput = document.getElementById("loginUser");
  const passwordInput = document.getElementById("loginPassword");

  if (submitButton) {
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? "Entrando..." : "Entrar";
  }

  if (userInput) {
    userInput.disabled = isLoading;
  }

  if (passwordInput) {
    passwordInput.disabled = isLoading;
  }
}

function getAuthErrorMessage(error) {
  if (!getAuthService()?.isConfigured) {
    return "Firebase Auth não está disponível.";
  }

  const errorMessage = String(error?.message || "").toLowerCase();
  if (
    error?.code === "auth/network-request-failed"
    || errorMessage.includes("internet_disconnected")
    || errorMessage.includes("failed to fetch")
  ) {
    return "Sem conexão com a internet. Verifique sua rede e tente novamente.";
  }

  return AUTH_ERROR_MESSAGES[error?.code] || "Não foi possível entrar. Verifique seus dados.";
}

async function login() {
  const userInput = document.getElementById("loginUser");
  const passwordInput = document.getElementById("loginPassword");
  const error = document.getElementById("loginError");
  const user = userInput.value.trim();
  const password = passwordInput.value.trim();
  const authService = getAuthService();

  if (!user) {
    error.textContent = "Digite seu e-mail.";
    return;
  }

  if (!password) {
    error.textContent = "Digite sua senha.";
    return;
  }

  error.textContent = "";
  setLoginLoading(true);

  try {
    await authService.login(user, password);
  } catch (loginError) {
    error.textContent = getAuthErrorMessage(loginError);
  } finally {
    setLoginLoading(false);
  }
}

async function logout() {
  const authService = getAuthService();

  try {
    if (authService?.logout) {
      await authService.logout();
    } else {
      setSessionState(false);
      updateAppState();
    }
  } catch (logoutError) {
    alert("Não foi possível sair da sessão.");
    return;
  }

  document.body.classList.remove("desktop-collapsed");
}

function resetLoginForm() {
  document.getElementById("loginForm").reset();
  document.getElementById("loginError").textContent = "";
}

async function updateSidebarUserInfo(user = getAuthService()?.getCurrentUser?.()) {
  const nameElement = document.getElementById("sidebarUserName");
  const statusElement = document.getElementById("sidebarUserStatus");

  if (!nameElement || !statusElement) {
    return;
  }

  if (!user) {
    nameElement.textContent = "Nenhum usuario conectado";
    statusElement.textContent = "Aguardando autenticacao";
    return;
  }

  let profile = currentUserProfile;
  const collaboratorService = window.collaboratorService;

  if (!profile && collaboratorService?.isConfigured) {
    try {
      profile = await collaboratorService.getProfile(user);
    } catch (error) {
      profile = null;
    }
  }

  const fallbackName = user.displayName || user.email || "Usuario autenticado";
  const metaParts = [];

  if (profile?.accessLevel) {
    metaParts.push(profile.accessLevel);
  }

  if (profile?.cargo) {
    metaParts.push(profile.cargo);
  }

  if (profile?.status) {
    metaParts.push(profile.status);
  } else {
    metaParts.push("Autenticado");
  }

  nameElement.textContent = profile?.nome || fallbackName;
  statusElement.textContent = metaParts.join(" | ");
}
