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

app.get("/", function (req, res) {
  res.render("home.ejs", {});
});

app.get("/login", function (req, res) {
  res.render("login.ejs", {});
});

app.get("/urna", function (req, res) {
      try {
      Candidato.find({}).then(function (docs) {
        res.render("urna.ejs", { Candidatos: docs });
      });
    } catch (error) {
      console.error("Erro: ", error);
      res.status(500).send("Ocorreu um erro ao carregar os candidatos.");
    }
});

app.post("/votar", async (req, res) => {
    try {
        const eleitor = await Eleitor.findById(eleitorId);

        if (eleitor.votou) {
            return res.status(400).json({ message: "Você já votou" });
        }

        const {
            deputadoEstadual,
            deputadoFederal,
            senador,
            governador,
            presidente
        } = req.body;

        // 🔒 valida candidatos (evita fraude)
        async function validar(numero, cargo) {
            if (!numero) return null;

            const candidato = await Candidato.findOne({
                numero,
                cargo,
                homologado: true
            });

            return candidato ? candidato._id : null;
        }

        const voto = {
            deputadoEstadual: await validar(deputadoEstadual, "Deputado Estadual"),
            deputadoFederal: await validar(deputadoFederal, "Deputado Federal"),
            senador: await validar(senador, "Senador"),
            governador: await validar(governador, "Governador"),
            presidente: await validar(presidente, "Presidente")
        };

        // salva voto
        await Voto.create({
            eleitorId,
            votos: voto
        });

        // soma votos
        for (let key in voto) {
            if (voto[key]) {
                await Candidato.findByIdAndUpdate(voto[key], {
                    $inc: { votos: 1 }
                });
            }
        }

        eleitor.votou = true;
        await eleitor.save();

        res.json({ message: "Voto registrado com sucesso" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao registrar voto" });
    }
});

app.get("/candidato", function (req, res) {
  res.render("candidato.ejs", {});
});

app.get("/admin", function (req, res) {
    try {
      Candidato.find({}).then(function (docs) {
        res.render("admin.ejs", { Candidatos: docs });
      });
    } catch (error) {
      console.error("Erro: ", error);
      res.status(500).send("Ocorreu um erro ao carregar os candidatos.");
    }
});

app.get("/resultados", function (req, res) {
  res.render("resultados.ejs", {});
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
                window.location.href = "/urna";
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
  
    } catch (error) {
        console.error("Erro no cadastro:", error);
        res.status(500).send("Erro ao cadastrar candidato.");
    }
});

app.listen("3000", function () {
  console.log("Servidor rodando na porta 3000!");
});