import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import caseApi from '../../features/cases/case.api.js';
import documentApi from '../../features/documents/document.api.js';
import aiApi from '../../features/ai/ai.api.js';
import casePartyApi from '../../features/case-parties/case-party.api.js';
import Badge from '../../components/ui/Badge.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import FinanceContextSummary from '../../components/finance/FinanceContextSummary.jsx';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  PERMISSION_KEYS,
  hasPermission,
} from '../../constants/roles.js';

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Brain,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Edit2,
  FileText,
  FolderOpen,
  Gavel,
  ListTodo,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Scale,
  Send,
  ShieldAlert,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';

import toast from 'react-hot-toast';
// ======================================================
// UTC format fonksiyonları
// ======================================================

const formatDateUTC = (date) => {
  if (!date) return '-';

  try {
    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return '-';
    }

    return `${String(d.getUTCDate()).padStart(2, '0')}.${String(
      d.getUTCMonth() + 1
    ).padStart(2, '0')}.${d.getUTCFullYear()}`;
  } catch {
    return '-';
  }
};

const formatDateTime = (
  value
) => {
  if (!value) {
    return '-';
  }

  try {
    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '-';
    }

    return new Intl.DateTimeFormat(
      'tr-TR',
      {
        timeZone:
          'Europe/Istanbul',

        day:
          '2-digit',

        month:
          '2-digit',

        year:
          'numeric',

        hour:
          '2-digit',

        minute:
          '2-digit',

        hour12:
          false,
      }
    ).format(
      date
    );
  } catch {
    return '-';
  }
};

const isDateOnlyValue = (value) => {
  if (!value) {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(value).trim()
  );
};

const formatAIImportantDate = (value) => {
  if (!value) {
    return '-';
  }

  if (isDateOnlyValue(value)) {
    return formatDateUTC(value);
  }

  return formatDateTime(value);
};

const unwrapResponse = (response) => {
  return response?.data?.data ?? response?.data ?? null;
};

// ======================================================
// Label yardımcıları
// ======================================================

const PARTY_LABELS = {
  davaci: 'Davacı',
  davali: 'Davalı',
  supheli: 'Şüpheli',
  sanik: 'Sanık',
  musteki: 'Müşteki',
  katilan: 'Katılan',
  magdur: 'Mağdur',
  maktul: 'Maktul',
  alacakli: 'Alacaklı',
  borclu: 'Borçlu',
  ucuncu_kisi: 'Üçüncü Kişi',

  // Eski kayıtlarla uyumluluk
  plaintiff: 'Davacı',
  defendant: 'Davalı',
  intervener: 'Müdahil',
  witness: 'Tanık',
};

const PARTY_VARIANTS = {
  davaci: 'success',
  davali: 'danger',
  supheli: 'warning',
  sanik: 'danger',
  musteki: 'info',
  katilan: 'info',
  magdur: 'warning',
  maktul: 'default',
  alacakli: 'success',
  borclu: 'warning',
  ucuncu_kisi: 'default',

  // Eski kayıtlarla uyumluluk
  plaintiff: 'success',
  defendant: 'danger',
  intervener: 'warning',
  witness: 'info',
};

const normalizePartyRole = (role) => {
  const normalizedRole = String(role || '')
    .trim()
    .toLocaleLowerCase('tr-TR');

  const roleMap = {
    'davacı': 'davaci',
    davaci: 'davaci',
    'davalı': 'davali',
    davali: 'davali',
    'şüpheli': 'supheli',
    supheli: 'supheli',
    'sanık': 'sanik',
    sanik: 'sanik',
    'müşteki': 'musteki',
    musteki: 'musteki',
    'şikayetçi': 'musteki',
    sikayetci: 'musteki',
    'katılan': 'katilan',
    katilan: 'katilan',
    'mağdur': 'magdur',
    magdur: 'magdur',
    maktul: 'maktul',
    'alacaklı': 'alacakli',
    alacakli: 'alacakli',
    'borçlu': 'borclu',
    borclu: 'borclu',
    'üçüncü kişi': 'ucuncu_kisi',
    'ucuncu kisi': 'ucuncu_kisi',
    ucuncu_kisi: 'ucuncu_kisi',

    // CaseParty modelinde ayrı tanık enum'u olmadığı için
    // AI tarafından tanık olarak bulunan kişi üçüncü kişi olarak kaydedilir.
    'tanık': 'ucuncu_kisi',
    tanik: 'ucuncu_kisi',
  };

  return roleMap[normalizedRole] || 'ucuncu_kisi';
};

const normalizeAIEntityType = (entityType) => {
  const normalized = String(entityType || '')
    .trim()
    .toLocaleLowerCase('tr-TR');

  if (
    normalized.includes('şirket') ||
    normalized.includes('sirket') ||
    normalized.includes('kurum') ||
    normalized.includes('tüzel') ||
    normalized.includes('tuzel') ||
    normalized.includes('company') ||
    normalized.includes('organization')
  ) {
    return 'company';
  }

  return 'person';
};

const PRIORITY_LABELS = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
  critical: 'Kritik',
};

const CASE_UPDATE_LABELS = {
  title: 'Dava Başlığı',
  judiciary_type: 'Yargı Türü',
  judiciary_unit: 'Yargı Birimi',
  court_name: 'Mahkeme',
  case_number: 'Dosya / Esas No',
  subject: 'Konu',
  description: 'Açıklama',
  opening_date: 'Dava Açılış Tarihi',
  status: 'Durum',
  priority: 'Öncelik',
  assigned_to: 'Atanan Avukat',
};

const getCaseUpdateLabel = (field) => {
  return CASE_UPDATE_LABELS[field] || field || 'Dava bilgisi';
};

const getApiErrorMessage = (error, fallback) => {
  const validationErrors = error?.response?.data?.errors;

  if (Array.isArray(validationErrors) && validationErrors.length > 0) {
    const firstMessage = validationErrors.find((item) => item?.msg)?.msg;

    if (firstMessage) {
      return firstMessage;
    }
  }

  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const RISK_LABELS = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  critical: 'Kritik',
  undetermined: 'Belirsiz',
};

const ACTION_PRIORITY_LABELS = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
  critical: 'Kritik',
};

const getRiskBadgeVariant = (level) => {
  switch (level) {
    case 'critical':
    case 'high':
      return 'danger';

    case 'medium':
      return 'warning';

    case 'low':
      return 'success';

    default:
      return 'default';
  }
};

const getActionPriorityVariant = (priority) => {
  switch (priority) {
    case 'critical':
      return 'danger';

    case 'high':
      return 'warning';

    case 'normal':
      return 'info';

    case 'low':
      return 'default';

    default:
      return 'default';
  }
};

// ======================================================
// AI PANEL
// ======================================================

