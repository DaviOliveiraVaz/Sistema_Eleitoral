const express = require("express");
const app = express();
const path = require("path");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const session = require("express-session");
const conexao = require("./config/database");
const bcrypt = require("bcrypt");
const saltRounds = 10;
require('dotenv').config();
const Eleitor = require("./model/Eleitor");
const Candidato = require("./model/Candidato");
const Administrador = require("./model/Administrador");
const Voto = require("./model/Voto");
const Eleicao = require("./model/Eleicao");

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use((req, res, next) => {
    if (req.session && req.session.tipoAcesso) {
        
        let linkHome = '/';
        
        switch (req.session.tipoAcesso) {
            case 'Eleitor':
                linkHome = '/home_eleitor';
                break;
            case 'Candidato':
                linkHome = '/home_candidato';
                break;
            case 'Administrador':
                linkHome = '/home_adm';
                break;
        }

        res.locals.linkHome = linkHome; 
        res.locals.tipoAcesso = req.session.tipoAcesso;
    } else {
        res.locals.linkHome = '/login';
        res.locals.tipoAcesso = null;
    }
    
    next();
});

app.get("/", function (req, res) {
  res.render("home.ejs", {});
});

app.get("/cadastro", function (req, res) {
  res.render("cadastro.ejs", {});
});

app.get("/login", function (req, res) {
  if (req.session.id_usuario) {
      return res.redirect(res.locals.linkHome);
  }
  res.render("login.ejs", {});
});

app.post('/login', async (req, res) => {
  const { tipoLogin, cpf, senha } = req.body;

  try {
    let ModeloUsuario;
    
    switch (tipoLogin) {
      case 'Eleitor':
        ModeloUsuario = Eleitor;
        break;
      case 'Candidato':
        ModeloUsuario = Candidato;
        break;
      case 'Administrador':
        ModeloUsuario = Administrador;
        break;
      default:
        return res.send(
          `<script>alert("Tipo de acesso inválido."); window.history.back();</script>`
        );
    }

    const usuario = await ModeloUsuario.findOne({ cpf });

    if (!usuario) {
      return res.send(
        `<script>alert("Cadastro não encontrado para este ${tipoLogin}."); window.history.back();</script>`
      );
    }

    const match = await bcrypt.compare(senha, usuario.senha);

    if (match) {
      req.session.id_usuario = usuario._id;
      req.session.cpf = usuario.cpf;
      req.session.tipoAcesso = tipoLogin;
      
      switch (tipoLogin) {
        case 'Eleitor':
          return res.redirect("/home_eleitor");
        case 'Candidato':
          return res.redirect("/home_candidato");
        case 'Administrador':
          return res.redirect("/home_adm");
        default:
          return res.redirect("/"); 
      }
    } else {
      return res.send(
        `<script>alert("CPF ou senha incorretos."); window.history.back();</script>`
      );
    }
  } catch (error) {
    console.error(`Erro ao consultar o banco de dados (${tipoLogin}): `, error);
    return res.status(500).send(
      `<script>alert("Ocorreu um erro ao consultar o banco de dados."); window.history.back();</script>`
    );
  }
});

app.get("/sair", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Erro ao finalizar a sessão:", err);
      return res
        .status(500)
        .send(
          `<script>alert("Ocorreu um erro ao sair da conta."); window.history.back();</script>`
        );
    }
    res.redirect("/login");
  });
});

