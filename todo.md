# glorytiktok — TODO / İlerleme Kaydı

## Tamamlananlar

- [x] Boş GitHub reposu klonlandı: `socialtradeturkey/glorytiktok`
- [x] TikTok benzeri koyu temalı görev akışı oluşturuldu.
- [x] YouTube resmi embed player çalışma alanı eklendi.
- [x] Manuel görev sırası oluşturuldu: beğen → abone ol → izle → Secret Code → görevi tamamla.
- [x] Video izleme ilerleme çubuğu ve video üstü Secret Code popup prototipi eklendi.
- [x] Admin kanıt inceleme paneli oluşturuldu: kanıt adedi, gönderim zamanı, onayla/reddet aksiyonları.
- [x] Kullanıcı cüzdan/profil görünümü oluşturuldu: bakiye, toplam kazanım, görev geçmişi ve onay oranı.
- [x] Reklamveren paneli oluşturuldu: kampanya listesi, bütçe, katılım ilerlemesi ve yeni kampanya taslağı.
- [x] Admin paneline environment değişkenleri üzerinden giriş formu eklendi; parola kaynak koda veya bu dosyaya yazılmadı.
- [x] Kullanıcı kayıt/giriş ekranı ve Supabase oturumundan güvenli çıkış düğmesi eklendi.
- [x] Admin paneline görev oluşturma formu eklendi: görseldeki temel bilgiler, platform/eylem, doğrulama, ödül-kapasite, zamanlama ve uygunluk alanları.
- [x] `pnpm build` başarılı şekilde çalıştırıldı.
- [x] Yerel smoke test başarılı.
- [x] GitHub commitleri gönderildi:
  - `fc1c262` — Build TikTok-style organic task flow prototype
  - `b801fda` — Add admin wallet and advertiser panels
  - `224778d` — Add Supabase productization foundation

## Sonraki aşama — gerçek ürünleştirme

- [x] Gerçek kullanıcı kimlik doğrulamasını Supabase Auth session akışıyla bağla.
- [x] Admin rolü ve yetki kontrolü için `profiles.role`, `is_admin()` ve RLS altyapısını ekle.
- [x] Ekran görüntüsü yükleme/storage istemci akışını ve private bucket RLS politikasını ekle.
- [x] Kanıt kayıtları için `submissions` ve `evidence` tablolarını ve istemci yardımcılarını ekle.
- [x] Admin onayında ledger ve profil bakiyesini atomik güncelleyen `approve_submission()` RPC’sini ekle.
- [x] Reklamveren kampanyaları ve bütçe rezervasyonu için tablo/RLS/istemci yardımcılarını ekle.
- [x] Reklamveren kampanya formunu doğrulama ve bütçe hesabıyla Supabase insert akışına bağla.
- [x] YouTube OAuth/API kanıtlarını görev submission akışına bağla; `youtube-verify` Edge Function beğeni ve aboneliği YouTube Data API üzerinden kontrol ediyor.
- [x] Gerçek heartbeat ve tek kullanımlık Secret Code endpoint’i ekle; `heartbeat` Edge Function nonce, süre ve tek kullanımlık kod doğrulamasını yönetiyor.

## Üretim migration notu
`supabase/migrations/001_productization.sql`, `002_youtube_verification.sql` ve `003_task_details.sql` dosyaları repoya eklendi. Supabase SQL Editor’de sırasıyla bir kez çalıştırılmalı; ardından yeni kullanıcılar otomatik olarak `profiles` kaydı alır. `murathand08@gmail.com` adresi migration ile admin rolüne alınır; yeni kayıt oluşturulursa trigger da aynı rolü verir. Edge Function’lar `supabase functions deploy heartbeat` ve `supabase functions deploy youtube-verify` komutlarıyla yayınlanmalıdır. Google Cloud Console’da YouTube Data API v3 etkinleştirilmeli, OAuth Web client ID için uygulamanın yerel ve üretim redirect URL’leri tanımlanmalı ve `VITE_GOOGLE_CLIENT_ID` ayarlanmalıdır. Admin yeni görev oluştururken YouTube kanal ID’sini de girmelidir.

## Güvenlik notu

Admin parolası source code, `todo.md` veya GitHub’a yazılmamalıdır. Kullanıcı parolaları Supabase Auth tarafından yönetilir; admin yetkisi `profiles.role` ve RLS/RPC politikalarıyla kontrol edilir.

## Supabase Auth entegrasyonu

- [x] `@supabase/supabase-js` eklendi.
- [x] Supabase public client modülü oluşturuldu.
- [x] Google OAuth olmadan e-posta/şifre kayıt ve giriş formu eklendi.
- [x] Supabase session dinleme ve oturum yoksa auth ekranı gösterme eklendi.
- [x] Admin paneli yetkili `VITE_ADMIN_EMAIL` ile Supabase oturumunu kontrol edecek şekilde bağlandı.
- [x] Supabase URL ve publishable key yalnız environment değişkenleri üzerinden okunuyor.
- [x] Supabase Dashboard’da Email provider’ı etkinleştir.
- [ ] Supabase Auth’ta `murathand08@gmail.com` hesabını oluştur/varsa parolasını güncelle ve `VITE_ADMIN_EMAIL=murathand08@gmail.com` değerini ayarla.
- [x] Üretim için `profiles.role` + RLS ile server-side admin rol kontrolü migration’a eklendi.
