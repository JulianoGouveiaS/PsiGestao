# PsiGestão - Sistema de Gestão para Psicólogos

Sistema completo de gestão para profissionais de psicologia, desenvolvido com React, TypeScript, Vite e Supabase.

## 🚀 Tecnologias

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Components**: Radix UI + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State Management**: TanStack Query (React Query)
- **Formulários**: React Hook Form + Zod
- **Roteamento**: React Router DOM

## 📋 Pré-requisitos

- Node.js 18+ ou Bun
- Conta no Supabase (https://supabase.com)

## ⚙️ Configuração

### 1. Clonar o repositório

```bash
git clone <repository-url>
cd psigestao
```

### 2. Instalar dependências

```bash
npm install
# ou
bun install
```

### 3. Configurar variáveis de ambiente

Edite o arquivo `.env` e adicione suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

**Onde encontrar estas credenciais:**
1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá em `Settings` > `API`
4. Copie a `URL` e a `anon/public key`

### 4. Executar migrações do banco de dados

As migrações estão localizadas em `supabase/migrations/`. Para aplicá-las:

```bash
# Se você tiver o Supabase CLI instalado
supabase db push

# Ou execute manualmente no SQL Editor do Supabase Dashboard
```

## 🏃‍♂️ Executar o projeto

### Desenvolvimento

```bash
npm run dev
# ou
bun dev
```

O aplicativo estará disponível em `http://localhost:5173`

### Build para produção

```bash
npm run build
# ou
bun run build
```

### Preview da build

```bash
npm run preview
# ou
bun preview
```

## 🧪 Testes

```bash
# Executar testes uma vez
npm test

# Executar testes em modo watch
npm run test:watch
```

## 📁 Estrutura do Projeto

```
psigestao/
├── src/
│   ├── components/       # Componentes React reutilizáveis
│   ├── contexts/         # Contextos React (Auth, Clinic, etc)
│   ├── hooks/            # Custom hooks
│   ├── integrations/     # Integrações externas (Supabase)
│   ├── lib/              # Utilitários e helpers
│   ├── pages/            # Páginas da aplicação
│   └── styles/           # Estilos globais e CSS modules
├── supabase/
│   ├── functions/        # Edge Functions
│   └── migrations/       # Migrações do banco de dados
└── public/               # Arquivos estáticos
```

## 🔐 Segurança

- Nunca commite o arquivo `.env` com credenciais reais
- Use Row Level Security (RLS) no Supabase para todas as tabelas
- Valide todos os inputs no frontend e backend
- Implemente rate limiting para APIs sensíveis

## 📝 Funcionalidades Principais

- ✅ Autenticação de usuários (Login/Signup/Recuperação de senha)
- ✅ Gestão de pacientes
- ✅ Agenda de sessões
- ✅ Prontuários e anamneses
- ✅ Gestão financeira
- ✅ Sistema de pacotes de sessões
- ✅ Clínicas multi-profissionais
- ✅ Notificações em tempo real
- ✅ Temas claro/escuro

## 🤝 Contribuindo

1. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
2. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
3. Push para a branch (`git push origin feature/AmazingFeature`)
4. Abra um Pull Request

## 📄 Licença

Este projeto é proprietário e confidencial.

## 🆘 Suporte

Para suporte, entre em contato através de [seu-email@exemplo.com]
