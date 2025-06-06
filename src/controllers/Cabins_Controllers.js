import { validationResult } from "express-validator";
import {
  getAllCabinsService,
  getCabinByIdService,
  createCabinService,
  updateCabinService,
  deleteCabinService,
} from "../services/Cabin_Services.js";
import { updateGroupedComfortsByCabinService } from "../services/CabinComfort_Service.js"; 

export const getAllCabinsController = async (req, res) => {
  try {
    const cabins = await getAllCabinsService();
    res.status(200).json(cabins);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getCabinByIdController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const cabin = await getCabinByIdService(req.params.id);
    res.status(200).json(cabin);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const createCabinController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    // ¡AQUÍ FALTA MANEJAR LAS COMODIDADES!
    const { name, description, capacity, status, comforts } = req.body; // Asumimos que 'comforts' puede venir aquí

    const cabinData = { name, description, capacity, status: status || "En Servicio" };
    const newCabin = await createCabinService(cabinData);

    // Si se enviaron comodidades, asignarlas
    if (comforts && Array.isArray(comforts) && comforts.length > 0) {
      await updateGroupedComfortsByCabinService({ idCabin: newCabin.idCabin, comforts });
    }

    const cabinWithDetails = await getCabinByIdService(newCabin.idCabin);
    res.status(201).json(cabinWithDetails);

  } catch (error) {
    console.error("Error en createCabinController:", error);
    res.status(400).json({ message: error.message });
  }
};

export const updateCabinController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { name, description, capacity, status, comforts } = req.body;

    // Obtener la cabaña existente
    const existingCabin = await getCabinByIdService(id);
    if (!existingCabin) {
      return res.status(404).json({ message: "Cabaña no encontrada" });
    }

    const cabinDataToUpdate = {
      name: name === undefined ? existingCabin.name : name,
      description: description === undefined ? existingCabin.description : description,
      capacity: capacity === undefined ? existingCabin.capacity : capacity,
      status: status === undefined ? existingCabin.status : status
    };
    await updateCabinService(id, cabinDataToUpdate);

    // Actualizar comodidades SI se proporcionaron en el body
    if (comforts !== undefined && Array.isArray(comforts)) {
      await updateGroupedComfortsByCabinService({ idCabin: parseInt(id), comforts });
    }

    const updatedCabinWithDetails = await getCabinByIdService(id);
    res.status(200).json(updatedCabinWithDetails);

  } catch (error) {
    console.error("Error en updateCabinController:", error);
    res.status(400).json({ message: error.message });
  }
};

export const deleteCabinController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const idCabin = req.params.id;

   

    await deleteCabinService(idCabin);
    res.status(200).json({ message: "Cabaña eliminada correctamente" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};