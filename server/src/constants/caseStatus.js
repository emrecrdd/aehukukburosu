export const CASE_STATUS = {
  PREPARATION: 'preparation',
  ACTIVE: 'active',
  HEARING: 'hearing',
  APPEAL: 'appeal',
  CASSATION: 'cassation',
  SUSPENDED: 'suspended',
  CONCLUDED: 'concluded',
  ARCHIVED: 'archived',
};

export const CASE_STATUS_LABELS = {
  [CASE_STATUS.PREPARATION]: 'Hazırlık',
  [CASE_STATUS.ACTIVE]: 'Devam Ediyor',
  [CASE_STATUS.HEARING]: 'Duruşmada',
  [CASE_STATUS.APPEAL]: 'İstinaf',
  [CASE_STATUS.CASSATION]: 'Temyiz',
  [CASE_STATUS.SUSPENDED]: 'Durduruldu',
  [CASE_STATUS.CONCLUDED]: 'Sonuçlandı',
  [CASE_STATUS.ARCHIVED]: 'Arşivlendi',
};

export const CASE_STATUS_COLORS = {
  [CASE_STATUS.PREPARATION]: 'yellow',
  [CASE_STATUS.ACTIVE]: 'green',
  [CASE_STATUS.HEARING]: 'blue',
  [CASE_STATUS.APPEAL]: 'purple',
  [CASE_STATUS.CASSATION]: 'orange',
  [CASE_STATUS.SUSPENDED]: 'orange',
  [CASE_STATUS.CONCLUDED]: 'gray',
  [CASE_STATUS.ARCHIVED]: 'red',
};