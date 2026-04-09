const { Schema, model } = require("mongoose");

const AdministradorSchema = new Schema({
  nome: { type: String, required: true },
  cpf: { type: String, required: true, unique: true }
});

module.exports = model("Administrador", AdministradorSchema, "Administradores");