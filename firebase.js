const firebaseConfig = {
  apiKey: "AIzaSyB0myXbhT3o0dvG_pEx2ocLV_8m5Vg9FE0",
  authDomain: "pedeai-61a74.firebaseapp.com",
  projectId: "pedeai-61a74",
  storageBucket: "pedeai-61a74.firebasestorage.app",
  messagingSenderId: "568742487501",
  appId: "1:568742487501:web:a8df2114614cf16db49084"
};

function getFirebaseApp() {
  if (typeof firebase === "undefined") {
    return null;
  }

  return firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
}

function getSecondaryFirebaseApp() {
  if (typeof firebase === "undefined") {
    return null;
  }

  const secondaryName = "pedeai-secondary-auth";
  const existing = firebase.apps.find((app) => app.name === secondaryName);
  return existing || firebase.initializeApp(firebaseConfig, secondaryName);
}

function getBootstrapDocumentReference(db) {
  return db.collection("app_meta").doc("bootstrap");
}

function getAccessProvisionError(error) {
  const code = error?.code;

  if (code === "auth/email-already-in-use") {
    return new Error("Ja existe um usuario com esse e-mail de acesso.");
  }

  if (code === "auth/weak-password") {
    return new Error("A senha inicial precisa ter pelo menos 6 caracteres.");
  }

  return new Error("Nao foi possivel criar o acesso do colaborador no Firebase Auth.");
}

function createUnavailableAuthService() {
  const unavailableError = () => new Error("Firebase Auth nao esta disponivel.");

  return {
    isConfigured: false,
    getCurrentUser() {
      return null;
    },
    onAuthStateChanged(callback) {
      if (typeof callback === "function") {
        callback(null);
      }

      return () => {};
    },
    async login() {
      throw unavailableError();
    },
    async logout() {
      throw unavailableError();
    }
  };
}

function createFirebaseAuthService() {
  if (typeof firebase === "undefined") {
    return createUnavailableAuthService();
  }

  const app = getFirebaseApp();
  const auth = firebase.auth(app);

  return {
    isConfigured: true,
    getCurrentUser() {
      return auth.currentUser;
    },
    onAuthStateChanged(callback) {
      return auth.onAuthStateChanged(callback);
    },
    async login(email, password) {
      const credential = await auth.signInWithEmailAndPassword(email, password);
      return credential.user;
    },
    async logout() {
      await auth.signOut();
    }
  };
}

function createUnavailableCollaboratorService() {
  const unavailableError = () => new Error("Firebase Firestore nao esta disponivel.");

  return {
    isConfigured: false,
    async list() {
      throw unavailableError();
    },
    async save() {
      throw unavailableError();
    },
    subscribe() {
      return () => {};
    },
    async getProfile() {
      return null;
    },
    async getOnboardingState() {
      return {
        needsOnboarding: false,
        profile: null,
        isFirstUser: false,
        email: ""
      };
    },
    async saveOwnProfile() {
      throw unavailableError();
    }
  };
}

function createUnavailableCatalogService() {
  const unavailableError = () => new Error("Firebase Firestore nao esta disponivel.");

  return {
    isConfigured: false,
    async list() {
      throw unavailableError();
    },
    subscribe() {
      return () => {};
    },
    async save() {
      throw unavailableError();
    },
    async remove() {
      throw unavailableError();
    }
  };
}

function createUnavailableOrderService() {
  const unavailableError = () => new Error("Firebase Firestore nao esta disponivel.");

  return {
    isConfigured: false,
    async list() {
      throw unavailableError();
    },
    subscribe() {
      return () => {};
    },
    async save() {
      throw unavailableError();
    }
  };
}

function normalizeCollaboratorSnapshot(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    nome: data.nome || "",
    email: data.email || "",
    telefone: data.telefone || "",
    cargo: data.cargo || "",
    accessLevel: data.accessLevel || "Atendimento",
    status: data.status || "Ativo",
    uid: data.uid || ""
  };
}

function getDefaultCollaboratorState(collaborator = {}) {
  return {
    nome: collaborator.nome || "",
    email: collaborator.email || "",
    telefone: collaborator.telefone || "",
    cargo: collaborator.cargo || "",
    accessLevel: collaborator.accessLevel || "Atendimento",
    status: collaborator.status || "Ativo"
  };
}

function normalizeCatalogSnapshot(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    nome: data.nome || "",
    descricao: data.descricao || "",
    preco: data.preco || "",
    imagem: data.imagem || PRODUCT_IMAGE_FALLBACK
  };
}

function getDefaultCatalogItemState(item = {}) {
  return {
    nome: item.nome || "",
    descricao: item.descricao || "",
    preco: item.preco || "",
    imagem: item.imagem || PRODUCT_IMAGE_FALLBACK
  };
}

