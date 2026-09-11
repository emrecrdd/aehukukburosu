import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Command,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../../app/providers/auth.provider.jsx';

const ONBOARDING_VERSION = 'v5-topbar';
const START_EVENT = 'derkenar:onboarding:start';

const STEP_DEFINITIONS = [
  {
    id: 'welcome',
    category: 'Başlangıç',
    title: 'Derkenar’a hoş geldiniz',
    description:
      'Derkenar; hukuk ofisinin dosya, operasyon, iletişim, finans ve yapay zekâ süreçlerini tek merkezde toplar. Bu kısa tur, sistemdeki tüm ana çalışma alanlarını sırasıyla tanıtır.',
    target: null,
  },
  {
    id: 'dashboard',
    category: 'Genel',
    title: 'Genel Bakış',
    description:
      'Günün iş yükünü, yaklaşan tarihleri, önemli dosya hareketlerini ve ofisin genel durumunu hızlıca görmek için başlangıç noktanızdır.',
    onboardingId: 'nav-dashboard',
  },
  {
    id: 'chat',
    category: 'Genel',
    title: 'Sohbetler',
    description:
      'Ofis içi iletişimi sistem içinde sürdürün. Ekip üyeleriyle yürütülen yazışmaları çalışma akışınızdan kopmadan takip edin.',
    onboardingId: 'nav-chat',
  },
  {
    id: 'clients',
    category: 'Dosya Yönetimi',
    title: 'Müvekkiller',
    description:
      'Bireysel ve kurumsal müvekkil kayıtlarını, iletişim bilgilerini, bağlı davaları, danışmanlıkları ve finans özetlerini tek profilde yönetin.',
    onboardingId: 'nav-clients',
  },
  {
    id: 'cases',
    category: 'Dosya Yönetimi',
    title: 'Davalar',
    description:
      'Dava dosyalarını; taraflar, belgeler, görevler, toplantılar, duruşmalar, notlar ve finans bağlantılarıyla birlikte merkezi olarak takip edin.',
    onboardingId: 'nav-cases',
  },
  {
    id: 'consultations',
    category: 'Dosya Yönetimi',
    title: 'Danışmanlıklar',
    description:
      'Henüz davaya dönüşmemiş hukuki işleri ayrı bir dosya olarak yönetin. Potansiyel müvekkil, sorumlular, ücretlendirme ve bağlı iş akışlarını takip edin; gerektiğinde müvekkile ve davaya dönüştürün.',
    onboardingId: 'nav-consultations',
  },
  {
    id: 'documents',
    category: 'Dosya Yönetimi',
    title: 'Belgeler',
    description:
      'Dosya belgelerini merkezi olarak saklayın ve görüntüleyin. Desteklenen belgeleri yapay zekâ analizine dahil ederek dosyanın içeriğinden daha hızlı yararlanın.',
    onboardingId: 'nav-documents',
  },
  {
    id: 'templates',
    category: 'Dosya Yönetimi',
    title: 'Şablonlar',
    description:
      'Sık kullanılan belge ve metin yapılarını standartlaştırın. Ofis genelinde daha tutarlı ve hızlı belge üretimi için şablonlarınızı yönetin.',
    onboardingId: 'nav-templates',
  },
  {
    id: 'tasks',
    category: 'Operasyon',
    title: 'Görevler',
    description:
      'İşleri ekip üyelerine atayın; öncelik, son tarih ve durum bilgileriyle takip edin. Dosya bağlantıları sayesinde görevin hangi hukuki işe ait olduğunu kaybetmeyin.',
    onboardingId: 'nav-tasks',
  },
  {
    id: 'performance',
    category: 'Operasyon',
    title: 'Performans',
    description:
      'Yetkiniz dahilinde görev ve çalışma verilerini performans görünümünde izleyin. İş yükü ve tamamlanma eğilimlerini daha görünür hale getirin.',
    onboardingId: 'nav-performance',
  },
  {
    id: 'calendar',
    category: 'Operasyon',
    title: 'Takvim',
    description:
      'Duruşma, toplantı, görev ve diğer tarihli işlerinizi ortak zaman çizelgesinde takip edin; kritik tarihleri kaçırma riskini azaltın.',
    onboardingId: 'nav-calendar',
  },
  {
    id: 'meetings',
    category: 'Operasyon',
    title: 'Toplantılar',
    description:
      'Müvekkil ve dosya bağlantılı görüşmeleri planlayın, zamanını takip edin ve toplantı kayıtlarını ilgili hukuki işin içinde tutun.',
    onboardingId: 'nav-meetings',
  },
  {
    id: 'finance',
    category: 'Operasyon',
    title: 'Finans',
    description:
      'Ücret anlaşmaları, ödeme planları, alacaklar, tahsilatlar, giderler ve kasa/banka hareketlerini tek finans merkezinden yönetin; müvekkil, dava ve danışmanlıklarla ilişkilendirin.',
    onboardingId: 'nav-finance',
  },
  {
    id: 'ai',
    category: 'Akıllı Araçlar',
    title: 'AI Asistan',
    description:
      'Derkenar’ın ayırt edici çalışma alanıdır. Dosya ve belgeler üzerinden eksik bilgi ve delilleri, riskleri, önemli tarihleri ve önerilen sonraki işlemleri görünür hale getirir; duruşma hazırlığı gibi çalışmalarda avukatın değerlendirmesine destek olur.',
    onboardingId: 'nav-ai',
    featured: true,
  },
  {
    id: 'search',
    category: 'Akıllı Araçlar',
    title: 'Global Arama',
    description:
      'Müvekkil, dava, danışmanlık, belge, görev ve not kayıtlarında tek noktadan arama yaparak ihtiyaç duyduğunuz kayda hızla ulaşın.',
    onboardingId: 'nav-search',
  },
  {
    id: 'settings',
    category: 'Sistem',
    title: 'Ayarlar',
    description:
      'Yetkiniz dahilindeki kişisel ve sistem ayarlarını buradan yönetin. Derkenar’ı ofisinizin çalışma düzenine uygun şekilde yapılandırın.',
    onboardingId: 'nav-settings',
  },
  {
    id: 'system-info',
    category: 'Sistem',
    title: 'Sistem Bilgileri',
    description:
      'Uygulama ve sistem bilgilerine ihtiyaç duyduğunuzda bu bölümü kullanın. Destek ve teknik kontrol süreçlerinde referans noktasıdır.',
    onboardingId: 'nav-system-info',
  },
  {
    id: 'users',
    category: 'Yönetim',
    title: 'Kullanıcılar',
    description:
      'Yönetici hesabıyla ofis kullanıcılarını ve erişim yapılarını yönetin. Bu adım yalnızca ilgili yönetim alanını görebilen kullanıcılara gösterilir.',
    onboardingId: 'nav-users',
  },
  {
    id: 'audit-logs',
    category: 'Yönetim',
    title: 'Denetim Logları',
    description:
      'Sistemdeki önemli işlem izlerini denetim kayıtları üzerinden takip edin. Kurumsal izlenebilirlik ve operasyonel kontrol için merkezi kayıt alanıdır.',
    onboardingId: 'nav-audit-logs',
  },
  {
    id: 'topbar-search',
    category: 'Üst Menü',
    title: 'Hızlı Global Arama',
    description:
      'Üst bardaki arama alanını kullanarak bulunduğunuz sayfadan ayrılmadan aramanızı başlatın. Dava, müvekkil, belge ve diğer kayıtları hızlıca bulmak için günlük kullanımın en pratik kısayollarından biridir.',
    onboardingId: 'topbar-search',
  },
  {
    id: 'topbar-connection',
    category: 'Üst Menü',
    title: 'Sistem Bağlantı Durumu',
    description:
      'Derkenar’ın gerçek zamanlı bağlantı durumunu buradan takip edin. “Sistem Aktif” göstergesi, anlık bildirim ve canlı bağlantı kanalının çalıştığını hızlıca doğrulamanızı sağlar.',
    onboardingId: 'topbar-connection',
  },
  {
    id: 'topbar-theme',
    category: 'Üst Menü',
    title: 'Görünüm ve Tema',
    description:
      'Açık ve koyu görünüm arasında tek tıkla geçiş yapın. Derkenar çalışma alanını bulunduğunuz ortama ve kişisel kullanım tercihinize göre uyarlayabilirsiniz.',
    onboardingId: 'topbar-theme',
  },
  {
    id: 'topbar-notifications',
    category: 'Üst Menü',
    title: 'Bildirim Merkezi',
    description:
      'Görevler, dosya hareketleri ve sistemdeki önemli gelişmeler için bildirimlerinizi burada takip edin. Okunmamış bildirim sayısını anlık olarak görebilir ve bildirim merkezine hızlıca ulaşabilirsiniz.',
    onboardingId: 'topbar-notifications',
  },
  {
    id: 'topbar-user',
    category: 'Üst Menü',
    title: 'Hesap ve Profil Menüsü',
    description:
      'Profil bilgilerinize ve kişisel ayarlarınıza buradan erişin. Kullanıcı rolünüzü kontrol edebilir, profil ve ayarlar bölümüne geçebilir veya güvenli biçimde oturumu kapatabilirsiniz.',
    onboardingId: 'topbar-user',
  },
  {
    id: 'finish',
    category: 'Tamamlandı',
    title: 'Derkenar kullanıma hazır',
    description:
      'Ana çalışma alanlarını gördünüz. Artık müvekkil ve dosyalarınızı yönetebilir, ofis operasyonlarını takip edebilir ve yapay zekâ destekli araçlardan yararlanabilirsiniz. Tur tamamlandığında bu tanıtım otomatik olarak tekrar gösterilmez.',
    target: null,
    featured: true,
  },
];