app.get("/urna", async function (req, res) {
    try {
        const idUsuario = req.session.id_usuario;
        const tipoAcesso = req.session.tipoAcesso;

        if (!idUsuario) {
            return res.status(401).send(`<script>alert("Acesso negado. Você precisa estar logado."); window.location.href="/login";</script>`);
        }

        if (tipoAcesso === 'Administrador') {
            return res.status(403).send(`<script>alert("Administradores não têm acesso à urna de votação."); window.history.back();</script>`);
        }

        let ModeloVotante = tipoAcesso === 'Eleitor' ? Eleitor : Candidato;
        const usuarioVotante = await ModeloVotante.findById(idUsuario);

        if (!usuarioVotante) {
            return res.status(404).send(`<script>alert("Usuário não encontrado."); window.location.href="/login";</script>`);
        }

        const eleicaoAtiva = await Eleicao.findOne({ ativa: true });

        if (!eleicaoAtiva) {
            return res.send(`<script>alert("Nenhuma eleição ativa no momento."); window.location.href = "${res.locals.linkHome}";</script>`);
        }

        const tipoEleicao = eleicaoAtiva.tipo; 

        // TRAVA: Verifica a eleição específica
        if (tipoEleicao === "Geral" && usuarioVotante.votouGeral) {
            return res.send(`<script>alert("Você já votou nas Eleições Gerais."); window.location.href = "${res.locals.linkHome}";</script>`);
        } else if (tipoEleicao === "Municipal" && usuarioVotante.votouMunicipal) {
            return res.send(`<script>alert("Você já votou nas Eleições Municipais."); window.location.href = "${res.locals.linkHome}";</script>`);
        }

        const estadoEleitor = usuarioVotante.estado;
        const cidadeEleitor = usuarioVotante.cidade;

        const filtro = { status: "Homologado", ativo: true };

        if (tipoEleicao === "Municipal") {
            filtro.cidade = cidadeEleitor;
            filtro.cargo = { $in: ["Prefeito", "Vereador"] };
        } else {
            filtro.estado = estadoEleitor;
            filtro.cargo = { $in: ["Presidente", "Governador", "Senador", "Deputado Federal", "Deputado Estadual"] };
        }

        const docs = await Candidato.find(filtro);
        res.render("urna.ejs", { Candidatos: docs, tipoEleicao });

    } catch (error) {
        console.error("Erro: ", error);
        res.status(500).send("Ocorreu um erro ao carregar os candidatos.");
    }
});

app.post("/votar", async (req, res) => {
    try {
        const idUsuario = req.session.id_usuario;
        const tipoAcesso = req.session.tipoAcesso;

        if (!idUsuario) {
            return res.status(401).json({ message: "Acesso negado." });
        }

        let ModeloVotante = tipoAcesso === 'Eleitor' ? Eleitor : Candidato;
        const usuarioVotante = await ModeloVotante.findById(idUsuario);

        const eleicaoAtiva = await Eleicao.findOne({ ativa: true });
        if (!eleicaoAtiva) {
            return res.status(400).json({ message: "Nenhuma eleição ativa no momento." });
        }

        const tipoEleicao = eleicaoAtiva.tipo;

        // TRAVA DE SEGURANÇA FINAL
        if (tipoEleicao === "Geral" && usuarioVotante.votouGeral) {
            return res.status(400).json({ message: "Você já votou nas Eleições Gerais." });
        } else if (tipoEleicao === "Municipal" && usuarioVotante.votouMunicipal) {
            return res.status(400).json({ message: "Você já votou nas Eleições Municipais." });
        }

        const cargosGeral = {
            deputadoEstadual: "Deputado Estadual",
            deputadoFederal: "Deputado Federal",
            senador: "Senador",
            governador: "Governador",
            presidente: "Presidente"
        };

        const cargosMunicipal = {
            vereador: "Vereador",
            prefeito: "Prefeito"
        };

        const isMunicipal = tipoEleicao === "Municipal";
        const mapaCargos = isMunicipal ? cargosMunicipal : cargosGeral;

        async function validarCandidato(numero, cargo) {
            if (!numero) return null;
            const candidato = await Candidato.findOne({ numero: Number(numero), cargo, status: "Homologado" });
            return candidato ? candidato._id : null;
        }

        const voto = {};
        for (const [chave, nomeCargo] of Object.entries(mapaCargos)) {
            voto[chave] = await validarCandidato(req.body[chave], nomeCargo);
        }

        await Voto.create({ votos: voto });

        for (let cargo in voto) {
            if (voto[cargo]) {
                await Candidato.findByIdAndUpdate(voto[cargo], { $inc: { votos: 1 } });
            }
        }

        // SALVA A TRAVA CORRETA
        if (tipoEleicao === "Geral") {
            usuarioVotante.votouGeral = true;
        } else {
            usuarioVotante.votouMunicipal = true;
        }
        await usuarioVotante.save();

        res.json({ message: "Voto registrado com sucesso!" });

    } catch (error) {
        console.error("Erro ao processar votação:", error);
        res.status(500).json({ message: "Erro interno ao registrar voto." });
    }
});

