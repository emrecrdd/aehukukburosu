import axios from '../../app/config/axios.js';

const searchApi = {
  // Global search
  search: (query, type = 'all', limit = 20) => {
    return axios.get('/search', {
      params: { q: query, type, limit },
    });
  },

  // Search all
  searchAll: (query, limit = 10) => {
    return axios.get('/search/all', {
      params: { q: query, limit },
    });
  },

  // Search clients
  searchClients: (query, limit = 20) => {
    return axios.get('/search/clients', {
      params: { q: query, limit },
    });
  },

  // Search cases
  searchCases: (query, limit = 20) => {
    return axios.get('/search/cases', {
      params: { q: query, limit },
    });
  },

  // Search consultations
  searchConsultations: (query, limit = 20) => {
    return axios.get('/search/consultations', {
      params: { q: query, limit },
    });
  },

  // Search documents
  searchDocuments: (query, limit = 20) => {
    return axios.get('/search/documents', {
      params: { q: query, limit },
    });
  },

  // Search tasks
  searchTasks: (query, limit = 20) => {
    return axios.get('/search/tasks', {
      params: { q: query, limit },
    });
  },

  // Search notes
  searchNotes: (query, limit = 20) => {
    return axios.get('/search/notes', {
      params: { q: query, limit },
    });
  },

  // Get search suggestions
  getSuggestions: (query) => {
    return axios.get('/search/suggestions', {
      params: { q: query },
    });
  },
};

export default searchApi;
