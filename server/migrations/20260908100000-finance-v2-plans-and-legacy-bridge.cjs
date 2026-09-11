'use strict';

/**
 * Finance V2 phase 2: native payment plans/installments + deterministic legacy bridge metadata.
 * Legacy tables are never dropped here. Backfill is idempotent and runs only when they exist.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    const q = queryInterface.sequelize;
    const uuid = { type:DataTypes.UUID, primaryKey:true, allowNull:false, defaultValue:Sequelize.literal('gen_random_uuid()') };
    const timestamps = {
      created_at:{type:DataTypes.DATE,allowNull:false,defaultValue:Sequelize.fn('NOW')},
      updated_at:{type:DataTypes.DATE,allowNull:false,defaultValue:Sequelize.fn('NOW')},
      deleted_at:{type:DataTypes.DATE,allowNull:true},
    };

    await queryInterface.createTable('finance_payment_plans', {
      id:uuid,
      reference_no:{type:DataTypes.STRING(40),allowNull:false,unique:true},
      fee_agreement_id:{type:DataTypes.UUID,allowNull:true,references:{model:'finance_fee_agreements',key:'id'},onDelete:'SET NULL'},
      client_id:{type:DataTypes.UUID,allowNull:true,references:{model:'clients',key:'id'},onDelete:'SET NULL'},
      case_id:{type:DataTypes.UUID,allowNull:true,references:{model:'cases',key:'id'},onDelete:'SET NULL'},
      consultation_id:{type:DataTypes.UUID,allowNull:true,references:{model:'consultations',key:'id'},onDelete:'SET NULL'},
      title:{type:DataTypes.STRING(255),allowNull:false}, description:{type:DataTypes.TEXT,allowNull:true},
      total_amount:{type:DataTypes.DECIMAL(19,4),allowNull:false}, currency:{type:DataTypes.STRING(3),allowNull:false,defaultValue:'TRY'},
      plan_type:{type:DataTypes.ENUM('one_time','installment','custom'),allowNull:false,defaultValue:'installment'},
      status:{type:DataTypes.ENUM('draft','active','completed','cancelled','defaulted'),allowNull:false,defaultValue:'draft'},
      start_date:{type:DataTypes.DATEONLY,allowNull:true}, end_date:{type:DataTypes.DATEONLY,allowNull:true}, activated_at:{type:DataTypes.DATE,allowNull:true}, completed_at:{type:DataTypes.DATE,allowNull:true}, cancelled_at:{type:DataTypes.DATE,allowNull:true},
      legacy_payment_plan_id:{type:DataTypes.UUID,allowNull:true,unique:true},
      created_by:{type:DataTypes.UUID,allowNull:false,references:{model:'users',key:'id'},onDelete:'RESTRICT'}, ...timestamps,
    });
    await queryInterface.addConstraint('finance_payment_plans',{fields:['client_id','case_id','consultation_id'],type:'check',where:Sequelize.literal('client_id IS NOT NULL OR case_id IS NOT NULL OR consultation_id IS NOT NULL'),name:'ck_finance_payment_plans_context'});
    await queryInterface.addConstraint('finance_payment_plans',{fields:['total_amount'],type:'check',where:{total_amount:{[Sequelize.Op.gt]:0}},name:'ck_finance_payment_plans_total_positive'});

    await queryInterface.createTable('finance_installments', {
      id:uuid,
      payment_plan_id:{type:DataTypes.UUID,allowNull:false,references:{model:'finance_payment_plans',key:'id'},onDelete:'RESTRICT'},
      receivable_id:{type:DataTypes.UUID,allowNull:false,unique:true,references:{model:'finance_receivables',key:'id'},onDelete:'RESTRICT'},
      installment_number:{type:DataTypes.INTEGER,allowNull:false}, title:{type:DataTypes.STRING(255),allowNull:true},
      amount:{type:DataTypes.DECIMAL(19,4),allowNull:false}, currency:{type:DataTypes.STRING(3),allowNull:false}, due_date:{type:DataTypes.DATEONLY,allowNull:false},
      status:{type:DataTypes.ENUM('pending','partially_paid','paid','overdue','cancelled'),allowNull:false,defaultValue:'pending'}, paid_at:{type:DataTypes.DATE,allowNull:true},
      legacy_installment_id:{type:DataTypes.UUID,allowNull:true,unique:true}, ...timestamps,
    });
    await queryInterface.addConstraint('finance_installments',{fields:['amount'],type:'check',where:{amount:{[Sequelize.Op.gt]:0}},name:'ck_finance_installments_amount_positive'});
    await q.query('CREATE UNIQUE INDEX uq_finance_installments_plan_number_active ON finance_installments(payment_plan_id, installment_number) WHERE deleted_at IS NULL;');
    await queryInterface.addIndex('finance_payment_plans',['client_id','status']);
    await queryInterface.addIndex('finance_payment_plans',['case_id','status']);
    await queryInterface.addIndex('finance_payment_plans',['consultation_id','status']);
    await queryInterface.addIndex('finance_installments',['due_date','status']);

    // Traceability columns make reconciliation provable and idempotent.
    await queryInterface.addColumn('finance_transactions','legacy_payment_id',{type:DataTypes.UUID,allowNull:true,unique:true});
    await queryInterface.addColumn('finance_receivables','legacy_installment_id',{type:DataTypes.UUID,allowNull:true,unique:true});

    // Backfill legacy plans/installments only if the legacy schema is present.
    await q.query(`DO $$
    BEGIN
      IF to_regclass('public.payment_plans') IS NOT NULL AND to_regclass('public.payment_installments') IS NOT NULL THEN
        INSERT INTO finance_payment_plans (id,reference_no,client_id,case_id,title,description,total_amount,currency,plan_type,status,start_date,end_date,activated_at,completed_at,cancelled_at,legacy_payment_plan_id,created_by,created_at,updated_at,deleted_at)
        SELECT gen_random_uuid(),'LPLN-'||upper(substr(replace(pp.id::text,'-',''),1,12)),pp.client_id,pp.case_id,pp.title,pp.description,pp.total_amount,pp.currency,pp.plan_type::text::"enum_finance_payment_plans_plan_type",pp.status::text::"enum_finance_payment_plans_status",pp.start_date,pp.end_date,pp.activated_at,pp.completed_at,pp.cancelled_at,pp.id,pp.created_by,pp.created_at,pp.updated_at,pp.deleted_at
        FROM payment_plans pp
        WHERE NOT EXISTS (SELECT 1 FROM finance_payment_plans fp WHERE fp.legacy_payment_plan_id=pp.id);

        INSERT INTO finance_receivables (id,reference_no,client_id,case_id,receivable_type,description,amount,currency,due_date,status,posted_at,created_by,legacy_installment_id,created_at,updated_at,deleted_at)
        SELECT gen_random_uuid(),'LRCV-'||upper(substr(replace(pi.id::text,'-',''),1,12)),pp.client_id,pp.case_id,'legal_fee',COALESCE(pi.title,'Legacy taksit #'||pi.installment_number),pi.amount,pp.currency,pi.due_date,
          (CASE WHEN pi.status='paid' THEN 'paid' WHEN COALESCE(pi.paid_amount,0)>0 THEN 'partially_paid' WHEN pi.status='cancelled' THEN 'cancelled' ELSE 'open' END)::text::"enum_finance_receivables_status",
          COALESCE(pp.activated_at,pp.created_at),pp.created_by,pi.id,pi.created_at,pi.updated_at,pi.deleted_at
        FROM payment_installments pi JOIN payment_plans pp ON pp.id=pi.payment_plan_id
        WHERE NOT EXISTS (SELECT 1 FROM finance_receivables r WHERE r.legacy_installment_id=pi.id);

        INSERT INTO finance_installments (id,payment_plan_id,receivable_id,installment_number,title,amount,currency,due_date,status,paid_at,legacy_installment_id,created_at,updated_at,deleted_at)
        SELECT gen_random_uuid(),fp.id,r.id,pi.installment_number,pi.title,pi.amount,fp.currency,pi.due_date,
          (CASE WHEN pi.status='paid' THEN 'paid' WHEN COALESCE(pi.paid_amount,0)>0 THEN 'partially_paid' WHEN pi.status='overdue' THEN 'overdue' WHEN pi.status='cancelled' THEN 'cancelled' ELSE 'pending' END)::text::"enum_finance_installments_status",
          pi.paid_at,pi.id,pi.created_at,pi.updated_at,pi.deleted_at
        FROM payment_installments pi
        JOIN finance_payment_plans fp ON fp.legacy_payment_plan_id=pi.payment_plan_id
        JOIN finance_receivables r ON r.legacy_installment_id=pi.id
        WHERE NOT EXISTS (SELECT 1 FROM finance_installments fi WHERE fi.legacy_installment_id=pi.id);
      END IF;
    END $$;`);
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('finance_receivables','legacy_installment_id');
    await queryInterface.removeColumn('finance_transactions','legacy_payment_id');
    await queryInterface.dropTable('finance_installments');
    await queryInterface.dropTable('finance_payment_plans');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_finance_installments_status"; DROP TYPE IF EXISTS "enum_finance_payment_plans_status"; DROP TYPE IF EXISTS "enum_finance_payment_plans_plan_type";');
  }
};
