(function(){
  var $ = function(id){ return document.getElementById(id); };
  var M = window.HanseatMercado;
  var MEMB = window.HANSEAT_MEMBROS || [];
  var app = $("app");
  var timer = null, contagem = null;

  /* ---------- utilidades ---------- */
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function n(v, casas){ return v == null || isNaN(v) ? "—" : Number(v).toLocaleString("pt-BR", {minimumFractionDigits:casas, maximumFractionDigits:casas}); }
  function brl(v, casas){ return v == null || isNaN(v) ? "—" : "R$ " + n(v, casas == null ? 2 : casas); }
  function pct(v){ return v == null || isNaN(v) ? "—" : (v > 0 ? "+" : "") + n(v, 2) + "%"; }
  function classeVar(v){ return v > 0 ? "alta" : v < 0 ? "baixa" : "neutra"; }
  function seta(v){ return v > 0 ? "▲" : v < 0 ? "▼" : "■"; }
  function dataBR(d){ return d ? d.toLocaleDateString("pt-BR") : "—"; }
  function iniciais(nome){ var p = nome.split(" "); return (p[0][0] + p[p.length - 1][0]).toUpperCase(); }
  function logo(arq, alt){
    return '<img class="logo-escuro" src="assets/' + arq + '.svg" alt="' + esc(alt) + '"><img class="logo-claro" src="assets/' + arq + '-claro.svg" alt="' + esc(alt) + '">';
  }
  function spark(serie, cor){
    if (!serie || serie.length < 2) return "";
    var w = 300, h = 48, vs = serie.map(function(p){ return p.v; });
    var mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs), amp = mx - mn || 1;
    var pts = vs.map(function(v, i){ return (i / (vs.length - 1) * w).toFixed(1) + "," + (h - 4 - (v - mn) / amp * (h - 8)).toFixed(1); });
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + cor + '" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>';
  }
  function parar(){ clearTimeout(timer); clearInterval(contagem); timer = contagem = null; }
  function agendar(fn, ms, idProx){
    parar();
    var em = Date.now() + ms;
    timer = setTimeout(fn, ms);
    var tick = function(){ var el = $(idProx); if (el) el.textContent = "próxima leitura em " + Math.max(0, Math.round((em - Date.now()) / 1000)) + "s"; };
    tick(); contagem = setInterval(tick, 1000);
  }

  /* ---------- sessão: quem está logado vem do js/auth.js (Firebase) ---------- */
  function usuario(){ return window.HanseatUsuario || null; }

  /* ---------- tema ---------- */
  function aplicarTema(t){ if (t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme"); }
  try { aplicarTema(localStorage.getItem("hanseat.tema")); } catch(e){}

  /* ---------- rotas ---------- */
  var AREAS = [
    {id:"administracao", nome:"Administração", logo:"administracao", simbolo:"simbolo-administracao", resumo:"Consultoria administrativa, processos, pessoas e o quadro de colaboradores do Hub."},
    {id:"economia", nome:"Economia", logo:"economia", simbolo:"simbolo-economia", resumo:"Consultoria financeira, indicadores do Banco Central e simulações de investimento."},
    {id:"desenvolvedores", nome:"Desenvolvedores", logo:"desenvolvedores", simbolo:"simbolo-desenvolvedores", resumo:"Sites, sistemas, automações e painéis de dados sob medida."},
    {id:"bolsa", nome:"Bolsa de Valores", logo:"bolsa", simbolo:"simbolo-bolsa", resumo:"Cotações reais da B3, dólar, euro e bitcoin, atualizados sozinhos."}
  ];
  var PAGINAS = {inicio:inicio, administracao:administracao, economia:economia, desenvolvedores:desenvolvedores, bolsa:bolsa, convites:convites};

  function rota(){
    parar();
    var u = usuario();
    var r = (location.hash.replace(/^#\/?/, "") || "inicio").split("?")[0];
    if (!PAGINAS[r] || (r === "convites" && !(u && u.admin))) r = "inicio";
    $("navConvites").classList.toggle("oculto", !(u && u.admin));
    document.body.classList.toggle("sem-sessao", !u);
    $("portal").classList.toggle("oculto", !u);
    $("login").classList.toggle("oculto", !!u);
    if (!u) { document.title = "Entrar · Hanseat"; return; }
    $("nomeUsuario").textContent = u.nome.split(" ")[0];
    $("avatarUsuario").textContent = iniciais(u.nome);
    Array.prototype.forEach.call(document.querySelectorAll(".nav a"), function(a){
      if (a.getAttribute("href") === "#/" + r) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    var area = AREAS.filter(function(a){ return a.id === r; })[0];
    document.title = (area ? area.nome + " · " : "") + "Hanseat";
    PAGINAS[r](u);
    window.scrollTo(0, 0);
  }

  function cabecalho(a, titulo, lead){
    return '<div class="cabecalho-area"><div><div class="logo-area">' + logo(a.logo, "Hanseat " + a.nome) + '</div>' +
      '<h1 style="margin-top:24px">' + titulo + '</h1><p class="lead">' + lead + '</p></div></div>';
  }

  /* ---------- Início ---------- */
  function inicio(u){
    app.innerHTML =
      '<div class="boas-vindas"><div class="card" style="display:flex;flex-direction:column;justify-content:center;padding:32px">' +
        '<span class="rotulo">Portal do membro</span><h1 style="margin-top:8px">Olá, ' + esc(u.nome.split(" ")[0]) + '.</h1>' +
        '<p class="lead">Hub Associativo de Negócios, Serviços, Empreendimentos, Autônomos e Trabalho. Escolha uma área para começar.</p></div>' +
        '<div class="selo-hero"><img src="assets/selo.svg" alt="Selo Hanseat"></div></div>' +
      '<span class="rotulo">Áreas</span><div class="grade g4" style="margin-top:12px">' +
        AREAS.map(function(a){
          return '<a class="area" href="#/' + a.id + '"><div class="faixa"><img src="assets/' + a.simbolo + '.svg" alt=""></div>' +
            '<div class="txt"><h3>' + a.nome + '</h3><p>' + a.resumo + '</p></div></a>';
        }).join("") + '</div>' +
      '<div class="secao"><span class="rotulo">Mercado agora</span><div class="grade g4" id="resumo">' +
        ["Dólar","Euro","Selic","PETR4"].map(function(t){ return '<div class="card kpi"><div class="rotulo">' + t + '</div><div class="valor num">…</div></div>'; }).join("") +
      '</div></div>';
    Promise.all([M.cambio().catch(function(){ return null; }), M.selic().catch(function(){ return null; }), M.acoes().catch(function(){ return null; })]).then(function(r){
      var c = r[0] || [], selic = r[1], a = (r[2] || []).filter(function(x){ return x.papel === "PETR4"; })[0];
      var kpi = function(rot, val, v, sub){
        return '<div class="card kpi"><div class="rotulo">' + rot + '</div><div class="valor num">' + val + '</div>' +
          (v != null ? '<span class="var ' + classeVar(v) + '">' + seta(v) + ' ' + pct(v) + '</span>' : '<span class="sub">' + (sub || "") + '</span>') + '</div>';
      };
      var resumo = $("resumo"); if (!resumo) return;
      resumo.innerHTML =
        kpi("Dólar", c[0] ? brl(c[0].valor, 4) : "—", c[0] && c[0].var) +
        kpi("Euro", c[1] ? brl(c[1].valor, 4) : "—", c[1] && c[1].var) +
        kpi("Selic meta", selic ? n(selic.v, 2) + "% a.a." : "—", null, selic ? "Banco Central" : "Banco Central fora do ar") +
        kpi("PETR4", a && !a.erro ? brl(a.preco) : "—", a && a.var);
    });
  }

  /* ---------- Administração ---------- */
  // Situação do membro: cotitular (dono da marca), em experiência, licença vencida, a renovar (até 60 dias) ou ativa
  var HOJE = new Date(); HOJE.setHours(12, 0, 0, 0);
  function dia(s){ return new Date(s + "T12:00"); }
  function situacao(m){
    if (m.papel === "Cotitular") return m.admin ? "Administrador(a) da marca" : "Cotitular";
    if (m.experiencia) return "Em experiência";
    var dias = Math.round((dia(m.licencaAte) - HOJE) / 864e5);
    if (dias < 0) return "Licença vencida";
    if (dias <= 60) return "Renovar em breve";
    return "Licença ativa";
  }
  function chipSit(s){ return /vencida/.test(s) ? "afastado" : /Renovar|experiência/.test(s) ? "ferias" : "ativo"; }
  function nomeDe(id){ var c = MEMB.filter(function(m){ return m.id === id; })[0]; return c ? c.nome : "—"; }

  function administracao(){
    var a = AREAS[0];
    var areas = AREAS.map(function(x){ return x.nome; });
    var situacoes = ["Administrador(a) da marca","Cotitular","Licença ativa","Renovar em breve","Em experiência","Licença vencida"];
    app.innerHTML = cabecalho(a, "Consultoria administrativa", "Membros da rede que organizam processos, rotinas e documentos de pequenos negócios e de outros profissionais independentes.") +
      '<div class="grade g3">' +
        servico("Processos e rotinas", "Mapeamento do fluxo atual, eliminação de retrabalho e manual de procedimentos do negócio do cliente.") +
        servico("Pessoas e departamento pessoal", "Apoio ao cliente que tem equipe: admissão, folha, férias e obrigações trabalhistas.") +
        servico("Contratos e documentos", "Modelos padronizados, controle de vigência e organização da documentação do negócio.") +
      '</div>' +
      '<div class="secao"><span class="rotulo">Membros da rede</span>' +
        '<p class="aviso" style="margin-bottom:16px">O Hanseat não tem funcionários. Os cotitulares são os donos da marca; os demais são profissionais independentes (autônomos, MEI ou com empresa própria), licenciados para usar a marca, que atendem e faturam em nome próprio. Dados fictícios, para demonstração do portal.</p>' +
        '<div class="grade g4" id="kpisMemb"></div>' +
        '<div class="grade g3" style="margin-top:16px"><div class="card"><h3>Por área</h3><div class="barras" id="barArea" style="margin-top:14px"></div></div>' +
          '<div class="card"><h3>Por forma de atuação</h3><div class="barras" id="barAtu" style="margin-top:14px"></div></div>' +
          '<div class="card"><h3>Licenciados por cotitular</h3><div class="barras" id="barInd" style="margin-top:14px"></div></div></div>' +
        '<div class="filtros" style="margin-top:24px">' +
          '<div class="campo"><label for="fBusca">Buscar</label><input type="search" id="fBusca" placeholder="Nome ou especialidade"></div>' +
          campoSel("fArea", "Área", areas) + campoSel("fAtu", "Atuação", ["Autônomo (CPF)","MEI","ME"]) + campoSel("fSit", "Situação", situacoes) +
        '</div>' +
        '<div class="tabela-box"><table><thead><tr><th>Nome</th><th>Especialidade</th><th>Área</th><th>Papel</th><th>Atuação</th><th>Cidade</th><th>Membro desde</th><th>Licença até</th><th>Situação</th></tr></thead><tbody id="tbMemb"></tbody></table></div>' +
        '<p class="rotulo" id="contMemb" style="margin-top:10px"></p>' +
      '</div>' +
      '<dialog id="ficha"></dialog>';

    var cot = MEMB.filter(function(m){ return m.papel === "Cotitular"; }), lic = MEMB.filter(function(m){ return m.papel !== "Cotitular"; });
    var exp = lic.filter(function(m){ return m.experiencia; }).length;
    var renovar = lic.filter(function(m){ var s = situacao(m); return s === "Renovar em breve" || s === "Licença vencida"; }).length;
    $("kpisMemb").innerHTML =
      kpiSimples("Membros", MEMB.length, cot.length + " cotitulares e " + lic.length + " licenciados") +
      kpiSimples("Cotitulares", cot.length, "donos da marca") +
      kpiSimples("Em experiência", exp, "período inicial do Regimento") +
      kpiSimples("Licenças a renovar", renovar, "vencidas ou vencendo em 60 dias");
    barras("barArea", contar(MEMB, "area"));
    barras("barAtu", contar(MEMB, "atuacao"));
    barras("barInd", contar(lic.map(function(m){ return {cot:nomeDe(m.indicadoPor).split(" ")[0]}; }), "cot"));

    function filtrar(){
      var b = $("fBusca").value.trim().toLowerCase(), ar = $("fArea").value, at = $("fAtu").value, si = $("fSit").value;
      var l = MEMB.filter(function(m){
        return (!ar || m.area === ar) && (!at || m.atuacao === at) && (!si || situacao(m) === si) &&
          (!b || (m.nome + " " + m.especialidade).toLowerCase().indexOf(b) >= 0);
      });
      $("tbMemb").innerHTML = l.map(function(m){
        var s = situacao(m);
        return '<tr class="clicavel" data-id="' + m.id + '" tabindex="0"><td><strong>' + esc(m.nome) + '</strong></td><td>' + esc(m.especialidade) +
          '</td><td>' + m.area + '</td><td>' + m.papel + '</td><td>' + m.atuacao + '</td><td>' + m.cidade + '</td><td class="num">' + dataBR(dia(m.desde)) +
          '</td><td class="num">' + (m.licencaAte ? dataBR(dia(m.licencaAte)) : "—") + '</td><td><span class="chip ' + chipSit(s) + '">' + s + '</span></td></tr>';
      }).join("") || '<tr><td colspan="9">Nenhum membro com esses filtros.</td></tr>';
      $("contMemb").textContent = l.length + " de " + MEMB.length + " membros";
    }
    ["fBusca","fArea","fAtu","fSit"].forEach(function(id){ $(id).addEventListener("input", filtrar); });
    $("tbMemb").addEventListener("click", function(e){ var tr = e.target.closest("tr[data-id]"); if (tr) ficha(tr.getAttribute("data-id")); });
    $("tbMemb").addEventListener("keydown", function(e){ if (e.key === "Enter") { var tr = e.target.closest("tr[data-id]"); if (tr) ficha(tr.getAttribute("data-id")); } });
    filtrar();
  }
  function servico(t, d){ return '<div class="card"><h3>' + t + '</h3><p style="color:var(--muted);margin:0">' + d + '</p></div>'; }
  function kpiSimples(rot, val, sub){ return '<div class="card kpi"><div class="rotulo">' + rot + '</div><div class="valor num">' + val + '</div><span class="sub">' + sub + '</span></div>'; }
  function campoSel(id, rot, ops){ return '<div class="campo"><label for="' + id + '">' + rot + '</label><select id="' + id + '"><option value="">Todas</option>' + ops.map(function(o){ return '<option>' + o + '</option>'; }).join("") + '</select></div>'; }
  function contar(lista, campo){ var c = {}; lista.forEach(function(f){ c[f[campo]] = (c[f[campo]] || 0) + 1; }); return Object.keys(c).map(function(k){ return [k, c[k]]; }).sort(function(a,b){ return b[1] - a[1]; }); }
  function barras(id, l){
    var mx = Math.max.apply(null, l.map(function(x){ return x[1]; }));
    $(id).innerHTML = l.map(function(x){
      return '<div class="barra"><span>' + x[0] + '</span><div class="trilho"><div class="cheio" style="width:' + (x[1] / mx * 100) + '%"></div></div><span class="num" style="text-align:right">' + x[1] + '</span></div>';
    }).join("");
  }
  function semAcento(t){ return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function ficha(id){
    var m = MEMB.filter(function(x){ return x.id === id; })[0]; if (!m) return;
    var desde = dia(m.desde), meses = Math.max(0, Math.floor((HOJE - desde) / (30.44 * 864e5)));
    var tempo = meses >= 12 ? Math.floor(meses / 12) + " ano(s) e " + (meses % 12) + " mês(es)" : meses + " mês(es)";
    var p = m.nome.split(" "), email = semAcento(p[0]) + "." + semAcento(p[p.length - 1]) + "@hanseat.com.br", s = situacao(m);
    var linhas = '<dt>Papel</dt><dd>' + (m.papel === "Cotitular" ? "Cotitular da marca" + (m.admin ? " · Administrador(a)" : "") : "Membro licenciado") + '</dd>' +
      '<dt>Área</dt><dd>' + m.area + '</dd><dt>Atua como</dt><dd>' + m.atuacao + '</dd><dt>Cidade</dt><dd>' + m.cidade + '</dd>' +
      '<dt>Na rede desde</dt><dd class="num">' + dataBR(desde) + ' (' + tempo + ')</dd>';
    if (m.papel !== "Cotitular") linhas +=
      '<dt>Licença válida até</dt><dd class="num">' + dataBR(dia(m.licencaAte)) + '</dd>' +
      '<dt>Indicado por</dt><dd>' + esc(nomeDe(m.indicadoPor)) + ' <span style="color:var(--muted)">(recebe o royalty)</span></dd>';
    linhas += '<dt>E-mail</dt><dd>' + email + '</dd><dt>Situação</dt><dd><span class="chip ' + chipSit(s) + '">' + s + '</span></dd>';
    var d = $("ficha");
    d.innerHTML = '<div class="ficha-topo"><div class="avatar">' + iniciais(m.nome) + '</div><div><div style="font-size:20px;font-weight:600">' + esc(m.nome) + '</div><div>' + esc(m.especialidade) + '</div></div></div>' +
      '<div class="ficha-corpo"><dl>' + linhas + '</dl><form method="dialog"><button class="btn">Fechar</button></form></div>';
    d.showModal();
  }

  /* ---------- Economia ---------- */
  function economia(){
    var a = AREAS[1];
    app.innerHTML = cabecalho(a, "Consultoria financeira", "Planejamento, fluxo de caixa e decisões de investimento com base nos números oficiais do Banco Central.") +
      '<div class="grade g4" id="indic">' + ["Selic meta","CDI","IPCA 12 meses","Dólar"].map(function(t, k){
        return '<div class="card kpi" id="ind' + k + '"><div class="rotulo">' + t + '</div><div class="valor">…</div><span class="sub">consultando…</span></div>'; }).join("") + '</div>' +
      '<p class="rotulo" style="margin-top:10px">Fonte: Banco Central do Brasil (SGS) · Dólar: AwesomeAPI</p>' +
      '<div class="grade g2 secao">' +
        '<div class="card"><h2>Simulador de investimento</h2><p style="color:var(--muted)">Juros compostos mês a mês, sem imposto de renda.</p>' +
          '<div class="grade g2" style="gap:12px">' +
            '<div class="campo"><label for="sIni">Valor inicial (R$)</label><input id="sIni" type="number" min="0" step="100" value="10000"></div>' +
            '<div class="campo"><label for="sAp">Aporte mensal (R$)</label><input id="sAp" type="number" min="0" step="50" value="500"></div>' +
            '<div class="campo"><label for="sMes">Prazo (meses)</label><input id="sMes" type="number" min="1" max="600" value="24"></div>' +
            '<div class="campo"><label for="sTx">Taxa (% ao ano)</label><input id="sTx" type="number" min="0" step="0.05" value="13.65"></div>' +
          '</div><p class="sub" id="sTxObs" style="color:var(--muted);font-size:14px;margin-top:8px"></p></div>' +
        '<div class="card"><h2>Resultado</h2><div class="grade g2" style="gap:12px;margin-top:12px" id="sRes"></div>' +
          '<div id="sGraf" style="margin-top:16px"></div></div>' +
      '</div>' +
      '<div class="secao"><span class="rotulo">Como a consultoria funciona</span><ol class="passos card">' +
        '<li><div><h3>Diagnóstico</h3><p style="margin:0;color:var(--muted)">Levantamento de receitas, despesas, dívidas e reservas.</p></div></li>' +
        '<li><div><h3>Plano</h3><p style="margin:0;color:var(--muted)">Orçamento mensal, metas e a reserva de emergência adequada.</p></div></li>' +
        '<li><div><h3>Acompanhamento</h3><p style="margin:0;color:var(--muted)">Revisão mensal dos números e ajuste do plano com o membro.</p></div></li>' +
      '</ol></div>';

    var cdi = 13.65;
    function simular(){
      var ini = +$("sIni").value || 0, ap = +$("sAp").value || 0, m = Math.min(600, Math.max(1, +$("sMes").value || 1)), tx = +$("sTx").value || 0;
      var im = Math.pow(1 + tx / 100, 1 / 12) - 1, s = ini, serie = [{t:0, v:s}];
      for (var k = 1; k <= m; k++) { s = s * (1 + im) + ap; serie.push({t:k, v:s}); }
      var investido = ini + ap * m;
      $("sRes").innerHTML = kpiSimples("Total investido", brl(investido), m + " meses") + kpiSimples("Valor final", brl(s), "rendimento de " + brl(s - investido));
      $("sGraf").innerHTML = spark(serie, "var(--cobre)");
    }
    ["sIni","sAp","sMes","sTx"].forEach(function(id){ $(id).addEventListener("input", simular); });
    simular();

    // cada cartão se preenche sozinho quando a sua fonte responde (saiu da página antes? não faz nada)
    function preencher(k, promessa, html){
      promessa.then(function(v){ var el = $("ind" + k); if (el) el.outerHTML = html(v); })
        .catch(function(e){ var el = $("ind" + k); if (el) el.querySelector(".sub").textContent = "indisponível agora: " + e.message; });
    }
    preencher(0, M.selic(), function(s){ return kpiSimples("Selic meta", n(s.v, 2) + "%", "ao ano, vigente desde o último Copom"); });
    preencher(1, M.cdi().then(function(c){
      cdi = c.v;
      if ($("sTx")) { $("sTx").value = c.v.toFixed(2); $("sTxObs").textContent = "Taxa sugerida: CDI de " + n(c.v, 2) + "% a.a. em " + dataBR(c.data) + "."; simular(); }
      return c;
    }), function(c){ return kpiSimples("CDI", n(c.v, 2) + "%", "ao ano, em " + dataBR(c.data)); });
    preencher(2, M.ipca(), function(i){
      return '<div class="card kpi"><div class="rotulo">IPCA 12 meses</div><div class="valor num">' + n(i.atual.v, 2) + '%</div><span class="sub">até ' +
        i.atual.data.toLocaleDateString("pt-BR", {month:"long", year:"numeric"}) + '</span>' + spark(i.serie, "var(--tijolo)") + '</div>';
    });
    preencher(3, M.cambio(), function(c){
      return kpiSimples("Dólar", brl(c[0].valor, 4), '<span class="var ' + classeVar(c[0].var) + '">' + seta(c[0].var) + " " + pct(c[0].var) + '</span> hoje');
    });
  }

  /* ---------- Convites (só administradores) ---------- */
  function convites(u){
    app.innerHTML =
      '<span class="rotulo">Acesso ao portal</span><h1 style="margin-top:8px">Convites</h1>' +
      '<p class="lead">Só quem for convidado aqui consegue criar senha no portal. A pessoa entra em hanseat.com.br, usa "Primeiro acesso" com o e-mail convidado e confirma pelo link que chega na caixa dela.</p>' +
      '<form class="card" id="fConv" style="margin-top:20px"><h3>Convidar membro</h3>' +
        '<div class="filtros" style="margin:12px 0 0">' +
          '<div class="campo" style="flex:1 1 220px"><label for="cNome">Nome</label><input id="cNome" required></div>' +
          '<div class="campo" style="flex:1 1 260px"><label for="cEmail">E-mail</label><input id="cEmail" type="email" required placeholder="pessoa@exemplo.com"></div>' +
          campoSel("cArea", "Área", AREAS.map(function(x){ return x.nome; })).replace('<option value="">Todas</option>', '<option value="">—</option>') +
          '<button class="btn primario" type="submit">Convidar</button>' +
        '</div><p class="aviso" id="cMsg" role="status" aria-live="polite" style="margin-top:12px">Administradores: Nicholas e Apollo. Eles não precisam de convite.</p></form>' +
      '<div class="secao"><span class="rotulo">Convidados</span><div class="tabela-box"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Área</th><th>Convidado por</th><th>Data</th><th></th></tr></thead>' +
        '<tbody id="tbConv"><tr><td colspan="6">Carregando…</td></tr></tbody></table></div></div>';

    function aviso(t, erro){ var m = $("cMsg"); if (m) { m.textContent = t; m.style.color = erro ? "var(--baixa)" : ""; } }
    function carregar(){
      HanseatAuth.listarConvites().then(function(l){
        if (!$("tbConv")) return;
        l.sort(function(a, b){ return (a.nome || "").localeCompare(b.nome || ""); });
        $("tbConv").innerHTML = l.map(function(c){
          var data = c.criadoEm && c.criadoEm.toDate ? dataBR(c.criadoEm.toDate()) : "—";
          return '<tr><td><strong>' + esc(c.nome) + '</strong></td><td>' + esc(c.email) + '</td><td>' + esc(c.area || "—") + '</td><td>' + esc((c.convidadoPor || "").split("@")[0]) +
            '</td><td class="num">' + data + '</td><td><button class="btn leve" data-remover="' + esc(c.email) + '">Remover</button></td></tr>';
        }).join("") || '<tr><td colspan="6">Ninguém convidado ainda.</td></tr>';
      }).catch(function(e){ if ($("tbConv")) $("tbConv").innerHTML = '<tr><td colspan="6" style="color:var(--baixa)">Não consegui ler os convites: ' + esc(e.message) + '</td></tr>'; });
    }
    $("fConv").addEventListener("submit", function(e){
      e.preventDefault();
      var nome = $("cNome").value, email = $("cEmail").value.trim();
      HanseatAuth.convidar(nome, email, $("cArea").value).then(function(erro){
        if (erro) return aviso(erro, true);
        aviso(nome + " foi convidado(a). Avise a pessoa para entrar em hanseat.com.br e usar “Primeiro acesso” com " + email + ".");
        $("fConv").reset(); carregar();
      });
    });
    $("tbConv").addEventListener("click", function(e){
      var b = e.target.closest("[data-remover]"); if (!b) return;
      var email = b.getAttribute("data-remover");
      if (!confirm("Remover o convite de " + email + "? A pessoa perde o acesso ao portal.")) return;
      HanseatAuth.removerConvite(email).then(function(erro){ if (erro) aviso(erro, true); else carregar(); });
    });
    carregar();
  }

  /* ---------- Desenvolvedores ---------- */
  function desenvolvedores(){
    var a = AREAS[2];
    app.innerHTML = cabecalho(a, "Desenvolvimento sob medida", "Do site institucional ao sistema interno: desenvolvedores independentes da rede constroem, publicam e mantêm.") +
      '<div class="grade g4">' +
        servico("Sites e portais", "Sites institucionais e portais com área do cliente, publicados com domínio próprio.") +
        servico("Automações", "Rotinas que hoje são manuais: conciliações, planilhas, lançamentos e relatórios.") +
        servico("Painéis de dados", "Indicadores atualizados sozinhos a partir do sistema que a empresa já usa.") +
        servico("Integrações", "Ligação entre sistemas, bancos e APIs públicas, como as cotações deste portal.") +
      '</div>' +
      '<div class="grade g2 secao">' +
        '<div><span class="rotulo">Como trabalhamos</span><ol class="passos card" style="margin-top:12px">' +
          '<li><div><h3>Conversa</h3><p style="margin:0;color:var(--muted)">Entendemos o problema e o que já existe hoje.</p></div></li>' +
          '<li><div><h3>Protótipo</h3><p style="margin:0;color:var(--muted)">Uma primeira versão navegável em poucos dias.</p></div></li>' +
          '<li><div><h3>Entrega</h3><p style="margin:0;color:var(--muted)">Publicação, treinamento e documentação.</p></div></li>' +
          '<li><div><h3>Manutenção</h3><p style="margin:0;color:var(--muted)">Ajustes e evolução contínua com o membro.</p></div></li>' +
        '</ol></div>' +
        '<div><span class="rotulo">Exemplo ao vivo</span><div class="card" style="margin-top:12px"><h3>Cotações em tempo real</h3>' +
          '<p style="color:var(--muted)">A área de Bolsa de Valores deste portal lê a B3, o câmbio e o Banco Central direto do navegador e se atualiza sozinha, no mesmo modelo de uma apuração eleitoral ao vivo.</p>' +
          '<a class="btn" href="#/bolsa">Ver a Bolsa</a></div>' +
          '<div class="card" style="margin-top:16px"><h3>Falar com um desenvolvedor</h3><p style="color:var(--muted)">Conte o que precisa e indicamos o membro da rede com o perfil certo. A proposta e o contrato são feitos diretamente com ele.</p>' +
          '<a class="btn primario" href="mailto:contato@hanseat.com.br?subject=Projeto%20-%20Desenvolvedores%20Hanseat">Enviar e-mail</a></div></div>' +
      '</div>';
  }

  /* ---------- Bolsa de Valores ---------- */
  function bolsa(){
    var a = AREAS[3];
    app.innerHTML = cabecalho(a, "Investimentos", "Cotações reais da B3 e do câmbio, lidas direto das fontes e atualizadas sozinhas enquanto a página estiver aberta.") +
      '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:20px">' +
        '<div class="status parado" id="status"><span class="pt"></span><span id="stTexto">Conectando…</span><span id="stProx"></span></div>' +
        '<button class="btn leve" id="btAtualizar">Atualizar agora</button></div>' +
      '<span class="rotulo">Câmbio</span><div class="grade g4" id="cambio" style="margin-top:12px"></div>' +
      '<div class="secao"><span class="rotulo">Ações · último mês</span><div class="tabela-box" style="margin-top:12px"><table><thead><tr>' +
        '<th>Papel</th><th>Empresa</th><th class="r">Preço</th><th class="r">Dia</th><th class="r">Mín.</th><th class="r">Máx.</th><th class="r">Volume</th><th style="min-width:160px">30 dias</th></tr></thead><tbody id="tbAcoes"><tr><td colspan="8">Carregando…</td></tr></tbody></table></div>' +
        '<p class="rotulo" style="margin-top:10px">Fontes: B3 via brapi.dev · Câmbio: AwesomeAPI · cotações podem ter até 15 min de atraso</p></div>' +
      '<div class="secao"><div class="card"><h3>Mais papéis e o Ibovespa</h3>' +
        '<p style="color:var(--muted)">Sem chave a fonte libera só PETR4, VALE3, ITUB4 e MGLU3. Com uma chave gratuita da <a href="https://brapi.dev/dashboard" target="_blank" rel="noopener">brapi.dev</a>, a página mostra também o Ibovespa e outros papéis. A chave fica salva só neste navegador.</p>' +
        '<form id="fChave" class="filtros" style="margin:0"><div class="campo" style="flex:1"><label for="chave">Chave da brapi</label><input id="chave" autocomplete="off" placeholder="cole a chave aqui"></div>' +
        '<button class="btn" type="submit">Salvar</button><button class="btn leve" type="button" id="btLimpa">Remover</button></form></div></div>';

    $("chave").value = M.chave();
    $("fChave").addEventListener("submit", function(e){ e.preventDefault(); M.chave($("chave").value.trim()); atualizar(); });
    $("btLimpa").addEventListener("click", function(){ M.chave(""); $("chave").value = ""; atualizar(); });
    $("btAtualizar").addEventListener("click", function(){ atualizar(); });

    var usd30 = null;
    function atualizar(){
      parar();
      var st = $("status"); if (!st) return;
      $("stTexto").textContent = "Lendo as cotações…"; $("stProx").textContent = "";
      var pHist = usd30 ? Promise.resolve(usd30) : M.historicoMoeda("USD-BRL", 30).then(function(h){ usd30 = h; return h; }).catch(function(){ return null; });
      Promise.all([M.cambio(), M.acoes(), pHist]).then(function(r){
        if (!$("status")) return;
        desenharCambio(r[0], r[2]); desenharAcoes(r[1]);
        var aberto = M.pregaoAberto();
        st.className = "status" + (aberto ? "" : " parado");
        $("stTexto").textContent = (aberto ? "Pregão aberto · " : "Pregão fechado · ") + "lido às " + new Date().toLocaleTimeString("pt-BR") + " · ";
        agendar(atualizar, aberto ? 60000 : 300000, "stProx");
      }).catch(function(e){
        if (!$("status")) return;
        st.className = "status erro";
        $("stTexto").textContent = "Não consegui ler as cotações (" + e.message + "). Tento de novo sozinho · ";
        agendar(atualizar, 60000, "stProx");
      });
    }
    function desenharCambio(c, hist){
      $("cambio").innerHTML = c.map(function(x, i){
        var casas = x.codigo === "BTC" ? 0 : 4;
        return '<div class="card kpi"><div class="rotulo">' + x.nome + ' · ' + x.codigo + '</div><div class="valor num">' + brl(x.valor, casas) + '</div>' +
          '<span class="var ' + classeVar(x.var) + '">' + seta(x.var) + ' ' + pct(x.var) + '</span><span class="sub" style="display:block">mín. ' + n(x.min, casas) + ' · máx. ' + n(x.max, casas) + '</span>' +
          (i === 0 && hist ? spark(hist, "var(--tijolo)") + '<span class="sub">últimos 30 dias</span>' : "") + '</div>';
      }).join("");
    }
    function desenharAcoes(l){
      $("tbAcoes").innerHTML = l.map(function(x){
        if (x.erro) return '<tr><td><strong>' + esc(x.papel) + '</strong></td><td colspan="7" style="color:var(--baixa)">' + esc(x.erro) + '</td></tr>';
        var ind = x.papel === "^BVSP", casas = ind ? 0 : 2;
        var cor = x.serie.length > 1 && x.serie[x.serie.length - 1].v >= x.serie[0].v ? "var(--alta)" : "var(--baixa)";
        return '<tr><td><strong>' + (ind ? "IBOV" : esc(x.papel)) + '</strong></td><td>' + esc(ind ? "Ibovespa" : x.nome) + '</td>' +
          '<td class="r num">' + (ind ? n(x.preco, 0) + " pts" : brl(x.preco)) + '</td>' +
          '<td class="r"><span class="var ' + classeVar(x.var) + '">' + seta(x.var) + ' ' + pct(x.var) + '</span></td>' +
          '<td class="r num">' + n(x.min, casas) + '</td><td class="r num">' + n(x.max, casas) + '</td>' +
          '<td class="r num">' + (x.volume ? n(x.volume / 1e6, 1) + " mi" : "—") + '</td><td>' + spark(x.serie, cor) + '</td></tr>';
      }).join("");
    }
    atualizar();
  }

  /* ---------- eventos globais ---------- */
  function msg(t, erro){ var m = $("lMsg"); m.textContent = t; m.style.color = erro ? "var(--baixa)" : ""; }
  function ocupado(sim){ Array.prototype.forEach.call(document.querySelectorAll("#formLogin button"), function(b){ b.disabled = sim; }); }
  function chamar(promessa, ok){
    ocupado(true);
    promessa.then(function(erro){ ocupado(false); if (erro) msg(erro, true); else if (ok) msg(ok); });
  }
  function semAuth(){ if (!window.HanseatAuth) { msg("O login ainda está carregando. Tente de novo em instantes.", true); return true; } }
  $("formLogin").addEventListener("submit", function(e){
    e.preventDefault();
    if (semAuth()) return;
    msg("Entrando…");
    chamar(HanseatAuth.entrar($("lEmail").value, $("lSenha").value));
  });
  $("btPrimeiro").addEventListener("click", function(){
    if (semAuth()) return;
    if (!$("lEmail").value || $("lSenha").value.length < 6) { msg("Digite o seu e-mail @hanseat.com.br e escolha uma senha de pelo menos 6 caracteres; depois clique em Primeiro acesso.", true); return; }
    chamar(HanseatAuth.primeiroAcesso($("lEmail").value, $("lSenha").value));
  });
  $("btEsqueci").addEventListener("click", function(){
    if (semAuth()) return;
    if (!$("lEmail").value) { msg("Digite o seu e-mail e clique de novo em Esqueci a senha.", true); return; }
    chamar(HanseatAuth.esqueci($("lEmail").value), "Enviamos um link para criar uma nova senha. Confira o seu e-mail.");
  });
  $("btReenviar").addEventListener("click", function(){ chamar(HanseatAuth.reenviar(), "E-mail de confirmação reenviado."); });
  $("btJaConfirmei").addEventListener("click", function(){
    ocupado(true);
    HanseatAuth.jaConfirmei().then(function(){ ocupado(false); if (window.HanseatPendente) msg("Ainda não aparece como confirmado. Clique no link do e-mail e tente de novo.", true); });
  });
  $("btSairVer").addEventListener("click", function(){ HanseatAuth.sair(); });
  $("btSair").addEventListener("click", function(){ if (window.HanseatAuth) HanseatAuth.sair(); location.hash = ""; });
  // o estado do login chega do Firebase; enquanto isso a tela de entrada mostra "Carregando…"
  window.addEventListener("hanseat:auth", function(){
    var p = window.HanseatPendente;
    $("lCampos").classList.toggle("oculto", !!(p && p.tipo === "verificar"));
    $("lVerificar").classList.toggle("oculto", !(p && p.tipo === "verificar"));
    if (p && p.tipo === "verificar") { $("lVerEmail").textContent = p.email; msg(""); }
    else if (p && p.tipo === "sem-acesso") { msg("O e-mail " + p.email + " não foi convidado para o portal. Peça o convite a um administrador do Hanseat.", true); HanseatAuth.sair(); }
    if (usuario() && !location.hash) location.hash = "#/inicio"; else rota();
  });
  $("btTema").addEventListener("click", function(){
    var escuro = document.documentElement.getAttribute("data-theme") === "dark" ||
      (!document.documentElement.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
    var t = escuro ? "light" : "dark"; aplicarTema(t); try { localStorage.setItem("hanseat.tema", t); } catch(e){}
  });
  window.addEventListener("hashchange", rota);
  rota();
})();