function normalizeOrderSnapshot(doc) {
  const data = doc.data() || {};
  return {
    id: data.id || doc.id,
    cliente: data.cliente || "Cliente nao informado",
    canal: data.canal || "Canal nao informado",
    contato: data.contato || "-",
    observacoes: data.observacoes || "-",
    itens: Array.isArray(data.itens) ? data.itens : [],
    total: typeof data.total === "number" ? data.total : 0,
    status: data.status || "Registrado",
    criadoEm: data.criadoEm || "",
    criadoPorUid: data.criadoPorUid || "",
    mesa: data.mesa || "",
    tipoAtendimento: data.tipoAtendimento || "",
    formaPagamento: data.formaPagamento || "",
    valorRecebido: typeof data.valorRecebido === "number" ? data.valorRecebido : 0,
    troco: typeof data.troco === "number" ? data.troco : 0,
    createdAt: data.createdAt || null
  };
}

function createFirebaseCollaboratorService() {
  if (typeof firebase === "undefined" || typeof firebase.firestore !== "function") {
    return createUnavailableCollaboratorService();
  }

  const app = getFirebaseApp();
  const db = firebase.firestore(app);
  const collection = db.collection("colaboradores");
  const bootstrapDoc = getBootstrapDocumentReference(db);

  return {
    isConfigured: true,
    async list() {
      const snapshot = await collection.orderBy("nome").get();
      return snapshot.docs.map(normalizeCollaboratorSnapshot);
    },
    subscribe(callback, onError) {
      return collection.orderBy("nome").onSnapshot(
        (snapshot) => {
          callback(snapshot.docs.map(normalizeCollaboratorSnapshot));
        },
        (error) => {
          if (typeof onError === "function") {
            onError(error);
          }
        }
      );
    },
    async save(collaborator) {
      let resolvedUid = collaborator.uid || "";

      // Creating another auth user from the client must happen through a
      // secondary app so the current admin session remains logged in.
      if (!resolvedUid && collaborator.email && collaborator.initialPassword) {
        try {
          const secondaryApp = getSecondaryFirebaseApp();
          const secondaryAuth = firebase.auth(secondaryApp);
          const credential = await secondaryAuth.createUserWithEmailAndPassword(
            collaborator.email,
            collaborator.initialPassword
          );

          resolvedUid = credential.user?.uid || "";
          await secondaryAuth.signOut();
        } catch (error) {
          throw getAccessProvisionError(error);
        }
      }

      const docId = collaborator.id || resolvedUid || collection.doc().id;
      const now = firebase.firestore.FieldValue.serverTimestamp();
      const payload = getDefaultCollaboratorState(collaborator);

      await collection.doc(docId).set(
        {
          nome: payload.nome,
          email: payload.email,
          telefone: payload.telefone,
          cargo: payload.cargo,
          accessLevel: payload.accessLevel,
          status: payload.status,
          uid: resolvedUid,
          updatedAt: now,
          createdAt: now
        },
        { merge: true }
      );

      return {
        id: docId,
        nome: payload.nome,
        email: payload.email,
        telefone: payload.telefone,
        cargo: payload.cargo,
        accessLevel: payload.accessLevel,
        status: payload.status,
        uid: resolvedUid
      };
    },
    async getProfile(user) {
      if (!user) {
        return null;
      }

      const byUid = await collection.doc(user.uid).get();
      if (byUid.exists) {
        return normalizeCollaboratorSnapshot(byUid);
      }

      if (!user.email) {
        return null;
      }

      try {
        const byEmail = await collection.where("email", "==", user.email).limit(1).get();
        if (byEmail.empty) {
          return null;
        }

        return normalizeCollaboratorSnapshot(byEmail.docs[0]);
      } catch (error) {
        return null;
      }
    },
    async getOnboardingState(user) {
      if (!user) {
        return {
          needsOnboarding: false,
          profile: null,
          isFirstUser: false,
          email: ""
        };
      }

      const profile = await this.getProfile(user);
      if (profile) {
        return {
          needsOnboarding: false,
          profile,
          isFirstUser: false,
          email: profile.email || user.email || ""
        };
      }

      let isFirstUser = false;

      try {
        const bootstrapSnapshot = await bootstrapDoc.get();
        isFirstUser = !bootstrapSnapshot.exists;
      } catch (error) {
        isFirstUser = false;
      }

      return {
        needsOnboarding: true,
        profile: null,
        isFirstUser,
        email: user.email || ""
      };
    },
    async saveOwnProfile(user, collaborator) {
      if (!user?.uid) {
        throw new Error("Nao foi possivel identificar o usuario autenticado.");
      }

      const existingProfile = await this.getProfile(user);
      const onboardingState = await this.getOnboardingState(user);
      const now = firebase.firestore.FieldValue.serverTimestamp();
      const currentData = existingProfile || {};
      const payload = getDefaultCollaboratorState({
        ...currentData,
        ...collaborator,
        email: user.email || collaborator.email || currentData.email || ""
      });

      if (!payload.email) {
        throw new Error("O usuario autenticado precisa ter um e-mail valido.");
      }

      if (onboardingState.isFirstUser) {
        payload.accessLevel = "Gerente";
        payload.status = "Ativo";
      } else {
        payload.accessLevel = currentData.accessLevel || collaborator.accessLevel || "Atendimento";
        payload.status = currentData.status || collaborator.status || "Ativo";
      }

      const batch = db.batch();
      const userDoc = collection.doc(user.uid);

      batch.set(
        userDoc,
        {
          nome: payload.nome,
          email: payload.email,
          telefone: payload.telefone,
          cargo: payload.cargo,
          accessLevel: payload.accessLevel,
          status: payload.status,
          uid: user.uid,
          updatedAt: now,
          createdAt: currentData.createdAt || now
        },
        { merge: true }
      );

      if (onboardingState.isFirstUser) {
        batch.set(
          bootstrapDoc,
          {
            hasCollaborators: true,
            firstUserUid: user.uid,
            createdAt: now,
            updatedAt: now
          },
          { merge: true }
        );
      }

      await batch.commit();

      return {
        id: user.uid,
        nome: payload.nome,
        email: payload.email,
        telefone: payload.telefone,
        cargo: payload.cargo,
        accessLevel: payload.accessLevel,
        status: payload.status,
        uid: user.uid
      };
    }
  };
}

