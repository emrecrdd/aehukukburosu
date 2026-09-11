import { User } from './User.js';
import { Client } from './Client.js';
import { Consultation } from './Consultation.js';
import { ConsultationAssignee } from './ConsultationAssignee.js';
import { Case } from './Case.js';
import { CaseParty } from './CaseParty.js';
import { Document } from './Document.js';
import { Task } from './Task.js';
import { TaskAssignee } from './TaskAssignee.js';
import { Event } from './Event.js';
import { Meeting } from './Meeting.js';
import { MeetingAttendee } from './MeetingAttendee.js';
import { Note } from './Note.js';
import { AuditLog } from './AuditLog.js';
import { Notification } from './Notification.js';
import { PowerOfAttorney } from './PowerOfAttorney.js';
import { Template } from './Template.js';
import { AIAnalysis } from './AIAnalysis.js';
import { Reminder } from './Reminder.js';
import { CalendarIntegration } from './CalendarIntegration.js';
import { Conversation } from './Conversation.js';
import { ConversationMember } from './ConversationMember.js';
import { Message } from './Message.js';
import { MessageAttachment } from './MessageAttachment.js';
import { FinanceAccount } from './FinanceAccount.js';
import { FinanceFeeAgreement } from './FinanceFeeAgreement.js';
import { FinanceReceivable } from './FinanceReceivable.js';
import { FinanceTransaction } from './FinanceTransaction.js';
import { FinanceAllocation } from './FinanceAllocation.js';
import { FinanceAuditEvent } from './FinanceAuditEvent.js';
import { FinanceExpense } from './FinanceExpense.js';
import { FinancePeriod } from './FinancePeriod.js';
import { FinancePaymentPlan } from './FinancePaymentPlan.js';
import { FinanceInstallment } from './FinanceInstallment.js';
import { FinanceReceivableAdjustment } from './FinanceReceivableAdjustment.js';
import { FinanceRefundAllocation } from './FinanceRefundAllocation.js';
const initModels = (sequelize) => {
  // ======================================================
  // MODEL INITIALIZATION
  // ======================================================

  User.initModel(sequelize);
  Client.initModel(sequelize);
  Consultation.initModel(sequelize);
  ConsultationAssignee.initModel(sequelize);
  Case.initModel(sequelize);
  CaseParty.initModel(sequelize);
  Document.initModel(sequelize);

  Task.initModel(sequelize);
  TaskAssignee.initModel(sequelize);

  Event.initModel(sequelize);
  Meeting.initModel(sequelize);
  MeetingAttendee.initModel(sequelize);

  FinanceAccount.initModel(sequelize);
  FinanceFeeAgreement.initModel(sequelize);
  FinanceReceivable.initModel(sequelize);
  FinanceTransaction.initModel(sequelize);
  FinanceAllocation.initModel(sequelize);
  FinanceAuditEvent.initModel(sequelize);
  FinanceExpense.initModel(sequelize);
  FinancePeriod.initModel(sequelize);
  FinancePaymentPlan.initModel(sequelize);
  FinanceInstallment.initModel(sequelize);
  FinanceReceivableAdjustment.initModel(sequelize);
  FinanceRefundAllocation.initModel(sequelize);

  Note.initModel(sequelize);
  AuditLog.initModel(sequelize);
  Notification.initModel(sequelize);
  PowerOfAttorney.initModel(sequelize);
  Template.initModel(sequelize);
  AIAnalysis.initModel(sequelize);
  Reminder.initModel(sequelize);

  CalendarIntegration.initModel(
    sequelize
  );
Conversation.initModel(sequelize);
ConversationMember.initModel(sequelize);
Message.initModel(sequelize);
MessageAttachment.initModel(sequelize);
  // ======================================================
  // USER ASSOCIATIONS
  // ======================================================

  User.hasMany(Client, {
    foreignKey: 'created_by',
    as: 'clients',
  });

  Client.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator',
  });

  User.hasMany(Case, {
    foreignKey: 'created_by',
    as: 'createdCases',
  });

  Case.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator',
  });

  User.hasMany(Case, {
    foreignKey: 'assigned_to',
    as: 'assignedCases',
  });

  Case.belongsTo(User, {
    foreignKey: 'assigned_to',
    as: 'assignee',
  });

  // ======================================================
  // TASK USER ASSOCIATIONS
  // ======================================================

  /*
   * Çoklu görev ataması artık gerçek TaskAssignee
   * modeli üzerinden yönetiliyor.
   *
   * task_assignees:
   * - task_id
   * - user_id
   * - status
   * - progress
   * - started_at
   * - completed_at
   * - actual_hours
   */

  User.belongsToMany(Task, {
    through: TaskAssignee,

    foreignKey: 'user_id',

    otherKey: 'task_id',

    as: 'assignedTasks',
  });

  Task.belongsToMany(User, {
    through: TaskAssignee,

    foreignKey: 'task_id',

    otherKey: 'user_id',

    as: 'assignees',
  });

  // ======================================================
  // TASK ASSIGNEE DIRECT ASSOCIATIONS
  // ======================================================

  /*
   * Performans kayıtlarına direkt erişim için:
   *
   * task.getAssignmentRecords()
   * user.getTaskAssignments()
   *
   * kullanılabilecek.
   */

  Task.hasMany(TaskAssignee, {
    foreignKey: 'task_id',
    as: 'assignmentRecords',
  });

  TaskAssignee.belongsTo(Task, {
    foreignKey: 'task_id',
    as: 'task',
  });

  User.hasMany(TaskAssignee, {
    foreignKey: 'user_id',
    as: 'taskAssignments',
  });

  TaskAssignee.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  // ======================================================
  // TASK CREATOR
  // ======================================================

  User.hasMany(Task, {
    foreignKey: 'created_by',
    as: 'createdTasks',
  });

  Task.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator',
  });

  // ======================================================
  // TASK APPROVER
  // ======================================================

  User.hasMany(Task, {
    foreignKey: 'approved_by',
    as: 'approvedTasks',
  });

  Task.belongsTo(User, {
    foreignKey: 'approved_by',
    as: 'approver',
  });

  // ======================================================
  // FINANCE V2 PAYMENT PLAN ASSOCIATIONS
  // ======================================================
  FinancePaymentPlan.hasMany(FinanceInstallment, { foreignKey: 'payment_plan_id', as: 'installments' });
  FinanceInstallment.belongsTo(FinancePaymentPlan, { foreignKey: 'payment_plan_id', as: 'paymentPlan' });
  FinanceInstallment.belongsTo(FinanceReceivable, { foreignKey: 'receivable_id', as: 'receivable' });
  FinanceReceivable.hasOne(FinanceInstallment, { foreignKey: 'receivable_id', as: 'installment' });
  FinanceReceivable.hasMany(FinanceReceivableAdjustment, { foreignKey: 'receivable_id', as: 'adjustments' });
  FinanceReceivableAdjustment.belongsTo(FinanceReceivable, { foreignKey: 'receivable_id', as: 'receivable' });
  FinanceTransaction.hasMany(FinanceRefundAllocation, { foreignKey: 'refund_transaction_id', as: 'refundAllocations' });
  FinanceRefundAllocation.belongsTo(FinanceTransaction, { foreignKey: 'refund_transaction_id', as: 'refundTransaction' });
  FinanceRefundAllocation.belongsTo(FinanceTransaction, { foreignKey: 'original_transaction_id', as: 'originalTransaction' });
  FinanceRefundAllocation.belongsTo(FinanceReceivable, { foreignKey: 'receivable_id', as: 'receivable' });
  FinanceReceivable.hasMany(FinanceRefundAllocation, { foreignKey: 'receivable_id', as: 'refundAllocations' });
  FinancePaymentPlan.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  FinancePaymentPlan.belongsTo(Case, { foreignKey: 'case_id', as: 'case' });
  FinancePaymentPlan.belongsTo(Consultation, { foreignKey: 'consultation_id', as: 'consultation' });
  FinancePaymentPlan.belongsTo(FinanceFeeAgreement, { foreignKey: 'fee_agreement_id', as: 'feeAgreement' });

  User.hasMany(Note, {
    foreignKey: 'created_by',
    as: 'createdNotes',
  });

  Note.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator',
  });

  User.hasMany(AuditLog, {
    foreignKey: 'user_id',
    as: 'auditLogs',
  });

  AuditLog.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  User.hasMany(Document, {
    foreignKey: 'uploaded_by',
    as: 'uploadedDocuments',
  });

  Document.belongsTo(User, {
    foreignKey: 'uploaded_by',
    as: 'uploader',
  });

  User.hasMany(Event, {
    foreignKey: 'created_by',
    as: 'createdEvents',
  });

  Event.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator',
  });

  User.hasMany(Event, {
    foreignKey: 'assigned_to',
    as: 'assignedEvents',
  });

  Event.belongsTo(User, {
    foreignKey: 'assigned_to',
    as: 'assignedTo',
  });

  User.hasMany(Meeting, {
    foreignKey: 'created_by',
    as: 'createdMeetings',
  });

  Meeting.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator',
  });

  User.hasMany(Meeting, {
    foreignKey: 'assigned_to',
    as: 'assignedMeetings',
  });

  Meeting.belongsTo(User, {
    foreignKey: 'assigned_to',
    as: 'assignee',
  });

  // ======================================================
  // MEETING PARTICIPANT ASSOCIATIONS
  // ======================================================

  /*
   * Meeting modelinde zaten `attendees` adında JSONB alan bulunduğu için
   * association alias'ı olarak `attendees` kullanılmıyor.
   *
   * - attendees JSONB: harici / serbest katılımcı bilgileri
   * - participantUsers: Derkenar iç kullanıcı katılımcıları
   *
   * Legacy assigned_to ilişkisi geçiş sürecinde korunur.
   */

  User.belongsToMany(Meeting, {
    through: MeetingAttendee,
    foreignKey: 'user_id',
    otherKey: 'meeting_id',
    as: 'participatingMeetings',
  });

  Meeting.belongsToMany(User, {
    through: MeetingAttendee,
    foreignKey: 'meeting_id',
    otherKey: 'user_id',
    as: 'participantUsers',
  });

  Meeting.hasMany(MeetingAttendee, {
    foreignKey: 'meeting_id',
    as: 'participantRecords',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  });

  MeetingAttendee.belongsTo(Meeting, {
    foreignKey: 'meeting_id',
    as: 'meeting',
  });

  User.hasMany(MeetingAttendee, {
    foreignKey: 'user_id',
    as: 'meetingParticipantRecords',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  });

  MeetingAttendee.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  // ======================================================
  // CALENDAR INTEGRATION ASSOCIATIONS
  // ======================================================

  /*
   * Bir kullanıcı ileride birden fazla takvim sağlayıcısı
   * bağlayabilir:
   *
   * - google
   * - microsoft
   *
   * Veritabanındaki unique constraint:
   *
   * user_id + provider
   *
   * kombinasyonunu tekilleştirir.
   */

  User.hasMany(
    CalendarIntegration,
    {
      foreignKey:
        'user_id',

      as:
        'calendarIntegrations',

      onUpdate:
        'CASCADE',

      onDelete:
        'CASCADE',
    }
  );

  CalendarIntegration.belongsTo(
    User,
    {
      foreignKey:
        'user_id',

      as:
        'user',
    }
  );

  User.hasMany(Notification, {
    foreignKey: 'user_id',
    as: 'notifications',
  });

  Notification.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  User.hasMany(PowerOfAttorney, {
    foreignKey: 'created_by',
    as: 'powerOfAttorneys',
  });

  PowerOfAttorney.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator',
  });

  // ======================================================
  // TEMPLATE - USER ASSOCIATIONS
  // ======================================================

  User.hasMany(Template, {
    foreignKey: 'created_by',
    as: 'templates',
  });

  Template.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator',
  });

  User.hasMany(Template, {
    foreignKey: 'updated_by',
    as: 'updatedTemplates',
  });

  Template.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'updater',
  });

  // ======================================================
  // CLIENT ASSOCIATIONS
  // ======================================================

  Client.belongsToMany(Case, {
    through: 'case_clients',
    foreignKey: 'client_id',
    otherKey: 'case_id',
    as: 'cases',
  });

  Client.hasMany(Note, {
    foreignKey: 'client_id',
    as: 'clientNotes',
  });

  Note.belongsTo(Client, {
    foreignKey: 'client_id',
    as: 'client',
  });


  Client.hasMany(Document, {
    foreignKey: 'client_id',
    as: 'documents',
  });

  Document.belongsTo(Client, {
    foreignKey: 'client_id',
    as: 'client',
  });

  Client.hasMany(Meeting, {
    foreignKey: 'client_id',
    as: 'meetings',
  });

  Meeting.belongsTo(Client, {
    foreignKey: 'client_id',
    as: 'client',
  });

  Client.hasMany(PowerOfAttorney, {
    foreignKey: 'client_id',
    as: 'powerOfAttorneys',
  });

  PowerOfAttorney.belongsTo(Client, {
    foreignKey: 'client_id',
    as: 'client',
  });

  Client.hasMany(Task, {
    foreignKey: 'client_id',
    as: 'tasks',
  });

  Task.belongsTo(Client, {
    foreignKey: 'client_id',
    as: 'client',
  });

  // ======================================================
  // CONSULTATION ASSOCIATIONS
  // ======================================================

  Client.hasMany(Consultation, {
    foreignKey: 'client_id',
    as: 'consultations',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  Consultation.belongsTo(Client, {
    foreignKey: 'client_id',
    as: 'client',
  });

  User.hasMany(Consultation, {
    foreignKey: 'created_by',
    as: 'createdConsultations',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  Consultation.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator',
  });

  User.hasMany(Consultation, {
    foreignKey: 'updated_by',
    as: 'updatedConsultations',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  Consultation.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'updater',
  });

  Case.hasMany(Consultation, {
    foreignKey: 'converted_case_id',
    as: 'sourceConsultations',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  Consultation.belongsTo(Case, {
    foreignKey: 'converted_case_id',
    as: 'convertedCase',
  });

  User.belongsToMany(Consultation, {
    through: ConsultationAssignee,
    foreignKey: 'user_id',
    otherKey: 'consultation_id',
    as: 'assignedConsultations',
  });

  Consultation.belongsToMany(User, {
    through: ConsultationAssignee,
    foreignKey: 'consultation_id',
    otherKey: 'user_id',
    as: 'assignees',
  });

  Consultation.hasMany(ConsultationAssignee, {
    foreignKey: 'consultation_id',
    as: 'assignmentRecords',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  });

  ConsultationAssignee.belongsTo(Consultation, {
    foreignKey: 'consultation_id',
    as: 'consultation',
  });

  User.hasMany(ConsultationAssignee, {
    foreignKey: 'user_id',
    as: 'consultationAssignments',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  ConsultationAssignee.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  User.hasMany(ConsultationAssignee, {
    foreignKey: 'assigned_by',
    as: 'createdConsultationAssignments',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  ConsultationAssignee.belongsTo(User, {
    foreignKey: 'assigned_by',
    as: 'assigner',
  });

  // ======================================================
  // CONSULTATION CHILD ASSOCIATIONS
  // ======================================================

  Consultation.hasMany(Task, {
    foreignKey: 'consultation_id',
    as: 'tasks',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  Task.belongsTo(Consultation, {
    foreignKey: 'consultation_id',
    as: 'consultation',
  });

  Consultation.hasMany(Meeting, {
    foreignKey: 'consultation_id',
    as: 'meetings',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  Meeting.belongsTo(Consultation, {
    foreignKey: 'consultation_id',
    as: 'consultation',
  });

  Consultation.hasMany(Document, {
    foreignKey: 'consultation_id',
    as: 'documents',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  Document.belongsTo(Consultation, {
    foreignKey: 'consultation_id',
    as: 'consultation',
  });

  Consultation.hasMany(Note, {
    foreignKey: 'consultation_id',
    as: 'notes',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  Note.belongsTo(Consultation, {
    foreignKey: 'consultation_id',
    as: 'consultation',
  });

  // ======================================================
  // CASE ASSOCIATIONS
  // ======================================================

  Case.belongsToMany(Client, {
    through: 'case_clients',
    foreignKey: 'case_id',
    otherKey: 'client_id',
    as: 'clients',
  });

  Case.hasMany(CaseParty, {
    foreignKey: 'case_id',
    as: 'parties',
  });

  CaseParty.belongsTo(Case, {
    foreignKey: 'case_id',
    as: 'case',
  });

  Case.hasMany(Document, {
    foreignKey: 'case_id',
    as: 'documents',
  });

  Document.belongsTo(Case, {
    foreignKey: 'case_id',
    as: 'case',
  });

  Case.hasMany(Task, {
    foreignKey: 'case_id',
    as: 'tasks',
  });

  Task.belongsTo(Case, {
    foreignKey: 'case_id',
    as: 'case',
  });

  Case.hasMany(Event, {
    foreignKey: 'case_id',
    as: 'events',
  });

  Event.belongsTo(Case, {
    foreignKey: 'case_id',
    as: 'case',
  });

  Case.hasMany(Note, {
    foreignKey: 'case_id',
    as: 'notes',
  });

  Note.belongsTo(Case, {
    foreignKey: 'case_id',
    as: 'case',
  });


  Case.hasMany(Meeting, {
    foreignKey: 'case_id',
    as: 'meetings',
  });

  Meeting.belongsTo(Case, {
    foreignKey: 'case_id',
    as: 'case',
  });

  Case.hasMany(PowerOfAttorney, {
    foreignKey: 'case_id',
    as: 'powerOfAttorneys',
  });

  PowerOfAttorney.belongsTo(Case, {
    foreignKey: 'case_id',
    as: 'case',
  });


  // ======================================================
  // FINANCE V2 ASSOCIATIONS
  // ======================================================

  User.hasMany(FinanceAccount, { foreignKey: 'created_by', as: 'createdFinanceAccounts' });
  FinanceAccount.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
  FinanceAccount.hasMany(FinanceTransaction, { foreignKey: 'account_id', as: 'transactions' });
  FinanceTransaction.belongsTo(FinanceAccount, { foreignKey: 'account_id', as: 'account' });

  Client.hasMany(FinanceFeeAgreement, { foreignKey: 'client_id', as: 'financeFeeAgreements' });
  FinanceFeeAgreement.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  Case.hasMany(FinanceFeeAgreement, { foreignKey: 'case_id', as: 'financeFeeAgreements' });
  FinanceFeeAgreement.belongsTo(Case, { foreignKey: 'case_id', as: 'case' });
  Consultation.hasMany(FinanceFeeAgreement, { foreignKey: 'consultation_id', as: 'financeFeeAgreements' });
  FinanceFeeAgreement.belongsTo(Consultation, { foreignKey: 'consultation_id', as: 'consultation' });

  FinanceFeeAgreement.hasMany(FinanceReceivable, { foreignKey: 'fee_agreement_id', as: 'receivables' });
  FinanceReceivable.belongsTo(FinanceFeeAgreement, { foreignKey: 'fee_agreement_id', as: 'feeAgreement' });

  Client.hasMany(FinanceReceivable, { foreignKey: 'client_id', as: 'financeReceivables' });
  FinanceReceivable.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  Case.hasMany(FinanceReceivable, { foreignKey: 'case_id', as: 'financeReceivables' });
  FinanceReceivable.belongsTo(Case, { foreignKey: 'case_id', as: 'case' });
  Consultation.hasMany(FinanceReceivable, { foreignKey: 'consultation_id', as: 'financeReceivables' });
  FinanceReceivable.belongsTo(Consultation, { foreignKey: 'consultation_id', as: 'consultation' });

  Client.hasMany(FinanceTransaction, { foreignKey: 'client_id', as: 'financeTransactions' });
  FinanceTransaction.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  Case.hasMany(FinanceTransaction, { foreignKey: 'case_id', as: 'financeTransactions' });
  FinanceTransaction.belongsTo(Case, { foreignKey: 'case_id', as: 'case' });
  Consultation.hasMany(FinanceTransaction, { foreignKey: 'consultation_id', as: 'financeTransactions' });
  FinanceTransaction.belongsTo(Consultation, { foreignKey: 'consultation_id', as: 'consultation' });

  FinanceTransaction.hasMany(FinanceAllocation, { foreignKey: 'transaction_id', as: 'allocations' });
  FinanceAllocation.belongsTo(FinanceTransaction, { foreignKey: 'transaction_id', as: 'transaction' });
  FinanceReceivable.hasMany(FinanceAllocation, { foreignKey: 'receivable_id', as: 'allocations' });
  FinanceAllocation.belongsTo(FinanceReceivable, { foreignKey: 'receivable_id', as: 'receivable' });

  FinanceTransaction.belongsTo(FinanceTransaction, { foreignKey: 'reversed_transaction_id', as: 'reversedTransaction' });
  FinanceTransaction.hasMany(FinanceTransaction, { foreignKey: 'reversed_transaction_id', as: 'reversals' });

  User.hasMany(FinanceAuditEvent, { foreignKey: 'actor_id', as: 'financeAuditEvents' });
  FinanceAuditEvent.belongsTo(User, { foreignKey: 'actor_id', as: 'actor' });
  User.hasMany(FinanceExpense, { foreignKey: 'created_by', as: 'createdFinanceExpenses' });
  FinanceExpense.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
  Client.hasMany(FinanceExpense, { foreignKey: 'client_id', as: 'financeExpenses' });
  FinanceExpense.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  Case.hasMany(FinanceExpense, { foreignKey: 'case_id', as: 'financeExpenses' });
  FinanceExpense.belongsTo(Case, { foreignKey: 'case_id', as: 'case' });
  Consultation.hasMany(FinanceExpense, { foreignKey: 'consultation_id', as: 'financeExpenses' });
  FinanceExpense.belongsTo(Consultation, { foreignKey: 'consultation_id', as: 'consultation' });
  FinanceExpense.belongsTo(FinanceTransaction, { foreignKey: 'transaction_id', as: 'transaction' });
  FinanceExpense.belongsTo(FinanceReceivable, { foreignKey: 'reimbursement_receivable_id', as: 'reimbursementReceivable' });

  // ======================================================
  // DOCUMENT ASSOCIATIONS
  // ======================================================

  Document.hasMany(
    Document,
    {
      foreignKey:
        'parent_id',

      as:
        'versions',
    }
  );

  Document.belongsTo(
    Document,
    {
      foreignKey:
        'parent_id',

      as:
        'parent',
    }
  );

  PowerOfAttorney.hasMany(
    Document,
    {
      foreignKey:
        'power_of_attorney_id',

      as:
        'documents',
    }
  );

  Document.belongsTo(
    PowerOfAttorney,
    {
      foreignKey:
        'power_of_attorney_id',

      as:
        'powerOfAttorney',
    }
  );

  // ======================================================
  // TASK ASSOCIATIONS
  // ======================================================

  Task.hasMany(
    Task,
    {
      foreignKey:
        'parent_task_id',

      as:
        'subtasks',
    }
  );

  Task.belongsTo(
    Task,
    {
      foreignKey:
        'parent_task_id',

      as:
        'parentTask',
    }
  );

  Task.hasMany(
    Note,
    {
      foreignKey:
        'task_id',

      as:
        'taskNotes',
    }
  );

  Note.belongsTo(
    Task,
    {
      foreignKey:
        'task_id',

      as:
        'task',
    }
  );

  // ======================================================
  // AI ANALYSIS ASSOCIATIONS
  // ======================================================

  User.hasMany(
    AIAnalysis,
    {
      foreignKey:
        'user_id',

      as:
        'aiAnalyses',
    }
  );

  AIAnalysis.belongsTo(
    User,
    {
      foreignKey:
        'user_id',

      as:
        'user',
    }
  );

  Document.hasMany(
    AIAnalysis,
    {
      foreignKey:
        'document_id',

      as:
        'aiAnalyses',
    }
  );

  AIAnalysis.belongsTo(
    Document,
    {
      foreignKey:
        'document_id',

      as:
        'document',
    }
  );

  Case.hasMany(
    AIAnalysis,
    {
      foreignKey:
        'case_id',

      as:
        'aiAnalyses',
    }
  );

  AIAnalysis.belongsTo(
    Case,
    {
      foreignKey:
        'case_id',

      as:
        'case',
    }
  );
// ======================================================
// CHAT ASSOCIATIONS
// ======================================================

User.hasMany(ConversationMember, {
  foreignKey: 'user_id',
  as: 'conversationMemberships',
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE',
});

ConversationMember.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

Conversation.hasMany(ConversationMember, {
  foreignKey: 'conversation_id',
  as: 'members',
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE',
});

ConversationMember.belongsTo(Conversation, {
  foreignKey: 'conversation_id',
  as: 'conversation',
});

User.belongsToMany(Conversation, {
  through: ConversationMember,
  foreignKey: 'user_id',
  otherKey: 'conversation_id',
  as: 'conversations',
});

Conversation.belongsToMany(User, {
  through: ConversationMember,
  foreignKey: 'conversation_id',
  otherKey: 'user_id',
  as: 'users',
});

User.hasMany(Conversation, {
  foreignKey: 'created_by',
  as: 'createdConversations',
});

Conversation.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator',
});

Conversation.hasMany(Message, {
  foreignKey: 'conversation_id',
  as: 'messages',
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE',
});

Message.belongsTo(Conversation, {
  foreignKey: 'conversation_id',
  as: 'conversation',
});

User.hasMany(Message, {
  foreignKey: 'sender_id',
  as: 'sentMessages',
});

Message.belongsTo(User, {
  foreignKey: 'sender_id',
  as: 'sender',
});

Message.hasMany(MessageAttachment, {
  foreignKey: 'message_id',
  as: 'attachments',
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE',
});

MessageAttachment.belongsTo(Message, {
  foreignKey: 'message_id',
  as: 'message',
});

ConversationMember.belongsTo(Message, {
  foreignKey: 'last_read_message_id',
  as: 'lastReadMessage',
});
  // ======================================================
  // REMINDER ASSOCIATIONS
  // ======================================================

  User.hasMany(
    Reminder,
    {
      foreignKey:
        'user_id',

      as:
        'reminders',

      onUpdate:
        'CASCADE',

      onDelete:
        'CASCADE',
    }
  );

  Reminder.belongsTo(
    User,
    {
      foreignKey:
        'user_id',

      as:
        'user',
    }
  );

  User.hasMany(
    Reminder,
    {
      foreignKey:
        'created_by',

      as:
        'createdReminders',

      onUpdate:
        'CASCADE',

      onDelete:
        'RESTRICT',
    }
  );

  Reminder.belongsTo(
    User,
    {
      foreignKey:
        'created_by',

      as:
        'creator',
    }
  );

  Task.hasMany(
    Reminder,
    {
      foreignKey:
        'task_id',

      as:
        'reminders',

      onUpdate:
        'CASCADE',

      onDelete:
        'CASCADE',
    }
  );

  Reminder.belongsTo(
    Task,
    {
      foreignKey:
        'task_id',

      as:
        'task',
    }
  );

  Event.hasMany(
    Reminder,
    {
      foreignKey:
        'event_id',

      as:
        'reminders',

      onUpdate:
        'CASCADE',

      onDelete:
        'CASCADE',
    }
  );

  Reminder.belongsTo(
    Event,
    {
      foreignKey:
        'event_id',

      as:
        'event',
    }
  );

  Meeting.hasMany(
    Reminder,
    {
      foreignKey:
        'meeting_id',

      as:
        'reminders',

      onUpdate:
        'CASCADE',

      onDelete:
        'CASCADE',
    }
  );

  Reminder.belongsTo(
    Meeting,
    {
      foreignKey:
        'meeting_id',

      as:
        'meeting',
    }
  );

  return sequelize;
};

export {
  initModels,

  User,
  Client,
  Consultation,
  ConsultationAssignee,
  Case,
  CaseParty,
  Document,

  Task,
  TaskAssignee,

  Event,
  Meeting,
  MeetingAttendee,


  Note,
  AuditLog,
  Notification,
  PowerOfAttorney,
  Template,
  AIAnalysis,
  Reminder,

  CalendarIntegration,
  
  Conversation,
ConversationMember,
Message,
MessageAttachment,
  FinanceAccount,
  FinanceFeeAgreement,
  FinanceReceivable,
  FinanceTransaction,
  FinanceAllocation,
  FinanceAuditEvent,
  FinanceExpense,
  FinancePeriod,
  FinancePaymentPlan,
  FinanceInstallment,
  FinanceReceivableAdjustment,
  FinanceRefundAllocation,
};