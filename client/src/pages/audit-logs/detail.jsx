import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  useQuery,
} from '@tanstack/react-query';

import auditLogApi from '../../features/audit-log/auditLog.api.js';

import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';

import Loader from '../../components/shared/Loader.jsx';
import Error from '../../components/shared/Error.jsx';
import Empty from '../../components/shared/Empty.jsx';

import {
  Activity,
  ArrowLeft,
  Clock3,
  Database,
  Fingerprint,
  History,
  Monitor,
  Network,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import {
  format,
} from 'date-fns';

import {
  tr,
} from 'date-fns/locale/tr';

// ======================================================
// HELPERS
// ======================================================

const getActionLabel = (
  action
) => {
  const labels = {
    create: 'Oluşturdu',
    update: 'Güncelledi',
    delete: 'Sildi',
    view: 'Görüntüledi',
    login: 'Giriş Yaptı',
    logout: 'Çıkış Yaptı',
    upload: 'Yükledi',
    download: 'İndirdi',
    share: 'Paylaştı',
  };

  return (
    labels[action] ||
    action ||
    '-'
  );
};

const getActionVariant = (
  action
) => {
  const variants = {
    create: 'success',
    update: 'warning',
    delete: 'danger',
    view: 'info',
    login: 'primary',
    logout: 'default',
    upload: 'success',
    download: 'info',
    share: 'warning',
  };

  return (
    variants[action] ||
    'default'
  );
};

const getEntityLabel = (
  type
) => {
  const labels = {
    case: 'Dava',
    client: 'Müvekkil',
    task: 'Görev',
    event: 'Duruşma',
    meeting: 'Toplantı',
    document: 'Belge',
    payment: 'Ödeme',
    user: 'Kullanıcı',
    case_party: 'Taraf',
    notification: 'Bildirim',
  };

  return (
    labels[type] ||
    type ||
    '-'
  );
};

const formatDate = (
  date
) => {
  if (!date) {
    return '-';
  }

  try {
    return format(
      new Date(date),
      'dd.MM.yyyy HH:mm:ss',
      {
        locale: tr,
      }
    );
  } catch {
    return '-';
  }
};

const getUserName = (
  log
) => {
  const fullName = [
    log?.user?.first_name,
    log?.user?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    fullName ||
    'Sistem'
  );
};

// ======================================================
// COMPONENT
// ======================================================

const AuditLogDetail = () => {
  const {
    id,
  } =
    useParams();

  const {
    data,
    isLoading,
    error,
    refetch,
  } =
    useQuery({
      queryKey: [
        'audit-log',
        id,
      ],

      queryFn: () =>
        auditLogApi.getOne(
          id
        ),

      enabled:
        Boolean(id),
    });

  const log =
    data?.data?.data;

  // ====================================================
  // LOADING
  // ====================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader text="Denetim kaydı yükleniyor..." />
      </div>
    );
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (
    error
  ) {
    return (
      <Error
        title="Denetim kaydı yüklenemedi"
        message="Log detayları alınırken bir hata oluştu."
        error={error}
        onRetry={() =>
          refetch?.()
        }
      />
    );
  }

  // ====================================================
  // NOT FOUND
  // ====================================================

  if (
    !log
  ) {
    return (
      <Empty
        icon={Activity}
        title="Denetim kaydı bulunamadı"
        description="İstenen log kaydı silinmiş veya artık erişilebilir olmayabilir."
        action={
          <Link to="/audit-logs">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Loglara Dön
            </Button>
          </Link>
        }
      />
    );
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <Link
            to="/audit-logs"
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
            Denetim Logları
          </Link>

          <div className="mt-3 flex items-start gap-3">

            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-violet-50
                text-violet-600
                dark:bg-violet-500/[0.08]
                dark:text-violet-400
              "
            >
              <ShieldCheck size={21} />
            </div>

            <div>

              <h1
                className="
                  text-2xl
                  font-semibold
                  tracking-[-0.035em]
                  text-gray-900
                  dark:text-white
                "
              >
                Denetim Kaydı
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">

                <Badge
                  variant={
                    getActionVariant(
                      log.action
                    )
                  }
                  dot
                >
                  {getActionLabel(
                    log.action
                  )}
                </Badge>

                <Badge variant="default">
                  {getEntityLabel(
                    log.entity_type
                  )}
                </Badge>

              </div>

            </div>

          </div>

        </div>

        <Link to="/audit-logs">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Listeye Dön
          </Button>
        </Link>

      </div>

      {/* ==================================================
          SUMMARY
      ================================================== */}

      <div className="grid gap-4 lg:grid-cols-2">

        {/* BASIC */}

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
                <Fingerprint size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  İşlem Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Kaydın işlem ve hedef bilgileri
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <div>

              <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                İşlem
              </p>

              <div className="mt-2">
                <Badge
                  variant={
                    getActionVariant(
                      log.action
                    )
                  }
                  dot
                >
                  {getActionLabel(
                    log.action
                  )}
                </Badge>
              </div>

            </div>

            <div>

              <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                Modül
              </p>

              <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                {getEntityLabel(
                  log.entity_type
                )}
              </p>

            </div>

            <div>

              <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                Kayıt ID
              </p>

              <code
                className="
                  mt-2
                  block
                  break-all
                  rounded-lg
                  bg-gray-50
                  px-3
                  py-2
                  text-xs
                  text-gray-600
                  dark:bg-white/[0.03]
                  dark:text-slate-400
                "
              >
                {log.entity_id ||
                  '-'}
              </code>

            </div>

            <div>

              <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                Açıklama
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-slate-300">
                {log.description ||
                  '-'}
              </p>

            </div>

          </Card.Body>

        </Card>

        {/* USER + TIME */}

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
                <UserRound size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Kullanıcı ve Oturum
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  İşlemi gerçekleştiren oturum bilgileri
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <div>

              <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                Kullanıcı
              </p>

              <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                {getUserName(
                  log
                )}
              </p>

              {log.user?.email && (
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                  {log.user.email}
                </p>
              )}

            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              <div>

                <div className="flex items-center gap-2 text-xs font-medium text-gray-400 dark:text-slate-500">
                  <Clock3 size={13} />
                  Tarih
                </div>

                <p className="mt-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                  {formatDate(
                    log.created_at
                  )}
                </p>

              </div>

              <div>

                <div className="flex items-center gap-2 text-xs font-medium text-gray-400 dark:text-slate-500">
                  <Network size={13} />
                  IP Adresi
                </div>

                <code className="mt-2 block text-xs text-gray-600 dark:text-slate-400">
                  {log.ip_address ||
                    '-'}
                </code>

              </div>

            </div>

            <div>

              <div className="flex items-center gap-2 text-xs font-medium text-gray-400 dark:text-slate-500">
                <Monitor size={13} />
                Cihaz / Tarayıcı
              </div>

              <p
                className="
                  mt-2
                  break-all
                  rounded-lg
                  bg-gray-50
                  px-3
                  py-2
                  text-xs
                  leading-5
                  text-gray-600
                  dark:bg-white/[0.03]
                  dark:text-slate-400
                "
              >
                {log.user_agent ||
                  '-'}
              </p>

            </div>

          </Card.Body>

        </Card>

      </div>

      {/* ==================================================
          CHANGES
      ================================================== */}

      {(log.old_values ||
        log.new_values) && (
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
                <History size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Değişim Detayları
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  İşlem öncesi ve sonrası veri karşılaştırması
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="grid gap-4 lg:grid-cols-2">

              {log.old_values && (
                <div>

                  <div className="mb-2 flex items-center justify-between">

                    <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                      Eski Değerler
                    </p>

                    <span className="text-[10px] text-gray-400 dark:text-slate-600">
                      Önce
                    </span>

                  </div>

                  <pre
                    className="
                      max-h-[360px]
                      overflow-auto
                      rounded-xl
                      border
                      border-red-100
                      bg-red-50/40
                      p-4
                      text-xs
                      leading-5
                      text-gray-700
                      dark:border-red-500/10
                      dark:bg-red-500/[0.025]
                      dark:text-slate-300
                    "
                  >
                    {JSON.stringify(
                      log.old_values,
                      null,
                      2
                    )}
                  </pre>

                </div>
              )}

              {log.new_values && (
                <div>

                  <div className="mb-2 flex items-center justify-between">

                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Yeni Değerler
                    </p>

                    <span className="text-[10px] text-gray-400 dark:text-slate-600">
                      Sonra
                    </span>

                  </div>

                  <pre
                    className="
                      max-h-[360px]
                      overflow-auto
                      rounded-xl
                      border
                      border-emerald-100
                      bg-emerald-50/40
                      p-4
                      text-xs
                      leading-5
                      text-gray-700
                      dark:border-emerald-500/10
                      dark:bg-emerald-500/[0.025]
                      dark:text-slate-300
                    "
                  >
                    {JSON.stringify(
                      log.new_values,
                      null,
                      2
                    )}
                  </pre>

                </div>
              )}

            </div>

          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          METADATA
      ================================================== */}

      {log.metadata &&
        Object.keys(
          log.metadata
        ).length >
          0 && (
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
                    bg-gray-100
                    text-gray-600
                    dark:bg-white/[0.05]
                    dark:text-slate-400
                  "
                >
                  <Database size={17} />
                </div>

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Metadata
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                    İşleme ait yardımcı teknik bilgiler
                  </p>

                </div>

              </div>

            </Card.Header>

            <Card.Body>

              <pre
                className="
                  max-h-[360px]
                  overflow-auto
                  rounded-xl
                  border
                  border-gray-200
                  bg-gray-50
                  p-4
                  text-xs
                  leading-5
                  text-gray-700
                  dark:border-white/[0.07]
                  dark:bg-white/[0.025]
                  dark:text-slate-300
                "
              >
                {JSON.stringify(
                  log.metadata,
                  null,
                  2
                )}
              </pre>

            </Card.Body>

          </Card>
        )}

    </div>
  );
};

export default AuditLogDetail;