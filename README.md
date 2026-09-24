# ChickSafe

Aplicativo mobile da FETIN para monitoramento de galpões avícolas. O produtor autentica, associa-se a galpões e acompanha em tempo quase real **energia** (Fonte/USB vs Bateria), **tensão da bateria** e **corrente do ventilador**, com histórico das mudanças de estado e **notificação push no Android** quando o galpão **entra em alerta** (inclusive com o app fechado).

O app é [Expo](https://docs.expo.dev/versions/v54.0.0/) 54 + React Native, com roteamento por arquivos ([Expo Router](https://docs.expo.dev/router/introduction/)) e backend no [Supabase](https://supabase.com/) (auth, Postgres, Realtime e Edge Functions). Push remoto usa [Expo Push Service](https://docs.expo.dev/push-notifications/overview/) + Firebase Cloud Messaging (FCM V1), de graça no plano Spark.

**Expo Go não recebe push remoto no Android.** É obrigatório um *development build* ou APK de produção com `google-services.json` e o plugin `expo-notifications`.

## Sumário

1. [Trocar de PC ou de celular](#trocar-de-pc-ou-de-celular)
2. [O que o app faz](#o-que-o-app-faz)
3. [Stack](#stack)
4. [Regras de monitoramento](#regras-de-monitoramento)
5. [Arquitetura](#arquitetura)
6. [Push: alerta com o app fechado](#push-alerta-com-o-app-fechado)
7. [Estrutura](#estrutura)
8. [Configuração do backend (uma vez)](#configuração-do-backend-uma-vez)
9. [Configuração em um PC novo](#configuração-em-um-pc-novo)
10. [Development build no Android](#development-build-no-android)
11. [Metro no tablet por USB (localhost)](#metro-no-tablet-por-usb-localhost)
12. [Como testar o push de alerta](#como-testar-o-push-de-alerta)
13. [Como rodar](#como-rodar)
14. [Testes](#testes)
15. [Integração contínua](#integração-contínua)
16. [Scripts npm](#scripts-npm)
17. [Problemas frequentes](#problemas-frequentes)
18. [Próximos passos](#próximos-passos)

## Trocar de PC ou de celular

**Sim, o produto continua o mesmo** — login, galpões, alertas e push não estão “presos” ao notebook ou ao Tab S10 FE usados no desenvolvimento. Supabase, Expo e FCM são serviços na nuvem. O que muda é o **aparelho** e a **máquina de build**.

### Outro celular / tablet

| Precisa | Não precisa |
|---|---|
| Instalar o APK do ChickSafe (*development build* ou produção). **Não use Expo Go.** | Recriar o projeto Firebase ou o EAS |
| Login com a mesma conta (ou a conta que deve receber o alerta) | Copiar `.env.local` para o telefone |
| Aceitar a permissão de notificação | Cabo USB (só serve para o Metro em modo `--localhost`) |
| Internet que alcance `*.supabase.co`, Expo e Google/FCM | Wi‑Fi do PC de desenvolvimento |

Fluxo no aparelho novo:

1. Instale o mesmo APK (ou gere outro *development build* com o mesmo `android.package` `com.fetin.chicksafe` e o mesmo `google-services.json`).
2. Abra o app, faça login, aceite notificações.
3. Em **Perfil**, confira se aparece `ExponentPushToken[...]`.
4. O app grava esse token em `usuarios.push_token`.

**Um usuário = um token.** Se a Maria logar no telefone B, o token do telefone A é **substituído**. O A deixa de receber push até ela logar de novo nele.

O cabo USB **não** leva a internet do app. Login, Realtime e push saem pela Wi‑Fi/4G do aparelho.

### Outro PC

O código no Git **não** inclui `.env.local` nem a chave privada FCM (`*firebase-adminsdk*.json`). No PC novo:

1. Clone o repositório e rode `npm install`.
2. Recrie `.env.local` a partir de `.env.example` com a URL e a chave **publishable** do mesmo projeto Supabase.
3. Copie `google-services.json` (Firebase → app Android `com.fetin.chicksafe` → baixar de novo se não estiver no clone).
4. Para **só usar** o app: instale o APK já gerado no celular; o segundo PC nem precisa de Android SDK.
5. Para **desenvolver**: Android Studio / SDK, `adb`, conta Expo (`npx eas login`) do owner `leandroid3`, e o mesmo `app.json` (`extra.eas.projectId`).
6. **Não** é preciso subir de novo a chave FCM V1 no EAS se ela já está em [expo.dev](https://expo.dev) → projeto AppChickSafe → Credentials → Android → FCM V1.
7. **Não** é preciso `eas init` de novo: o UUID já está em `app.json`.

A chave `firebase-adminsdk` **não** vai para o segundo PC. Ela já está no EAS; o app no celular usa o `google-services.json` (cliente) e o Expo usa a credencial do EAS (servidor).

### O que já está na nuvem (não refazer)

- Projeto Supabase (Auth, tabelas, trigger de alerta, Edge Function `enviar-push`)
- Projeto Firebase Spark `fetin-chicksafe` + app Android `com.fetin.chicksafe`
- Projeto EAS `AppChickSafe` (`91b4b0ff-4324-44e1-a2f5-7e860ca03a58`), owner `leandroid3`
- Credencial FCM V1 no EAS

Se o projeto Supabase estiver **Paused**, login e push de alerta falham. Restaure no dashboard antes de testar.

## O que o app faz

- Cadastro, login e recuperação de senha por e-mail (Supabase Auth)
- Perfil do produtor (nome e telefone editáveis; e-mail e CPF fixos)
- Token push de teste no Perfil (development build)
- Criar galpão (gera código de convite) ou entrar com código
- Home com a lista de galpões e status Normal/Alerta/Offline de cada um
- Ver quem tem acesso ao galpão (Dono quem criou, Funcionário quem entrou com código)
- Dono gerencia o galpão: nome, limiares de tensão/corrente, aprovar/recusar acesso, remover funcionário e apagar
- Funcionário pede acesso com código (o dono aprova) e pode sair sozinho
- Sino de notificações ao lado do nome: pedido de acesso abre a tela para aprovar/recusar; sensor offline avisa quem tem acesso; alerta de galpão abre o detalhe
- Push no Android quando o galpão **entra** em alerta (transição, não a cada leitura)
- Botão **Testar alerta no galpão** na home (grava Normal e em seguida Alerta)
- Detalhe do galpão com cards de status (Normal / Alerta) segundo os limiares do galpão; banner se o sensor ficou 5 min sem sinal
- Histórico das mudanças, filtrado por galpão, data e tipo (energia, tensão, corrente); exportação em PDF
- Dashboard do dono com gráficos de tensão, corrente e fonte vs bateria; exportação em PDF com resumo, gráficos e tabela
- Atualização ao vivo na home e no detalhe quando chega `INSERT` em `leituras`
- Proteção de rotas: área privada só com sessão; logado é mandado para a home

## Stack

| Camada | Tecnologia |
|---|---|
| App | Expo 54, React Native 0.81, React 19, TypeScript |
| Navegação | Expo Router 6 |
| Backend | Supabase (Auth + Postgres + Realtime + Edge Functions) |
| Push | expo-notifications, Expo Push Service, FCM V1 |
| Build nativo | EAS project + Gradle local (`expo-dev-client`) |
| Testes | Jest, jest-expo, React Native Testing Library |
| Lint | ESLint (`eslint-config-expo`) |

Identificadores atuais (não troque sem atualizar Firebase, EAS e `google-services.json`):

| Item | Valor |
|---|---|
| Pacote Android | `com.fetin.chicksafe` |
| Scheme | `appchicksafe` |
| EAS projectId | `91b4b0ff-4324-44e1-a2f5-7e860ca03a58` |
| EAS owner | `leandroid3` |
| Firebase | `fetin-chicksafe` |

## Regras de monitoramento

Definidas em `lib/status.ts` (padrão; o dono pode mudar por galpão):

- Energia: `Fonte` e `USB` contam como fonte; o restante é bateria
- Tensão ok se **> limiar do galpão** (padrão 3 V)
- Corrente do ventilador ok se **> limiar do galpão** (padrão 50 mA)
- Qualquer valor no limiar ou abaixo, ou energia em bateria, vira **Alerta**
- Sensor **Offline** se a última leitura tem **60 minutos** ou mais (`MINUTOS_SEM_SINAL`)

O status **não** é uma coluna em `galpoes`. Ele é calculado na última linha de `leituras`. A notificação de alerta só nasce na **transição** para Alerta (a leitura anterior não estava em alerta). Leituras seguidas já em alerta **não** geram aviso novo.

## Arquitetura

```
Telas (app/)
  → contextos (auth, AuthGate, push)
  → lib/ (regras + acesso a dados)
  → Supabase (Postgres + Realtime + Edge Functions)
       → Expo Push Service → FCM → aparelho
```

- `lib/database.ts` — perfil, galpões, acessos, leituras, notificações, `salvarPushToken`
- `lib/push.ts` — permissão, canal Android `ChickSafe`, `getExpoPushTokenAsync`
- `contexts/push.tsx` — depois do login registra o token e grava em `usuarios.push_token`
- `lib/historico.ts` — extrai mudanças entre leituras consecutivas e filtra por data/campo
- `lib/status.ts` — limiares, rótulos e sensor offline
- `lib/exportar.ts` — PDF do histórico e do dashboard
- `lib/acesso.ts` — papéis Dono / Funcionário
- `lib/galpao.ts` — mapeia galpão e valida limiares
- `contexts/auth.tsx` — sessão, login, cadastro, logout e edição de conta
- `contexts/auth-gate.tsx` — redireciona público ↔ privado
- `constants/tema.ts` — cores do app
- `hooks/use-home-galpoes.ts`, `hooks/use-galpao.ts`, `hooks/use-historico.ts` — carga e tempo real, fora do layout
- `supabase/migrations/` — schema na ordem em que deve ser aplicado
- `supabase/functions/ingest-leitura` — ESP32 autentica com `X-Device-Key` e grava `leituras`
- `supabase/functions/enviar-push` — lê o token do usuário e POST em `https://exp.host/--/api/v2/push/send`

Leituras reais vêm de um ESP32 (`ingest-leitura`). O app não publica leituras de teste.

## Push: alerta com o app fechado

```
ESP32 (`ingest-leitura`)
        ↓
INSERT em public.leituras
        ↓
trigger trg_notificar_alerta_galpao
  (só se a leitura atual está em alerta
   e a anterior não estava)
        ↓
INSERT em public.notificacoes
  tipo = alerta_galpao
  para cada usuario_galpoes status = aprovado
        ↓
  Realtime → sino no app (se estiver aberto)
        ↓
trigger trg_enviar_push_notificacao
  (pg_net → Edge Function enviar-push)
        ↓
Expo Push Service → FCM → notificação no Android
```

Arquivos envolvidos:

| Papel | Arquivo |
|---|---|
| Canal + token Expo | `lib/push.ts` |
| Grava token após login | `contexts/push.tsx` |
| Coluna + HTTP para a function | `supabase/migrations/20260301000800_push_token.sql` |
| Envio Expo | `supabase/functions/enviar-push/index.ts` |
| `verify_jwt = false` | `supabase/config.toml` (`[functions.enviar-push]`) |
| Plugin nativo | `app.json` → `expo-notifications` + `android.googleServicesFile` |

O push **não** é calculado de novo no `ingest-leitura`. Quem decide “entrou em alerta” é o trigger SQL.

## Estrutura

```
app/
  index.tsx                 # boas-vindas
  (auth)/login|cadastro     # autenticação
  (private)/home            # galpões
  (private)/perfil          # editar conta + token push
  (private)/galpao/[id]     # detalhe + realtime
  (private)/historico       # mudanças
contexts/                   # AuthProvider, AuthGate, PushProvider
lib/                        # dados, status, histórico, push
supabase/
  migrations/               # schema versionado
  functions/ingest-leitura  # ESP32
  functions/enviar-push     # Expo Push
google-services.json        # cliente Firebase Android (necessário no build)
eas.json                    # perfis development / production
tests/
  unit/                     # regras puras
  integration/              # database + AuthProvider (Supabase mockado)
  ui/                       # telas e AuthGate
```

## Configuração do backend (uma vez)

Já feito no projeto ChickSafe atual. Só repita se for um **projeto Supabase/Firebase novo**.

### Supabase

1. Copie o exemplo de ambiente:

   ```bash
   cp .env.example .env.local
   ```

   No Windows (PowerShell):

   ```powershell
   Copy-Item .env.example .env.local
   ```

2. Preencha no `.env.local`:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   Use só a chave **publishable** (anon). Não commite `.env.local`. Essas variáveis são embutidas no bundle do Metro; o tablet **não** precisa do arquivo.

3. Banco: os scripts estão em `supabase/migrations/`, nesta ordem:

   - `20260301000100_extras.sql`
   - `20260301000200_alter_leituras.sql`
   - `20260301000300_listar_acessos.sql`
   - `20260301000400_gestao.sql`
   - `20260301000500_aprovacao.sql`
   - `20260301000600_notificacoes.sql`
   - `20260301000700_notificacoes_alerta.sql`
   - `20260301000800_push_token.sql`
   - `20260301000900_dispositivos.sql`
   - `20260301001000_sensor_offline.sql`

   Projeto **novo**: `npx supabase db push`.

   Projeto **que já rodou esses SQLs**: não execute de novo. Marque cada versão como aplicada (passo a passo na seção abaixo).

4. Edge Functions (na pasta do repo, logado no CLI):

   ```powershell
   npx supabase login
   npx supabase functions deploy ingest-leitura --project-ref SEU_REF
   npx supabase functions deploy enviar-push --project-ref SEU_REF
   ```

   `20260301000800_push_token.sql` chama `https://SEU_REF.supabase.co/functions/v1/enviar-push`. Se o ref mudar, edite a URL nesse arquivo e aplique só essa migration nova.

5. Mantenha o projeto **Active**. Projeto *Paused* quebra login (`Network request failed`) e o Chrome do aparelho não abre `https://SEU_REF.supabase.co`.

### Banco que já tem o schema

Não rode `db push` nem cole os SQLs de novo. No PowerShell, na pasta do repo, com o CLI logado e o projeto linkado:

```powershell
npx supabase login
npx supabase link --project-ref SEU_REF
npx supabase migration repair --status applied 20260301000100
npx supabase migration repair --status applied 20260301000200
npx supabase migration repair --status applied 20260301000300
npx supabase migration repair --status applied 20260301000400
npx supabase migration repair --status applied 20260301000500
npx supabase migration repair --status applied 20260301000600
npx supabase migration repair --status applied 20260301000700
npx supabase migration repair --status applied 20260301000800
npx supabase migration repair --status applied 20260301000900
npx supabase migration repair --status applied 20260301001000
npx supabase migration list
```

`migration list` deve mostrar Local e Remote iguais. Daqui pra frente, mudança de banco entra só como arquivo novo em `supabase/migrations/`.

No painel, em Authentication → URL Configuration → Redirect URLs, inclua:

- `appchicksafe://redefinir/page` (recuperar senha)
- `appchicksafe://` (confirmar e-mail)

### Firebase + EAS (push Android)

1. Firebase Console → projeto (ex.: `fetin-chicksafe`) → app Android com pacote `com.fetin.chicksafe`.
2. Baixe `google-services.json` para a raiz do repo (`app.json` aponta para `./google-services.json`).
3. `npx eas-cli init` só se ainda não houver `extra.eas.projectId` (neste repo já existe).
4. EAS → Credentials → Android `com.fetin.chicksafe` → **FCM V1** → upload do JSON **firebase-adminsdk** (conta de serviço). Não use a chave genérica do Google Cloud nem o `google-services.json` nesse campo.
5. A chave privada `*firebase-adminsdk*.json` está no `.gitignore`. Não commite.

## Configuração em um PC novo

Checklist objetivo:

1. Git clone + `npm install` (Node 20+ recomendado; o Expo 54 documenta as versões em https://docs.expo.dev/versions/v54.0.0/).
2. `.env.local` com a **mesma** URL/chave do projeto (peça a quem já tem; não está no Git).
3. `google-services.json` na raiz (clone ou download no Firebase).
4. Conta Expo do time: `npx eas-cli login` (owner `leandroid3`).
5. Android Studio → SDK Platform-Tools (`adb` em `%LOCALAPPDATA%\Android\Sdk\platform-tools`).
6. **Não** rode `eas init` de novo.
7. **Não** precisa do `firebase-adminsdk` neste PC se o FCM V1 já está no EAS.

Arquivos que **não** vão de um PC ao outro pelo Git:

| Arquivo | O que fazer |
|---|---|
| `.env.local` | Recriar à mão |
| `*firebase-adminsdk*.json` | Deixar no EAS; não copiar |
| `node_modules/` | `npm install` |
| pasta `android/` gerada | `npx expo prebuild` / `npx expo run:android` no PC novo se for build local |
| `.expo/` | ignorar |

## Development build no Android

Push remoto **não funciona no Expo Go**. Gere um cliente nativo:

```powershell
npx expo install expo-dev-client expo-notifications
npx expo prebuild --platform android
npx expo run:android
```

Pacote: `com.fetin.chicksafe`. Ícones em `assets/images/` (incluindo `android-icon-foreground.png`) precisam existir antes do prebuild.

Se `expo run:android` insistir em `emulator-5554` (serviço da empresa na porta 5555, emulador fantasma):

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path += ";$env:ANDROID_HOME\platform-tools"
adb devices -l
# instale no serial real, exemplo Tab S10 FE:
cd android
.\gradlew.bat installDebug
```

Serial de exemplo já usado: `RXGL705A7BM` (SM-X520). O seu aparelho terá outro serial.

Samsung: se **Depuração USB** ficar cinza, desative o **Bloqueador automático** (Auto Blocker).

## Metro no tablet por USB (localhost)

Use isto quando a Wi‑Fi do PC/tablet **não** alcança o Metro (rede corporativa, IP `192.168.x.x` com timeout) mas o USB funciona.

**Não aperte `a` no Metro.** Isso tenta o emulador `5554` e falha com `could not connect to TCP port 5554`.

No PC:

```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "127.0.0.1"
npx expo start --dev-client --localhost
```

Em **outro** terminal, com o tablet autorizado em `adb devices`:

```powershell
$sdk = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$serial = "SERIAL_DO_TABLET"
& $sdk -s $serial reverse tcp:8081 tcp:8081
& $sdk -s $serial shell am start -a android.intent.action.VIEW -d "exp+appchicksafe://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"
```

O cabo só entrega o **JavaScript**. Login e push usam a internet do tablet. Se `adb devices` estiver vazio: reconecte o USB (dados, não “só carregar”), aceite a depuração, ou `adb kill-server` / `adb start-server`.

Se o USB cair, o app tenta baixar fontes em `http://127.0.0.1:8081/assets/...` e aparece `ExponentAsset.downloadAsync` / `MaterialIcons.ttf`. Religue o `adb reverse` e reabra o cliente.

Em um PC de casa, na mesma Wi‑Fi do celular, muitas vezes basta `npx expo start --dev-client` **sem** `--localhost`.

## Como testar o push de alerta

Pré-requisitos: migration de push aplicada, function `enviar-push` publicada, APK de development, usuário logado, permissão de notificação, token visível no Perfil, galpão com acesso **aprovado**, projeto Supabase não pausado.

1. USB + Metro ok (se estiver em modo localhost).
2. Home → **Testar alerta no galpão**.
   - Grava uma leitura Normal e em seguida Bateria 0 V / 0 mA.
   - O cartão do galpão fica **Alerta**.
   - O sino recebe `alerta_galpao`.
3. Vá à tela inicial e **deslize o ChickSafe** (não use **Forçar parada** — isso mata o FCM no aparelho).
4. Deve aparecer **Alerta no galpão** / *O galpão X entrou em alerta.*

Teste manual do Expo (sem passar pelo galpão), com o token do Perfil ou do Metro (`Expo push token:`):

```powershell
$payload = '{"to":"ExponentPushToken[COLE_AQUI]","sound":"default","title":"ChickSafe","body":"teste fechado","channelId":"default"}'
Invoke-WebRequest -Method Post -Uri "https://exp.host/--/api/v2/push/send" -ContentType "application/json" -Body $payload -UseBasicParsing
```

Ou [https://expo.dev/notifications](https://expo.dev/notifications).

Se o botão de alerta atualiza a home mas **não** chega push: a function `enviar-push` não está no ar, a migration de push não foi aplicada, `usuarios.push_token` está vazio, ou o aparelho está sem Play Services / sem internet para o FCM.

## Como rodar

Só UI / Expo Go (push Android **não** entra):

```bash
npm install
npx expo start
```

Development build + Metro (push Android **sim**):

```powershell
npm install
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "127.0.0.1"
npx expo start --dev-client --localhost
```

Abra o app nativo já instalado, não o Expo Go.

## Testes

A suíte não acessa o Supabase real: a camada de dados e o auth usam mocks.

```bash
npm test                 # tudo
npm run test:unit        # regras de negócio
npm run test:integration # database + AuthProvider
npm run test:ui          # telas
npm run test:watch       # modo watch
npm run test:ci          # Jest no modo CI (relatório + cobertura + piso de lib/)
npm run lint             # ESLint
npm run typecheck        # TypeScript sem gerar arquivos
```

No modo CI, a pasta `lib/` precisa de pelo menos **80%** de cobertura (statements, branches, functions e lines). Se o piso não for atingido, o comando falha.

## Integração contínua

A cada `push` e `pull request`, o GitHub Actions (`.github/workflows/ci.yml`) sobe três jobs **em paralelo**:

| Job | O que faz |
|---|---|
| **Testes** | `npm run test:ci` — roda a suíte, gera relatório e exige 80% de cobertura em `lib/` |
| **Lint** | `npm run lint` |
| **Typecheck** | `npm run typecheck` (`tsc --noEmit`) |

Os três precisam passar para a run ficar verde. Uma falha aparece com o nome do job (por exemplo “Typecheck”), sem misturar com os testes.

### Como ver o relatório no GitHub

1. Abra o repositório → aba **Actions**
2. Clique na run **CI** do commit
3. Em **Summary**, a tabela de testes
4. Em **Artifacts**, baixe `relatorio-testes`
5. Abra `relatorio-testes.html` (resultados) e `coverage/lcov-report/index.html` (cobertura)

O arquivo `reports/relatorio-testes.html` na sua máquina só está completo se você rodou `npm run test:ci`. Um `jest` só em um arquivo gera um HTML parcial.

## Scripts npm

| Script | Função |
|---|---|
| `start` | Metro / Expo |
| `android` / `ios` / `web` | Abre o alvo correspondente |
| `lint` | ESLint |
| `typecheck` | TypeScript (`tsc --noEmit`) |
| `test` / `test:unit` / `test:integration` / `test:ui` | Jest |
| `test:ci` | Jest no CI (relatório HTML, JUnit, cobertura e piso de `lib/`) |

## Problemas frequentes

| Sintoma | Causa típica | O que fazer |
|---|---|---|
| `TypeError: Network request failed` no login | Supabase *Paused* ou aparelho sem rota até `*.supabase.co` | Restaurar o projeto; testar a URL no Chrome do aparelho; hotspot 4G se a Wi‑Fi corporativa bloquear |
| Chrome do tablet não abre o host Supabase | Projeto pausado **ou** DNS/firewall | Restaurar; no celular desligue Wi‑Fi e abra o mesmo link; depois hotspot |
| `could not connect to TCP port 5554` | Tecla `a` no Metro / emulador fantasma | Ignore; não aperte `a`; use `adb reverse` + serial do tablet |
| `ExponentAsset.downloadAsync` / `MaterialIcons.ttf` | USB/`adb reverse` caiu | Reconectar cabo, `adb reverse tcp:8081 tcp:8081`, reabrir o dev client |
| `adb devices` vazio ou `device offline` | Cabo, “só carregar”, Auto Blocker, daemon ADB | Dados USB, autorizar depuração, `adb kill-server` |
| Token no Perfil: “Ainda sem token…” | Expo Go, permissão recusada, ou `projectId` ausente | Development build; aceitar notificação |
| Alerta na home, sem push | Function/SQL de push ou token não gravado | migration `20260301000800_push_token.sql`, `deploy enviar-push`, login de novo, coluna `push_token` |
| Push no aparelho antigo parou | Login no aparelho novo sobrescreveu o token | Esperado; um token por usuário |
| `.env.local` “falta no tablet” | Confusão | O tablet não usa esse arquivo; o Metro injeta `EXPO_PUBLIC_*` no bundle |
| Telas vermelhas empilhadas no LogBox | Erros **antigos** (rede, fonte, 5554) | Dismiss; olhe o Metro para o erro **atual** |

## Próximos passos (já mapeados)

- Ligar o MQTT/ESP32 de verdade (sem senha versionada no git)
- Guardar mais de um `push_token` por usuário (vários aparelhos ao mesmo tempo)
- Abrir o galpão ao tocar na notificação (`data.galpaoId`)
