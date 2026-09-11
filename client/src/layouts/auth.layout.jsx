import {
  Outlet,
} from 'react-router-dom';

import {
  BrainCircuit,
  BriefcaseBusiness,
  FileText,
  Landmark,
  ShieldCheck,
} from 'lucide-react';

const features = [
  {
    icon: BriefcaseBusiness,
    title: 'Dosya ve Müvekkil Yönetimi',
    description:
      'Dava, müvekkil ve ilişkili kayıtları tek çalışma alanında yönetin.',
  },
  {
    icon: FileText,
    title: 'Belge Yönetimi',
    description:
      'Dosyaya bağlı belgelere hızlı erişin ve süreçleri düzenli tutun.',
  },
  {
    icon: BrainCircuit,
    title: 'AI Destekli Çalışma',
    description:
      'Dosya analizi, eksik bilgi tespiti ve akıllı çalışma araçlarından yararlanın.',
  },
  {
    icon: Landmark,
    title: 'Finans ve Tahsilat',
    description:
      'Ücret, ödeme planı, tahsilat ve masraf süreçlerini takip edin.',
  },
];

const AuthLayout = () => {
  return (
    <div
      className="
        relative
        flex
        min-h-screen
        items-center
        justify-center
        overflow-hidden
        bg-[#06152e]
        p-4
        sm:p-6
        lg:p-8
      "
    >
      {/* ==================================================
          BACKGROUND
      ================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(circle_at_15%_15%,rgba(37,99,235,0.13),transparent_28%),radial-gradient(circle_at_85%_80%,rgba(245,158,11,0.07),transparent_25%)]
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          opacity-[0.035]
          [background-image:linear-gradient(rgba(255,255,255,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.4)_1px,transparent_1px)]
          [background-size:40px_40px]
        "
      />

      {/* ==================================================
          CONTAINER
      ================================================== */}

      <div
        className="
          relative
          z-10
          grid
          w-full
          max-w-[1180px]
          overflow-hidden
          rounded-[28px]
          border
          border-white/[0.08]
          bg-[#081b3d]
          shadow-[0_35px_100px_rgba(0,0,0,0.35)]
          lg:grid-cols-[1.05fr_0.95fr]
        "
      >
        {/* ==================================================
            LEFT / BRAND
        ================================================== */}

        <section
          className="
            relative
            hidden
            min-h-[700px]
            overflow-hidden
            border-r
            border-white/[0.06]
            px-10
            py-10
            lg:flex
            lg:flex-col
            lg:justify-between
            xl:px-12
            xl:py-12
          "
        >
          {/* background decoration */}

          <div
            className="
              pointer-events-none
              absolute
              -right-24
              -top-24
              h-80
              w-80
              rounded-full
              bg-blue-500/[0.08]
              blur-3xl
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -bottom-24
              -left-20
              h-72
              w-72
              rounded-full
              bg-amber-400/[0.035]
              blur-3xl
            "
          />

          {/* BRAND */}

          <div className="relative">

            <div className="flex items-center gap-3">
              <img
                src="/favicon.svg"
                alt=""
                className="
                  h-11
                  w-11
                  shrink-0
                "
              />

              <div>
                <h1
                  className="
                    text-lg
                    font-bold
                    uppercase
                    tracking-[0.08em]
                    text-white
                  "
                >
                  Derkenar
                </h1>

                <p
                  className="
                    mt-0.5
                    text-[9px]
                    font-semibold
                    uppercase
                    tracking-[0.16em]
                    text-amber-300/75
                  "
                >
                  Hukuk Büro Yönetimi
                </p>
              </div>
            </div>

            <div className="mt-14 max-w-lg">

              <p
                className="
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-[0.16em]
                  text-amber-300
                "
              >
                Büro çalışma alanı
              </p>

              <h2
                className="
                  mt-4
                  text-4xl
                  font-semibold
                  leading-[1.15]
                  tracking-[-0.045em]
                  text-white
                  xl:text-[44px]
                "
              >
                Hukuki süreçlerinizi
                <span className="block text-slate-400">
                  tek merkezden yönetin.
                </span>
              </h2>

              <p
                className="
                  mt-5
                  max-w-md
                  text-[15px]
                  leading-7
                  text-slate-400
                "
              >
                Dosyadan müvekkile, duruşmadan belgeye kadar
                büronuzun günlük operasyonunu daha düzenli,
                izlenebilir ve erişilebilir hale getirin.
              </p>

            </div>

          </div>

          {/* FEATURES */}

          <div className="relative space-y-4">

            {features.map(
              (
                feature
              ) => {
                const Icon =
                  feature.icon;

                return (
                  <div
                    key={
                      feature.title
                    }
                    className="
                      flex
                      items-start
                      gap-3.5
                      rounded-xl
                      border
                      border-white/[0.05]
                      bg-white/[0.025]
                      px-4
                      py-3.5
                    "
                  >
                    <div
                      className="
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        bg-blue-500/[0.08]
                        text-blue-300
                      "
                    >
                      <Icon
                        size={17}
                      />
                    </div>

                    <div>

                      <p
                        className="
                          text-sm
                          font-semibold
                          text-slate-100
                        "
                      >
                        {feature.title}
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          leading-5
                          text-slate-500
                        "
                      >
                        {feature.description}
                      </p>

                    </div>

                  </div>
                );
              }
            )}

          </div>

          {/* FOOTER */}

          <div
            className="
              relative
              flex
              items-center
              gap-2
              border-t
              border-white/[0.06]
              pt-6
            "
          >
            <ShieldCheck
              size={15}
              className="text-emerald-400"
            />

            <p
              className="
                text-[11px]
                font-medium
                text-slate-500
              "
            >
              Güvenli hukuk bürosu çalışma alanı
            </p>

          </div>

        </section>

        {/* ==================================================
            RIGHT / AUTH FORM
        ================================================== */}

        <section
          className="
            relative
            flex
            min-h-[620px]
            items-center
            justify-center
            bg-[#f8fafc]
            px-5
            py-10
            dark:bg-[#09172b]
            sm:px-8
            lg:min-h-[700px]
            lg:px-10
            xl:px-14
          "
        >
          <div
            className="
              w-full
              max-w-[420px]
            "
          >
            {/* MOBILE BRAND */}

            <div className="mb-10 lg:hidden">

              <div className="flex items-center gap-3">
                <img
                  src="/favicon.svg"
                  alt=""
                  className="
                    h-10
                    w-10
                    shrink-0
                  "
                />

                <div>
                  <h1
                    className="
                      text-lg
                      font-bold
                      uppercase
                      tracking-[0.08em]
                      text-gray-900
                      dark:text-white
                    "
                  >
                    Derkenar
                  </h1>

                  <p
                    className="
                      mt-0.5
                      text-[9px]
                      font-semibold
                      uppercase
                      tracking-[0.16em]
                      text-amber-600
                      dark:text-amber-300/75
                    "
                  >
                    Hukuk Büro Yönetimi
                  </p>
                </div>
              </div>

            </div>

            {/* FORM */}

            <Outlet />

          </div>

        </section>

      </div>
    </div>
  );
};

export default AuthLayout;
