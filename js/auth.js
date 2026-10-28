/* Login do portal: Firebase Authentication (e-mail e senha), projeto level-up-c3f9b.
   Só entra quem está na lista ACESSO e já confirmou o e-mail (o link de confirmação chega na caixa @hanseat.com.br).
   A configuração abaixo é pública por natureza (identifica o projeto, não dá acesso a nada). */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, signOut, setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const app = initializeApp({
  apiKey: "AIzaSyCKCIsfFUfPUPTBKwVuYQrVHVgolc2CtsA",
  authDomain: "level-up-c3f9b.firebaseapp.com",
  projectId: "level-up-c3f9b",
  appId: "1:162788989046:web:8ab0d9ae8c3197a1352757"
});
const auth = getAuth(app);
auth.languageCode = "pt";
setPersistence(auth, browserLocalPersistence).catch(() => {});

// Quem pode entrar no portal
const ACESSO = {
  "nicholas.steiner@hanseat.com.br": "Nicholas Steiner",
  "apollo.becker@hanseat.com.br": "Apollo Costa Becker"
};
const norm = (e) => String(e || "").trim().toLowerCase();

const MSG = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "Esse e-mail ainda não tem senha. Use “Primeiro acesso”.",
  "auth/email-already-in-use": "Esse e-mail já tem senha. Use “Entrar” ou “Esqueci a senha”.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/invalid-email": "E-mail inválido.",
  "auth/too-many-requests": "Muitas tentativas. Espere alguns minutos e tente de novo.",
  "auth/network-request-failed": "Sem conexão com o servidor de login."
};
const traduz = (e) => MSG[e && e.code] || ("Não foi possível concluir: " + ((e && e.message) || e));

function publicar(user) {
  let u = null, pendente = null;
  if (user) {
    const email = norm(user.email);
    if (!ACESSO[email]) pendente = { tipo: "sem-acesso", email };
    else if (!user.emailVerified) pendente = { tipo: "verificar", email };
    else u = { nome: ACESSO[email], email };
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
  async primeiroAcesso(email, senha) {
    email = norm(email);
    if (!ACESSO[email]) return "Esse e-mail não está liberado para o portal.";
    try {
      const c = await createUserWithEmailAndPassword(auth, email, senha);
      await sendEmailVerification(c.user);
      return null;
    } catch (e) { return traduz(e); }
  },
  async esqueci(email) {
    email = norm(email);
    if (!ACESSO[email]) return "Esse e-mail não está liberado para o portal.";
    try { await sendPasswordResetEmail(auth, email); return null; } catch (e) { return traduz(e); }
  },
  async reenviar() {
    try { if (auth.currentUser) await sendEmailVerification(auth.currentUser); return null; } catch (e) { return traduz(e); }
  },
  async jaConfirmei() {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    publicar(auth.currentUser);
  },
  sair() { return signOut(auth); }
};
window.dispatchEvent(new Event("hanseat:auth-pronto"));
