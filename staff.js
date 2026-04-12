let staffRecords = [];
let staffRealtimeUnsubscribe = null;

function canManageStaffRecords() {
  const profile = typeof getCurrentUserProfile === "function"
    ? getCurrentUserProfile()
    : null;

  if (!profile) {
    return false;
  }

  return profile.status === "Ativo"
    && ["Administrador", "Gerente"].includes(profile.accessLevel);
}

function syncStaffPermissions() {
  const newStaffButton = document.getElementById("newStaffButton");

  if (newStaffButton) {
    newStaffButton.hidden = !canManageStaffRecords();
  }
}

function isEditingStaff() {
  const documentId = document.getElementById("staffDocumentId");
  return Boolean(documentId?.value.trim());
}

function getStaffFormElement() {
  return document.getElementById("user-form");
}

function getStaffDialogElement() {
  return document.getElementById("staffDialog");
}

function getCollaboratorService() {
  return window.collaboratorService;
}

function getStaffFormMode() {
  return getStaffFormElement()?.dataset.mode || "staff";
}

function setStaffFormFeedback(message, type = "neutral") {
  const feedback = document.getElementById("staffFormFeedback");
  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.dataset.state = type;
}

function setStaffFormLoading(isLoading) {
  const submitButton = document.getElementById("staffSubmitButton");
  const form = getStaffFormElement();
  if (!submitButton) {
    return;
  }

  const idleLabel = isEditingStaff()
    ? (form?.dataset.editLabel || "Atualizar colaborador")
    : (form?.dataset.createLabel || "Salvar colaborador");
  const loadingLabel = form?.dataset.loadingLabel
    || (isEditingStaff() ? "Atualizando..." : "Salvando...");

  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? loadingLabel : idleLabel;
}

function normalizeLocalStaff(member, index) {
  return {
    id: member.id || `local-${index}`,
    nome: member.nome || "",
    email: member.email || "",
    telefone: member.telefone || "",
    cargo: member.cargo || "",
    accessLevel: member.accessLevel || "Atendimento",
    status: member.status || "Ativo",
    uid: member.uid || ""
  };
}

async function loadStaffRecords() {
  const collaboratorService = getCollaboratorService();

  if (collaboratorService?.isConfigured) {
    try {
      return await collaboratorService.list();
    } catch (error) {
      setStaffFormFeedback("Falha ao carregar do Firebase.", "warning");
      return [];
    }
  }

  return getStaff().map(normalizeLocalStaff);
}

function stopStaffRealtimeSync() {
  if (typeof staffRealtimeUnsubscribe === "function") {
    staffRealtimeUnsubscribe();
    staffRealtimeUnsubscribe = null;
  }
}

function configureStaffForm(options = {}) {
  const form = getStaffFormElement();
  const title = document.getElementById("userFormTitle");
  const email = document.getElementById("staffEmail");
  const passwordField = document.getElementById("staffPasswordField");
  const passwordHint = document.getElementById("staffPasswordHint");
  const accessLevel = document.getElementById("staffAccessLevel");
  const status = document.getElementById("staffStatus");
  const resetButton = form?.querySelector("button[type='button']");
  const {
    mode = "staff",
    titleText = "Novo colaborador",
    lockEmail = false,
    showPassword = true,
    allowAccessLevelEdit = true,
    allowStatusEdit = true,
    hideResetButton = false,
    createLabel = "Salvar colaborador",
    editLabel = "Atualizar colaborador",
    loadingLabel = "Salvando..."
  } = options;

  if (!form || !title || !email || !passwordField || !passwordHint || !accessLevel || !status) {
    return;
  }

  form.dataset.mode = mode;
  form.dataset.createLabel = createLabel;
  form.dataset.editLabel = editLabel;
  form.dataset.loadingLabel = loadingLabel;
  title.textContent = titleText;
  email.disabled = lockEmail;
  passwordField.hidden = !showPassword;
  passwordHint.hidden = !showPassword;
  accessLevel.disabled = !allowAccessLevelEdit;
  status.disabled = !allowStatusEdit;

  if (resetButton) {
    resetButton.hidden = hideResetButton;
  }
}

