const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const mongoose = require("mongoose");
require('dotenv').config();

const Eleitor = require("./model/Eleitor");
const Candidato = require("./model/Candidato");

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB conectado com sucesso!"))
  .catch(err => console.error("Erro ao conectar no MongoDB:", err));

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback_secret",
    resave: false,
    saveUninitialized: true,
  })
);

app.get("/", (req, res) => res.render("home.ejs"));
app.get("/login", (req, res) => res.render("login.ejs"));

app.get("/urna", async (req, res) => {
    try {
        const candidatos = await Candidato.find({ status: "Homologado" });
        res.render("urna.ejs", { candidatos });
    } catch (error) {
        res.status(500).send("Erro ao carregar urna.");
    }
});

app.get("/candidato", (req, res) => {
    res.render("cadastro_candidato.ejs");
});

app.get("/cadastro_candidato", (req, res) => {
    res.render("cadastro_candidato.ejs");
});

app.get("/admin", async (req, res) => {
    try {
        const candidatos = await Candidato.find();
        res.render("admin.ejs", { candidatos });
    } catch (error) {
        res.status(500).send("Erro ao carregar painel administrativo.");
    }
});

app.get("/resultados", async (req, res) => {
    try {
        const candidatos = await Candidato.find({ status: "Homologado" }).sort({ votos: -1 });
        res.render("resultados.ejs", { candidatos });
    } catch (error) {
        res.status(500).send("Erro ao carregar resultados.");
    }
});

app.get("/cadastro_eleitor", (req, res) => res.render("cadastro_eleitor.ejs"));

app.post("/cadastro_eleitor", async (req, res) => {
    try {
        const { nome, cpf, municipio, idade, naturalidade } = req.body;
        const eleitorExistente = await Eleitor.findOne({ cpf });
        if (eleitorExistente) {
            return res.send("<script>alert('CPF já cadastrado!'); window.history.back();</script>");
        }
        const novoEleitor = new Eleitor({
            nome, cpf, municipio, idade: Number(idade), naturalidade
        });
        await novoEleitor.save();
        res.send("<script>alert('Eleitor cadastrado com sucesso!'); window.location.href = '/login';</script>");
    } catch (error) {
        res.status(500).send("Erro ao cadastrar eleitor.");
    }
});

app.post("/cadastro_candidato", async (req, res) => {
    try {
        const { nome, cpf, numero, cargo, partido, municipio, idade, naturalidade } = req.body;
        const existente = await Candidato.findOne({ $or: [{ cpf }, { numero }] });
        if (existente) {
            return res.send("<script>alert('CPF ou Número já cadastrado!'); window.history.back();</script>");
        }
        const novoCandidato = new Candidato({
            nome, 
            cpf, 
            numero: Number(numero), 
            cargo, 
            partido, 
            municipio, 
            idade: Number(idade), 
            naturalidade, 
            status: "Pendente"
        });
        await novoCandidato.save();
        res.send("<script>alert('Candidatura enviada! Aguarde homologação.'); window.location.href = '/login';</script>");
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao cadastrar candidato.");
    }
});

app.listen("3000", () => console.log("Servidor rodando na porta 3000!"));