app.post("/admin/homologar", async (req, res) => {
    try {
        if (req.session.tipoAcesso !== 'Administrador') {
            return res.status(403).json({ message: "Acesso negado. Apenas administradores podem homologar." });
        }

        const { candidatoId, novoStatus } = req.body;

        if (!["Homologado", "Rejeitado"].includes(novoStatus)) {
            return res.status(400).json({ message: "Status inválido." });
        }

        await Candidato.findByIdAndUpdate(candidatoId, { status: novoStatus });

        res.json({ message: `Candidato ${novoStatus} com sucesso!` });

    } catch (error) {
        console.error("Erro ao atualizar status do candidato:", error);
        res.status(500).json({ message: "Erro interno ao processar a homologação." });
    }
});

app.get("/resultados", async (req, res) => {
  try {
    // Mesma lógica: verifica a eleição ativa
    const eleicaoAtiva = await Eleicao.findOne({ ativa: true });

    if (!eleicaoAtiva) {
        return res.render("resultados.ejs", { 
            resultadosPorCargo: {}, 
            nomeEleicao: "Nenhuma eleição ativa no momento" 
        });
    }

    const filtro = { status: "Homologado", ativo: true };

    if (eleicaoAtiva.tipo === "Municipal") {
        filtro.cargo = { $in: ["Prefeito", "Vereador"] };
    } else {
        filtro.cargo = { $in: ["Presidente", "Governador", "Senador", "Deputado Federal", "Deputado Estadual"] };
    }

    const candidatos = await Candidato.find(filtro).sort({ votos: -1 });

    const resultadosPorCargo = {};
    candidatos.forEach(candidato => {
      if (!resultadosPorCargo[candidato.cargo]) {
        resultadosPorCargo[candidato.cargo] = [];
      }
      resultadosPorCargo[candidato.cargo].push(candidato);
    });

    res.render("resultados.ejs", { resultadosPorCargo, nomeEleicao: eleicaoAtiva.nome });

  } catch (error) {
    console.error("Erro ao carregar os resultados:", error);
    res.status(500).send("Erro interno ao carregar os resultados da eleição.");
  }
});

app.get("/cadastro_eleitor", function (req, res) {
  res.render("cadastro_eleitor.ejs", {});
});

