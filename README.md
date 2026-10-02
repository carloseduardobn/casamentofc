# Confirmação de Presença (RSVP)

Aplicação simples para convidados confirmarem presença em um evento, e um
painel de administrador para acompanhar e gerenciar a lista.

## Como funciona

- **Página pública (`/`)**: o convidado digita o nome. Se houver um cadastro
  correspondente, aparecem os botões **Confirmar** / **Não vai** para ele e,
  se houver cônjuge, filhos ou outras pessoas associadas, elas aparecem
  logo abaixo, cada uma com seus próprios botões, além de **Confirmar todo o
  grupo** / **Nenhum poderá ir** para resolver tudo de uma vez. Se o nome não
  for encontrado, mostra uma mensagem avisando isso.
- **Painel do administrador (`/admin/login` → `/admin/dashboard`)**: login
  com senha, visão geral de confirmados/pendentes/recusas (contando cada
  pessoa, não só os titulares), cadastro e edição de convidados titulares,
  associação de cônjuge/filhos/acompanhantes a um titular (com edição e
  remoção individual), e edição da data do evento e do prazo de confirmação.

### Como funciona a associação de pessoas

- Cada **convidado titular** é quem faz a busca pelo nome e confirma por si
  (e, se quiser, pelo grupo).
- Um titular pode ter **pessoas associadas** (cônjuge, filhos, namorado(a),
  etc.), cadastradas pelo admin na lista expansível de cada convidado.
- Ao remover um titular, as pessoas associadas a ele também são removidas
  automaticamente.

## Arquitetura

- **Next.js** (App Router) — frontend e backend (API routes) no mesmo
  projeto, ideal para deploy na Vercel.
- **PostgreSQL** — qualquer Postgres serve (Vercel Postgres/Neon, Supabase,
  Railway, etc.). As tabelas são criadas automaticamente na primeira
  requisição, não é preciso rodar migrações manuais.
- **Login do admin** — senha única guardada em variável de ambiente, sessão
  guardada em cookie assinado (sem necessidade de tabela de usuários).
- Sem frameworks de UI externos: CSS simples e semântico, pensado para
  leitores de tela (labels em todos os campos, `aria-live` nas mensagens de
  status, foco visível, textos alternativos em botões de ação por linha).

## Rodando localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie `.env.example` para `.env.local` e preencha:
   - `DATABASE_URL`: string de conexão do seu Postgres.
   - `ADMIN_PASSWORD`: a senha que você vai usar para entrar no painel.
   - `SESSION_SECRET`: uma string aleatória longa (`openssl rand -hex 32`).
3. Rode o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Acesse `http://localhost:3000` (página pública) e
   `http://localhost:3000/admin/login` (painel).

## Publicando no GitHub

```bash
git init
git add .
git commit -m "Sistema de confirmação de presença"
git branch -M main
git remote add origin <URL_DO_SEU_REPOSITORIO>
git push -u origin main
```

## Publicando na Vercel

1. Crie um banco Postgres gratuito. As opções mais simples:
   - Na própria Vercel: aba **Storage** do projeto → **Create Database** →
     Postgres (isso já cria a variável `DATABASE_URL`/`POSTGRES_URL`
     automaticamente — se o nome vier diferente, copie o valor para
     `DATABASE_URL` nas variáveis de ambiente do projeto).
   - Ou crie gratuitamente em [neon.tech](https://neon.tech) ou
     [supabase.com](https://supabase.com) e copie a "connection string".
2. Importe o repositório do GitHub na Vercel (New Project → selecione o
   repositório).
3. Em **Settings → Environment Variables**, adicione:
   - `DATABASE_URL`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
4. Clique em **Deploy**. Pronto — a página pública fica em `/` e o painel em
   `/admin/login`.

## Primeiros passos após o deploy

1. Acesse `/admin/login` e entre com a senha definida em `ADMIN_PASSWORD`.
2. Em **Dados do evento**, preencha nome do evento, data e prazo de
   confirmação.
3. Em **Adicionar convidado**, cadastre os nomes da sua lista (um de cada
   vez). Depois compartilhe o link da página pública (`/`) com os
   convidados.

## Segurança e limites conhecidos

- O login de admin usa uma senha única (sem múltiplos usuários) — adequado
  para um evento com um ou poucos organizadores. Escolha uma senha forte.
- A busca de nome ignora acentos e maiúsculas/minúsculas, e mostra uma lista
  quando há mais de um nome parecido, para evitar confirmar a pessoa errada.
- Depois que o prazo definido em "Prazo para confirmar" passa, os botões de
  confirmação na página pública ficam bloqueados; o administrador ainda pode
  alterar o status de qualquer convidado manualmente no painel.
