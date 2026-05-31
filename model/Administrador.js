const { Schema, model } = require("mongoose");

const AdministradorSchema = new Schema({
  nome: { type: String, required: true },
<<<<<<< HEAD
  cpf: { type: String, required: true, unique: true },
  senha: { type: String, required: true }
=======
  cpf: { type: String, required: true, unique: true }
>>>>>>> e077e616750ecbc5f6dee404d7c35f30468a753e
});

module.exports = model("Administrador", AdministradorSchema, "Administradores");