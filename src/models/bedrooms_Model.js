import { DataTypes } from "sequelize";
import { database } from "../config/Database.js";

export const Bedrooms = database.define(
  "Bedrooms",
  {
    idRoom: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING(250),
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("En Servicio", "Fuera de Servicio", "Mantenimiento"),
      defaultValue: "En Servicio",
      allowNull: false,
    },
    imagen: {
      type: DataTypes.STRING(250),
      allowNull: false,
    },
  },
  {
    tableName: "Bedrooms",
    timestamps: false,
  }
);