const isElementUsable = (element) => {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number(style.opacity || 1) !== 0 &&
    rect.width > 0 &&
    rect.height > 0
  );
};

const findTarget = (step) => {
  if (!step || step.target === null) return null;

  if (step.onboardingId) {
    const candidates = Array.from(
      document.querySelectorAll(`[data-onboarding="${step.onboardingId}"]`)
    );
    const usable = candidates.find(isElementUsable);
    if (usable) return usable;
  }

  return null;
};

const getScrollableParent = (element) => {
  let node = element?.parentElement;

  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;

    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }

    node = node.parentElement;
  }

  return null;
};

const revealTarget = (element) => {
  if (!element) return;

  const scroller = getScrollableParent(element);

  if (!scroller) return;

  const itemRect = element.getBoundingClientRect();
  const scrollRect = scroller.getBoundingClientRect();
  const margin = 20;

  if (itemRect.top < scrollRect.top + margin) {
    scroller.scrollTop -= (scrollRect.top + margin) - itemRect.top;
  } else if (itemRect.bottom > scrollRect.bottom - margin) {
    scroller.scrollTop += itemRect.bottom - (scrollRect.bottom - margin);
  }
};

const storageKeyFor = (user) =>
  `derkenar:onboarding:${ONBOARDING_VERSION}:${user?.id || user?.email || 'anonymous'}`;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getTooltipPosition = (rect) => {
  const viewportPadding = 16;
  const width = Math.min(420, Math.max(300, window.innerWidth - viewportPadding * 2));
  const maxHeight = Math.max(280, window.innerHeight - viewportPadding * 2);
  const gap = 18;

  if (!rect) {
    return {
      width,
      left: (window.innerWidth - width) / 2,
      top: viewportPadding,
      maxHeight,
    };
  }

  const roomRight = window.innerWidth - rect.right;
  const roomLeft = rect.left;

  let left;

  // Sidebar hedeflerinde kartı mümkün olduğunca sağ tarafta sabit tutuyoruz.
  // Böylece alt menülere indikçe ana ekranın yatayda kayması/daralması engellenir.
  if (roomRight >= width + gap) {
    left = rect.right + gap;
  } else if (roomLeft >= width + gap) {
    left = rect.left - width - gap;
  } else {
    left = clamp(rect.right + gap, viewportPadding, window.innerWidth - width - viewportPadding);
  }

  const preferredTop = rect.top - 24;
  const top = clamp(preferredTop, viewportPadding, Math.max(viewportPadding, window.innerHeight - maxHeight - viewportPadding));

  return {
    width,
    left: clamp(left, viewportPadding, Math.max(viewportPadding, window.innerWidth - width - viewportPadding)),
    top,
    maxHeight,
  };
};