app.post("/cadastro_eleitor", async (req, res) => {
    try {
        // Removemos zona e secao da requisição, o usuário não envia mais isso!
        const { nome, cpf, dataNascimento, estado, cidade, sexo, senha } = req.body;

        const eleitorExistente = await Eleitor.findOne({ cpf: cpf });
        
        if (eleitorExistente) {
            return res.send(`
                <script>
                    alert('CPF já cadastrado! Verifique os dados.');
                    window.location.href = "/cadastro_eleitor";
                </script>
            `);
        }

        // Cálculo exato da idade
        const hoje = new Date();
        const nascimento = new Date(dataNascimento);
        let idadedecalculo = hoje.getFullYear() - nascimento.getFullYear();
        const m = hoje.getMonth() - nascimento.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
            idadedecalculo--;
        }

        if (idadedecalculo < 16) {
            return res.send(`
                <script>
                    alert('Cadastro não permitido! A idade mínima obrigatória ou facultativa para votar é de 16 anos completos.');
                    window.history.back();
                </script>
            `);
        }

        // --- MÁGICA DA REGIONALIZAÇÃO: GERADOR DE ZONA E SEÇÃO ---
        // 1. Gera a Zona baseada na cidade/estado (mesma cidade = mesma zona)
        const stringLocal = `${cidade}-${estado}`;
        let hashLocal = 0;
        for (let i = 0; i < stringLocal.length; i++) {
            hashLocal += stringLocal.charCodeAt(i);
        }
        const zonaGerada = String((hashLocal % 300) + 1).padStart(3, '0'); // Ex: 045
        
        // 2. Gera a Seção de forma aleatória para distribuir nas "salas" (0001 a 0500)
        const secaoGerada = String(Math.floor(Math.random() * 500) + 1).padStart(4, '0'); // Ex: 0128

        const hash = await bcrypt.hash(senha, saltRounds);

        const novoEleitor = new Eleitor({
            nome,
            cpf,
            dataNascimento,
            idade: idadedecalculo,
            estado,
            cidade,
            sexo,
            zona: zonaGerada,   // Salvando o valor automático
            secao: secaoGerada, // Salvando o valor automático
            senha: hash
        });

        await novoEleitor.save();

        res.send(`
            <script>
                alert('Eleitor cadastrado com sucesso!\\nSua Zona Eleitoral: ${zonaGerada}\\nSua Seção: ${secaoGerada}\\n\\nAgora você pode fazer login e votar.');
                window.location.href = "/login";
            </script>
        `);
    } catch (error) {
        console.error("Erro no cadastro:", error);
        res.status(500).send("Erro ao cadastrar eleitor.");
    }
});

app.get("/cadastro_candidato", function (req, res) {
  res.render("cadastro_candidato.ejs", {});
});

app.post("/cadastro_candidato", async (req, res) => {
    try {
        const { nome, cpf, dataNascimento, estado, cidade, sexo, senha } = req.body;
        const existente = await Candidato.findOne({ $or: [{ cpf }] });
        if (existente) {
            return res.send("<script>alert('CPF já cadastrado!'); window.history.back();</script>");
        }

        const hoje = new Date();
        const nascimento = new Date(dataNascimento);
        let idadedecalculo = hoje.getFullYear() - nascimento.getFullYear();
        const m = hoje.getMonth() - nascimento.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
            idadedecalculo--;
        }

        // --- MÁGICA DA REGIONALIZAÇÃO: GERADOR DE ZONA E SEÇÃO ---
        const stringLocal = `${cidade}-${estado}`;
        let hashLocal = 0;
        for (let i = 0; i < stringLocal.length; i++) {
            hashLocal += stringLocal.charCodeAt(i);
        }
        const zonaGerada = String((hashLocal % 300) + 1).padStart(3, '0');
        const secaoGerada = String(Math.floor(Math.random() * 500) + 1).padStart(4, '0');

        const hash = await bcrypt.hash(senha, saltRounds);

        const novoCandidato = new Candidato({
            nome,
            cpf,
            dataNascimento,
            idade: idadedecalculo,
            estado,
            cidade,
            sexo,
            zona: zonaGerada,
            secao: secaoGerada,
            senha: hash
        });
        
        await novoCandidato.save();
        res.send(`<script>alert('Cadastro concluído!\\nSua Zona Eleitoral: ${zonaGerada}\\nSua Seção: ${secaoGerada}\\n\\nFaça login no portal para lançar sua candidatura.'); window.location.href = '/login';</script>`);
    } catch (error) {
        console.error("ERRO GRAVE AO CADASTRAR:", error);
        res.send(`<script>alert("Erro ao cadastrar: ${error.message}"); window.history.back();</script>`);
    }
});

app.get("/home_eleitor", (req, res) => res.render("home_eleitor.ejs"));

