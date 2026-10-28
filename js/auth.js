/* Login do portal: Firebase Authentication (e-mail e senha), projeto level-up-c3f9b.
   Entra no portal: os administradores (ADMINS) e quem eles convidaram (documento em hanseat_membros/{e-mail}),
   sempre com o e-mail confirmado. As regras do Firestore só deixam os administradores gravar convites.
   A configuração abaixo é pública por natureza (identifica o projeto, não dá acesso a nada). */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, signOut, setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyCKCIsfFUfPUPTBKwVuYQrVHVgolc2CtsA",
  authDomain: "level-up-c3f9b.firebaseapp.com",
  projectId: "level-up-c3f9b",
  appId: "1:162788989046:web:8ab0d9ae8c3197a1352757"
});
const auth = getAuth(app);
const db = getFirestore(app);
auth.languageCode = "pt";
setPersistence(auth, browserLocalPersistence).catch(() => {});

// Administradores: os únicos que convidam (a mesma lista está nas regras do Firestore)
const ADMINS = {
  "nicholas.steiner@hanseat.com.br": "Nicholas Steiner",
  "apollo.becker@hanseat.com.br": "Apollo Costa Becker"
};
const COL = "hanseat_membros";
const norm = (e) => String(e || "").trim().toLowerCase();

const MSG = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "Esse e-mail ainda não tem senha. Use “Primeiro acesso”.",
  "auth/email-already-in-use": "Esse e-mail já tem senha. Use “Entrar” ou “Esqueci a senha”.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/invalid-email": "E-mail inválido.",
  "auth/too-many-requests": "Muitas tentativas. Espere alguns minutos e tente de novo.",
  "auth/network-request-failed": "Sem conexão com o servidor de login.",
  "permission-denied": "Sem permissão para isso."
};
const traduz = (e) => MSG[e && e.code] || ("Não foi possível concluir: " + ((e && e.message) || e));

// Convite do e-mail (null se não foi convidado). Administradores não precisam de convite.
async function convite(email) {
  if (ADMINS[email]) return { nome: ADMINS[email], admin: true };
  const s = await getDoc(doc(db, COL, email));
  return s.exists() ? s.data() : null;
}

async function publicar(user) {
  let u = null, pendente = null;
  if (user) {
    const email = norm(user.email);
    let c = null;
    try { c = await convite(email); } catch (e) { c = null; }
    if (!c) pendente = { tipo: "sem-acesso", email };
    else if (!user.emailVerified) pendente = { tipo: "verificar", email };
    else u = { nome: c.nome || email, email, admin: !!ADMINS[email] };
  }
  window.HanseatUsuario = u;
  window.HanseatPendente = pendente;
  window.dispatchEvent(new Event("hanseat:auth"));
}
onAuthStateChanged(auth, publicar);

window.HanseatAuth = {
  async entrar(email, senha) {
    try { await signInWithEmailAndPassword(auth, norm(email), senha); return null; } catch (e) { return traduz(e); }
  },
  // Cria a senha; se o e-mail não tiver convite, a conta recém-criada é apagada na hora
  async primeiroAcesso(email, senha) {
    email = norm(email);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      let c = null;
      try { c = await convite(email); } catch (e) { c = null; }
      if (!c) {
        await cred.user.delete().catch(() => signOut(auth));
        return "Esse e-mail não foi convidado. Peça o convite a um administrador do Hanseat.";
      }
      await sendEmailVerification(cred.user);
      return null;
    } catch (e) { return traduz(e); }
  },
  async esqueci(email) {
    try { await sendPasswordResetEmail(auth, norm(email)); return null; } catch (e) { return traduz(e); }
  },
  async reenviar() {
    try { if (auth.currentUser) await sendEmailVerification(auth.currentUser); return null; } catch (e) { return traduz(e); }
  },
  async jaConfirmei() {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    await publicar(auth.currentUser);
  },
  sair() { return signOut(auth); },

  /* ---- convites (só administradores) ---- */
  async listarConvites() {
    const s = await getDocs(collection(db, COL));
    return s.docs.map((d) => Object.assign({ email: d.id }, d.data()));
  },
  async convidar(nome, email, area) {
    email = norm(email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "E-mail inválido.";
    if (ADMINS[email]) return "Esse e-mail já é administrador.";
    try {
      await setDoc(doc(db, COL, email), {
        nome: String(nome || "").trim(), area: area || "", convidadoPor: norm(auth.currentUser && auth.currentUser.email),
        criadoEm: serverTimestamp()
      });
      return null;
    } catch (e) { return traduz(e); }
  },
  async removerConvite(email) {
    try { await deleteDoc(doc(db, COL, norm(email))); return null; } catch (e) { return traduz(e); }
  }
};
window.dispatchEvent(new Event("hanseat:auth-pronto"));
