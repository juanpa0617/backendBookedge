import { Reservations } from "../models/Reservations_Model.js";
import { Op } from "sequelize";
import { Companions } from "../models/Companions_Model.js";
import { Plans } from "../models/Plans_Model.js";
import { Users } from "../models/user_Model.js";
import { Cabins } from "../models/Cabin_Model.js";
import { Bedrooms } from "../models/Bedrooms_Model.js";
import { Services } from "../models/Services_Model.js";
import { ReservationsCompanions } from "../models/Reservations_Companions_Models.js";
import { body, param } from "express-validator";

export const validateReservationsExistence = async (idReservation) => {
  const reservations = await Reservations.findByPk(idReservation);
  if (!reservations) {
    return Promise.reject("La reserva no existe");
  }
  return true;
};

const reservationBaseValidation = [
  // No permitir ambos campos a la vez
  body().custom((_, { req }) => {
    if (req.body.idCabin && req.body.idRoom) {
      throw new Error("No puedes seleccionar una cabaña y una habitación en la misma reserva");
    }
    return true;
  }),

  body("idUser")
    .notEmpty()
    .withMessage("El ID del usuario es obligatorio")
    .isInt()
    .withMessage("El ID del usuario debe ser un número entero")
    .custom(async (value) => {
      const user = await Users.findByPk(value);
      if (!user) throw new Error("El usuario no existe");
      return true;
    }),

  body("idPlan")
    .notEmpty()
    .withMessage("El ID del plan es obligatorio")
    .isInt()
    .withMessage("El ID del plan debe ser un número entero")
    .custom(async (value) => {
      const plan = await Plans.findByPk(value);
      if (!plan) throw new Error("El plan no existe");
      return true;
    }),

  // Validación de cabaña ocupada
  body("idCabin")
    .customSanitizer(value => value === null ? undefined : value)
    .optional()
    .isInt()
    .withMessage("El ID de la cabaña debe ser un número entero")
    .custom(async (value, { req }) => {
      if (!value) return true;
      const cabin = await Cabins.findByPk(value);
      if (!cabin) throw new Error("La cabaña no existe");
      const { startDate, endDate } = req.body;
      if (!startDate || !endDate) return true;
      const overlapping = await Reservations.findOne({
        include: [{
          model: Cabins,
          as: "cabins",
          where: { idCabin: value }
        }],
        where: {
          status: { [Op.in]: ["Reservado", "Confirmado"] },
          [Op.or]: [
            { startDate: { [Op.between]: [startDate, endDate] } },
            { endDate: { [Op.between]: [startDate, endDate] } },
            { startDate: { [Op.lte]: startDate }, endDate: { [Op.gte]: endDate } }
          ]
        }
      });
      if (overlapping) throw new Error("La cabaña ya está reservada para esas fechas");
      return true;
    }),

  // Validación de habitación ocupada
  body("idRoom")
    .customSanitizer(value => value === null ? undefined : value)
    .optional()
    .isInt()
    .withMessage("El ID de la habitación debe ser un número entero")
    .custom(async (value, { req }) => {
      if (!value) return true;
      const bedrooms = await Bedrooms.findByPk(value);
      if (!bedrooms) throw new Error("La habitación no existe");
      const { startDate, endDate } = req.body;
      if (!startDate || !endDate) return true;
      const overlapping = await Reservations.findOne({
        include: [{
          model: Bedrooms,
          as: "bedrooms",
          where: { idRoom: value }
        }],
        where: {
          status: { [Op.in]: ["Reservado", "Confirmado"] },
          [Op.or]: [
            { startDate: { [Op.between]: [startDate, endDate] } },
            { endDate: { [Op.between]: [startDate, endDate] } },
            { startDate: { [Op.lte]: startDate }, endDate: { [Op.gte]: endDate } }
          ]
        }
      });
      if (overlapping) throw new Error("La habitación ya está reservada para esas fechas");
      return true;
    }),

  body("startDate")
    .notEmpty()
    .withMessage("La fecha de inicio es obligatoria")
    .isISO8601()
    .withMessage("La fecha de inicio debe tener un formato válido (Año-Mes-Dia)")
    .custom((value) => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      if (value < todayStr) {
        throw new Error("La fecha de inicio no puede ser anterior a la fecha actual");
      }
      return true;
    }),

  body("endDate")
    .custom(async (value, { req }) => {
      const plan = await Plans.findByPk(req.body.idPlan);
      if (plan && plan.requiresLodging) {
        if (!value) {
          throw new Error("La fecha de fin es obligatoria para este plan");
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          throw new Error("La fecha de fin debe tener un formato válido (Año-Mes-Dia)");
        }
        if (req.body.startDate) {
          const startDate = new Date(req.body.startDate);
          const endDate = new Date(value);
          if (isNaN(endDate.getTime())) {
            throw new Error("La fecha de fin debe tener un formato válido (Año-Mes-Dia)");
          }
          if (endDate <= startDate) {
            throw new Error("La fecha de fin debe ser posterior a la de inicio");
          }
        }
      }
      // Si el plan NO requiere alojamiento, endDate puede estar vacío, undefined o no existir
      return true;
    }),

  body("status")
    .optional()
    .isIn(["Reservado", "Confirmado", "Pendiente", "Anulado"])
    .withMessage("Estado no válido"),
];

