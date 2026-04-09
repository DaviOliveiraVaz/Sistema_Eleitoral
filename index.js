const express = require("express");
const app = express();
const path = require("path");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const session = require("express-session");
const conexao = require("./config/database");
require('dotenv').config();
const Eleitor = require("./model/Eleitor");

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
  res.render("urna.ejs", {});
});

app.get("/candidato", function (req, res) {
  res.render("candidato.ejs", {});
});

app.get("/admin", function (req, res) {
  res.render("admin.ejs", {});
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

app.listen("3000", function () {
  console.log("Servidor rodando na porta 3000!");
});