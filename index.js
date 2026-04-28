const express = require("express");
const app = express();
const path = require("path");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const session = require("express-session");
const conexao = require("./config/database");
require('dotenv').config();
const Eleitor = require("./model/Eleitor");
const Candidato = require("./model/Candidato");
const Administrador = require("./model/Administrador");
const Voto = require("./model/Voto");

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
  const { tipoLogin, cpf } = req.body;

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
          const eleitor = await Eleitor.findById(idUsuario);

          if (!idUsuario) {
              return res.status(401).send(
                  `<script>alert("Acesso negado. Você precisa estar logado."); window.location.href="/login";</script>`
              );
          } 

          if (tipoAcesso === 'Administrador') {
              return res.status(403).send(
                  `<script>alert("Administradores não têm acesso à urna de votação."); window.history.back();</script>`
              );
          }

          if (eleitor.votou) {
            return res.send(`
                <script>
                    alert("Você já votou.");
                    window.location.href = "${res.locals.linkHome}";
                </script>
            `);
          }

          const docs = await Candidato.find({});
          res.render("urna.ejs", { Candidatos: docs });

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
            return res.status(401).json({ message: "Acesso negado. Você precisa estar logado para votar." });
        }

        if (tipoAcesso === 'Administrador') {
            return res.status(403).json({ message: "Administradores não votam." });
        }

        const eleitor = await Eleitor.findById(idUsuario);

        if (!eleitor) {
            return res.status(403).json({ message: "Apenas eleitores cadastrados podem registrar votos." });
        }

        if (eleitor.votou) {
            return res.status(400).json({ message: "Você já votou." });
        }

        const { deputadoEstadual, deputadoFederal, senador, governador, presidente } = req.body;

        async function validarCandidato(numero, cargo) {
            if (!numero) return null;
            const candidato = await Candidato.findOne({ numero, cargo, status: "Homologado" });
            return candidato ? candidato._id : null;
        }

        const voto = {
            deputadoEstadual: await validarCandidato(deputadoEstadual, "Deputado Estadual"),
            deputadoFederal: await validarCandidato(deputadoFederal, "Deputado Federal"),
            senador: await validarCandidato(senador, "Senador"),
            governador: await validarCandidato(governador, "Governador"),
            presidente: await validarCandidato(presidente, "Presidente")
        };

        await Voto.create({
            eleitorId: idUsuario,
            votos: voto
        });

        for (let cargo in voto) {
            if (voto[cargo]) {
                await Candidato.findByIdAndUpdate(voto[cargo], {
                    $inc: { votos: 1 }
                });
            }
        }

        eleitor.votou = true;
        await eleitor.save();

        res.json({ message: "Voto registrado com sucesso!" });

    } catch (error) {
        console.error("Erro ao processar votação:", error);
        res.status(500).json({ message: "Erro interno ao registrar voto." });
    }
});

app.get("/candidato", function (req, res) {
  res.render("candidato.ejs", {});
});

app.get("/admin", function (req, res) {
    try {
        const administradorId = req.session.id_usuario;

        if (!administradorId) {
            return res.status(401).json({ message: "Acesso negado. Você precisa estar logado para votar." });
        }

      Candidato.find({}).then(function (docs) {
        res.render("admin.ejs", { Candidatos: docs });
      });
    } catch (error) {
      console.error("Erro: ", error);
      res.status(500).send("Ocorreu um erro ao carregar os candidatos.");
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
    const candidatos = await Candidato.find({ status: "Homologado" }).sort({ votos: -1 });

    const resultadosPorCargo = {};

    candidatos.forEach(candidato => {
      if (!resultadosPorCargo[candidato.cargo]) {
        resultadosPorCargo[candidato.cargo] = [];
      }
      resultadosPorCargo[candidato.cargo].push(candidato);
    });

    res.render("resultados.ejs", { resultadosPorCargo });

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
        const { nome, cpf, municipio, idade, naturalidade } = req.body;

        const eleitorExistente = await Eleitor.findOne({ cpf: cpf });
        
        if (eleitorExistente) {
            return res.send(`
                <script>
                    alert('CPF já cadastrado! Verifique os dados.');
                    window.location.href = "/cadastro_eleitor";
                </script>
            `);
        }

        const novoEleitor = new Eleitor({
            nome,
            cpf,
            municipio,
            idade: Number(idade),
            naturalidade
        });

        await novoEleitor.save();

        res.send(`
            <script>
                alert('Eleitor cadastrado com sucesso! Agora você pode votar.');
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
        const { nome, cpf, numero, cargo, partido, municipio, idade, naturalidade } = req.body;
        const existente = await Candidato.findOne({ $or: [{ cpf }, { numero }] });
        if (existente) {
            return res.send("<script>alert('CPF ou Número já cadastrado!'); window.history.back();</script>");
        }
        const novoCandidato = new Candidato({
            nome, cpf, numero: Number(numero), cargo, partido, municipio, 
            idade: Number(idade), naturalidade, status: "Pendente"
        });
        await novoCandidato.save();
        res.send("<script>alert('Candidatura enviada! Aguarde homologação.'); window.location.href = '/login';</script>");
    } catch (error) {
        res.status(500).send("Erro ao cadastrar candidato.");
    }
});

app.get("/home_eleitor", (req, res) => res.render("home_eleitor.ejs"));

app.get("/home_candidato", (req, res) => res.render("home_candidato.ejs"));

app.get("/home_adm", (req, res) => res.render("home_adm.ejs"));

app.get("/consulta_candidatos", async (req, res) => {
    try {
        const candidatos = await Candidato.find({ status: "Homologado" }).sort({ nome: 1 });

        const candidatosPorCargo = {};
        candidatos.forEach(candidato => {
            if (!candidatosPorCargo[candidato.cargo]) {
                candidatosPorCargo[candidato.cargo] = [];
            }
            candidatosPorCargo[candidato.cargo].push(candidato);
        });

        res.render("consulta_candidatos.ejs", { candidatosPorCargo });

    } catch (error) {
        console.error("Erro ao carregar candidatos:", error);
        res.status(500).send("Erro ao carregar a lista de candidatos.");
    }
});

app.listen("3000", function () {
  console.log("Servidor rodando na porta 3000!");
});