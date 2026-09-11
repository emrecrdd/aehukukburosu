import axios from '../../app/config/axios.js';

const casePartyApi = {
  getByCase: (
    caseId
  ) => {
    return axios.get(
      `/case-parties/case/${caseId}`
    );
  },

  create: (
    caseId,
    data
  ) => {
    return axios.post(
      `/case-parties/case/${caseId}`,
      data
    );
  },

  getOne: (
    id
  ) => {
    return axios.get(
      `/case-parties/${id}`
    );
  },

  update: (
    id,
    data
  ) => {
    return axios.patch(
      `/case-parties/${id}`,
      data
    );
  },

  remove: (
    id
  ) => {
    return axios.delete(
      `/case-parties/${id}`
    );
  },
};

export default casePartyApi;