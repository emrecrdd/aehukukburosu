import {
  useEffect,
} from 'react';

import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import {
  useAuth,
} from '../providers/auth.provider.jsx';

import PrivateRoute from './private.routes.jsx';
import PublicRoute from './public.routes.jsx';

import {
  PERMISSION_KEYS,
} from '../../constants/roles.js';

// ======================================================
// LAYOUTS
// ======================================================

import AuthLayout from '../../layouts/auth.layout.jsx';
import DashboardLayout from '../../layouts/dashboard.layout.jsx';

// ======================================================
// AUTH
// ======================================================

import Login from '../../pages/auth/login.jsx';
import ForgotPassword from '../../pages/auth/forgot-password.jsx';
import ResetPassword from '../../pages/auth/reset-password.jsx';

// ======================================================
// DASHBOARD
// ======================================================

import Dashboard from '../../pages/dashboard/index.jsx';

// ======================================================
// NOTIFICATIONS
// ======================================================

import NotificationsPage from '../../pages/notification/index.jsx';
// ======================================================
// CHAT
// ======================================================

import ChatPage from '../../pages/chat/index.jsx';
// ======================================================
// CLIENTS
// ======================================================

import ClientsList from '../../pages/clients/list.jsx';
import ClientDetail from '../../pages/clients/detail.jsx';
import ClientCreate from '../../pages/clients/create.jsx';
import ClientEdit from '../../pages/clients/edit.jsx';

// ======================================================
// CASES
// ======================================================

import CasesList from '../../pages/cases/list.jsx';
import CaseDetail from '../../pages/cases/detail.jsx';
import CaseCreate from '../../pages/cases/create.jsx';
import CaseEdit from '../../pages/cases/edit.jsx';

// ======================================================
// CONSULTATIONS
// ======================================================

import ConsultationsList from '../../pages/consultations/list.jsx';
import ConsultationDetail from '../../pages/consultations/detail.jsx';
import ConsultationCreate from '../../pages/consultations/create.jsx';
import ConsultationEdit from '../../pages/consultations/edit.jsx';

// ======================================================
// CASE PARTIES
// ======================================================

import CasePartyList from '../../pages/case-parties/list.jsx';
import CasePartyCreate from '../../pages/case-parties/create.jsx';
import CasePartyEdit from '../../pages/case-parties/edit.jsx';
import CasePartyDetail from '../../pages/case-parties/detail.jsx';

// ======================================================
// DOCUMENTS
// ======================================================

import DocumentsList from '../../pages/documents/list.jsx';
import DocumentUpload from '../../pages/documents/upload.jsx';
import DocumentEdit from '../../pages/documents/edit.jsx';
import DocumentDetail from '../../pages/documents/detail.jsx';

// ======================================================
// TASKS
// ======================================================

import TasksList from '../../pages/tasks/list.jsx';
import TaskDetail from '../../pages/tasks/detail.jsx';
import TaskCreate from '../../pages/tasks/create.jsx';
import TaskEdit from '../../pages/tasks/edit.jsx';
// ======================================================
// PERFORMANCE
// ======================================================

import Performance from '../../pages/performance/index.jsx';
import PerformanceDetail from '../../pages/performance/detail.jsx';
// ======================================================
// MEETINGS
// ======================================================

import MeetingsList from '../../pages/meetings/list.jsx';
import MeetingCreate from '../../pages/meetings/create.jsx';
import MeetingDetail from '../../pages/meetings/detail.jsx';
import MeetingEdit from '../../pages/meetings/edit.jsx';

// ======================================================
// EVENTS
// ======================================================

import EventCreate from '../../pages/events/create.jsx';
import EventDetail from '../../pages/events/detail.jsx';
import EventEdit from '../../pages/events/edit.jsx';

// ======================================================
// TEMPLATES
// ======================================================

import TemplatesList from '../../pages/templates/list.jsx';
import TemplateCreate from '../../pages/templates/create.jsx';
import TemplateDetail from '../../pages/templates/detail.jsx';
import TemplateEdit from '../../pages/templates/edit.jsx';

// ======================================================
// CALENDAR
// ======================================================

import Calendar from '../../pages/calendar/index.jsx';

// ======================================================
// LEGACY FINANCE
// ======================================================

import Finance from '../../pages/finance-v2/index.jsx';
import FinanceCreate from '../../pages/finance-v2/create.jsx';

// ======================================================
// NEW PAYMENTS
// ======================================================

