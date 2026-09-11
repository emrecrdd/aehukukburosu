import { aiService } from '../modules/ai/ai.service.js';
import { aiQueue } from './queue.js';
import { logger } from '../config/logger.js';

// Process AI queue
aiQueue.process(async (job) => {
  const { type, data, userId } = job.data;
  
  try {
    let result;
    
    switch (type) {
      case 'analyze_document':
        result = await aiService.analyzeDocument(data.file);
        break;
        
      case 'summarize_case':
        result = await aiService.summarizeCase(data.caseId);
        break;
        
      case 'legal_advice':
        result = await aiService.generateLegalAdvice(data.query, data.context);
        break;
        
      case 'generate_draft':
        result = await aiService.generateDraft(data.type, data.data);
        break;
        
      case 'extract_entities':
        result = await aiService.extractEntities(data.text);
        break;
        
      case 'classify_document':
        result = await aiService.classifyDocument(data.file);
        break;
        
      case 'sentiment_analysis':
        result = await aiService.analyzeSentiment(data.text);
        break;
        
      case 'recommendations':
        result = await aiService.getCaseRecommendations(data.caseId);
        break;
        
      default:
        throw new Error(`Unknown AI job type: ${type}`);
    }
    
    logger.info(`✅ AI job completed: ${type} (User: ${userId})`);
    
    return {
      success: true,
      type,
      result,
      processedAt: new Date().toISOString(),
    };
    
  } catch (error) {
    logger.error(`❌ AI job failed: ${type}`, error);
    throw error;
  }
});

// Schedule AI jobs
export const scheduleAIAnalysis = async (file, userId, options = {}) => {
  return aiQueue.add(
    {
      type: 'analyze_document',
      data: { file },
      userId,
    },
    {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      ...options,
    }
  );
};

export const scheduleCaseSummary = async (caseId, userId, options = {}) => {
  return aiQueue.add(
    {
      type: 'summarize_case',
      data: { caseId },
      userId,
    },
    {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      ...options,
    }
  );
};

export const scheduleLegalAdvice = async (query, context, userId, options = {}) => {
  return aiQueue.add(
    {
      type: 'legal_advice',
      data: { query, context },
      userId,
    },
    {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      ...options,
    }
  );
};

export const scheduleDraftGeneration = async (type, data, userId, options = {}) => {
  return aiQueue.add(
    {
      type: 'generate_draft',
      data: { type, data },
      userId,
    },
    {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      ...options,
    }
  );
};

export const scheduleEntityExtraction = async (text, userId, options = {}) => {
  return aiQueue.add(
    {
      type: 'extract_entities',
      data: { text },
      userId,
    },
    {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      ...options,
    }
  );
};

export const scheduleDocumentClassification = async (file, userId, options = {}) => {
  return aiQueue.add(
    {
      type: 'classify_document',
      data: { file },
      userId,
    },
    {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      ...options,
    }
  );
};

export const scheduleSentimentAnalysis = async (text, userId, options = {}) => {
  return aiQueue.add(
    {
      type: 'sentiment_analysis',
      data: { text },
      userId,
    },
    {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      ...options,
    }
  );
};

export const scheduleRecommendations = async (caseId, userId, options = {}) => {
  return aiQueue.add(
    {
      type: 'recommendations',
      data: { caseId },
      userId,
    },
    {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      ...options,
    }
  );
};

// Get AI job status
export const getAIJobStatus = async (jobId) => {
  try {
    const job = await aiQueue.getJob(jobId);
    if (!job) return null;
    
    const state = await job.getState();
    const progress = job.progress();
    const result = job.returnvalue;
    
    return {
      id: job.id,
      state,
      progress,
      result,
      data: job.data,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  } catch (error) {
    logger.error('Get AI job status error:', error);
    return null;
  }
};

// Cancel AI job
export const cancelAIJob = async (jobId) => {
  try {
    const job = await aiQueue.getJob(jobId);
    if (!job) return false;
    
    await job.remove();
    logger.info(`AI job cancelled: ${jobId}`);
    return true;
  } catch (error) {
    logger.error('Cancel AI job error:', error);
    return false;
  }
};

export default {
  scheduleAIAnalysis,
  scheduleCaseSummary,
  scheduleLegalAdvice,
  scheduleDraftGeneration,
  scheduleEntityExtraction,
  scheduleDocumentClassification,
  scheduleSentimentAnalysis,
  scheduleRecommendations,
  getAIJobStatus,
  cancelAIJob,
};