// Exporta para usar en tus rutas
export const createReservationValidation = [...reservationBaseValidation];

export const updateReservationsValidation = [
  param("idReservation")
    .isInt()
    .withMessage("El ID de la reserva debe ser un número entero")
    .custom(validateReservationsExistence),
  ...reservationBaseValidation,
];

export const deletereservationsValidation = [
  param("idReservation")
    .isInt()
    .withMessage("El ID de la reserva debe ser un número entero")
    .custom(validateReservationsExistence),
];

export const getReservationsValidation = [
  param("idReservation")
    .isInt()
    .withMessage("El ID de la reserva debe ser un número entero")
    .custom(validateReservationsExistence),
];
export const getUserReservationsValidation = [
  param("userId")
    .isInt({ min: 1 })
    .withMessage("El ID del usuario debe ser un número entero positivo")
    .custom(async (value) => {
      const user = await Users.findByPk(value)
      if (!user) {
        throw new Error("El usuario no existe")
      }
      return true
    }),
]


export const changeStateReservationsValidation = [
  body("status")
    .isIn(["Reservado", "Confirmado", "Pendiente", "Anulado"])
    .withMessage(
      "El estado de la reserva debe ser 'Reservado', 'Confirmado', 'Pendiente' o 'Anulado'"
    ),
  param("idReservation")
    .isInt()
    .withMessage("El ID de la reserva debe ser un número entero")
    .custom(validateReservationsExistence),
];

//VALIDACIONES PUT , DELETE, POST ADDCOMPANIONS

export const validateReservationsCompanions = async (
  idReservationsCompanions
) => {
  const relation = await ReservationsCompanions.findByPk(
    idReservationsCompanions
  );
  console.log("Buscando relación con ID:", idReservationsCompanions); // Depuración
  if (!relation) {
    return Promise.reject("No hay relaciones de Reservas y Acompañantes");
  }
  return true;
};

export const validateCompanionsNotExists = async (
  idReservation,
  idCompanions
) => {
  const reservationsCompanions = await ReservationsCompanions.findOne({
    where: { idReservation, idCompanions },
  });
  if (reservationsCompanions) {
    return Promise.reject("La Reserva ya contiene este acompañante");
  }
  return true;
};

export const addCompanionValidation = [
  param("idReservation")
    .isInt()
    .withMessage("El id de la reserva debe ser un número entero")
    .custom(validateReservationsExistence),
  param("idCompanion")
    .isInt()
    .withMessage("El id del acompañante debe ser un número entero")
    .custom(async (value) => {
      const companion = await Companions.findByPk(value);
      if (!companion) {
        throw new Error("El acompañante no existe");
      }
      return true;
    }),
];

export const updateCompanionsValidation = [
  param("idReservationsCompanions")
    .isInt()
    .withMessage(
      "El id de la relación Reserva-Acompañante debe ser un número entero"
    )
    .custom(validateReservationsCompanions),
];

export const deleteCompaniosValidation = [
  param("idReservationsCompanions")
    .isInt()
    .withMessage(
      "El id de la relación Reserva-Acompañante debe ser un número entero"
    )
    .custom(validateReservationsCompanions),
];

