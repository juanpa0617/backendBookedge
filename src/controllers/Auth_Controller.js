import {
  loginService,
  registerCustomerService,
  refreshAccessToken,
  logoutService,
  recoveryPassword,
  resetPasswordService,
  updateProfileService,
} from "../services/authService.js";
import { getUserByIdService } from "../services/Users_Services.js";
import { validationResult } from "express-validator";

export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    const loginData = await loginService(email, password);

    // 1. Establecer Cookies para el Cliente Web
    res.cookie("authToken", loginData.token, {
      httpOnly: true,
      secure: true, // Render es HTTPS
      maxAge: 60 * 60 * 1000,
      sameSite: 'None',
    });
    res.cookie("refreshToken", loginData.refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'None',
    });

    // 2. Devolver solo el access token y el usuario en el cuerpo (NO el refresh token)
    return res.status(200).json({
      message: "Login exitoso",
      user: loginData.user,
      token: loginData.token
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const registerController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const registerData = await registerCustomerService(req.body);

    res.cookie("authToken", registerData.token, {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 1000,
      sameSite: 'None',
    });
    res.cookie("refreshToken", registerData.refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'None',
    });

    return res.status(201).json({
      message: "Registro exitoso",
      user: registerData.user,
      token: registerData.token
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const refreshTokenController = async (req, res) => {
  try {
    const receivedRefreshToken = req.cookies?.refreshToken;

    if (!receivedRefreshToken) {
      return res.status(401).json({ message: "No se proporcionó refresh token Controlelr 2" });
    }

    const refreshResult = await refreshAccessToken(receivedRefreshToken);

    // Establecer la cookie del NUEVO authToken para el Cliente Web
    res.cookie("authToken", refreshResult.token, {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 1000,
      sameSite: 'None',
    });

    // Si rotas el refresh token, actualiza la cookie (opcional)
    if (refreshResult.newRefreshToken) {
      res.cookie("refreshToken", refreshResult.newRefreshToken, {
        httpOnly: true,
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'None',
      });
    }

    // Solo devuelve el nuevo access token
    return res.status(200).json({
      message: "Token renovado exitosamente",
      token: refreshResult.token
    });

  } catch (error) {
    return res.status(403).json({ message: error.message });
  }
};

export const logoutController = async (req, res) => {
  try {
    if (req.user && req.user.idUser) {
      await logoutService(req.user.idUser);
    }

    res.clearCookie("authToken", { httpOnly: true, secure: true, sameSite: 'None' });
    res.clearCookie("refreshToken", { httpOnly: true, secure: true, sameSite: 'None' });

    return res.status(200).json({ message: "Sesión cerrada exitosamente" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};


export const recoveryPasswordController = async (req, res) => {
  try {
    const { email } = req.body;
    await recoveryPassword(email);
    return res.status(200).json({ message: "correo de recuperación enviado" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const resetPasswordController = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    await resetPasswordService(token, newPassword);
    return res
      .status(200)
      .json({ message: "Contraseña Reestablecida correctamente" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// Auth_Controller.js
// ...
export const getUserProfileController = async (req, res) => {
  try {
     console.log("getUserProfileController: req.user:", req.user); // <--- BUEN PUNTO PARA UN LOG
    const userId = req.user.idUser; // <--- PUNTO POTENCIAL DE FALLO
    const user = await getUserByIdService(userId);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const userPlain = user.toJSON();
    const {  ...rest } = userPlain;

    return res.status(200).json(rest);
  } catch (error) {
    console.error("Error al obtener el perfil del usuario:", error); // <-- ESTE LOG ES EL QUE DEBERÍAS VER EN TU CONSOLA DEL BACKEND
    return res.status(500).json({ message: "Error interno del servidor" }); // <-- Y ESTO ES LO QUE RECIBE EL FRONTEND
  }
};
// --- CONTROLADOR `updateProfileController` CON AJUSTES Y LOGS ---
export const updateProfileController = async (req, res) => {
  console.log("--- updateProfileController ---");
  console.log("User ID from params (req.params.id):", req.params.id);
  console.log("User ID from token (req.user.idUser):", req.user ? req.user.idUser : "N/A (req.user no definido)");
  console.log("Request body (req.body) ANTES de desestructurar:", JSON.stringify(req.body, null, 2));

  const errorsValidation = validationResult(req);
  if (!errorsValidation.isEmpty()) {
    console.log("Errores de validación de express-validator:", JSON.stringify(errorsValidation.array(), null, 2));
    return res.status(400).json({ errors: errorsValidation.array() });
  }

  try {
    if (!req.user || !req.user.idUser) {
      console.error("updateProfileController: req.user no está definido. Problema con verifyToken.");
      return res.status(401).json({ message: "No autorizado (usuario no identificado)." });
    }
    if (parseInt(req.params.id) !== req.user.idUser) {
      console.warn(`Intento no autorizado de actualizar perfil: params.id ${req.params.id} vs token.idUser ${req.user.idUser}`);
      return res.status(403).json({
        message: "Solo puedes actualizar tu propio perfil.",
      });
    }

    // --- DESESTRUCTURACIÓN CORRECTA DE req.body ---
    // Extraer solo los campos que esperamos y permitimos modificar.
    // idRol y password se ignoran explícitamente aquí si vienen en el body,
    // ya que se manejan en otros lugares o no son modificables por el usuario de esta forma.
    // El email tampoco lo tomamos para actualizar directamente desde aquí.
    const {
       // No se toma para la actualización directa
      // Campos que SÍ nos interesan del body:
      name,
      identification,
      identificationType,
      eps,
      cellphone,
      address,
      birthdate,
      // ...cualquier otro campo que SÍ permitas actualizar y esté en tu formulario
    } = req.body;
    // --- FIN DE DESESTRUCTURACIÓN ---

    // Construir el objeto solo con los datos que realmente se van a actualizar
    // y que están definidos (no undefined)
    const safeDataToUpdate = {
        ...(name !== undefined && { name }),
        ...(identification !== undefined && { identification }),
        ...(identificationType !== undefined && { identificationType }),
        ...(eps !== undefined && { eps }),
        ...(cellphone !== undefined && { cellphone }),
        ...(address !== undefined && { address }),
        ...(birthdate !== undefined && { birthdate }),
    };

    console.log("Datos seguros a enviar al servicio (safeDataToUpdate):", JSON.stringify(safeDataToUpdate, null, 2));

    if (Object.keys(safeDataToUpdate).length === 0) {
        console.log("No hay datos válidos para actualizar después de filtrar el body.");
        // Si no hay nada que actualizar, simplemente devolvemos el usuario actual
        // Esto evita una llamada innecesaria a la BD para "actualizar nada"
        // y luego otra para recargar.
        // Asegúrate que getUserByIdService devuelva el usuario con todos los permisos.
        const currentUser = await getUserByIdService(req.params.id);
        if (!currentUser) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }
        return res.json(currentUser.toJSON ? currentUser.toJSON() : currentUser);
    }

    // Llamar al servicio del backend para actualizar el perfil
    // updateProfileService ahora devuelve el usuario completo con roles y permisos
    const updatedUser = await updateProfileService(req.params.id, safeDataToUpdate);

    console.log("Usuario actualizado y devuelto por el servicio:", JSON.stringify(updatedUser, null, 2));
    return res.json(updatedUser); // updatedUser ya es un objeto plano desde el servicio

  } catch (error) {
    console.error("ERROR en CATCH de updateProfileController:", error);
    // Si el error tiene un stack, loguéalo para más detalle en desarrollo
    if (error.stack) {
        console.error("Stack de error en updateProfileController:", error.stack);
    }
    res.status(400).json({ message: error.message || "Error en el backend al actualizar el perfil." });
  }
};