import PaymentPlanCreate from '../../pages/finance-v2/payment-plan-create.jsx';
import PaymentPlanDetail from '../../pages/finance-v2/payment-plan-detail.jsx';
import FinanceTransactionDetail from '../../pages/finance-v2/transaction-detail.jsx';
import FinanceControls from '../../pages/finance-v2/controls.jsx';
import FinanceFeeAgreementCreate from '../../pages/finance-v2/fee-agreement-create.jsx';
import FinanceFeeAgreementDetail from '../../pages/finance-v2/fee-agreement-detail.jsx';
import FinanceReceivableCreate from '../../pages/finance-v2/receivable-create.jsx';
import FinanceReceivableDetail from '../../pages/finance-v2/receivable-detail.jsx';
import FinanceExpenseCreate from '../../pages/finance-v2/expense-create.jsx';
import FinanceExpenseDetail from '../../pages/finance-v2/expense-detail.jsx';
import FinanceTransferCreate from '../../pages/finance-v2/transfer-create.jsx';

// ======================================================
// AI / SEARCH / SETTINGS
// ======================================================

import AIAssistant from '../../pages/ai/index.jsx';
import Search from '../../pages/search/index.jsx';
import Settings from '../../pages/settings/index.jsx';
import SystemInfo from '../../pages/system-info/index.jsx';

// ======================================================
// USERS
// ======================================================

import UserList from '../../pages/users/list.jsx';
import UserCreate from '../../pages/users/UserCreate.jsx';

// ======================================================
// AUDIT LOG
// ======================================================

import AuditLogList from '../../pages/audit-logs/list.jsx';
import AuditLogDetail from '../../pages/audit-logs/detail.jsx';

// ======================================================
// POWER OF ATTORNEY
// ======================================================

import PowerOfAttorneyList from '../../pages/power-of-attorney/list.jsx';
import PowerOfAttorneyDetail from '../../pages/power-of-attorney/detail.jsx';
import PowerOfAttorneyCreate from '../../pages/power-of-attorney/create.jsx';
import PowerOfAttorneyEdit from '../../pages/power-of-attorney/edit.jsx';

// ======================================================
// GLOBAL ROUTE SCROLL
// ======================================================

const ScrollToTop = () => {
  const {
    pathname,
  } = useLocation();

  useEffect(() => {
    const scrollToTop =
      () => {
        /*
         * Normal document scroll'u.
         */
        window.scrollTo({
          top:
            0,

          left:
            0,

          behavior:
            'auto',
        });

        /*
         * Bazı layout'larda kaydırma window yerine <main>
         * üzerinde olabilir. Böyle bir yapı varsa onu da
         * merkezi olarak en üste al.
         */
        const mainElement =
          document.querySelector(
            'main'
          );

        if (
          mainElement &&
          typeof mainElement.scrollTo ===
            'function'
        ) {
          mainElement.scrollTo({
            top:
              0,

            left:
              0,

            behavior:
              'auto',
          });
        }
      };

    /*
     * Yeni route DOM'a işlendiğinde scroll'u uygula.
     */
    const frame =
      window.requestAnimationFrame(
        scrollToTop
      );

    return () => {
      window.cancelAnimationFrame(
        frame
      );
    };
  }, [
    pathname,
  ]);

  return null;
};

// ======================================================
// ROUTER
// ======================================================