app.get("/home_candidato", (req, res) => res.render("home_candidato.ejs"));

app.get("/home_adm", (req, res) => res.render("home_adm.ejs"));

app.get("/lista_candidatos", async (req, res) => {
    try {
        // Busca qual é a eleição ativa no momento
        const eleicaoAtiva = await Eleicao.findOne({ ativa: true });

        // Se não houver eleição ativa, manda um objeto vazio para não quebrar a tela
        if (!eleicaoAtiva) {
            return res.render("lista_candidatos.ejs", { 
                candidatosPorCargo: {}, 
                nomeEleicao: "Nenhuma eleição ativa no momento" 
            });
        }

        // Filtro base: apenas os homologados e ativos
        const filtro = { status: "Homologado", ativo: true };

        // Aplica o filtro de cargos dependendo do tipo da eleição
        if (eleicaoAtiva.tipo === "Municipal") {
            filtro.cargo = { $in: ["Prefeito", "Vereador"] };
        } else {
            filtro.cargo = { $in: ["Presidente", "Governador", "Senador", "Deputado Federal", "Deputado Estadual"] };
        }

        const candidatos = await Candidato.find(filtro).sort({ nome: 1 });

        const candidatosPorCargo = {};
        candidatos.forEach(candidato => {
            if (!candidatosPorCargo[candidato.cargo]) {
                candidatosPorCargo[candidato.cargo] = [];
            }
            candidatosPorCargo[candidato.cargo].push(candidato);
        });

        // Passamos o nome da eleição para a tela
        res.render("lista_candidatos.ejs", { candidatosPorCargo, nomeEleicao: eleicaoAtiva.nome });

    } catch (error) {
        console.error("Erro ao carregar candidatos:", error);
        res.status(500).send("Erro ao carregar a lista de candidatos.");
    }
});

app.get("/minha_candidatura", async (req, res) => {
    try {
        const idUsuario = req.session.id_usuario;

        if (!idUsuario || req.session.tipoAcesso !== 'Candidato') {
            return res.send(`<script>alert("Acesso negado."); window.location.href="/login";</script>`);
        }

        const candidato = await Candidato.findById(idUsuario);

        if (!candidato) {
            return res.send(`<script>alert("Candidato não encontrado."); window.location.href="/login";</script>`);
        }

        const eleicaoAtiva = await Eleicao.findOne({ ativa: true });
        const tipoEleicao = eleicaoAtiva ? eleicaoAtiva.tipo : null;

        res.render("candidatura.ejs", { candidato, tipoEleicao });

    } catch (error) {
        console.error("Erro ao carregar candidatura:", error);
        res.status(500).send("Erro interno ao carregar a página.");
    }
});

app.post("/lancar_candidatura", async (req, res) => {
    try {
        const idUsuario = req.session.id_usuario;
        const { numero, cargo, partido, slogan, descricao } = req.body;

        // 1. Busca os dados do candidato para verificar a idade
        const candidato = await Candidato.findById(idUsuario);

        // 2. Validação da Regra de Negócio (Idade Mínima)
        let idadeMinima = 0;
        if (cargo === "Presidente" || cargo === "Senador") {
            idadeMinima = 35;
        } else if (cargo === "Governador") {
            idadeMinima = 30;
        } else if (cargo === "Deputado Federal" || cargo === "Deputado Estadual") {
            idadeMinima = 21;
        } else if (cargo === "Prefeito") {
            idadeMinima = 21;
        } else if (cargo === "Vereador") {
            idadeMinima = 18;
        }

        if (candidato.idade < idadeMinima) {
            return res.send(`<script>alert("Idade insuficiente! A Constituição exige a idade mínima de ${idadeMinima} anos para o cargo de ${cargo}. Sua idade atual é ${candidato.idade} anos."); window.history.back();</script>`);
        }

        // 3. Validação de Número Único
        const numeroEmUso = await Candidato.findOne({ numero: Number(numero), cargo: cargo });
        if (numeroEmUso) {
            return res.send(`<script>alert("Esse número já está registrado para este cargo!"); window.history.back();</script>`);
        }

        // 4. Salva a Candidatura
        await Candidato.findByIdAndUpdate(idUsuario, {
            numero: Number(numero),
            cargo,
            partido,
            slogan,
            descricao,
            status: "Pendente"
        });

        res.send(`<script>alert("Candidatura lançada com sucesso! Aguarde a homologação do administrador."); window.location.href="/minha_candidatura";</script>`);

    } catch (error) {
        console.error("Erro ao lançar candidatura:", error);
        res.status(500).send(`<script>alert("Erro ao lançar candidatura."); window.history.back();</script>`);
    }
});

