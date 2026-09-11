import { PERMISSION_KEYS } from '../../constants/roles.js';

/*
 * Backend V1 anahtarları UPDATE_CONSULTATIONS kullanır.
 * Eski frontend'de EDIT_CONSULTATIONS bulunuyorsa geçiş sırasında fallback edilir.
 * roles.js güncellendiğinde otomatik olarak UPDATE_CONSULTATIONS tercih edilir.
 */
const resolvePermission = (primary, legacy = null) =>
  PERMISSION_KEYS?.[primary] ??
  (legacy ? PERMISSION_KEYS?.[legacy] : undefined) ??
  primary;

export const CONSULTATION_PERMISSION_KEYS = Object.freeze({
  VIEW: resolvePermission('VIEW_CONSULTATIONS'),
  VIEW_ALL: resolvePermission('VIEW_ALL_CONSULTATIONS'),
  CREATE: resolvePermission('CREATE_CONSULTATIONS'),
  UPDATE: resolvePermission('UPDATE_CONSULTATIONS', 'EDIT_CONSULTATIONS'),
  DELETE: resolvePermission('DELETE_CONSULTATIONS'),
  CONVERT: resolvePermission('CONVERT_CONSULTATIONS'),
});

export default CONSULTATION_PERMISSION_KEYS;