function fillStaffForm(member, options = {}) {
  const documentId = document.getElementById("staffDocumentId");
  const nome = document.getElementById("staffNome");
  const email = document.getElementById("staffEmail");
  const telefone = document.getElementById("staffTelefone");
  const password = document.getElementById("staffPassword");
  const passwordToggle = document.getElementById("staffPasswordToggle");
  const cargo = document.getElementById("staffCargo");
  const accessLevel = document.getElementById("staffAccessLevel");
  const status = document.getElementById("staffStatus");

  if (!documentId || !nome || !email || !telefone || !password || !passwordToggle || !cargo || !accessLevel || !status) {
    return;
  }

  configureStaffForm(options);

  if (!member) {
    documentId.value = "";
    nome.value = "";
    email.value = "";
    telefone.value = "";
    password.value = "";
    cargo.value = "";
    accessLevel.value = "Atendimento";
    status.value = "Ativo";
    password.type = "password";
    setPasswordToggleState(password, passwordToggle);
    setStaffFormLoading(false);
    return;
  }

  documentId.value = member.id || "";
  nome.value = member.nome || "";
  email.value = member.email || "";
  telefone.value = formatPhoneValue(member.telefone || "");
  password.value = "";
  cargo.value = member.cargo || "";
  accessLevel.value = member.accessLevel || "Atendimento";
  status.value = member.status || "Ativo";
  password.type = "password";
  setPasswordToggleState(password, passwordToggle);
  setStaffFormLoading(false);
}

function resetStaffForm() {
  fillStaffForm(null, {
    mode: "staff",
    titleText: "Novo colaborador",
    lockEmail: false,
    showPassword: true,
    allowAccessLevelEdit: true,
    allowStatusEdit: true,
    hideResetButton: false,
    createLabel: "Salvar colaborador",
    editLabel: "Atualizar colaborador",
    loadingLabel: "Salvando..."
  });
  setStaffFormFeedback("");
}

async function openStaffDialog(index) {
  const dialog = getStaffDialogElement();
  if (!dialog) {
    return;
  }

  if (getStaffFormMode() !== "self-onboarding" && !canManageStaffRecords()) {
    setStaffFormFeedback("Somente gerente ou administrador pode cadastrar colaboradores.", "error");
    return;
  }

  if (typeof index === "number") {
    if (!staffRecords.length) {
      staffRecords = await loadStaffRecords();
    }

    const member = staffRecords[index];
    if (!member) {
      return;
    }

    fillStaffForm(member, {
      mode: "staff",
      titleText: "Editar colaborador",
      lockEmail: true,
      showPassword: false,
      createLabel: "Salvar colaborador",
      editLabel: "Atualizar colaborador",
      loadingLabel: "Atualizando..."
    });
    setStaffFormFeedback(`Editando ${member.nome}.`, "info");
  } else {
    resetStaffForm();
  }

  if (!dialog.open) {
    dialog.showModal();
  }

  setupStaffPhoneMask();
}

