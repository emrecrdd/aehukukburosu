import axios from '../../app/config/axios.js';

const aiApi = {
  analyzeDocument(documentId, data = {}) {
    return axios.post(
      `/ai/documents/${documentId}/analyze`,
      data
    );
  },
analyzeCaseCompletion(
  caseId,
  data = {}
) {
  return axios.post(
    `/ai/cases/${caseId}/completion`,
    data
  );
},
  classifyDocument(documentId, data = {}) {
    return axios.post(
      `/ai/documents/${documentId}/classify`,
      data
    );
  },

  getDocumentAnalyses(documentId) {
    return axios.get(
      `/ai/documents/${documentId}/analyses`
    );
  },

  summarizeCase(caseId, data = {}) {
    return axios.post(
      `/ai/cases/${caseId}/summary`,
      data
    );
  },
    askCaseQuestion(caseId, question) {
  return axios.post(
    `/ai/cases/${caseId}/ask`,
    {
      question,
    }
  );
},

prepareForHearing(
  caseId,
  eventId,
  data = {}
) {
  return axios.post(
    `/ai/cases/${caseId}/hearing-preparation`,
    {
      eventId,
      ...data,
    }
  );
},

generateLegalResearch(data) {
  return axios.post(
    '/ai/legal-research',
    data
  );
},

  extractEntities(text, documentId = null) {
    return axios.post('/ai/entities', {
      text,
      documentId,
    });
  },

  generateDraft(data) {
    return axios.post('/ai/drafts', data);
  },

  getAnalysis(analysisId) {
    return axios.get(
      `/ai/analyses/${analysisId}`
    );
  },
};

export default aiApi;