const CaseAIAnalysis = ({
  analysis,
  onRefresh,
  refreshing,
  caseId,
    clientId,
  canCreateTasks,
}) => {
  if (!analysis) {
    return null;
  }

  const result =
    analysis.result || analysis;

  return (
    <Card>
      <Card.Header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                AI Dava Analizi
              </h2>
            </div>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Dava kayıtları, görevler, duruşmalar, toplantılar,
              belgeler ve notlar birlikte değerlendirildi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {analysis.cached && (
              <Badge variant="info">
                Kayıtlı analiz
              </Badge>
            )}

            {analysis.model && (
  <Badge variant="default">
    Derkenar AI · Gelişmiş Hukuki Analiz
  </Badge>
)}

            <Button
              variant="outline"
              size="sm"
              loading={refreshing}
              onClick={onRefresh}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Yeniden Analiz
            </Button>
          </div>
        </div>
      </Card.Header>

      <Card.Body className="space-y-6">
        {/* SKORLAR */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Activity className="h-4 w-4" />
              Dosya Sağlığı
            </div>

            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {Number.isInteger(result.caseHealthScore)
                ? result.caseHealthScore
                : '-'}
              {Number.isInteger(result.caseHealthScore) && (
                <span className="text-base font-normal text-gray-400">
                  /100
                </span>
              )}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Kazanma ihtimali değil; dosyanın hazırlık ve takip
              seviyesidir.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <ShieldAlert className="h-4 w-4" />
              Risk Skoru
            </div>

            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {Number.isInteger(result.riskScore)
                ? result.riskScore
                : '-'}
              {Number.isInteger(result.riskScore) && (
                <span className="text-base font-normal text-gray-400">
                  /100
                </span>
              )}
            </p>

            <div className="mt-2">
              <Badge
                variant={getRiskBadgeVariant(
                  result.overallRiskLevel
                )}
              >
                {RISK_LABELS[result.overallRiskLevel] ||
                  result.overallRiskLevel ||
                  'Belirsiz'}
              </Badge>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <ListTodo className="h-4 w-4" />
              Açık Görev
            </div>

            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {result.workloadSummary?.openTaskCount ?? '-'}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Geciken:{' '}
              {result.workloadSummary?.overdueTaskCount ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CalendarDays className="h-4 w-4" />
              Yaklaşan İşlem
            </div>

            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {(result.workloadSummary?.upcomingEventCount ?? 0) +
                (result.workloadSummary?.upcomingMeetingCount ?? 0)}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Duruşma/etkinlik:{' '}
              {result.workloadSummary?.upcomingEventCount ?? 0}
              {' · '}
              Toplantı:{' '}
              {result.workloadSummary?.upcomingMeetingCount ?? 0}
            </p>
          </div>
        </div>

        {/* GENEL ÖZET */}
        {result.overview && (
          <section>
            <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
              Genel Değerlendirme
            </h3>

            <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-gray-300">
              {result.overview}
            </p>
          </section>
        )}

        {/* MEVCUT DURUM */}
{result.currentStatus && (
  <section>
    <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
      Mevcut Durum
    </h3>

    <div className="rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {{
        preparation: 'Hazırlık',
        active: 'Aktif',
        pending: 'Beklemede',
        completed: 'Tamamlandı',
        closed: 'Kapandı',
      }[result.currentStatus] || result.currentStatus}
    </div>
  </section>
)}

        {/* NEXT BEST ACTIONS */}
        {Array.isArray(result.nextBestActions) &&
          result.nextBestActions.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />

                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Önerilen Sonraki İşlemler
                </h3>
              </div>

              <div className="space-y-3">
                {result.nextBestActions.map((action, index) => (
                  <div
                    key={`${action.title}-${index}`}
                    className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {action.title}
                      </p>

                      <Badge
                        variant={getActionPriorityVariant(
                          action.priority
                        )}
                      >
                        {ACTION_PRIORITY_LABELS[action.priority] ||
                          action.priority}
                      </Badge>
                    </div>

                    {action.description && (
                      <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                        {action.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                      {action.suggestedDueDate && (
                        <span>
                          Önerilen tarih:{' '}
                          {formatDateUTC(action.suggestedDueDate)}
                        </span>
                      )}

                      {action.canCreateTask &&
                      canCreateTasks && (
  <Link
    to={`/tasks/create?${new URLSearchParams({
      source: 'ai',
      case_id: caseId || '',
      client_id: clientId || '',
      title: action.title || '',
      description: action.description || '',
      priority: action.priority || 'normal',
      due_date: action.suggestedDueDate || '',
      note: 'AI dava analizi önerisinden oluşturuldu.',
    }).toString()}`}
  >
    <Button
      type="button"
      size="sm"
      variant="outline"
    >
      <Sparkles className="mr-2 h-4 w-4" />
      Görev Oluştur
    </Button>
  </Link>
)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* RİSKLER */}
        {Array.isArray(result.risks) &&
          result.risks.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />

                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Riskler
                </h3>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {result.risks.map((risk, index) => (
                  <div
                    key={`${risk.title}-${index}`}
                    className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {risk.title}
                      </p>

                      <Badge
                        variant={getRiskBadgeVariant(risk.level)}
                      >
                        {RISK_LABELS[risk.level] || risk.level}
                      </Badge>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {risk.description}
                    </p>

                    {risk.recommendation && (
                      <p className="mt-3 text-sm font-medium text-blue-700 dark:text-blue-300">
                        Öneri: {risk.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* TARİHLER */}
        {Array.isArray(result.upcomingDeadlines) &&
          result.upcomingDeadlines.length > 0 && (
            <section>
              <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                Yaklaşan Kritik Tarihler
              </h3>

              <div className="space-y-2">
                {result.upcomingDeadlines.map((item, index) => (
                  <div
                    key={`${item.date}-${index}`}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.label}
                      </p>

                      {item.explanation && (
                        <p className="mt-1 text-sm text-gray-500">
                          {item.explanation}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatAIImportantDate(item.date)}
                      </p>

                      <Badge
                        variant={getRiskBadgeVariant(
                          item.importance
                        )}
                      >
                        {RISK_LABELS[item.importance] ||
                          item.importance}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* EKSİK BİLGİ / DELİL */}
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.isArray(result.missingInformation) &&
            result.missingInformation.length > 0 && (
              <section>
                <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                  Eksik Bilgiler
                </h3>

                <ul className="space-y-2">
                  {result.missingInformation.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

          {Array.isArray(result.missingEvidence) &&
            result.missingEvidence.length > 0 && (
              <section>
                <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                  Eksik Deliller
                </h3>

                <ul className="space-y-2">
                  {result.missingEvidence.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-900/20 dark:text-red-200"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}
        </div>

        {/* STRATEJİ */}
        {Array.isArray(result.strategicConsiderations) &&
          result.strategicConsiderations.length > 0 && (
            <section>
              <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                Stratejik Değerlendirme
              </h3>

              <ul className="space-y-2">
                {result.strategicConsiderations.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="rounded-lg bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-900 dark:bg-blue-900/20 dark:text-blue-200"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

        {/* MÜVEKKİL İLETİŞİMİ */}
        {Array.isArray(result.clientCommunicationNotes) &&
          result.clientCommunicationNotes.length > 0 && (
            <section>
              <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                Müvekkil ile Görüşülebilecek Konular
              </h3>

              <ul className="space-y-2">
                {result.clientCommunicationNotes.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

        {/* HUMAN REVIEW */}
        {result.requiresHumanReview && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
            <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5" />
              Avukat incelemesi gerekli
            </div>

            {Array.isArray(result.reviewReasons) &&
              result.reviewReasons.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-800 dark:text-amber-200">
                  {result.reviewReasons.map((reason, index) => (
                    <li key={`${reason}-${index}`}>
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
          </div>
        )}

        {Array.isArray(result.warnings) &&
          result.warnings.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-300">
                AI uyarılarını göster
              </summary>

              <ul className="mt-3 space-y-2">
                {result.warnings.map((warning, index) => (
                  <li
                    key={`${warning}-${index}`}
                    className="text-sm text-gray-600 dark:text-gray-400"
                  >
                    • {warning}
                  </li>
                ))}
              </ul>
            </details>
          )}
      </Card.Body>
    </Card>
  );
};


// ======================================================
// DOSYAYA SOR
// ======================================================

const CASE_QUESTION_SUGGESTIONS = [
  'Bu dosyada şu anda en kritik risk nedir?',
  'Yaklaşan işlem ve dikkat edilmesi gereken tarihler neler?',
  'Dosyada hangi bilgi veya deliller eksik görünüyor?',
  'Karşı tarafın savunması hakkında dosyada ne kayıtlı?',
];

const getCaseQuestionSourceLink = (source, caseId) => {
  if (!source?.sourceType || !source?.sourceId) return null;

  switch (source.sourceType) {
    case 'case':
      return `/cases/${caseId || source.sourceId}`;
    case 'document':
      return `/documents/${source.sourceId}`;
    case 'task':
      return `/tasks/${source.sourceId}`;
    case 'event':
      return `/events/${source.sourceId}`;
    case 'meeting':
      return `/meetings/${source.sourceId}`;
    default:
      return null;
  }
};

const CASE_QUESTION_SOURCE_LABELS = {
  case: 'Dava kaydı',
  document: 'Belge',
  task: 'Görev',
  event: 'Duruşma / Etkinlik',
  meeting: 'Toplantı',
  note: 'Dosya notu',
};

const CaseQuestionPanel = ({
  analysis,
  asking,
  onAsk,
  caseId,
  clientId,
  canCreateTasks,
}) => {
  const [question, setQuestion] = useState('');
  const result = analysis?.result || analysis || null;

  const submitQuestion = (value = question) => {
    const normalized = String(value || '').trim();
    if (!normalized || asking) return;
    setQuestion(normalized);
    onAsk(normalized);
  };

  return (
    <Card>
      <Card.Header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Dosyaya Sor
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Bu dava kaydı, görevler, duruşmalar, toplantılar, notlar ve analiz edilmiş belgeler üzerinden kaynaklı yanıt alın.
            </p>
          </div>

          <Badge variant="default">
            Derkenar AI · Dosya Hafızası
          </Badge>
        </div>
      </Card.Header>

      <Card.Body className="space-y-5">
        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bu dosya hakkında ne bilmek istiyorsunuz?
              </label>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                    event.preventDefault();
                    submitQuestion();
                  }
                }}
                rows={3}
                maxLength={10000}
                disabled={asking}
                placeholder="Örn. Bu dosyada şu anda en kritik eksiklik nedir?"
                className="w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-400">
                Ctrl/⌘ + Enter ile sorabilirsiniz.
              </p>
            </div>

            <Button
              type="button"
              loading={asking}
              disabled={asking || !question.trim()}
              onClick={() => submitQuestion()}
            >
              <Send className="mr-2 h-4 w-4" />
              Dosyaya Sor
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {CASE_QUESTION_SUGGESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                disabled={asking}
                onClick={() => {
                  setQuestion(item);
                  submitQuestion(item);
                }}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-gray-600 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-500/40 dark:hover:text-blue-300"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {asking && !result && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
            Derkenar AI dosya kayıtlarını ve mevcut belge analizlerini değerlendiriyor...
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <section className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-blue-950 dark:text-blue-100">
                  Kısa Cevap
                </h3>
                {typeof result.confidence === 'number' && (
                  <Badge variant="info">
                    Güven %{Math.round(result.confidence * 100)}
                  </Badge>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-7 text-blue-950 dark:text-blue-100">
                {result.shortAnswer || 'Yanıt oluşturuldu.'}
              </p>
            </section>

            {result.answer && (
              <section>
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                  Dosya Üzerinden Değerlendirme
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-gray-300">
                  {result.answer}
                </p>
              </section>
            )}

            {Array.isArray(result.keyFindings) && result.keyFindings.length > 0 && (
              <section>
                <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                  Önemli Tespitler
                </h3>
                <div className="space-y-3">
                  {result.keyFindings.map((finding, index) => {
                    const sourceLink = getCaseQuestionSourceLink(finding, caseId);
                    return (
                      <div key={`${finding.finding}-${index}`} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-sm leading-6 text-gray-800 dark:text-gray-200">
                            {finding.finding}
                          </p>
                          <Badge variant={getRiskBadgeVariant(finding.importance)}>
                            {RISK_LABELS[finding.importance] || finding.importance || 'Belirsiz'}
                          </Badge>
                        </div>
                        {finding.sourceType && finding.sourceId && (
                          <div className="mt-3 text-xs">
                            {sourceLink ? (
                              <Link to={sourceLink} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                                Kaynağı aç · {CASE_QUESTION_SOURCE_LABELS[finding.sourceType] || 'Kaynak'}
                              </Link>
                            ) : (
                              <span className="text-gray-500">
                                Kaynak · {CASE_QUESTION_SOURCE_LABELS[finding.sourceType] || 'Dosya kaydı'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {Array.isArray(result.sources) && result.sources.length > 0 && (
              <section>
                <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                  Kullanılan Kaynaklar
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {result.sources.map((source, index) => {
                    const sourceLink = getCaseQuestionSourceLink(source, caseId);
                    const content = (
                      <div className="rounded-xl border border-gray-200 p-3 transition hover:border-blue-300 dark:border-gray-700 dark:hover:border-blue-500/40">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {source.title || 'Kaynak'}
                          </p>
                          <span className="shrink-0 text-xs text-gray-400">
                            {CASE_QUESTION_SOURCE_LABELS[source.sourceType] || source.sourceType}
                          </span>
                        </div>
                        {source.relevance && (
                          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                            {source.relevance}
                          </p>
                        )}
                      </div>
                    );

                    return sourceLink ? (
                      <Link key={`${source.sourceType}-${source.sourceId}-${index}`} to={sourceLink}>
                        {content}
                      </Link>
                    ) : (
                      <div key={`${source.sourceType}-${source.sourceId}-${index}`}>
                        {content}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {Array.isArray(result.missingInformation) && result.missingInformation.length > 0 && (
              <section>
                <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                  Dosyadan Belirlenemeyenler
                </h3>
                <ul className="space-y-2">
                  {result.missingInformation.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {Array.isArray(result.suggestedActions) && result.suggestedActions.length > 0 && (
              <section>
                <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                  Önerilen İşlemler
                </h3>
                <div className="space-y-3">
                  {result.suggestedActions.map((action, index) => (
                    <div key={`${action.title}-${index}`} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {action.title}
                        </p>
                        <Badge variant={getActionPriorityVariant(action.priority)}>
                          {ACTION_PRIORITY_LABELS[action.priority] || action.priority || 'Normal'}
                        </Badge>
                      </div>
                      {action.description && (
                        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                          {action.description}
                        </p>
                      )}
                      {action.canCreateTask && canCreateTasks && (
                        <div className="mt-3">
                          <Link
                            to={`/tasks/create?${new URLSearchParams({
                              source: 'ai_case_question',
                              case_id: caseId || '',
                              client_id: clientId || '',
                              title: action.title || '',
                              description: action.description || '',
                              priority: action.priority || 'normal',
                              note: 'Derkenar AI Dosyaya Sor önerisinden oluşturuldu.',
                            }).toString()}`}
                          >
                            <Button type="button" size="sm" variant="outline">
                              <Sparkles className="mr-2 h-4 w-4" />
                              Görev Oluştur
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {result.requiresHumanReview && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
                <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-5 w-5" />
                  Avukat incelemesi gerekli
                </div>
                {Array.isArray(result.reviewReasons) && result.reviewReasons.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-800 dark:text-amber-200">
                    {result.reviewReasons.map((reason, index) => (
                      <li key={`${reason}-${index}`}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};


// ======================================================
// DURUŞMAYA HAZIRLA
// ======================================================

const HearingPreparationPanel = ({
  analysis,
  preparing,
  onRefresh,
  caseId,
  clientId,
  canCreateTasks,
}) => {
  if (!analysis) {
    return null;
  }

  const result = analysis.result || analysis;

  const renderSourceLink = (item) => {
    const sourceLink = getCaseQuestionSourceLink(item, caseId);

    if (!item?.sourceType || !item?.sourceId) {
      return null;
    }

    return sourceLink ? (
      <Link
        to={sourceLink}
        className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        Kaynağı aç ·{' '}
        {CASE_QUESTION_SOURCE_LABELS[item.sourceType] || 'Kaynak'}
      </Link>
    ) : (
      <span className="text-xs text-gray-500">
        Kaynak ·{' '}
        {CASE_QUESTION_SOURCE_LABELS[item.sourceType] || 'Dosya kaydı'}
      </span>
    );
  };

  return (
    <Card>
      <Card.Header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Duruşma Hazırlık Brifi
              </h2>
            </div>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Seçili duruşma için dosya kayıtları ve analiz edilmiş belgeler üzerinden hazırlık brifi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {analysis.cached && (
              <Badge variant="info">
                Kayıtlı hazırlık
              </Badge>
            )}

            {typeof result.confidence === 'number' && (
              <Badge variant="default">
                Güven %{Math.round(result.confidence * 100)}
              </Badge>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={preparing}
              disabled={preparing}
              onClick={onRefresh}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Yeniden Hazırla
            </Button>
          </div>
        </div>
      </Card.Header>

      <Card.Body className="space-y-6">
        <section className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/50 dark:bg-rose-900/10">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 text-rose-600" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {result.hearingTitle || 'Duruşma'}
              </p>
              {result.hearingDate && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {formatAIImportantDate(result.hearingDate)}
                </p>
              )}
            </div>
          </div>
        </section>

        {result.shortBrief && (
          <section>
            <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
              Duruşma Özeti
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-gray-300">
              {result.shortBrief}
            </p>
          </section>
        )}

        {(result.caseStatus || result.caseSummary) && (
          <section>
            <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
              Dosyanın Mevcut Durumu
            </h3>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
              {result.caseStatus && (
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {result.caseStatus}
                </p>
              )}
              {result.caseSummary && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-600 dark:text-gray-300">
                  {result.caseSummary}
                </p>
              )}
            </div>
          </section>
        )}

        {Array.isArray(result.partiesAndPositions) && result.partiesAndPositions.length > 0 && (
          <section>
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
              Taraflar ve Pozisyonlar
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {result.partiesAndPositions.map((party, index) => (
                <div
                  key={`${party.partyName}-${index}`}
                  className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {party.partyName}
                    </p>
                    {party.role && <Badge variant="default">{party.role}</Badge>}
                  </div>
                  {party.position && (
                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {party.position}
                    </p>
                  )}
                  <div className="mt-3">{renderSourceLink(party)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {Array.isArray(result.claimsAndDefenses) && result.claimsAndDefenses.length > 0 && (
          <section>
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
              İddia ve Savunmalar
            </h3>
            <div className="space-y-3">
              {result.claimsAndDefenses.map((item, index) => (
                <div
                  key={`${item.statement}-${index}`}
                  className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        item.type === 'claim'
                          ? 'warning'
                          : item.type === 'defense'
                            ? 'info'
                            : 'default'
                      }
                    >
                      {item.type === 'claim'
                        ? 'İddia'
                        : item.type === 'defense'
                          ? 'Savunma'
                          : 'Belirsiz'}
                    </Badge>
                    {item.partyName && (
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {item.partyName}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">
                    {item.statement}
                  </p>
                  <div className="mt-3">{renderSourceLink(item)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {Array.isArray(result.evidence) && result.evidence.length > 0 && (
          <section>
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
              Önemli Deliller
            </h3>
            <div className="space-y-3">
              {result.evidence.map((item, index) => (
                <div
                  key={`${item.title}-${index}`}
                  className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.title}
                    </p>
                    <Badge variant={getRiskBadgeVariant(item.importance)}>
                      {RISK_LABELS[item.importance] || item.importance || 'Belirsiz'}
                    </Badge>
                  </div>
                  {item.assessment && (
                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {item.assessment}
                    </p>
                  )}
                  <div className="mt-3">{renderSourceLink(item)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {Array.isArray(result.hearingFocusPoints) && result.hearingFocusPoints.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Duruşmada Dikkat Edilecekler
              </h3>
            </div>
            <div className="space-y-3">
              {result.hearingFocusPoints.map((item, index) => (
                <div
                  key={`${item.point}-${index}`}
                  className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-900/10"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium text-amber-950 dark:text-amber-100">
                      {item.point}
                    </p>
                    <Badge variant={getRiskBadgeVariant(item.importance)}>
                      {RISK_LABELS[item.importance] || item.importance || 'Belirsiz'}
                    </Badge>
                  </div>
                  {item.reason && (
                    <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-200">
                      {item.reason}
                    </p>
                  )}
                  <div className="mt-3">{renderSourceLink(item)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {Array.isArray(result.missingInformation) && result.missingInformation.length > 0 && (
          <section>
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
              Eksik Bilgi / Belgeler
            </h3>
            <ul className="space-y-2">
              {result.missingInformation.map((item, index) => (
                <li
                  key={`${item}-${index}`}
                  className="rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {Array.isArray(result.preparationChecklist) && result.preparationChecklist.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Hazırlık Kontrol Listesi
              </h3>
            </div>
            <div className="space-y-3">
              {result.preparationChecklist.map((item, index) => (
                <div
                  key={`${item.title}-${index}`}
                  className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.title}
                    </p>
                    <Badge variant={getActionPriorityVariant(item.priority)}>
                      {ACTION_PRIORITY_LABELS[item.priority] || item.priority || 'Normal'}
                    </Badge>
                  </div>
                  {item.description && (
                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {item.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {renderSourceLink(item)}
                    {item.canCreateTask && canCreateTasks && (
                      <Link
                        to={`/tasks/create?${new URLSearchParams({
                         source: 'ai_hearing_preparation',
case_id: caseId || '',
client_id: clientId || '',
title: item.title || '',
                          description: item.description || '',
                          priority: item.priority || 'normal',
                          note: 'Derkenar AI duruşma hazırlığı önerisinden oluşturuldu.',
                        }).toString()}`}
                      >
                        <Button type="button" size="sm" variant="outline">
                          <Sparkles className="mr-2 h-4 w-4" />
                          Görev Oluştur
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {Array.isArray(result.criticalDates) && result.criticalDates.length > 0 && (
          <section>
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
              Kritik Tarihler
            </h3>
            <div className="space-y-2">
              {result.criticalDates.map((item, index) => (
                <div
                  key={`${item.date}-${item.title}-${index}`}
                  className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="mt-1 text-sm text-gray-500">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formatAIImportantDate(item.date)}
                    </p>
                  </div>
                  <div className="mt-2">{renderSourceLink(item)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {Array.isArray(result.sources) && result.sources.length > 0 && (
          <section>
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
              Kullanılan Kaynaklar
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {result.sources.map((source, index) => {
                const sourceLink = getCaseQuestionSourceLink(source, caseId);
                const content = (
                  <div className="rounded-xl border border-gray-200 p-3 transition hover:border-blue-300 dark:border-gray-700 dark:hover:border-blue-500/40">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {source.title || 'Kaynak'}
                      </p>
                      <span className="shrink-0 text-xs text-gray-400">
                        {CASE_QUESTION_SOURCE_LABELS[source.sourceType] || source.sourceType}
                      </span>
                    </div>
                    {source.relevance && (
                      <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                        {source.relevance}
                      </p>
                    )}
                  </div>
                );

                return sourceLink ? (
                  <Link
                    key={`${source.sourceType}-${source.sourceId}-${index}`}
                    to={sourceLink}
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={`${source.sourceType}-${source.sourceId}-${index}`}>
                    {content}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {result.requiresHumanReview && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
            <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5" />
              Avukat incelemesi gerekli
            </div>
            {Array.isArray(result.reviewReasons) && result.reviewReasons.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-800 dark:text-amber-200">
                {result.reviewReasons.map((reason, index) => (
                  <li key={`${reason}-${index}`}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

// ======================================================
// AI DOSYA TAMAMLAMA PANELİ
// ======================================================

const CaseCompletionAnalysis = ({
  analysis,
  onRefresh,
  refreshing,
  selectedMissingParties,
  onToggleMissingParty,
  onAddSelectedMissingParties,
  addingMissingParties,
  selectedCaseUpdates,
  onToggleCaseUpdate,
  onApplySelectedCaseUpdates,
  applyingCaseUpdates,
  canManageParties,
  canEditCase,
}) => {
  if (!analysis) {
    return null;
  }

  const result = analysis.result || analysis;

  const missingParties = Array.isArray(result.missingParties)
    ? result.missingParties
    : [];

  const partyConflicts = Array.isArray(result.partyConflicts)
    ? result.partyConflicts
    : [];

  const suggestedCaseUpdates = Array.isArray(result.suggestedCaseUpdates)
    ? result.suggestedCaseUpdates
    : [];

  const importantDateSuggestions = Array.isArray(
    result.importantDateSuggestions
  )
    ? result.importantDateSuggestions
    : [];

  const warnings = Array.isArray(result.warnings)
    ? result.warnings
    : [];

  const reviewReasons = Array.isArray(result.reviewReasons)
    ? result.reviewReasons
    : [];

  const hasSuggestions =
    missingParties.length > 0 ||
    partyConflicts.length > 0 ||
    suggestedCaseUpdates.length > 0 ||
    importantDateSuggestions.length > 0 ||
    warnings.length > 0;

  return (
    <Card>
      <Card.Header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                AI ile Dosyayı Tamamla
              </h2>
            </div>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Dava kaydı ile analiz edilmiş belgeler karşılaştırıldı.
              Öneriler otomatik uygulanmaz; yalnızca sizin seçip onayladığınız bilgiler kayda işlenir.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {analysis.cached && (
              <Badge variant="info">
                Kayıtlı analiz
              </Badge>
            )}

            {typeof result.confidence === 'number' && (
              <Badge variant="default">
                Güven %{Math.round(result.confidence * 100)}
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              loading={refreshing}
              disabled={refreshing}
              onClick={onRefresh}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Yeniden Tara
            </Button>
          </div>
        </div>
      </Card.Header>

      <Card.Body className="space-y-6">
        {!hasSuggestions && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
            Analiz edilmiş belgeler ile mevcut dava kaydı arasında
            belirgin bir eksik veya çelişki bulunmadı.
          </div>
        )}

        {missingParties.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-violet-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Belgelerde Bulunan Eksik Taraflar
              </h3>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
  {missingParties.map((party, index) => {
    const key = `${party.name}-${party.role}`;

    const checked =
      selectedMissingParties.includes(key);

    return (
      <label
        key={`${party.name}-${party.sourceDocumentId || index}`}
        className={`block cursor-pointer rounded-xl border p-4 transition ${
          checked
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={checked}
            disabled={!canManageParties}
            onChange={() =>
              onToggleMissingParty(party)
            }
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          />

          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {party.name}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {party.entityType || 'belirsiz'}
                  {' · '}
                  {party.role || 'belirsiz'}
                </p>
              </div>

              {typeof party.confidence === 'number' && (
                <Badge variant="default">
                  %{Math.round(party.confidence * 100)}
                </Badge>
              )}
            </div>

            {party.description && (
              <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                {party.description}
              </p>
            )}

            {party.representative && (
              <p className="mt-2 text-sm text-gray-500">
                Temsilci: {party.representative}
              </p>
            )}
          </div>
        </div>
      </label>
    );
  })}
</div>

<div className="mt-4 flex flex-wrap items-center gap-3">
  {canManageParties && (
    <Button
      type="button"
      disabled={
        selectedMissingParties.length === 0 ||
        addingMissingParties
      }
      loading={addingMissingParties}
      onClick={onAddSelectedMissingParties}
    >
      Seçilen Tarafları Onayla ve Ekle
    </Button>
  )}

  {selectedMissingParties.length > 0 && (
    <span className="text-sm text-gray-500">
      {selectedMissingParties.length} taraf seçildi
    </span>
  )}
</div>
            
          </section>
        )}

        {partyConflicts.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Taraf Çelişkileri
              </h3>
            </div>

            <div className="space-y-3">
              {partyConflicts.map((conflict, index) => (
                <div
                  key={`${conflict.partyName}-${getCaseUpdateLabel(conflict.field)}-${index}`}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-amber-950 dark:text-amber-100">
                      {conflict.partyName}
                    </p>

                    <Badge variant="warning">
                      {getCaseUpdateLabel(conflict.field)}
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        Sistemde
                      </p>
                      <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">
                        {conflict.currentValue ?? '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        Belgede önerilen
                      </p>
                      <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">
                        {conflict.suggestedValue ?? '-'}
                      </p>
                    </div>
                  </div>

                  {conflict.explanation && (
                    <p className="mt-3 text-sm leading-6 text-amber-900 dark:text-amber-100">
                      {conflict.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {suggestedCaseUpdates.length > 0 && (
          <section>
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
              Önerilen Dava Bilgisi Güncellemeleri
            </h3>

            <div className="space-y-3">
              {suggestedCaseUpdates.map((item, index) => {
  const checked =
    selectedCaseUpdates.includes(item.field);

  return (
    <label
      key={`${item.field}-${index}`}
      className={`block cursor-pointer rounded-xl border p-4 transition ${
        checked
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={!canEditCase}
          onChange={() =>
            onToggleCaseUpdate(item)
          }
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        />

        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-gray-900 dark:text-white">
              {getCaseUpdateLabel(item.field)}
            </p>

            {item.requiresHumanConfirmation && (
              <Badge variant="warning">
                Onay gerekli
              </Badge>
            )}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Mevcut
              </p>

              <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                {item.currentValue ?? '-'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Önerilen
              </p>

              <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                {item.suggestedValue ?? '-'}
              </p>
            </div>
          </div>

          {item.reason && (
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
              {item.reason}
            </p>
          )}
        </div>
      </div>
    </label>
  );
})}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {canEditCase && (
                  <Button
                    type="button"
                    disabled={
                      selectedCaseUpdates.length === 0 ||
                      applyingCaseUpdates
                    }
                    loading={applyingCaseUpdates}
                    onClick={onApplySelectedCaseUpdates}
                  >
                    Seçilenleri Onayla ve Uygula
                  </Button>
                )}

                {selectedCaseUpdates.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {selectedCaseUpdates.length} güncelleme seçildi
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {importantDateSuggestions.length > 0 && (
          <section>
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
              Belgelerden Tespit Edilen Önemli Tarihler
            </h3>

            <div className="space-y-2">
              {importantDateSuggestions.map((item, index) => (
                <div
                  key={`${item.date}-${item.label}-${index}`}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.label}
                    </p>

                    {item.explanation && (
                      <p className="mt-1 text-sm text-gray-500">
                        {item.explanation}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formatAIImportantDate(item.date)}
                    </p>

                    <Badge variant={getRiskBadgeVariant(item.importance)}>
                      {RISK_LABELS[item.importance] ||
                        item.importance ||
                        'Belirsiz'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {result.requiresHumanReview && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
            <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5" />
              Avukat onayı gerekli
            </div>

            {reviewReasons.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-800 dark:text-amber-200">
                {reviewReasons.map((reason, index) => (
                  <li key={`${reason}-${index}`}>
                    {reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {warnings.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-300">
              Dosya tamamlama uyarılarını göster
            </summary>

            <ul className="mt-3 space-y-2">
              {warnings.map((warning, index) => (
                <li
                  key={`${warning}-${index}`}
                  className="text-sm text-gray-600 dark:text-gray-400"
                >
                  • {warning}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card.Body>
    </Card>
  );
};

// ======================================================
// CASE DETAIL
// ======================================================

const CaseDetail = () => {
  const { id } = useParams();

  const {
    user,
  } = useAuth();

  const queryClient = useQueryClient();

  // ====================================================
  // PERMISSIONS
  // ====================================================

  const canUseAI =
    hasPermission(
      user,
      PERMISSION_KEYS.USE_AI
    );

  const canEditCase =
    hasPermission(
      user,
      PERMISSION_KEYS.EDIT_CASES
    );

  const canManageParties =
    hasPermission(
      user,
      PERMISSION_KEYS.MANAGE_CASE_PARTIES
    );

  const canViewClients =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_CLIENTS
    );

  const canViewDocuments =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_DOCUMENTS
    );

  const canUploadDocuments =
    hasPermission(
      user,
      PERMISSION_KEYS.UPLOAD_DOCUMENTS
    );

  const canDownloadDocuments =
    hasPermission(
      user,
      PERMISSION_KEYS.DOWNLOAD_DOCUMENTS
    );

  const canViewTasks =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_TASKS
    );

  const canCreateTasks =
    hasPermission(
      user,
      PERMISSION_KEYS.CREATE_TASKS
    );

  const canViewEvents =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_EVENTS
    );

  const canCreateEvents =
    hasPermission(
      user,
      PERMISSION_KEYS.CREATE_EVENTS
    );

  const canViewFinance =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_FINANCE
    );

  const [caseCompletion, setCaseCompletion] =
    useState(null);

  const [caseQuestionAnalysis, setCaseQuestionAnalysis] =
    useState(null);
const [
  hearingPreparation,
  setHearingPreparation,
] = useState(null);

const [
  selectedHearingId,
  setSelectedHearingId,
] = useState('');
  const [
    selectedMissingParties,
    setSelectedMissingParties,
  ] = useState([]);
  const [
  selectedCaseUpdates,
  setSelectedCaseUpdates,
] = useState([]);
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['case', id],
    queryFn: () => caseApi.getOne(id),
    enabled: Boolean(id),
  });

  const caseItem =
    data?.data?.data;

  const aiSummaryMutation =
    useMutation({
      mutationFn: ({
        force = false,
      }) =>
        aiApi.summarizeCase(
          id,
          {
            force,
          }
        ),

      onSuccess: (
        response
      ) => {
        const result =
          unwrapResponse(
            response
          );

        toast.success(
          result?.cached
            ? 'Kayıtlı AI analizi getirildi'
            : 'Dava AI analizi tamamlandı'
        );
      },

      onError: (error) => {
        console.error(
          'Case AI error:',
          error
        );

        toast.error(
          getApiErrorMessage(
            error,
            'Dava AI analizi oluşturulamadı'
          )
        );
      },
    });


  const caseQuestionMutation =
    useMutation({
      mutationFn: (question) =>
        aiApi.askCaseQuestion(
          id,
          question
        ),

      onSuccess: (response) => {
        const result =
          unwrapResponse(response);

        setCaseQuestionAnalysis(result);

        toast.success(
          result?.cached
            ? 'Kayıtlı dosya yanıtı getirildi'
            : 'Dosya sorusu yanıtlandı'
        );
      },

      onError: (error) => {
        console.error(
          'Case question error:',
          error
        );

        toast.error(
          getApiErrorMessage(
            error,
            'Dosya sorusu yanıtlanamadı'
          )
        );
      },
    });
const hearingPreparationMutation =
  useMutation({
    mutationFn: ({
      eventId,
      force = false,
    }) =>
      aiApi.prepareForHearing(
        id,
        eventId,
        {
          force,
        }
      ),

    onSuccess: (response) => {
      const result =
        unwrapResponse(response);

      setHearingPreparation(result);

      toast.success(
        result?.cached
          ? 'Kayıtlı duruşma hazırlığı getirildi'
          : 'Duruşma hazırlığı oluşturuldu'
      );
    },

    onError: (error) => {
      console.error(
        'Hearing preparation error:',
        error
      );

      toast.error(
        getApiErrorMessage(
          error,
          'Duruşma hazırlığı oluşturulamadı'
        )
      );
    },
  });
  const caseCompletionMutation =
    useMutation({
      mutationFn: ({
        force = false,
      } = {}) =>
        aiApi.analyzeCaseCompletion(
          id,
          {
            force,
          }
        ),

      onSuccess: (response) => {
        const result =
          unwrapResponse(
            response
          );

        setCaseCompletion(
          result
        );
        setSelectedMissingParties([]);
        setSelectedCaseUpdates([]);

        toast.success(
          result?.cached
            ? 'Kayıtlı dosya tamamlama analizi getirildi'
            : 'AI dosya tamamlama analizi tamamlandı'
        );
      },

      onError: (error) => {
        console.error(
          'Case completion error:',
          error
        );

        toast.error(
          getApiErrorMessage(
            error,
            'Dosya tamamlama analizi oluşturulamadı'
          )
        );
      },
    });
const addMissingPartiesMutation =
  useMutation({
    mutationFn: async (parties) => {
      const results = [];

      for (const party of parties) {
        const payload = {
          name: String(
            party.name || ''
          ).trim(),

          party_type:
            normalizePartyRole(
              party.role
            ),

          entity_type:
            normalizeAIEntityType(
              party.entityType
            ),

          identification_number:
            party.identificationNumber ||
            party.identification_number ||
            null,

          lawyer_name:
            party.representative ||
            null,

          notes:
            party.description ||
            null,
        };

        const response =
          await casePartyApi.create(
            id,
            payload
          );

        results.push(response);
      }

      return results;
    },

    onSuccess: async (_, parties) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['case', id],
        }),
        queryClient.invalidateQueries({
          queryKey: ['case-parties', id],
        }),
      ]);

      setSelectedMissingParties([]);
      setCaseCompletion(null);

      toast.success(
        `${parties.length} taraf davaya eklendi. Güncel öneriler için dosyayı yeniden tarayın.`
      );
    },

    onError: (error) => {
      console.error(
        'Taraf ekleme hatası:',
        error
      );

      toast.error(
        getApiErrorMessage(
          error,
          'Taraflar eklenemedi'
        )
      );
    },
  });
  const applyCaseUpdatesMutation = useMutation({
  mutationFn: async (updates) => {
    const payload = {};

    for (const item of updates) {
      payload[item.field] = item.suggestedValue;
    }

    return caseApi.patch(id, payload);
  },

  onSuccess: async () => {
    await queryClient.invalidateQueries({
      queryKey: ['case', id],
    });

    setSelectedCaseUpdates([]);
    setCaseCompletion(null);

    toast.success(
      'Seçilen dava bilgileri güncellendi. Güncel öneriler için dosyayı yeniden tarayın.'
    );
  },

  onError: (error) => {
    console.error(
      'Dava güncelleme hatası:',
      error
    );

    toast.error(
      getApiErrorMessage(
        error,
        'Dava bilgileri güncellenemedi'
      )
    );
  },
});

  const toggleMissingParty = (party) => {
  const key = `${party.name}-${party.role}`;

  setSelectedMissingParties((current) => {
    if (current.includes(key)) {
      return current.filter(
        (item) => item !== key
      );
    }

    return [
      ...current,
      key,
    ];
  });
};
const toggleCaseUpdate = (item) => {
  const key = item.field;

  setSelectedCaseUpdates((current) => {
    if (current.includes(key)) {
      return current.filter(
        (value) => value !== key
      );
    }

    return [
      ...current,
      key,
    ];
  });
};

const handleAddSelectedMissingParties = () => {
  const missingParties =
    caseCompletion?.result
      ?.missingParties ||
    caseCompletion?.missingParties ||
    [];

  const selected =
    missingParties.filter(
      (party) =>
        selectedMissingParties.includes(
          `${party.name}-${party.role}`
        )
    );

  if (selected.length === 0) {
    toast.error(
      'En az bir taraf seçin'
    );

    return;
  }

  const confirmed = window.confirm(
    `${selected.length} taraf dava kaydına eklenecek. Devam etmek istiyor musunuz?`
  );

  if (!confirmed) {
    return;
  }

  addMissingPartiesMutation.mutate(
    selected
  );
};
const handleApplySelectedCaseUpdates = () => {
  const suggestedCaseUpdates =
    caseCompletion?.result?.suggestedCaseUpdates ||
    caseCompletion?.suggestedCaseUpdates ||
    [];

  const selected =
    suggestedCaseUpdates.filter((item) =>
      selectedCaseUpdates.includes(item.field)
    );

  if (selected.length === 0) {
    toast.error('En az bir dava bilgisi seçin');
    return;
  }

  const confirmed = window.confirm(
    `${selected.length} dava bilgisi AI önerisine göre güncellenecek. Devam etmek istiyor musunuz?`
  );

  if (!confirmed) {
    return;
  }

  applyCaseUpdatesMutation.mutate(selected);
};
const upcomingHearings =
  Array.isArray(caseItem?.events)
    ? caseItem.events
        .filter((event) => {
          if (!event?.id || !event?.start_date) {
            return false;
          }

          const startDate =
            new Date(event.start_date);

          if (
            Number.isNaN(
              startDate.getTime()
            )
          ) {
            return false;
          }

          return (
            startDate.getTime() >
            Date.now()
          );
        })
        .sort(
          (a, b) =>
            new Date(a.start_date).getTime() -
            new Date(b.start_date).getTime()
        )
    : [];
  const aiAnalysis =
    aiSummaryMutation.data
      ? unwrapResponse(
          aiSummaryMutation.data
        )
      : null;

  const handleAIAnalysis = (
    force = false
  ) => {
    if (!canUseAI) {
      toast.error('AI kullanımı için yetkiniz bulunmuyor');
      return;
    }

    if (!id) {
      return;
    }

    aiSummaryMutation.mutate({
      force,
    });
  };


  const handleCaseQuestion = (question) => {
    if (!canUseAI) {
      toast.error('AI kullanımı için yetkiniz bulunmuyor');
      return;
    }

    if (!id) {
      return;
    }

    const normalizedQuestion =
      String(question || '').trim();

    if (!normalizedQuestion) {
      toast.error('Lütfen dosya hakkında bir soru yazın');
      return;
    }

    caseQuestionMutation.mutate(
      normalizedQuestion
    );
  };
  const handleHearingPreparation = (
  force = false
) => {
  if (!canUseAI) {
    toast.error(
      'AI kullanımı için yetkiniz bulunmuyor'
    );
    return;
  }

  if (!id) {
    return;
  }

  if (
    upcomingHearings.length === 0
  ) {
    toast.error(
      'Bu dosyada yaklaşan duruşma bulunmuyor'
    );
    return;
  }

  let eventId =
    selectedHearingId;

  if (
    upcomingHearings.length === 1
  ) {
    eventId =
      upcomingHearings[0].id;

    setSelectedHearingId(
      eventId
    );
  }

  if (!eventId) {
    toast.error(
      'Hazırlanacak duruşmayı seçin'
    );
    return;
  }

  const exists =
    upcomingHearings.some(
      (event) =>
        event.id === eventId
    );

  if (!exists) {
    setSelectedHearingId('');

    toast.error(
      'Seçilen duruşma artık yaklaşan duruşmalar arasında bulunmuyor'
    );

    return;
  }

  hearingPreparationMutation.mutate({
    eventId,
    force,
  });
};

  const handleCaseCompletion = (
    force = false
  ) => {
    if (!canUseAI) {
      toast.error('AI kullanımı için yetkiniz bulunmuyor');
      return;
    }

    if (!id) {
      return;
    }

    caseCompletionMutation.mutate({
      force,
    });
  };

  const handleDownload =
    async (doc) => {
      if (!canDownloadDocuments) {
        toast.error('Belge indirme yetkiniz bulunmuyor');
        return;
      }

      try {
        const response =
          await documentApi.download(
            doc.id
          );

        const blob =
          new Blob([
            response.data,
          ]);

        const url =
          window.URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            'a'
          );

        link.href = url;

        link.download =
          doc.original_name ||
          doc.name;

        document.body.appendChild(
          link
        );

        link.click();
        link.remove();

        window.URL.revokeObjectURL(
          url
        );

        toast.success(
          'Dosya indirildi'
        );
      } catch (error) {
        console.error(
          'Download error:',
          error
        );

        toast.error(
          getApiErrorMessage(
            error,
            'Dosya indirilemedi'
          )
        );
      }
    };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600 dark:border-gray-700 dark:border-b-blue-400" />

          <p className="mt-4 text-sm text-gray-500 dark:text-slate-400">
            Dava dosyası yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  if (
    error ||
    !caseItem
  ) {
    return (
      <div className="py-14 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />

        <h2 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
          Dava dosyası açılamadı
        </h2>

        <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500 dark:text-slate-400">
          {getApiErrorMessage(
            error,
            'Dava kaydı bulunamadı veya bu dosyayı görüntüleme yetkiniz bulunmuyor.'
          )}
        </p>

        <Link
          to="/cases"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Davalara Dön
        </Link>
      </div>
    );
  }

  const statuses = [
    {
      value: 'preparation',
      label: 'Hazırlık',
    },
    {
      value: 'active',
      label: 'Devam Ediyor',
    },
    {
      value: 'hearing',
      label: 'Duruşmada',
    },
    {
      value: 'appeal',
      label: 'İstinaf',
    },
    {
      value: 'cassation',
      label: 'Temyiz',
    },
    {
  value: 'suspended',
  label: 'Durduruldu',
},
    {
      value: 'concluded',
      label: 'Sonuçlandı',
    },
    {
      value: 'archived',
      label: 'Arşivlendi',
    },
  ];

  const getStatusVariant = (
    status
  ) => {
    switch (status) {
      case 'preparation':
        return 'warning';

      case 'active':
        return 'success';

      case 'hearing':
        return 'info';

      case 'appeal':
        return 'warning';

      case 'cassation':
        return 'default';
        case 'suspended':
  return 'warning';

      case 'concluded':
        return 'default';

      case 'archived':
        return 'danger';

      default:
        return 'default';
    }
  };

    return (
    <div className="mx-auto max-w-7xl space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div>
        <Link
          to="/cases"
          className="
            inline-flex
            items-center
            gap-1.5
            text-xs
            font-medium
            text-gray-500
            transition
            hover:text-blue-600
            dark:text-slate-500
            dark:hover:text-blue-400
          "
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Davalar
        </Link>

        <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">

          {/* LEFT */}

          <div className="flex min-w-0 items-start gap-3">

            <div
              className="
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-blue-50
                text-blue-600
                dark:bg-blue-500/[0.08]
                dark:text-blue-400
              "
            >
              <Gavel size={22} />
            </div>

            <div className="min-w-0">

            <h1
  className="
    truncate
    text-2xl
    font-semibold
    tracking-[-0.035em]
    text-gray-900
    dark:text-white
  "
>
  {[
    caseItem.court_name,
    caseItem.case_number,
  ]
    .filter(Boolean)
    .join(' · ') ||
    caseItem.title ||
    'Dava Dosyası'}
</h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">

                <Badge
                  variant={getStatusVariant(
                    caseItem.status
                  )}
                >
                  {statuses.find(
                    (status) =>
                      status.value === caseItem.status
                  )?.label ||
                    caseItem.status}
                </Badge>

                {caseItem.priority && (
                  <Badge
                    variant={
                      caseItem.priority === 'critical'
                        ? 'danger'
                        : caseItem.priority === 'high'
                          ? 'warning'
                          : caseItem.priority === 'normal'
                            ? 'primary'
                            : 'default'
                    }
                  >
                    {PRIORITY_LABELS[
                      caseItem.priority
                    ] ||
                      caseItem.priority}
                  </Badge>
                )}

               

              </div>

             <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
  {[
    caseItem.judiciary_type,
    caseItem.judiciary_unit,
  ]
    .filter(Boolean)
    .join(' · ') || 'Yargı bilgisi belirtilmemiş'}
</p>

            </div>

          </div>

          {/* ACTIONS */}

          <div className="flex flex-wrap items-center gap-2">

            {canUseAI && (
              <>
                <Button
                  type="button"
                  onClick={() =>
                    handleAIAnalysis(false)
                  }
                  loading={
                    aiSummaryMutation.isPending
                  }
                  disabled={
                    aiSummaryMutation.isPending
                  }
                >
                  <Brain className="mr-2 h-4 w-4" />
                  AI Analiz Et
                </Button>
<Button
  type="button"
  variant="outline"
  onClick={() =>
    handleHearingPreparation(false)
  }
  loading={
    hearingPreparationMutation.isPending
  }
  disabled={
    hearingPreparationMutation.isPending ||
    upcomingHearings.length === 0
  }
  title={
    upcomingHearings.length === 0
      ? 'Yaklaşan duruşma bulunmuyor'
      : 'Seçili duruşma için AI hazırlık brifi oluştur'
  }
>
  <Gavel className="mr-2 h-4 w-4" />
  Duruşmaya Hazırla
</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    handleCaseCompletion(false)
                  }
                  loading={
                    caseCompletionMutation.isPending
                  }
                  disabled={
                    caseCompletionMutation.isPending
                  }
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Dosyayı Tamamla
                </Button>
              </>
            )}

            {canUseAI && upcomingHearings.length > 1 && (
              <div className="min-w-[260px]">
                <select
                  value={selectedHearingId}
                  disabled={hearingPreparationMutation.isPending}
                  onChange={(event) => {
                    setSelectedHearingId(event.target.value);
                    setHearingPreparation(null);
                  }}
                  aria-label="Hazırlanacak duruşma"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Hazırlanacak duruşmayı seçin</option>

                  {upcomingHearings.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title || 'Duruşma'} · {formatDateTime(event.start_date)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {canEditCase && (
              <Link
                to={`/cases/${caseItem.id}/edit`}
              >
                <Button
                  variant="outline"
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Düzenle
                </Button>
              </Link>
            )}

          </div>

        </div>
      </div>

      {canViewFinance && (
        <FinanceContextSummary type="case" id={id} title="Dava Finans Özeti" />
      )}

      {/* ==================================================
          QUICK SUMMARY
      ================================================== */}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

        {/* CLIENT */}

        <div
          className="
            rounded-xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            dark:border-white/[0.06]
            dark:bg-gray-800
          "
        >
          <div className="flex items-center justify-between">

            <div
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                bg-blue-50
                text-blue-600
                dark:bg-blue-500/[0.08]
                dark:text-blue-400
              "
            >
              <Users size={17} />
            </div>

            <span className="text-xs text-gray-400">
              Müvekkil
            </span>

          </div>

          <p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
            {caseItem.clients?.length || 0}
          </p>

          <p className="mt-1 truncate text-xs text-gray-500 dark:text-slate-500">
            {caseItem.clients?.[0]?.name ||
              'Müvekkil yok'}
          </p>
        </div>

        {/* PARTIES */}

        <div
          className="
            rounded-xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            dark:border-white/[0.06]
            dark:bg-gray-800
          "
        >
          <div className="flex items-center justify-between">

            <div
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                bg-violet-50
                text-violet-600
                dark:bg-violet-500/[0.08]
                dark:text-violet-400
              "
            >
              <UserRound size={17} />
            </div>

            <span className="text-xs text-gray-400">
              Taraf
            </span>

          </div>

          <p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
            {caseItem.parties?.length || 0}
          </p>

          <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
            Müvekkilden ayrı dava tarafı
          </p>
        </div>

        {/* DOCUMENT */}

        <div
          className="
            rounded-xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            dark:border-white/[0.06]
            dark:bg-gray-800
          "
        >
          <div className="flex items-center justify-between">

            <div
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                bg-emerald-50
                text-emerald-600
                dark:bg-emerald-500/[0.08]
                dark:text-emerald-400
              "
            >
              <FileText size={17} />
            </div>

            <span className="text-xs text-gray-400">
              Belge
            </span>

          </div>

          <p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
            {caseItem.documents?.length || 0}
          </p>

          <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
            Dava dosyasındaki belgeler
          </p>
        </div>

        {/* TASK */}

        <div
          className="
            rounded-xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            dark:border-white/[0.06]
            dark:bg-gray-800
          "
        >
          <div className="flex items-center justify-between">

            <div
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                bg-amber-50
                text-amber-600
                dark:bg-amber-500/[0.08]
                dark:text-amber-400
              "
            >
              <ListTodo size={17} />
            </div>

            <span className="text-xs text-gray-400">
              Görev
            </span>

          </div>

          <p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
            {caseItem.tasks?.length || 0}
          </p>

          <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
            Dosyaya bağlı görevler
          </p>
        </div>

      </div>

      {/* ==================================================
          AI
      ================================================== */}

      {canUseAI && (
        <>
          <CaseAIAnalysis
            analysis={aiAnalysis}
            onRefresh={() =>
              handleAIAnalysis(true)
            }
            refreshing={
              aiSummaryMutation.isPending
            }
            caseId={caseItem.id}
            clientId={
              caseItem.clients?.length === 1
                  ? caseItem.clients[0].id
                  : ''
           }
            canCreateTasks={
              canCreateTasks
            }
          />

          <CaseQuestionPanel
            analysis={caseQuestionAnalysis}
            asking={caseQuestionMutation.isPending}
            onAsk={handleCaseQuestion}
            caseId={caseItem.id}
  clientId={
    caseItem.clients?.length === 1
      ? caseItem.clients[0].id
      : ''
  }
            canCreateTasks={canCreateTasks}
          />

          <HearingPreparationPanel
  analysis={hearingPreparation}
  preparing={hearingPreparationMutation.isPending}
  onRefresh={() => handleHearingPreparation(true)}
  caseId={caseItem.id}
  clientId={
    caseItem.clients?.length === 1
      ? caseItem.clients[0].id
      : ''
  }
  canCreateTasks={canCreateTasks}
/>

          <CaseCompletionAnalysis
            analysis={caseCompletion}
            refreshing={
              caseCompletionMutation.isPending
            }
            onRefresh={() =>
              handleCaseCompletion(true)
            }
            selectedMissingParties={
              selectedMissingParties
            }
            onToggleMissingParty={
              toggleMissingParty
            }
            onAddSelectedMissingParties={
              handleAddSelectedMissingParties
            }
            addingMissingParties={
              addMissingPartiesMutation.isPending
            }
            selectedCaseUpdates={
              selectedCaseUpdates
            }
            onToggleCaseUpdate={
              toggleCaseUpdate
            }
            onApplySelectedCaseUpdates={
              handleApplySelectedCaseUpdates
            }
            applyingCaseUpdates={
              applyCaseUpdatesMutation.isPending
            }
            canManageParties={
              canManageParties
            }
            canEditCase={
              canEditCase
            }
          />
        </>
      )}

      {/* ==================================================
          MAIN INFORMATION
      ================================================== */}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">

        {/* CASE INFO */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-blue-50
                  text-blue-600
                  dark:bg-blue-500/[0.08]
                  dark:text-blue-400
                "
              >
                <Scale size={17} />
              </div>

              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Dava Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Dosyanın temel yargı ve sorumlu bilgileri
                </p>
              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">

              {/* JUDICIARY TYPE */}

              <div className="grid grid-cols-[140px_1fr] gap-4 py-3 first:pt-0">

                <span className="text-sm text-gray-500">
                  Yargı Türü
                </span>

                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {caseItem.judiciary_type || '-'}
                </span>

              </div>

              {/* UNIT */}

              <div className="grid grid-cols-[140px_1fr] gap-4 py-3">

                <span className="text-sm text-gray-500">
                  Yargı Birimi
                </span>

                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {caseItem.judiciary_unit || '-'}
                </span>

              </div>

              {/* COURT */}

              <div className="grid grid-cols-[140px_1fr] gap-4 py-3">

                <span className="text-sm text-gray-500">
                  Mahkeme
                </span>

                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {caseItem.court_name || '-'}
                </span>

              </div>

              {/* NUMBER */}

              <div className="grid grid-cols-[140px_1fr] gap-4 py-3">

                <span className="text-sm text-gray-500">
                  Dosya No
                </span>

                <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                  {caseItem.case_number || '-'}
                </span>

              </div>

              {/* OPENING */}

              <div className="grid grid-cols-[140px_1fr] gap-4 py-3">

                <span className="text-sm text-gray-500">
                  Açılış Tarihi
                </span>

                <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                  <CalendarDays className="h-4 w-4 text-gray-400" />

                  {formatDateUTC(
                    caseItem.opening_date
                  )}
                </span>

              </div>

              {/* ASSIGNEE */}

              <div className="grid grid-cols-[140px_1fr] gap-4 py-3">

                <span className="text-sm text-gray-500">
                  Atanan Avukat
                </span>

                <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                  <BriefcaseBusiness className="h-4 w-4 text-gray-400" />

                  {caseItem.assignee
                    ? `${caseItem.assignee.first_name || ''} ${
                        caseItem.assignee.last_name || ''
                      }`.trim()
                    : 'Atanmadı'}
                </span>

              </div>

              {/* SUBJECT */}

              <div className="grid grid-cols-[140px_1fr] gap-4 py-3 last:pb-0">

                <span className="text-sm text-gray-500">
                  Konu
                </span>

                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {caseItem.subject || '-'}
                </span>

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* CLIENTS */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-emerald-50
                  text-emerald-600
                  dark:bg-emerald-500/[0.08]
                  dark:text-emerald-400
                "
              >
                <Users size={17} />
              </div>

              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Müvekkiller
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Büronun temsil ettiği ve bu dava ile ilişkilendirilmiş müvekkiller
                </p>
              </div>

            </div>

          </Card.Header>

          <Card.Body>

            {!caseItem.clients ||
            caseItem.clients.length === 0 ? (
              <div className="py-8 text-center">

                <Users className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-600" />

                <p className="mt-3 text-sm text-gray-500">
                  Müvekkil kaydı bulunmuyor
                </p>

              </div>
            ) : (
              <div className="space-y-2">

                {caseItem.clients.map(
                  (client) => (
                    <div
                      key={client.id}
                      className="
                        flex
                        items-center
                        justify-between
                        gap-3
                        rounded-xl
                        border
                        border-gray-100
                        p-3
                        dark:border-white/[0.05]
                      "
                    >

                      <div className="flex min-w-0 items-center gap-3">

                        <div
                          className="
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            bg-gray-100
                            text-gray-500
                            dark:bg-white/[0.04]
                            dark:text-slate-400
                          "
                        >
                          {client.client_type ===
                          'corporate' ? (
                            <Building2 size={16} />
                          ) : (
                            <UserRound size={16} />
                          )}
                        </div>

                        <div className="min-w-0">

                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {client.name}
                          </p>

                          <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                            {client.client_type ===
                            'corporate'
                              ? 'Kurumsal Müvekkil'
                              : 'Bireysel Müvekkil'}
                          </p>

                        </div>

                      </div>

                      {canViewClients && (
                        <Link
                          to={`/clients/${client.id}`}
                          className="text-xs font-medium text-blue-600 transition hover:text-blue-700 dark:text-blue-400"
                        >
                          Görüntüle
                        </Link>
                      )}

                    </div>
                  )
                )}

              </div>
            )}

          </Card.Body>

        </Card>

      </div>

      {/* ==================================================
          DESCRIPTION
      ================================================== */}

      {caseItem.description && (
        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-amber-50
                  text-amber-600
                  dark:bg-amber-500/[0.08]
                  dark:text-amber-400
                "
              >
                <FileText size={17} />
              </div>

              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Dava Açıklaması
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Dosya hakkında girilmiş açıklamalar
                </p>
              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-slate-300">
              {caseItem.description}
            </p>

          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          PARTIES
      ================================================== */}

      <Card>

        <Card.Header>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-violet-50
                  text-violet-600
                  dark:bg-violet-500/[0.08]
                  dark:text-violet-400
                "
              >
                <Users size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Taraflar
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Davacı, davalı, sanık, müşteki ve diğer dava tarafları. Müvekkil kaydından ayrıdır.
                </p>

              </div>

            </div>

            <div className="flex flex-wrap gap-2">

              {caseItem.parties?.length >
                0 && (
                <Link
                  to={`/cases/${caseItem.id}/parties`}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                  >
                    Tümünü Gör
                  </Button>
                </Link>
              )}

              {canManageParties && (
                <Link
                  to={`/cases/${caseItem.id}/parties/create`}
                >
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Taraf Ekle
                  </Button>
                </Link>
              )}

            </div>

          </div>

        </Card.Header>

        <Card.Body>

          {!caseItem.parties ||
          caseItem.parties.length ===
            0 ? (
            <div
              className="
                rounded-xl
                border
                border-dashed
                border-gray-200
                px-4
                py-10
                text-center
                dark:border-white/[0.07]
              "
            >

              <Users className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-600" />

              <p className="mt-3 font-medium text-gray-900 dark:text-white">
                Henüz taraf eklenmemiş
              </p>

              <p className="mt-1 text-sm text-gray-500 dark:text-slate-500">
                Dosyanın davacı, davalı veya diğer taraflarını ekleyin. Müvekkiller bu bölümden ayrı tutulur.
              </p>

              {canManageParties && (
                <Link
                  to={`/cases/${caseItem.id}/parties/create`}
                  className="mt-4 inline-flex"
                >
                  <Button type="button" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    İlk Tarafı Ekle
                  </Button>
                </Link>
              )}

            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">

              {caseItem.parties.map(
                (party) => {
                  const isCompany =
                    party.entity_type ===
                    'company';

                  const identificationNumber =
                    party.identification_number ||
                    party.tc_number ||
                    null;

                  return (
                    <Link
                      key={party.id}
                      to={`/cases/${caseItem.id}/parties/${party.id}`}
                      className="
                        group
                        rounded-xl
                        border
                        border-gray-100
                        p-4
                        transition
                        hover:border-blue-200
                        hover:bg-blue-50/30
                        dark:border-white/[0.05]
                        dark:hover:border-blue-500/20
                        dark:hover:bg-blue-500/[0.025]
                      "
                    >

                      <div className="flex items-start gap-3">

                        <div
                          className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            bg-gray-100
                            text-gray-500
                            dark:bg-white/[0.04]
                            dark:text-slate-400
                          "
                        >
                          {isCompany ? (
                            <Building2 size={17} />
                          ) : (
                            <UserRound size={17} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex items-start justify-between gap-3">

                            <div className="min-w-0">

                              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {party.name}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-1.5">

                                <Badge
                                  variant={
                                    PARTY_VARIANTS[
                                      party.party_type
                                    ] ||
                                    'default'
                                  }
                                >
                                  {PARTY_LABELS[
                                    party.party_type
                                  ] ||
                                    party.party_type ||
                                    'Taraf'}
                                </Badge>

                                <Badge variant="default">
                                  {isCompany
                                    ? 'Tüzel Kişi'
                                    : 'Gerçek Kişi'}
                                </Badge>

                              </div>

                            </div>

                          </div>

                          <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-slate-500">

                            {identificationNumber && (
                              <p>
                                {isCompany
                                  ? 'VKN'
                                  : 'TCKN'}
                                :{' '}
                                <span className="font-medium text-gray-700 dark:text-slate-300">
                                  {identificationNumber}
                                </span>
                              </p>
                            )}

                            {party.phone && (
                              <p className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5" />
                                {party.phone}
                              </p>
                            )}

                            {party.email && (
                              <p className="flex min-w-0 items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" />

                                <span className="truncate">
                                  {party.email}
                                </span>
                              </p>
                            )}

                            {party.lawyer_name && (
                              <p className="pt-1 font-medium text-gray-700 dark:text-slate-300">
                                Vekil: {party.lawyer_name}
                              </p>
                            )}

                          </div>

                        </div>

                      </div>

                    </Link>
                  );
                }
              )}

            </div>
          )}

        </Card.Body>

      </Card>

      {/* ==================================================
          DOCUMENTS + TASKS
      ================================================== */}

      <div className="grid gap-6 xl:grid-cols-2">

        {/* DOCUMENTS */}

        {canViewDocuments && (
          <Card>

          <Card.Header>

            <div className="flex items-center justify-between gap-3">

              <div className="flex items-center gap-3">

                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    bg-emerald-50
                    text-emerald-600
                    dark:bg-emerald-500/[0.08]
                    dark:text-emerald-400
                  "
                >
                  <FolderOpen size={17} />
                </div>

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Belgeler
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                    {caseItem.documents?.length || 0} belge
                  </p>

                </div>

              </div>

              {canUploadDocuments && (
                <Link
                  to={`/documents/upload?case=${caseItem.id}`}
                >
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Belge
                  </Button>
                </Link>
              )}

            </div>

          </Card.Header>

          <Card.Body>

            {!caseItem.documents ||
            caseItem.documents.length ===
              0 ? (
              <div className="py-8 text-center">

                <FileText className="mx-auto h-7 w-7 text-gray-300 dark:text-slate-600" />

                <p className="mt-3 text-sm text-gray-500">
                  Bu dava dosyasına henüz belge yüklenmemiş.
                </p>

                {canUploadDocuments && (
                  <Link
                    to={`/documents/upload?case_id=${caseItem.id}`}
                    className="mt-4 inline-flex"
                  >
                    <Button type="button" size="sm" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      İlk Belgeyi Yükle
                    </Button>
                  </Link>
                )}

              </div>
            ) : (
              <div className="space-y-2">

                {caseItem.documents.map(
                  (doc) => (
                    <div
                      key={doc.id}
                      className="
                        flex
                        items-center
                        justify-between
                        gap-3
                        rounded-xl
                        border
                        border-gray-100
                        p-3
                        dark:border-white/[0.05]
                      "
                    >

                      <Link
                        to={`/documents/${doc.id}`}
                        className="min-w-0 flex-1"
                      >

                        <p className="truncate text-sm font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400">
                          {doc.name}
                        </p>

                        <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                          {formatDateUTC(
                            doc.created_at
                          )}
                          {' · '}
                          {(
                            Number(
                              doc.file_size ||
                                0
                            ) / 1024
                          ).toFixed(1)}{' '}
                          KB
                        </p>

                      </Link>

                      {canDownloadDocuments && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDownload(
                              doc
                            )
                          }
                          className="
                            inline-flex
                            h-8
                            w-8
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            text-gray-400
                            transition
                            hover:bg-blue-50
                            hover:text-blue-600
                            dark:hover:bg-blue-500/[0.08]
                            dark:hover:text-blue-400
                          "
                          title="İndir"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}

                    </div>
                  )
                )}

              </div>
            )}

          </Card.Body>

          </Card>
        )}

        {/* TASKS */}

        {canViewTasks && (
          <Card>

          <Card.Header>

            <div className="flex items-center justify-between gap-3">

              <div className="flex items-center gap-3">

                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    bg-amber-50
                    text-amber-600
                    dark:bg-amber-500/[0.08]
                    dark:text-amber-400
                  "
                >
                  <ListTodo size={17} />
                </div>

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Görevler
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                    {caseItem.tasks?.length || 0} görev
                  </p>

                </div>

              </div>

              {canCreateTasks && (
                <Link
                  to={`/tasks/create?case_id=${caseItem.id}`}
                >
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Görev
                  </Button>
                </Link>
              )}

            </div>

          </Card.Header>

          <Card.Body>

            {!caseItem.tasks ||
            caseItem.tasks.length ===
              0 ? (
              <div className="py-8 text-center">

                <ListTodo className="mx-auto h-7 w-7 text-gray-300 dark:text-slate-600" />

                <p className="mt-3 text-sm text-gray-500">
                  Bu dava için henüz görev oluşturulmamış.
                </p>

                {canCreateTasks && (
                  <Link
                    to={`/tasks/create?case_id=${caseItem.id}`}
                    className="mt-4 inline-flex"
                  >
                    <Button type="button" size="sm" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      İlk Görevi Oluştur
                    </Button>
                  </Link>
                )}

              </div>
            ) : (
              <div className="space-y-2">

                {caseItem.tasks.map(
                  (task) => (
                    <Link
                      key={task.id}
                      to={`/tasks/${task.id}`}
                      className="
                        block
                        rounded-xl
                        border
                        border-gray-100
                        p-3
                        transition
                        hover:border-blue-200
                        dark:border-white/[0.05]
                        dark:hover:border-blue-500/20
                      "
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {task.title}
                          </p>

                          <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                            {task.assignee
                              ? `${task.assignee.first_name || ''} ${
                                  task.assignee.last_name || ''
                                }`.trim()
                              : 'Atanmadı'}

                            {task.due_date &&
                              ` · ${formatDateUTC(
                                task.due_date
                              )}`}
                          </p>

                        </div>

                        <Badge
                          variant={
                            task.status ===
                            'completed'
                              ? 'success'
                              : task.status ===
                                  'in_progress'
                                ? 'info'
                                : task.status ===
                                    'cancelled'
                                  ? 'danger'
                                  : 'warning'
                          }
                        >
                          {task.status ===
                          'pending'
                            ? 'Bekliyor'
                            : task.status ===
                                'in_progress'
                              ? 'Devam Ediyor'
                              : task.status ===
                                  'completed'
                                ? 'Tamamlandı'
                                : 'İptal'}
                        </Badge>

                      </div>

                    </Link>
                  )
                )}

              </div>
            )}

          </Card.Body>

          </Card>
        )}

      </div>

      {/* ==================================================
          HEARINGS
      ================================================== */}

      {canViewEvents && (
        <Card>

        <Card.Header>

          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-red-50
                  text-red-600
                  dark:bg-red-500/[0.08]
                  dark:text-red-400
                "
              >
                <CalendarDays size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Duruşmalar
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Dosyaya bağlı duruşma ve etkinlikler
                </p>

              </div>

            </div>

            {canCreateEvents && (
              <Link
                to={`/events/create?case=${caseItem.id}`}
              >
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Duruşma
                </Button>
              </Link>
            )}

          </div>

        </Card.Header>

        <Card.Body>

          {!caseItem.events ||
          caseItem.events.length ===
            0 ? (
            <div className="py-8 text-center">

              <CalendarDays className="mx-auto h-7 w-7 text-gray-300 dark:text-slate-600" />

              <p className="mt-3 text-sm text-gray-500">
                Bu dava için henüz duruşma veya etkinlik eklenmemiş.
              </p>

              {canCreateEvents && (
                <Link
                  to={`/events/create?case=${caseItem.id}`}
                  className="mt-4 inline-flex"
                >
                  <Button type="button" size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    İlk Duruşmayı Ekle
                  </Button>
                </Link>
              )}

            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">

              {caseItem.events.map(
                (event) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="
                      rounded-xl
                      border
                      border-gray-100
                      p-4
                      transition
                      hover:border-blue-200
                      hover:bg-blue-50/20
                      dark:border-white/[0.05]
                      dark:hover:border-blue-500/20
                      dark:hover:bg-blue-500/[0.02]
                    "
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {event.title}
                        </p>

                        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-500">

                          <Clock3 className="h-3.5 w-3.5" />

                          {formatDateTime(
                            event.start_date
                          )}

                        </div>

                        {event.location && (
                          <p className="mt-1 truncate text-xs text-gray-400 dark:text-slate-600">
                            {event.location}
                          </p>
                        )}

                      </div>

                      <Badge
                        variant={
                          event.status ===
                          'completed'
                            ? 'success'
                            : event.status ===
                                'ongoing'
                              ? 'info'
                              : event.status ===
                                  'cancelled'
                                ? 'danger'
                                : 'warning'
                        }
                      >
                        {event.status ===
                        'scheduled'
                          ? 'Planlandı'
                          : event.status ===
                              'ongoing'
                            ? 'Devam Ediyor'
                            : event.status ===
                                'completed'
                              ? 'Tamamlandı'
                              : 'İptal'}
                      </Badge>

                    </div>

                  </Link>
                )
              )}

            </div>
          )}

        </Card.Body>

        </Card>
      )}

    </div>
  );
};

export default CaseDetail;  