const OverlayPieces = ({ rect, featured }) => {
  const overlayClass = featured
    ? 'bg-slate-950/65 backdrop-blur-[1.5px]'
    : 'bg-slate-950/58 backdrop-blur-[1px]';

  if (!rect) {
    return <div className={`fixed inset-0 ${overlayClass}`} />;
  }

  const padding = 8;
  const left = Math.max(0, rect.left - padding);
  const top = Math.max(0, rect.top - padding);
  const right = Math.min(window.innerWidth, rect.right + padding);
  const bottom = Math.min(window.innerHeight, rect.bottom + padding);
  const common = `fixed ${overlayClass}`;

  return (
    <>
      <div className={common} style={{ left: 0, top: 0, right: 0, height: top }} />
      <div className={common} style={{ left: 0, top, width: left, height: bottom - top }} />
      <div className={common} style={{ left: right, right: 0, top, height: bottom - top }} />
      <div className={common} style={{ left: 0, right: 0, top: bottom, bottom: 0 }} />
      <div
        className={`pointer-events-none fixed rounded-xl ring-2 ring-offset-4 ring-offset-transparent ${
          featured
            ? 'ring-amber-400 shadow-[0_0_0_1px_rgba(255,255,255,0.24),0_16px_50px_rgba(15,23,42,0.36)]'
            : 'ring-blue-400 shadow-[0_0_0_1px_rgba(255,255,255,0.20),0_12px_40px_rgba(15,23,42,0.28)]'
        }`}
        style={{ left, top, width: right - left, height: bottom - top }}
      />
    </>
  );
};

