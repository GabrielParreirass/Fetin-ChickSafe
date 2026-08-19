# ChickSafe

Aplicativo mobile da FETIN para monitoramento de galpões avícolas. O produtor autentica, associa-se a galpões e acompanha em tempo quase real **energia** (Fonte/USB vs Bateria), **tensão da bateria** e **corrente do ventilador**, com histórico das mudanças de estado.

O app é [Expo](https://docs.expo.dev/versions/v54.0.0/) 54 + React Native, com roteamento por arquivos ([Expo Router](https://docs.expo.dev/router/introduction/)) e backend no [Supabase](https://supabase.com/) (auth, Postgres e Realtime).

## O que o app faz

- Cadastro e login com e-mail/senha (Supabase Auth)
- Perfil do produtor (nome e telefone editáveis; e-mail e CPF fixos)
- Criar galpão (gera código de convite) ou entrar com código
- Home com a lista de galpões do usuário
- Ver quem tem acesso ao galpão (Dono quem criou, Funcionário quem entrou com código)
- Dono gerencia o galpão: nome, limiares de tensão/corrente, remover funcionário e apagar
- Detalhe do galpão com cards de status (Normal / Alerta) segundo os limiares do galpão
- Atualização ao vivo quando chega `INSERT` em `leituras`
- Histórico das mudanças, filtrado por galpão, data e tipo (energia, tensão, corrente)
- Proteção de rotas: área privada só com sessão; logado é mandado para a home

## Stack

| Camada | Tecnologia |
|---|---|
| App | Expo 54, React Native 0.81, React 19, TypeScript |
| Navegação | Expo Router 6 |
| Backend | Supabase (Auth + Postgres + Realtime) |
| Testes | Jest, jest-expo, React Native Testing Library |
| Lint | ESLint (`eslint-config-expo`) |

## Regras de monitoramento

Definidas em `lib/status.ts` (padrão; o dono pode mudar por galpão):

- Energia: `Fonte` e `USB` contam como fonte; o restante é bateria
- Tensão ok se **> limiar do galpão** (padrão 3 V)
- Corrente do ventilador ok se **> limiar do galpão** (padrão 50 mA)
- Qualquer valor no limiar ou abaixo vira **Alerta**

## Arquitetura

```
Telas (app/) → contextos (auth, AuthGate) → lib/ (regras + acesso a dados) → Supabase
```

- `lib/database.ts` — perfil, galpões, acessos e leituras
- `lib/historico.ts` — extrai mudanças entre leituras consecutivas e filtra por data/campo
- `lib/status.ts` — limiares e rótulos
- `lib/acesso.ts` — papéis Dono / Funcionário
- `lib/galpao.ts` — mapeia galpão e valida limiares
- `contexts/auth.tsx` — sessão, login, cadastro, logout e edição de conta
- `contexts/auth-gate.tsx` — redireciona público ↔ privado
- `supabase/extras.sql` — grants e RPCs `entrar_galpao` / `criar_galpao` / `listar_acessos_galpao` / gestão do dono
- `supabase/alter-leituras.sql` — energia Fonte/Bateria/USB e policy de insert
- `supabase/listar-acessos.sql` — RPC para listar dono e funcionários de um galpão
- `supabase/gestao.sql` — perfil, limiares, remover acesso e apagar galpão

Leituras reais devem vir de um ESP32. Nesta branch há um **simulador no app** (`lib/simulador.ts` + `contexts/simulador.tsx`) que publica leituras nos galpões nomeados `Teste1` e `Teste2`. Ele é temporário e será removido quando o hardware/MQTT estiver no fluxo.

Arquivos MQTT em `app/utils/` (`MqttOptions.ts`, `Api_url.json`) e mocks antigos (`app/utils/galpoes.ts`, histórico em memória) **não fazem parte do fluxo atual**.

## Estrutura

```
app/
  index.tsx                 # boas-vindas
  (auth)/login|cadastro     # autenticação
  (private)/home            # galpões
  (private)/perfil          # editar conta
  (private)/galpao/[id]     # detalhe + realtime
  (private)/historico       # mudanças
contexts/                   # AuthProvider, AuthGate, simulador
lib/                        # dados, status, histórico
supabase/                   # SQL para o projeto no painel
tests/
  unit/                     # regras puras (status, histórico, CPF, data)
  integration/              # database + AuthProvider (Supabase mockado)
  ui/                       # telas e AuthGate
```

## Configuração

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

   Use só a chave **publishable** (anon). Não commite `.env.local`.

3. No SQL Editor do Supabase, rode nesta ordem:

   - `supabase/extras.sql`
   - `supabase/alter-leituras.sql`

   Se o projeto já existia, rode também `supabase/listar-acessos.sql` e `supabase/gestao.sql`.

   Se a lista de acessos do galpão mostrar só quem está logado, rode de novo `supabase/listar-acessos.sql`.

## Como rodar

```bash
npm install
npx expo start
```

Depois abra no Expo Go, emulador Android ou simulador iOS.

## Testes

A suíte não acessa o Supabase real: a camada de dados e o auth usam mocks.

```bash
npm test                 # tudo
npm run test:unit        # regras de negócio
npm run test:integration # database + AuthProvider
npm run test:ui          # telas
npm run test:watch       # modo watch
```

Também:

```bash
npm run lint
```

## Scripts npm

| Script | Função |
|---|---|
| `start` | Metro / Expo |
| `android` / `ios` / `web` | Abre o alvo correspondente |
| `lint` | ESLint |
| `test` / `test:unit` / `test:integration` / `test:ui` | Jest |

## Próximos passos (já mapeados)

- Remover o simulador de ESP32 do app
- Ligar o MQTT/ESP32 de verdade (sem senha versionada no git)
- Revisar RLS de SELECT para um usuário não ler galpão alheio só trocando o id