async function saveStaffFromForm() {
  const formMode = getStaffFormMode();

  if (formMode !== "self-onboarding" && !canManageStaffRecords()) {
    setStaffFormFeedback("Somente gerente ou administrador pode cadastrar colaboradores.", "error");
    return;
  }

  const documentId = document.getElementById("staffDocumentId").value.trim();
  const nome = document.getElementById("staffNome").value.trim();
  const email = document.getElementById("staffEmail").value.trim();
  const telefone = document.getElementById("staffTelefone").value.trim();
  const initialPassword = document.getElementById("staffPassword").value.trim();
  const cargo = document.getElementById("staffCargo").value.trim();
  const accessLevel = document.getElementById("staffAccessLevel").value;
  const status = document.getElementById("staffStatus").value;

  if (!nome || !email || !telefone || !cargo) {
    setStaffFormFeedback("Preencha nome, e-mail de acesso, telefone e cargo.", "error");
    return;
  }

  if (formMode === "staff" && !documentId && initialPassword.length < 6) {
    setStaffFormFeedback("Defina uma senha inicial com pelo menos 6 caracteres.", "error");
    return;
  }

  setStaffFormLoading(true);
  setStaffFormFeedback("");

  try {
    const collaboratorService = getCollaboratorService();
    const payload = {
      id: documentId,
      nome,
      email,
      telefone,
      cargo,
      accessLevel,
      status,
      uid: staffRecords.find((member) => member.id === documentId)?.uid || "",
      initialPassword
    };

    if (formMode === "self-onboarding" && collaboratorService?.isConfigured) {
      const authUser = getAuthService()?.getCurrentUser?.();

      await collaboratorService.saveOwnProfile(authUser, payload);
      await refreshAuthenticatedUserContext(authUser);
      await updateSidebarUserInfo(authUser);
      await updateAppState();
      return;
    }

    if (collaboratorService?.isConfigured) {
      await collaboratorService.save(payload);
    } else if (formMode === "self-onboarding") {
      const authUser = getAuthService()?.getCurrentUser?.();
      const staff = getStaff().map(normalizeLocalStaff);
      const recordId = authUser?.uid || documentId || `local-${Date.now()}`;
      const index = staff.findIndex((member) => member.id === recordId);
      const record = {
        id: recordId,
        nome,
        email: authUser?.email || email,
        telefone,
        cargo,
        accessLevel,
        status,
        uid: authUser?.uid || ""
      };

      if (index >= 0) {
        staff[index] = record;
      } else {
        staff.push(record);
      }

      saveStaff(staff);
      await updateAppState();
      return;
    } else {
      const staff = getStaff().map(normalizeLocalStaff);
      const recordId = documentId || `local-${Date.now()}`;
      const index = staff.findIndex((member) => member.id === recordId);
      const record = {
        id: recordId,
        nome,
        email,
        telefone,
        cargo,
        accessLevel,
        status,
        uid: staffRecords.find((member) => member.id === documentId)?.uid || ""
      };

      if (index >= 0) {
        staff[index] = record;
      } else {
        staff.push(record);
      }

      saveStaff(staff);
    }

    await renderStaff();
    resetStaffForm();
    closeStaffDialog();
    updateSidebarUserInfo();
  } catch (error) {
    setStaffFormFeedback(error?.message || "Nao foi possivel salvar o colaborador no Firebase.", "error");
  } finally {
    setStaffFormLoading(false);
  }
}

function prepareSelfOnboardingPage() {
  const authUser = getAuthService()?.getCurrentUser?.();
  const onboardingState = typeof getCurrentOnboardingState === "function"
    ? getCurrentOnboardingState()
    : null;
  const isFirstUser = Boolean(onboardingState?.isFirstUser);
  const email = onboardingState?.email || authUser?.email || "";
  const profile = typeof getCurrentUserProfile === "function"
    ? getCurrentUserProfile()
    : null;

  fillStaffForm(
    {
      id: authUser?.uid || "",
      nome: profile?.nome || "",
      email,
      telefone: profile?.telefone || "",
      cargo: profile?.cargo || "",
      accessLevel: profile?.accessLevel || (isFirstUser ? "Gerente" : "Atendimento"),
      status: profile?.status || "Ativo"
    },
    {
      mode: "self-onboarding",
      titleText: "Meu cadastro",
      lockEmail: true,
      showPassword: false,
      allowAccessLevelEdit: false,
      allowStatusEdit: false,
      hideResetButton: true,
      createLabel: "Concluir acesso",
      editLabel: "Concluir acesso",
      loadingLabel: "Salvando..."
    }
  );

  setStaffFormFeedback(
    isFirstUser
      ? "Primeiro usuario detectado. Complete seus dados para criar automaticamente o perfil gerente ativo."
      : "Seu e-mail de acesso foi preenchido automaticamente pelo login. Complete os dados pessoais para continuar.",
    "info"
  );
  setupStaffPhoneMask();
}