const AppRouter = () => {
  const {
    loading,
  } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600 dark:border-white/[0.08] dark:border-b-blue-500" />
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />

      <Routes>

      {/* ==================================================
          PUBLIC
      ================================================== */}

      
        <Route element={<PublicRoute />}>
  <Route element={<AuthLayout />}>
    <Route path="/login" element={<Login />} />
  </Route>
</Route>

{/* Şifre kurtarma: oturum açık olsa da erişilebilir */}
<Route element={<AuthLayout />}>
  <Route
    path="/forgot-password"
    element={<ForgotPassword />}
  />

  <Route
    path="/reset-password"
    element={<ResetPassword />}
  />
</Route>
      

      {/* ==================================================
          AUTHENTICATED AREA
      ================================================== */}

      <Route
        element={
          <PrivateRoute />
        }
      >
        <Route
          element={
            <DashboardLayout />
          }
        >

          {/* ==================================================
              HOME
          ================================================== */}

          <Route
            path="/"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          <Route
            path="/dashboard"
            element={
              <Dashboard />
            }
          />

          {/* ==================================================
              NOTIFICATIONS
              Kullanıcının kendi bildirimleri.
          ================================================== */}

          <Route
            path="/notifications"
            element={
              <NotificationsPage />
            }
          />
{/* ==================================================
    CHAT
    Aktif giriş yapmış ofis kullanıcıları.
================================================== */}

<Route
  path="/chat"
  element={
    <ChatPage />
  }
/>
          {/* ==================================================
              CLIENTS - VIEW
          ================================================== */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.VIEW_CLIENTS
                }
              />
            }
          >
            <Route
              path="/clients"
              element={
                <ClientsList />
              }
            />

            <Route
              path="/clients/:id"
              element={
                <ClientDetail />
              }
            />
          </Route>

          {/* CLIENTS - CREATE */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.CREATE_CLIENTS
                }
              />
            }
          >
            <Route
              path="/clients/create"
              element={
                <ClientCreate />
              }
            />
          </Route>

          {/* CLIENTS - EDIT */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.EDIT_CLIENTS
                }
              />
            }
          >
            <Route
              path="/clients/:id/edit"
              element={
                <ClientEdit />
              }
            />
          </Route>

          {/* ==================================================
              CASES - VIEW
          ================================================== */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.VIEW_CASES
                }
              />
            }
          >
            <Route
              path="/cases"
              element={
                <CasesList />
              }
            />

            <Route
              path="/cases/:id"
              element={
                <CaseDetail />
              }
            />

            <Route
              path="/cases/:caseId/parties"
              element={
                <CasePartyList />
              }
            />

            <Route
              path="/cases/:caseId/parties/:id"
              element={
                <CasePartyDetail />
              }
            />
          </Route>

          {/* CASES - CREATE */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.CREATE_CASES
                }
              />
            }
          >
            <Route
              path="/cases/create"
              element={
                <CaseCreate />
              }
            />
          </Route>

          {/* CASES - EDIT */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.EDIT_CASES
                }
              />
            }
          >
            <Route
              path="/cases/:id/edit"
              element={
                <CaseEdit />
              }
            />
          </Route>

          {/* ==================================================
              CONSULTATIONS - VIEW
          ================================================== */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.VIEW_CONSULTATIONS
                }
              />
            }
          >
            <Route
              path="/consultations"
              element={
                <ConsultationsList />
              }
            />

            <Route
              path="/consultations/:id"
              element={
                <ConsultationDetail />
              }
            />
          </Route>

          {/* CONSULTATIONS - CREATE */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.CREATE_CONSULTATIONS
                }
              />
            }
          >
            <Route
              path="/consultations/create"
              element={
                <ConsultationCreate />
              }
            />
          </Route>

          {/* CONSULTATIONS - EDIT */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.EDIT_CONSULTATIONS
                }
              />
            }
          >
            <Route
              path="/consultations/:id/edit"
              element={
                <ConsultationEdit />
              }
            />
          </Route>

          {/* CASE PARTIES - MANAGE */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.MANAGE_CASE_PARTIES
                }
              />
            }
          >
            <Route
              path="/cases/:caseId/parties/create"
              element={
                <CasePartyCreate />
              }
            />

            <Route
              path="/cases/:caseId/parties/:id/edit"
              element={
                <CasePartyEdit />
              }
            />
          </Route>

          {/* ==================================================
              DOCUMENTS - VIEW
          ================================================== */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.VIEW_DOCUMENTS
                }
              />
            }
          >
            <Route
              path="/documents"
              element={
                <DocumentsList />
              }
            />

            <Route
              path="/documents/:id"
              element={
                <DocumentDetail />
              }
            />
          </Route>

          {/* DOCUMENT UPLOAD */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.UPLOAD_DOCUMENTS
                }
              />
            }
          >
            <Route
              path="/documents/upload"
              element={
                <DocumentUpload />
              }
            />
          </Route>

          {/* DOCUMENT EDIT */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.EDIT_DOCUMENTS
                }
              />
            }
          >
            <Route
              path="/documents/:id/edit"
              element={
                <DocumentEdit />
              }
            />
          </Route>

          {/* ==================================================
              TASKS - VIEW
          ================================================== */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.VIEW_TASKS
                }
              />
            }
          >
            <Route
              path="/tasks"
              element={
                <TasksList />
              }
            />

            <Route
              path="/tasks/:id"
              element={
                <TaskDetail />
              }
            />
          </Route>

          {/* TASK CREATE */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.CREATE_TASKS
                }
              />
            }
          >
            <Route
              path="/tasks/create"
              element={
                <TaskCreate />
              }
            />
          </Route>

          {/* TASK EDIT */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.EDIT_TASKS
                }
              />
            }
          >
            <Route
              path="/tasks/:id/edit"
              element={
                <TaskEdit />
              }
            />
          </Route>
          {/* ==================================================
    PERFORMANCE
    Kendi performansını görüntüleme.

    Ekip performansı sayfanın kendi içinde ayrıca
    VIEW_TEAM_PERFORMANCE yetkisine göre gösterilecek.
================================================== */}