export const startDerkenarOnboarding = () => {
  window.dispatchEvent(new CustomEvent(START_EVENT));
};

export default function DerkenarOnboarding() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [availableSteps, setAvailableSteps] = useState([
    STEP_DEFINITIONS[0],
    STEP_DEFINITIONS[STEP_DEFINITIONS.length - 1],
  ]);

  const storageKey = useMemo(() => storageKeyFor(user), [user]);

  const close = useCallback(
    (completed = false) => {
      setOpen(false);
      setTargetRect(null);

      if (completed) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            completed: true,
            version: ONBOARDING_VERSION,
            completedAt: new Date().toISOString(),
          })
        );
      }
    },
    [storageKey]
  );

  const buildSteps = useCallback(() => {
    const steps = STEP_DEFINITIONS.filter((step) => {
      if (step.target === null) return true;
      return Boolean(findTarget(step));
    });

    const resolved = steps.length
      ? steps
      : [STEP_DEFINITIONS[0], STEP_DEFINITIONS[STEP_DEFINITIONS.length - 1]];

    setAvailableSteps(resolved);
    return resolved;
  }, []);

  const start = useCallback(() => {
    const steps = buildSteps();
    setStepIndex(0);
    setOpen(true);

    requestAnimationFrame(() => {
      const element = findTarget(steps[0]);
      setTargetRect(element?.getBoundingClientRect?.() || null);
    });
  }, [buildSteps]);

  useEffect(() => {
    if (!user) return undefined;

    const onStart = () => start();
    window.addEventListener(START_EVENT, onStart);

    let parsed = null;
    try {
      const saved = localStorage.getItem(storageKey);
      parsed = saved ? JSON.parse(saved) : null;
    } catch {
      parsed = null;
    }

    if (!parsed?.completed) {
      const timeout = window.setTimeout(start, 900);
      return () => {
        window.clearTimeout(timeout);
        window.removeEventListener(START_EVENT, onStart);
      };
    }

    return () => window.removeEventListener(START_EVENT, onStart);
  }, [storageKey, user, start]);

  useEffect(() => {
    if (!open) return undefined;

    const step = availableSteps[stepIndex];
    const element = findTarget(step);

    // Hedef değiştiğinde Sidebar'ı sadece BİR KEZ gerekli konuma getir.
    // Kullanıcı daha sonra Sidebar'ı elle kaydırırsa onu geri zorlamıyoruz.
    if (element) {
      revealTarget(element);
    }

    const measure = () => {
      window.requestAnimationFrame(() => {
        const fresh = findTarget(step);
        setTargetRect(fresh?.getBoundingClientRect?.() || null);
      });
    };

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, stepIndex, availableSteps]);


  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') close(false);
      if (event.key === 'ArrowRight') {
        setStepIndex((current) =>
          Math.min(current + 1, availableSteps.length - 1)
        );
      }
      if (event.key === 'ArrowLeft') {
        setStepIndex((current) => Math.max(current - 1, 0));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, close, availableSteps.length]);

  if (!open) return null;

  const step = availableSteps[stepIndex];
  const isLast = stepIndex === availableSteps.length - 1;
  const tooltip = getTooltipPosition(targetRect);
  const progress = ((stepIndex + 1) / availableSteps.length) * 100;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]" aria-live="polite">
      <OverlayPieces rect={targetRect} featured={step.featured} />

      <div
        className="pointer-events-auto fixed z-[10001] overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0b1b33]"
        style={{
          width: tooltip.width,
          left: tooltip.left,
          top: tooltip.top,
          maxHeight: tooltip.maxHeight,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Derkenar sistem tanıtım turu"
      >
        <div
          className={`h-1 w-full ${
            step.featured
              ? 'bg-gradient-to-r from-amber-400 via-blue-500 to-blue-700'
              : 'bg-gradient-to-r from-blue-500 to-blue-700'
          }`}
        />

        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-white/[0.06]">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                step.featured
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300'
                  : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
              }`}
            >
              <Sparkles size={19} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.15em] ${
                    step.featured
                      ? 'text-amber-600 dark:text-amber-300'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {step.category}
                </p>
                <span className="text-[10px] text-gray-300 dark:text-slate-600">•</span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
                  Derkenar Rehberi
                </p>
              </div>

              <h3 className="mt-1 truncate text-base font-semibold text-gray-900 dark:text-white">
                {step.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => close(false)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.06] dark:hover:text-white"
            aria-label="Turu kapat"
          >
            <X size={17} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-gray-600 dark:text-slate-300">
            {step.description}
          </p>

          {step.id === 'welcome' && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 dark:border-blue-500/15 dark:bg-blue-500/[0.06]">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                Yetkiye duyarlı tanıtım
              </p>
              <p className="mt-1 text-xs leading-5 text-blue-700/75 dark:text-blue-300/70">
                Yalnızca hesabınızın erişebildiği modüller gösterilir. Yönetim alanları sadece yetkili hesapların turuna eklenir.
              </p>
            </div>
          )}

          {step.id === 'ai' && (
            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3 dark:border-amber-500/15 dark:bg-amber-500/[0.06]">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Derkenar’ın yapay zekâ katmanı
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-700/75 dark:text-amber-300/70">
                Yapay zekâ çıktıları avukatın mesleki değerlendirmesine destek olmak üzere sunulur; nihai hukuki değerlendirme kullanıcıya aittir.
              </p>
            </div>
          )}

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                step.featured ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
            <span>
              {stepIndex + 1} / {availableSteps.length}
            </span>

            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-1 md:inline-flex">
                <Command size={12} />
                ← →
              </span>
              <button
                type="button"
                onClick={() => close(true)}
                className="font-medium transition hover:text-gray-700 dark:hover:text-slate-200"
              >
                Turu atla
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/70 px-5 py-3 dark:border-white/[0.06] dark:bg-white/[0.025]">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() =>
              setStepIndex((current) => Math.max(current - 1, 0))
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-white/[0.05]"
          >
            <ChevronLeft size={16} />
            Geri
          </button>

          <button
            type="button"
            onClick={() => {
              if (isLast) {
                close(true);
                return;
              }
              setStepIndex((current) =>
                Math.min(current + 1, availableSteps.length - 1)
              );
            }}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition ${
              step.featured
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLast ? 'Turu Tamamla' : 'İleri'}
            {!isLast && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