async function renderStaff() {
  const list = document.getElementById("staffList");
  syncStaffPermissions();

  if (!list) {
    stopStaffRealtimeSync();
    return;
  }

  list.innerHTML = '<div class="card empty-state">Carregando colaboradores...</div>';
  const collaboratorService = getCollaboratorService();

  if (collaboratorService?.isConfigured && typeof collaboratorService.subscribe === "function") {
    stopStaffRealtimeSync();
    staffRealtimeUnsubscribe = collaboratorService.subscribe(
      (records) => {
        staffRecords = records;
        paintStaffList(list);
      },
      async () => {
        staffRecords = [];
        setStaffFormFeedback("Falha ao sincronizar colaboradores com o Firebase.", "warning");
        paintStaffList(list);
      }
    );
    return;
  }

  staffRecords = await loadStaffRecords();
  paintStaffList(list);
}

function paintStaffList(list) {
  if (!list) {
    return;
  }

  list.innerHTML = "";
  const searchInput = document.getElementById("staffSearch");
  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const filteredRecords = staffRecords.filter((member) => {
    const searchBase = [
      member.nome,
      member.cargo,
      member.accessLevel,
      member.email,
      member.telefone,
      member.status
    ].join(" ").toLowerCase();

    return searchBase.includes(searchTerm);
  });

  if (staffRecords.length === 0) {
    list.innerHTML = '<div class="card empty-state">Nenhum colaborador cadastrado.</div>';
    return;
  }

  if (filteredRecords.length === 0) {
    list.innerHTML = '<div class="card empty-state">Nenhum colaborador encontrado para essa busca.</div>';
    return;
  }

  filteredRecords.forEach((member) => {
    const statusClass = member.status === "Ativo" ? "staff-status-active" : "staff-status-inactive";
    const index = staffRecords.findIndex((record) => record.id === member.id);
    const editButton = canManageStaffRecords()
      ? `
        <div class="staff-card-actions">
          <button class="btn btn-card-secondary staff-btn" type="button" onclick="openStaffDialog(${index})">Editar</button>
        </div>
      `
      : "";
    list.innerHTML += `
      <article class="staff-card">
        <div class="staff-card-top">
          <span class="material-icons staff-icon">person</span>
          <span class="staff-status ${statusClass}">${escapeHtml(member.status)}</span>
        </div>
        <div class="staff-content">
          <strong>${escapeHtml(member.nome)}</strong>
          <span>${escapeHtml(member.cargo)} • ${escapeHtml(member.accessLevel || "Atendimento")}</span>
          <span>${escapeHtml(member.email || "Sem e-mail")}</span>
          <span>${escapeHtml(member.telefone || "Sem telefone")}</span>
        </div>
        ${editButton}
      </article>
    `;
  });
}

function closeStaffDialog() {
  const dialog = getStaffDialogElement();
  resetStaffForm();

  if (dialog && dialog.open) {
    dialog.close();
  }
}

function resetStaffDialog() {
  resetStaffForm();
}

function saveStaffFromDialog() {
  return saveStaffFromForm();
}

function setupStaffPhoneMask() {
  const phoneInput = document.getElementById("staffTelefone");
  if (!phoneInput || phoneInput.dataset.maskReady === "true") {
    return;
  }

  phoneInput.addEventListener("input", (event) => {
    event.target.value = formatPhoneValue(event.target.value);
  });

  phoneInput.dataset.maskReady = "true";
}

function formatPhoneValue(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits ? `(${digits}` : "";
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function togglePasswordVisibility(fieldId, button) {
  const input = document.getElementById(fieldId);
  if (!input || !button) {
    return;
  }

  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";
  setPasswordToggleState(input, button);
}

function setPasswordToggleState(input, button) {
  if (!input || !button) {
    return;
  }

  const icon = button.querySelector(".material-icons");
  const isPassword = input.type === "password";

  if (icon) {
    icon.textContent = isPassword ? "visibility" : "visibility_off";
  }

  button.setAttribute("aria-label", isPassword ? "Mostrar senha" : "Ocultar senha");
}