<Route
  element={
    <PrivateRoute
      requiredPermission={
        PERMISSION_KEYS.VIEW_OWN_PERFORMANCE
      }
    />
  }
>
  <Route
    path="/performance"
    element={
      <Performance />
    }
  />
</Route>
<Route
  element={
    <PrivateRoute
      requiredPermission={
        PERMISSION_KEYS.VIEW_TEAM_PERFORMANCE
      }
    />
  }
>
  <Route
    path="/performance/users/:userId"
    element={
      <PerformanceDetail />
    }
  />
</Route>

          {/* ==================================================
              MEETINGS - VIEW
          ================================================== */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.VIEW_MEETINGS
                }
              />
            }
          >
            <Route
              path="/meetings"
              element={
                <MeetingsList />
              }
            />

            <Route
              path="/meetings/:id"
              element={
                <MeetingDetail />
              }
            />
          </Route>

          {/* MEETING CREATE */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.CREATE_MEETINGS
                }
              />
            }
          >
            <Route
              path="/meetings/create"
              element={
                <MeetingCreate />
              }
            />
          </Route>

          {/* MEETING EDIT */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.EDIT_MEETINGS
                }
              />
            }
          >
            <Route
              path="/meetings/:id/edit"
              element={
                <MeetingEdit />
              }
            />
          </Route>

          {/* ==================================================
              EVENTS
          ================================================== */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.CREATE_EVENTS
                }
              />
            }
          >
            <Route
              path="/events/create"
              element={
                <EventCreate />
              }
            />
          </Route>

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.VIEW_EVENTS
                }
              />
            }
          >
            <Route
              path="/events/:id"
              element={
                <EventDetail />
              }
            />
          </Route>

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.EDIT_EVENTS
                }
              />
            }
          >
            <Route
              path="/events/:id/edit"
              element={
                <EventEdit />
              }
            />
          </Route>

          {/* ==================================================
              CALENDAR
          ================================================== */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.VIEW_CALENDAR
                }
              />
            }
          >
            <Route
              path="/calendar"
              element={
                <Calendar />
              }
            />
          </Route>

          {/* ==================================================
              TEMPLATES - VIEW
          ================================================== */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.VIEW_TEMPLATES
                }
              />
            }
          >
            <Route
              path="/templates"
              element={
                <TemplatesList />
              }
            />

            <Route
              path="/templates/:id"
              element={
                <TemplateDetail />
              }
            />
          </Route>

          {/* TEMPLATE CREATE */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.CREATE_TEMPLATES
                }
              />
            }
          >
            <Route
              path="/templates/create"
              element={
                <TemplateCreate />
              }
            />
          </Route>

          {/* TEMPLATE EDIT */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.EDIT_TEMPLATES
                }
              />
            }
          >
            <Route
              path="/templates/:id/edit"
              element={
                <TemplateEdit />
              }
            />
          </Route>

          {/* ==================================================
              LEGACY FINANCE
          ================================================== */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.VIEW_FINANCE
                }
              />
            }
          >
            <Route
              path="/finance"
              element={
                <Finance />
              }
            />
          </Route>

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.RECORD_PAYMENTS
                }
              />
            }
          >
            <Route
              path="/finance/create"
              element={
                <FinanceCreate />
              }
            />
          </Route>

          <Route element={<PrivateRoute requiredPermission={PERMISSION_KEYS.VIEW_FINANCE} />}>
            <Route path="/finance/transactions/:id" element={<FinanceTransactionDetail />} />
            <Route path="/finance/agreements/:id" element={<FinanceFeeAgreementDetail />} />
            <Route path="/finance/receivables/:id" element={<FinanceReceivableDetail />} />
            <Route path="/finance/expenses/:id" element={<FinanceExpenseDetail />} />
            <Route path="/finance/plans/:id" element={<PaymentPlanDetail />} />
          </Route>

          <Route element={<PrivateRoute requiredPermission={PERMISSION_KEYS.MANAGE_FEE_AGREEMENTS} />}>
            <Route path="/finance/agreements/create" element={<FinanceFeeAgreementCreate />} />
          </Route>
          <Route element={<PrivateRoute requiredPermission={PERMISSION_KEYS.CREATE_RECEIVABLES} />}>
            <Route path="/finance/receivables/create" element={<FinanceReceivableCreate />} />
          </Route>
          <Route element={<PrivateRoute requiredPermission={PERMISSION_KEYS.CREATE_EXPENSES} />}>
            <Route path="/finance/expenses/create" element={<FinanceExpenseCreate />} />
          </Route>
          <Route element={<PrivateRoute requiredPermission={PERMISSION_KEYS.MANAGE_FINANCE_ACCOUNTS} />}>
            <Route path="/finance/transfers/create" element={<FinanceTransferCreate />} />
          </Route>


          <Route element={<PrivateRoute requiredPermission={PERMISSION_KEYS.VIEW_FINANCE} />}>
            <Route path="/finance/controls" element={<FinanceControls />} />
          </Route>

          {/* ==================================================
              PROFESSIONAL PAYMENT PLANS
          ================================================== */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.MANAGE_PAYMENT_PLANS
                }
              />
            }
          >
            <Route
              path="/finance/plans/create"
              element={
                <PaymentPlanCreate />
              }
            />
            <Route path="/payments/plans/create" element={<Navigate to="/finance/plans/create" replace />} />
          </Route>

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.VIEW_FINANCE
                }
              />
            }
          >
            <Route path="/payments/plans/:id" element={<PaymentPlanDetail />} />
          </Route>

          {/* ==================================================
              POWER OF ATTORNEY
          ================================================== */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.VIEW_POWER_OF_ATTORNEY
                }
              />
            }
          >
            <Route
              path="/power-of-attorney"
              element={
                <PowerOfAttorneyList />
              }
            />

            <Route
              path="/power-of-attorney/:id"
              element={
                <PowerOfAttorneyDetail />
              }
            />
          </Route>

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.CREATE_POWER_OF_ATTORNEY
                }
              />
            }
          >
            <Route
              path="/power-of-attorney/create"
              element={
                <PowerOfAttorneyCreate />
              }
            />
          </Route>

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.EDIT_POWER_OF_ATTORNEY
                }
              />
            }
          >
            <Route
              path="/power-of-attorney/:id/edit"
              element={
                <PowerOfAttorneyEdit />
              }
            />
          </Route>

          {/* ==================================================
              AI
          ================================================== */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.USE_AI
                }
              />
            }
          >
            <Route
              path="/ai"
              element={
                <AIAssistant />
              }
            />
          </Route>

          {/* ==================================================
              SEARCH
          ================================================== */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.USE_SEARCH
                }
              />
            }
          >
            <Route
              path="/search"
              element={
                <Search />
              }
            />
          </Route>

          {/* ==================================================
              SETTINGS
          ================================================== */}

          <Route
            element={
              <PrivateRoute
                requiredPermission={
                  PERMISSION_KEYS.VIEW_SETTINGS
                }
              />
            }
          >
            <Route
              path="/settings"
              element={
                <Settings />
              }
            />
          </Route>

          {/* ==================================================
              SYSTEM INFO
          ================================================== */}

          <Route
            path="/system-info"
            element={
              <SystemInfo />
            }
          />

          {/* ==================================================
    USERS - VIEW
================================================== */}