//Validacion para agregar los pagos
// En Validate_Reservations.js
export const addPaymentsValidation = [
  body("amount")
    .notEmpty()
    .withMessage("El monto es obligatorio")
    .isFloat({ min: 0.01 })
    .withMessage("El monto debe ser un número positivo"),

  body("paymentMethod")
    .notEmpty()
    .withMessage("El método de pago es obligatorio")
    .isIn(["Efectivo", "Tarjeta", "Transferencia"])
    .withMessage("Método de pago no válido"),

  body("paymentDate")
    .optional()
    .isISO8601()
    .withMessage("Fecha de pago inválida"),

  body("status")
    .optional()
    .isIn(["Pendiente", "Confirmado", "Anulado"])
    .withMessage("Estado no válido"),
];

//Validacion para agregar el plan
export const addPlansValidation = [
  body("idReservation")
    .notEmpty()
    .withMessage("El ID de la reservación es obligatorio")
    .isInt()
    .withMessage("El ID de la reservación debe ser un número entero")
    .custom(validateReservationsExistence),

  body("idPlan")
    .notEmpty()
    .withMessage("El ID del plan es obligatorio")
    .isInt()
    .withMessage("El ID del plan debe ser un número entero")
    .custom(async (value) => {
      const plan = await Plans.findByPk(value);
      if (!plan) {
        throw new Error("El plan no existe");
      }
      return true;
    }),
];

//Validacion para agregar la cabaña
export const addCabinsValidation = [
  body("idReservation")
    .notEmpty()
    .withMessage("El ID de la reserva es obligatorio")
    .isInt()
    .withMessage("El ID de la reserva debe ser un número entero")
    .custom(validateReservationsExistence),

  body("idCabin")
    .optional()
    .isInt()
    .withMessage("El ID de la cabaña debe ser un número entero")
    .custom(async (value, { req }) => {
      if (!value) return true;
      const cabin = await Cabins.findByPk(value);
      if (!cabin) throw new Error("La cabaña no existe");
      const { startDate, endDate } = req.body;
      if (!startDate || !endDate) return true;
      const overlapping = await Reservations.findOne({
        include: [{
          model: Cabins,
          as: "cabins",
          where: { idCabin: value }
        }],
        where: {
          status: { [Op.in]: ["Reservado", "Confirmado"] },
          [Op.or]: [
            { startDate: { [Op.between]: [startDate, endDate] } },
            { endDate: { [Op.between]: [startDate, endDate] } },
            { startDate: { [Op.lte]: startDate }, endDate: { [Op.gte]: endDate } }
          ]
        }
      });
      if (overlapping) throw new Error("La cabaña ya está reservada para esas fechas");
      return true;
    }),
];

//Validacion para agregar las habitaciones
export const addRoomsValidation = [
  body("idReservation")
    .notEmpty()
    .withMessage("El ID de la reserva es obligatorio")
    .isInt()
    .withMessage("El ID de la reserva debe ser un número entero")
    .custom(validateReservationsExistence),
  body("idRoom")
    .optional()
    .isInt()
    .withMessage("El ID de la habitación debe ser un número entero")
    .custom(async (value, { req }) => {
      if (!value) return true;
      const bedrooms = await Bedrooms.findByPk(value);
      if (!bedrooms) throw new Error("La habitación no existe");
      const { startDate, endDate } = req.body;
      if (!startDate || !endDate) return true;
      const overlapping = await Reservations.findOne({
        include: [{
          model: Bedrooms,
          as: "bedrooms",
          where: { idRoom: value }
        }],
        where: {
          status: { [Op.in]: ["Reservado", "Confirmado"] },
          [Op.or]: [
            { startDate: { [Op.between]: [startDate, endDate] } },
            { endDate: { [Op.between]: [startDate, endDate] } },
            { startDate: { [Op.lte]: startDate }, endDate: { [Op.gte]: endDate } }
          ]
        }
      });
      if (overlapping) throw new Error("La habitación ya está reservada para esas fechas");
      return true;
    }),
];

//Vlidacion para agregar servicios
export const addServicesValidation = [
  body("idReservation")
    .notEmpty()
    .withMessage("El ID de la reserva es obligatorio")
    .isInt()
    .withMessage("El ID de la reserva debe ser un número entero")
    .custom(validateReservationsExistence),
  body("Id_Service")
    .notEmpty()
    .withMessage("El ID del servicio es obligatorio")
    .isInt()
    .withMessage("El ID del servicio debe ser un número entero")
    .custom(async (value) => {
      const service = await Services.findByPk(value);
      if (!service) {
        throw new Error("El servicio no existe");
      }
    }),
];
