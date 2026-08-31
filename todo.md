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
- [x] `pnpm build` başarılı şekilde çalıştırıldı.
- [x] Yerel smoke test başarılı.
- [x] GitHub commitleri gönderildi:
  - `fc1c262` — Build TikTok-style organic task flow prototype
  - `b801fda` — Add admin wallet and advertiser panels

## Sonraki aşama — gerçek ürünleştirme

- [ ] Gerçek kullanıcı/admin kimlik doğrulamasını backend session ve hash’li parola ile bağla.
- [ ] Admin rolü ve yetki kontrolü ekle; frontend-only login üretim güvenliği için yeterli değildir.
- [ ] Ekran görüntüsü yükleme/storage akışını ekle.
- [ ] Kanıt kayıtlarını veritabanına bağla.
- [ ] Admin onayında cüzdan ledger kaydını atomik olarak oluştur.
- [ ] Reklamveren kampanyalarını veritabanına ve bütçe rezervasyonuna bağla.
- [ ] YouTube OAuth/API kanıtlarını görev submission akışına bağla.
- [ ] Gerçek heartbeat ve tek kullanımlık Secret Code endpoint’i ekle.

## Güvenlik notu

Admin parolası source code, `todo.md` veya GitHub’a yazılmamalıdır. Static prototipte giriş alanı `VITE_ADMIN_EMAIL` ve `VITE_ADMIN_PASSWORD` environment değişkenlerini kullanır; gerçek production kullanımı için backend doğrulaması zorunludur.