function createFirebaseCatalogService() {
  if (typeof firebase === "undefined" || typeof firebase.firestore !== "function") {
    return createUnavailableCatalogService();
  }

  const app = getFirebaseApp();
  const db = firebase.firestore(app);
  const collection = db.collection("produtos");

  return {
    isConfigured: true,
    async list() {
      const snapshot = await collection.orderBy("nome").get();
      return snapshot.docs.map(normalizeCatalogSnapshot);
    },
    subscribe(callback, onError) {
      return collection.orderBy("nome").onSnapshot(
        (snapshot) => {
          callback(snapshot.docs.map(normalizeCatalogSnapshot));
        },
        (error) => {
          if (typeof onError === "function") {
            onError(error);
          }
        }
      );
    },
    async save(item) {
      const docId = item.id || collection.doc().id;
      const now = firebase.firestore.FieldValue.serverTimestamp();
      const payload = getDefaultCatalogItemState(item);

      await collection.doc(docId).set(
        {
          nome: payload.nome,
          descricao: payload.descricao,
          preco: payload.preco,
          imagem: payload.imagem,
          updatedAt: now,
          createdAt: now
        },
        { merge: true }
      );

      return {
        id: docId,
        ...payload
      };
    },
    async remove(itemId) {
      if (!itemId) {
        throw new Error("Nao foi possivel identificar o item.");
      }

      await collection.doc(itemId).delete();
    }
  };
}

function createFirebaseOrderService() {
  if (typeof firebase === "undefined" || typeof firebase.firestore !== "function") {
    return createUnavailableOrderService();
  }

  const app = getFirebaseApp();
  const db = firebase.firestore(app);
  const collection = db.collection("pedidos");

  return {
    isConfigured: true,
    async list() {
      const snapshot = await collection.orderBy("createdAt", "desc").get();
      return snapshot.docs.map(normalizeOrderSnapshot);
    },
    subscribe(callback, onError) {
      return collection.orderBy("createdAt", "desc").onSnapshot(
        (snapshot) => {
          callback(snapshot.docs.map(normalizeOrderSnapshot));
        },
        (error) => {
          if (typeof onError === "function") {
            onError(error);
          }
        }
      );
    },
    async save(order) {
      const now = firebase.firestore.FieldValue.serverTimestamp();
      const docId = order.id || `PED-${Date.now()}`;

      await collection.doc(docId).set(
        {
          id: docId,
          cliente: order.cliente || "Cliente nao informado",
          canal: order.canal || "Canal nao informado",
          contato: order.contato || "-",
          observacoes: order.observacoes || "-",
          itens: Array.isArray(order.itens) ? order.itens : [],
          total: typeof order.total === "number" ? order.total : 0,
          status: order.status || "Registrado",
          criadoEm: order.criadoEm || "",
          criadoPorUid: order.criadoPorUid || "",
          mesa: order.mesa || "",
          tipoAtendimento: order.tipoAtendimento || "",
          formaPagamento: order.formaPagamento || "",
          valorRecebido: typeof order.valorRecebido === "number" ? order.valorRecebido : 0,
          troco: typeof order.troco === "number" ? order.troco : 0,
          createdAt: now,
          updatedAt: now
        },
        { merge: true }
      );

      return {
        ...order,
        id: docId
      };
    }
  };
}

window.authService = createFirebaseAuthService();
window.collaboratorService = createFirebaseCollaboratorService();
window.catalogService = createFirebaseCatalogService();
window.orderService = createFirebaseOrderService();