app.post("/cancelar_candidatura", async (req, res) => {
    try {
        const idUsuario = req.session.id_usuario;

        if (!idUsuario || req.session.tipoAcesso !== 'Candidato') {
            return res.send(`<script>alert("Acesso negado."); window.location.href="/login";</script>`);
        }

        const candidato = await Candidato.findById(idUsuario);
        if (!candidato || !candidato.cargo) {
            return res.redirect("/minha_candidatura");
        }

        const registroHistorico = {
            cargo: candidato.cargo,
            numero: candidato.numero,
            partido: candidato.partido,
            statusFinal: candidato.status === 'Rejeitado' ? 'Rejeitada pelo TSE' : 'Cancelada pelo Candidato'
        };

        await Candidato.findByIdAndUpdate(idUsuario, {
            $push: { historicoCandidaturas: registroHistorico },
            $unset: { cargo: "", numero: "", partido: "", slogan: "", descricao: "" },
            $set: { status: "Nenhuma" }
        });

        res.send(`<script>alert("Candidatura movida para o histórico com sucesso. Você pode lançar uma nova quando quiser."); window.location.href="/minha_candidatura";</script>`);

    } catch (error) {
        console.error("Erro ao cancelar candidatura:", error);
        res.status(500).send(`<script>alert("Erro ao processar a solicitação."); window.history.back();</script>`);
    }
});

app.get("/perfil", async (req, res) => {
    try {
        const idUsuario = req.session.id_usuario;
        const tipoAcesso = req.session.tipoAcesso;

        if (!idUsuario || tipoAcesso === 'Administrador') {
            return res.redirect(res.locals.linkHome);
        }

        let usuario;
        if (tipoAcesso === 'Eleitor') {
            usuario = await Eleitor.findById(idUsuario);
        } else if (tipoAcesso === 'Candidato') {
            usuario = await Candidato.findById(idUsuario);
        }

        res.render("perfil.ejs", { usuario, tipoAcesso });
    } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        res.status(500).send("Erro interno ao carregar o perfil.");
    }
});

