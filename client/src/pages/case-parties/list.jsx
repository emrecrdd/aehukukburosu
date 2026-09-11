import {
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import casePartyApi from '../../features/case-parties/case-party.api.js';

import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  ArrowLeft,
  Building2,
  Edit2,
  Mail,
  Phone,
  Plus,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const PARTY_TYPES = [
  {
    value: 'davaci',
    label: 'Davacı',
    variant: 'success',
  },
  {
    value: 'davali',
    label: 'Davalı',
    variant: 'danger',
  },
  {
    value: 'supheli',
    label: 'Şüpheli',
    variant: 'warning',
  },
  {
    value: 'sanik',
    label: 'Sanık',
    variant: 'danger',
  },
  {
    value: 'musteki',
    label: 'Müşteki',
    variant: 'info',
  },
  {
    value: 'katilan',
    label: 'Katılan',
    variant: 'info',
  },
  {
    value: 'magdur',
    label: 'Mağdur',
    variant: 'warning',
  },
  {
    value: 'maktul',
    label: 'Maktul',
    variant: 'default',
  },
  {
    value: 'alacakli',
    label: 'Alacaklı',
    variant: 'success',
  },
  {
    value: 'borclu',
    label: 'Borçlu',
    variant: 'warning',
  },
  {
    value: 'ucuncu_kisi',
    label: 'Üçüncü Kişi',
    variant: 'default',
  },
];

// ======================================================
// HELPERS
// ======================================================

const getPartyType = (
  type
) => {
  return (
    PARTY_TYPES.find(
      (
        item
      ) =>
        item.value ===
        type
    ) || {
      value:
        type,

      label:
        type ||
        'Bilinmiyor',

      variant:
        'default',
    }
  );
};

// ======================================================
// COMPONENT
// ======================================================

const CasePartyList = () => {
  const {
    caseId,
  } =
    useParams();

  const queryClient =
    useQueryClient();

  const [
    filter,
    setFilter,
  ] =
    useState(
      'all'
    );

  // ======================================================
  // QUERY
  // ======================================================

  const {
    data,
    isLoading,
    error,
  } =
    useQuery({
      queryKey: [
        'case-parties',
        caseId,
      ],

      queryFn: () =>
        casePartyApi.getByCase(
          caseId
        ),

      enabled:
        Boolean(
          caseId
        ),

      staleTime:
        2 * 60 * 1000,
    });

  const parties =
    Array.isArray(
      data?.data?.data
    )
      ? data.data.data
      : Array.isArray(
          data?.data
        )
        ? data.data
        : [];

  // ======================================================
  // COUNTS
  // ======================================================

  const counts =
    useMemo(() => {
      const result = {
        all:
          parties.length,
      };

      PARTY_TYPES.forEach(
        (
          type
        ) => {
          result[
            type.value
          ] =
            parties.filter(
              (
                party
              ) =>
                party.party_type ===
                type.value
            ).length;
        }
      );

      return result;
    }, [
      parties,
    ]);

  const availableFilters =
    useMemo(() => {
      return PARTY_TYPES.filter(
        (
          type
        ) =>
          counts[
            type.value
          ] >
          0
      );
    }, [
      counts,
    ]);

  const filteredParties =
    useMemo(() => {
      if (
        filter ===
        'all'
      ) {
        return parties;
      }

      return parties.filter(
        (
          party
        ) =>
          party.party_type ===
          filter
      );
    }, [
      parties,
      filter,
    ]);

  // ======================================================
  // DELETE
  // ======================================================

  const deleteMutation =
    useMutation({
      mutationFn: (
        id
      ) =>
        casePartyApi.remove(
          id
        ),

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            'case-parties',
            caseId,
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'case',
            caseId,
          ],
        });

        toast.success(
          'Taraf silindi'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          error
            ?.response
            ?.data
            ?.message ||
          error?.message ||
          'Taraf silinemedi'
        );
      },
    });

  const handleDelete = (
    id,
    name
  ) => {
    if (
      deleteMutation.isPending
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `"${name}" taraf kaydını silmek istediğinize emin misiniz?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    deleteMutation.mutate(
      id
    );
  };

  // ======================================================
  // LOADING
  // ======================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex min-h-[20rem] flex-col items-center justify-center gap-3">

        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />

        <p className="text-sm text-gray-500">
          Taraflar yükleniyor...
        </p>

      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (
    error
  ) {
    return (
      <div className="py-16 text-center">

        <Users className="mx-auto h-12 w-12 text-gray-300" />

        <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          Taraflar yüklenemedi
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {error
            ?.response
            ?.data
            ?.message ||
            'Bir hata oluştu.'}
        </p>

        <Link
          to={`/cases/${caseId}`}
          className="mt-5 inline-block"
        >
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />

            Davaya Dön
          </Button>
        </Link>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <Link
            to={`/cases/${caseId}`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />

            Davaya Dön
          </Link>

          <div className="mt-4 flex items-start gap-3">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">

              <Users className="h-6 w-6 text-blue-600" />

            </div>

            <div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Davanın Tarafları
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Dosyada yer alan kişi ve kurumların taraf sıfatlarını ve vekil bilgilerini yönetin.
              </p>

              <p className="mt-2 text-xs text-gray-400">
                {parties.length} taraf kayıtlı
              </p>

            </div>

          </div>

        </div>

        <Link
          to={`/cases/${caseId}/parties/create`}
        >
          <Button>
            <Plus className="mr-2 h-4 w-4" />

            Yeni Taraf
          </Button>
        </Link>

      </div>

      {/* FILTERS */}

      {parties.length >
        0 && (
        <div className="flex flex-wrap gap-2">

          <button
            type="button"
            onClick={() =>
              setFilter(
                'all'
              )
            }
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filter ===
              'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            Tümü ({counts.all})
          </button>

          {availableFilters.map(
            (
              type
            ) => (
              <button
                key={
                  type.value
                }
                type="button"
                onClick={() =>
                  setFilter(
                    type.value
                  )
                }
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter ===
                  type.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {type.label}{' '}
                ({counts[type.value]})
              </button>
            )
          )}

        </div>
      )}

      {/* EMPTY */}

      {filteredParties.length ===
      0 ? (
        <Card>

          <Card.Body className="py-14 text-center">

            <Users className="mx-auto h-10 w-10 text-gray-300" />

            <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">
              {filter ===
              'all'
                ? 'Henüz taraf eklenmemiş'
                : 'Bu türde taraf bulunmuyor'}
            </h3>

            {filter ===
              'all' && (
              <Link
                to={`/cases/${caseId}/parties/create`}
                className="mt-4 inline-block"
              >
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />

                  İlk Tarafı Ekle
                </Button>
              </Link>
            )}

          </Card.Body>

        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">

          {filteredParties.map(
            (
              party
            ) => {
              const type =
                getPartyType(
                  party.party_type
                );

              const isCompany =
                party.entity_type ===
                'company';

              const identityNumber =
                party.identification_number ||
                party.tc_number ||
                null;

              return (
                <Card
                  key={
                    party.id
                  }
                  className="transition-shadow hover:shadow-md"
                >

                  <Card.Body>

                    <div className="flex items-start justify-between gap-4">

                      <Link
                        to={`/cases/${caseId}/parties/${party.id}`}
                        className="min-w-0 flex-1"
                      >

                        <div className="flex items-start gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">

                            {isCompany ? (
                              <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                            ) : (
                              <UserRound className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                            )}

                          </div>

                          <div className="min-w-0">

                            <h3 className="truncate font-semibold text-gray-900 dark:text-white">
                              {party.name}
                            </h3>

                            <div className="mt-2 flex flex-wrap gap-2">

                              <Badge
                                variant={
                                  type.variant
                                }
                              >
                                {type.label}
                              </Badge>

                              <Badge variant="default">
                                {isCompany
                                  ? 'Tüzel Kişi'
                                  : 'Gerçek Kişi'}
                              </Badge>

                            </div>

                          </div>

                        </div>

                      </Link>

                      <div className="flex shrink-0 gap-1">

                        <Link
                          to={`/cases/${caseId}/parties/${party.id}/edit`}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                          aria-label="Tarafı düzenle"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>

                        <button
                          type="button"
                          disabled={
                            deleteMutation.isPending
                          }
                          onClick={() =>
                            handleDelete(
                              party.id,
                              party.name
                            )
                          }
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20"
                          aria-label="Tarafı sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                      </div>

                    </div>

                    {/* INFO */}

                    <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm dark:border-gray-700">

                      {identityNumber && (
                        <div className="flex items-center justify-between gap-3">

                          <span className="text-gray-400">
                            {isCompany
                              ? 'VKN'
                              : 'TCKN'}
                          </span>

                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {identityNumber}
                          </span>

                        </div>
                      )}

                      {party.phone && (
                        <div className="flex items-center gap-2">

                          <Phone className="h-4 w-4 text-gray-400" />

                          <a
                            href={`tel:${party.phone}`}
                            className="text-gray-700 hover:text-blue-600 dark:text-gray-300"
                          >
                            {party.phone}
                          </a>

                        </div>
                      )}

                      {party.email && (
                        <div className="flex items-center gap-2">

                          <Mail className="h-4 w-4 text-gray-400" />

                          <a
                            href={`mailto:${party.email}`}
                            className="truncate text-gray-700 hover:text-blue-600 dark:text-gray-300"
                          >
                            {party.email}
                          </a>

                        </div>
                      )}

                      {party.lawyer_name && (
                        <div className="mt-3 rounded-lg bg-purple-50 p-3 dark:bg-purple-900/10">

                          <p className="text-xs uppercase tracking-wide text-purple-500">
                            Vekil
                          </p>

                          <p className="mt-1 font-medium text-gray-900 dark:text-white">
                            {party.lawyer_name}
                          </p>

                          {party.lawyer_registry_number && (
                            <p className="mt-1 text-xs text-gray-500">
                              Sicil: {party.lawyer_registry_number}
                            </p>
                          )}

                        </div>
                      )}

                    </div>

                  </Card.Body>

                </Card>
              );
            }
          )}

        </div>
      )}

    </div>
  );
};

export default CasePartyList;