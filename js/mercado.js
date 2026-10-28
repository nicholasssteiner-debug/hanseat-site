/* Leitura de dados reais de mercado, direto do navegador (todas as fontes liberam CORS).
   - Câmbio e bitcoin: AwesomeAPI (economia.awesomeapi.com.br), sem chave.
   - Ações da B3: brapi.dev. Sem chave só PETR4, VALE3, ITUB4 e MGLU3; com a chave gratuita do usuário, qualquer papel e o Ibovespa.
   - Juros e inflação: Banco Central, SGS (api.bcb.gov.br).
   Mesmo esquema da Apuração ao Vivo: busca sem cache, atualiza sozinho com contagem regressiva e mostra o erro sem apagar o que já está na tela. */
(function(){
  var M = window.HanseatMercado = {};
  var LIVRES = ["PETR4","VALE3","ITUB4","MGLU3"];
  var COM_CHAVE = ["^BVSP","BOVA11","ITSA4","BBDC4","BBAS3","WEGE3","ABEV3","B3SA3","PRIO3","SUZB3"];

  function pegar(url){
    return fetch(url + (url.indexOf("?") < 0 ? "?" : "&") + "nocache=" + Date.now(), {cache:"no-store"}).then(function(r){
      return r.json().then(function(j){
        if (!r.ok || (j && j.error)) throw new Error((j && j.message) || ("HTTP " + r.status));
        return j;
      });
    });
  }

  M.chave = function(v){
    try {
      if (v === undefined) return localStorage.getItem("hanseat.brapi") || "";
      if (v) localStorage.setItem("hanseat.brapi", v); else localStorage.removeItem("hanseat.brapi");
    } catch(e){}
    return v || "";
  };
  M.papeis = function(){ return M.chave() ? COM_CHAVE.concat(LIVRES) : LIVRES.slice(); };

  M.cambio = function(){
    return pegar("https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL,BTC-BRL").then(function(j){
      return ["USDBRL","EURBRL","GBPBRL","BTCBRL"].map(function(k){
        var x = j[k]; return {codigo:x.code, nome:x.name.split("/")[0], valor:+x.bid, var:+x.pctChange, max:+x.high, min:+x.low, hora:x.create_date};
      });
    });
  };
  M.historicoMoeda = function(par, dias){
    return pegar("https://economia.awesomeapi.com.br/json/daily/" + par + "/" + (dias || 30)).then(function(l){
      return l.map(function(x){ return {t:+x.timestamp * 1000, v:+x.bid}; }).reverse();
    });
  };

  M.acoes = function(){
    var lista = M.papeis(), k = M.chave();
    // sem chave a brapi aceita vários papéis numa chamada; com chave o plano gratuito pede um por vez
    var lotes = k ? lista.map(function(p){ return [p]; }) : [lista];
    return Promise.all(lotes.map(function(l){
      var u = "https://brapi.dev/api/quote/" + l.map(encodeURIComponent).join(",") + "?range=1mo&interval=1d" + (k ? "&token=" + encodeURIComponent(k) : "");
      return pegar(u).then(function(j){ return j.results || []; }).catch(function(e){ return [{symbol:l.join(","), erro:e.message}]; });
    })).then(function(partes){
      var res = [].concat.apply([], partes);
      return res.map(function(r){
        if (r.erro) return {papel:r.symbol, erro:r.erro};
        return {
          papel:r.symbol, nome:r.longName || r.shortName, preco:r.regularMarketPrice, var:r.regularMarketChangePercent,
          abertura:r.regularMarketOpen, max:r.regularMarketDayHigh, min:r.regularMarketDayLow, volume:r.regularMarketVolume,
          hora:r.regularMarketTime, logo:r.logourl,
          serie:(r.historicalDataPrice || []).map(function(h){ return {t:h.date * 1000, v:h.close}; }).filter(function(h){ return h.v != null; })
        };
      });
    });
  };

  /* Banco Central (SGS). A API é instável: a mesma consulta ora responde em 0,2s, ora segura a conexão por 15s ou
     devolve 502, e aceita no máximo 20 valores por consulta. Por isso cada série é buscada sozinha, com corte em 6s e
     até 3 tentativas, e guardada neste navegador por 6 horas (os indicadores mudam no máximo uma vez por dia). */
  function espera(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function lerCache(chave){
    try { var c = JSON.parse(localStorage.getItem(chave) || "null"); if (c && Date.now() - c.em < 216e5) return c.d; } catch(e){}
    return null;
  }
  function sgs(serie, n){
    var chave = "hanseat.sgs." + serie + "." + n, salvo = lerCache(chave);
    var revive = function(l){ return l.map(function(x){ return {data:new Date(x.data), v:x.v}; }); };
    if (salvo) return Promise.resolve(revive(salvo));
    var url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs." + serie + "/dados/ultimos/" + n + "?formato=json";
    var tenta = function(){
      var ctl = window.AbortController ? new AbortController() : null;
      var t = setTimeout(function(){ if (ctl) ctl.abort(); }, 6000);
      return fetch(url, {cache:"no-store", signal:ctl && ctl.signal}).then(function(r){
        clearTimeout(t); if (!r.ok) throw new Error("HTTP " + r.status); return r.json();
      }, function(e){ clearTimeout(t); throw new Error(e.name === "AbortError" ? "o Banco Central demorou demais" : "o Banco Central recusou a consulta"); });
    };
    var novamente = function(){ return espera(1000).then(tenta); };
    return tenta().catch(novamente).catch(novamente).then(function(l){
      var r = l.map(function(x){ var d = x.data.split("/"); return {data:new Date(+d[2], d[1]-1, +d[0]), v:+x.valor}; })
               .sort(function(a,b){ return a.data - b.data; });
      try { localStorage.setItem(chave, JSON.stringify({em:Date.now(), d:r})); } catch(e){}
      return r;
    });
  }
  function ultimo(l){ return l[l.length - 1]; }
  // cada indicador é uma promessa independente: a tela preenche cada um assim que chega
  M.selic = function(){
    // a série da meta Selic vem preenchida até a próxima reunião do Copom: usa o último valor até hoje
    return sgs(432, 20).then(function(l){ var h = new Date(), a = l.filter(function(x){ return x.data <= h; }); return ultimo(a.length ? a : l); });
  };
  M.cdi = function(){ return sgs(4389, 1).then(ultimo); };
  M.ipca = function(){ return sgs(13522, 13).then(function(l){ return {atual:ultimo(l), serie:l}; }); };
  M.igpm = function(){
    return sgs(189, 12).then(function(l){ return {v:(l.reduce(function(a, x){ return a * (1 + x.v / 100); }, 1) - 1) * 100, data:ultimo(l).data}; });
  };

  /* B3 abre 10h–18h (horário de Brasília), dias úteis. Fora disso, atualiza menos. */
  M.pregaoAberto = function(){
    var agora = new Date(new Date().toLocaleString("en-US", {timeZone:"America/Sao_Paulo"}));
    var d = agora.getDay(), h = agora.getHours() + agora.getMinutes() / 60;
    return d >= 1 && d <= 5 && h >= 10 && h < 18.25;
  };
})();