app.post("/perfil/editar", async (req, res) => {
    try {
        const idUsuario = req.session.id_usuario;
        const tipoAcesso = req.session.tipoAcesso;
        const { nome, dataNascimento, estado, cidade, sexo } = req.body;

        if (!idUsuario || tipoAcesso === 'Administrador') {
            return res.redirect("/login");
        }

        let Modelo = tipoAcesso === 'Eleitor' ? Eleitor : Candidato;

        const usuarioAtual = await Modelo.findById(idUsuario);
        if (!usuarioAtual) {
            return res.redirect("/login");
        }

        const dataNascimentoFinal = dataNascimento || usuarioAtual.dataNascimento;

        const hoje = new Date();
        const nascimento = new Date(dataNascimentoFinal);
        let idadedecalculo = hoje.getFullYear() - nascimento.getFullYear();
        const m = hoje.getMonth() - nascimento.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
            idadedecalculo--;
        }

        const dadosAtualizados = {
            nome,
            dataNascimento: dataNascimentoFinal,
            idade: idadedecalculo,
            estado: estado || usuarioAtual.estado,
            cidade: cidade || usuarioAtual.cidade,
            sexo: sexo || usuarioAtual.sexo
        };

        if (estado !== usuarioAtual.estado || cidade !== usuarioAtual.cidade) {
            const stringLocal = `${dadosAtualizados.cidade}-${dadosAtualizados.estado}`;
            let hashLocal = 0;
            for (let i = 0; i < stringLocal.length; i++) {
                hashLocal += stringLocal.charCodeAt(i);
            }
            dadosAtualizados.zona = String((hashLocal % 300) + 1).padStart(3, '0');
            dadosAtualizados.secao = String(Math.floor(Math.random() * 500) + 1).padStart(4, '0');
        }

        await Modelo.findByIdAndUpdate(idUsuario, dadosAtualizados);

        res.send(`
            <script>
                alert('Dados atualizados com sucesso!');
                window.location.href = "/perfil";
            </script>
        `);
    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        res.status(500).send("Erro ao salvar as alterações.");
    }
});

app.get("/consulta_candidatos", async (req, res) => {
    try {
        if (!req.session.id_usuario) {
            return res.redirect('/login');
        }

        const candidatos = await Candidato.find({}).sort({ nome: 1 });

        const candidatosPorCargo = {};
        candidatos.forEach(candidato => {
            const cargoAtual = candidato.cargo ? candidato.cargo : "Sem Cargo Definido";
            
            if (!candidatosPorCargo[cargoAtual]) {
                candidatosPorCargo[cargoAtual] = [];
            }
            candidatosPorCargo[cargoAtual].push(candidato);
        });

        res.render("consulta_candidatos.ejs", { candidatosPorCargo });
    } catch (error) {
        res.status(500).send("Erro ao carregar a lista de candidatos.");
    }
});

app.post("/candidatos/:id/editar", async (req, res) => {
    try {
        if (req.session.tipoAcesso !== 'Administrador') {
            return res.redirect('/');
        }

        // Recebendo cidade e estado no lugar de municipio
        const { nome, partido, cidade, estado, numero, status } = req.body;
        
        await Candidato.findByIdAndUpdate(req.params.id, {
            nome,
            partido,
            cidade,
            estado,
            numero: Number(numero),
            status
        });

        res.redirect("/consulta_candidatos");
    } catch (error) {
        res.status(500).send("Erro ao editar candidato.");
    }
});

app.post("/candidatos/:id/inativar", async (req, res) => {
    try {
        if (req.session.tipoAcesso !== 'Administrador') {
            return res.redirect('/');
        }

        // Busca o candidato para saber se ele está ativo ou inativo
        const candidato = await Candidato.findById(req.params.id);
        
        // Inverte o status atual (Se true vira false, se false vira true)
        await Candidato.findByIdAndUpdate(req.params.id, { ativo: !candidato.ativo });
        
        res.redirect("/consulta_candidatos");
    } catch (error) {
        res.status(500).send("Erro ao alterar status do cadastro.");
    }
});

app.get("/admin", async (req, res) => {
    try {
        if (req.session.tipoAcesso !== 'Administrador') {
            return res.redirect('/login');
        }

        const docs = await Candidato.find({});
        res.render("admin.ejs", { Candidatos: docs });
        
    } catch (error) {
        res.status(500).send("Ocorreu um erro ao carregar os candidatos.");
    }
});

app.get("/consulta_eleitores", async (req, res) => {
    try {
        if (req.session.tipoAcesso !== 'Administrador') {
            return res.redirect('/login');
        }

        const eleitores = await Eleitor.find({}).sort({ nome: 1 });
        res.render("consulta_eleitores.ejs", { Eleitores: eleitores });
    } catch (error) {
        res.status(500).send("Erro ao carregar a lista de eleitores.");
    }
});