<Route
  element={
    <PrivateRoute
      requiredPermission={
        PERMISSION_KEYS.VIEW_USERS
      }
    />
  }
>
  <Route
    path="/users"
    element={
      <UserList />
    }
  />
</Route>

{/* ==================================================
    USERS - CREATE
================================================== */}

<Route
  element={
    <PrivateRoute
      requiredPermission={
        PERMISSION_KEYS.CREATE_USERS
      }
    />
  }
>
  <Route
    path="/users/create"
    element={
      <UserCreate />
    }
  />
</Route>

{/* ==================================================
    AUDIT LOGS - VIEW
================================================== */}

<Route
  element={
    <PrivateRoute
      requiredPermission={
        PERMISSION_KEYS.VIEW_AUDIT_LOGS
      }
    />
  }
>
  <Route
    path="/audit-logs"
    element={
      <AuditLogList />
    }
  />

  <Route
    path="/audit-logs/:id"
    element={
      <AuditLogDetail />
    }
  />
</Route>

        </Route>
      </Route>

      {/* ==================================================
          404
      ================================================== */}

      <Route
        path="*"
        element={
          <div className="flex min-h-screen items-center justify-center">
            404 - Page Not Found
          </div>
        }
      />

      </Routes>
    </>
  );
};

export default AppRouter;