app.post("/eleitores/:id/editar", async (req, res) => {
    try {
        if (req.session.tipoAcesso !== 'Administrador') {
            return res.redirect('/');
        }

        const { nome, dataNascimento, cidade, estado } = req.body;
        
        // Recalcular a idade baseada na nova data inserida
        const hoje = new Date();
        const nascimento = new Date(dataNascimento);
        let idadeCalculada = hoje.getFullYear() - nascimento.getFullYear();
        const m = hoje.getMonth() - nascimento.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
            idadeCalculada--;
        }

        await Eleitor.findByIdAndUpdate(req.params.id, {
            nome,
            dataNascimento,
            idade: idadeCalculada,
            cidade,
            estado
        });

        res.redirect("/consulta_eleitores");
    } catch (error) {
        res.status(500).send("Erro ao editar eleitor.");
    }
});

app.post("/eleitores/:id/inativar", async (req, res) => {
    try {
        if (req.session.tipoAcesso !== 'Administrador') {
            return res.redirect('/');
        }

        const eleitor = await Eleitor.findById(req.params.id);
        await Eleitor.findByIdAndUpdate(req.params.id, { ativo: !eleitor.ativo });
        
        res.redirect("/consulta_eleitores");
    } catch (error) {
        res.status(500).send("Erro ao alterar status do eleitor.");
    }
});

app.get("/eleicoes", async (req, res) => {
  if (req.session.tipoAcesso !== 'Administrador') {
    return res.redirect('/login');
  }
  const eleicoes = await Eleicao.find();
  res.render("eleicoes.ejs", { eleicoes });
});

app.get("/eleicoes/nova", (req, res) => {
  if (req.session.tipoAcesso !== 'Administrador') {
    return res.redirect('/login');
  }
  res.render("nova_eleicao.ejs");
});

app.post("/eleicoes/nova", async (req, res) => {
  if (req.session.tipoAcesso !== 'Administrador') {
    return res.redirect('/login');
  }
  await Eleicao.create({
    nome: req.body.nome,
    tipo: req.body.tipo
  });
  res.redirect("/eleicoes");
});

app.get("/eleicoes/editar/:id", async (req, res) => {
  if (req.session.tipoAcesso !== 'Administrador') {
    return res.redirect('/login');
  }
  const eleicao = await Eleicao.findById(req.params.id);
  if (!eleicao) return res.redirect("/eleicoes");
  res.render("editar_eleicao.ejs", { eleicao });
});

app.post("/eleicoes/editar/:id", async (req, res) => {
  if (req.session.tipoAcesso !== 'Administrador') {
    return res.redirect('/login');
  }
  await Eleicao.findByIdAndUpdate(req.params.id, {
    nome: req.body.nome,
    tipo: req.body.tipo
  });
  res.redirect("/eleicoes?editada=1&nome=" + encodeURIComponent(req.body.nome));
});

app.post("/eleicoes/excluir/:id", async (req, res) => {
  if (req.session.tipoAcesso !== 'Administrador') {
    return res.redirect('/login');
  }
  const eleicao = await Eleicao.findById(req.params.id);
  if (eleicao && eleicao.ativa) {
    return res.redirect("/eleicoes?erro=ativa");
  }
  await Eleicao.findByIdAndDelete(req.params.id);
  res.redirect("/eleicoes?excluida=1");
});

app.get("/eleicoes/ativar/:id", async (req, res) => {
  if (req.session.tipoAcesso !== 'Administrador') {
    return res.redirect('/login');
  }
  await Eleicao.updateMany({}, { $set: { ativa: false } });
  const eleicao = await Eleicao.findByIdAndUpdate(req.params.id, { ativa: true }, { new: true });
  const nome = eleicao ? encodeURIComponent(eleicao.nome) : '';
  res.redirect(`/eleicoes?ativada=1&nome=${nome}`);
});

app.listen("3000", function () {
  console.log("Servidor rodando na porta 3000!");
});