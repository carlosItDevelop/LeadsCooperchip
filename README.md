# HTML, CSS, JS (Auto Refresh)

This template is a starter for building a website with HTML, CSS and JS, powered by [Vite](https://vitejs.dev/). HTML provides the basic structure, CSS controls formatting, and JavaScript controls the behavior of different elements.

Hit run to see this project in action. It will auto-refresh as you edit the HTML, CSS and JS files.

## Disable Auto Refresh

If you find the auto refresh getting in your way, go to [vite.config.js](./vite.config.js) and update it set `hmr` to false to disable hot module reloading (HMR). The full config will look like this:

```js
export default defineConfig({
  plugins: [],
  server: {
    host: '0.0.0.0',
    hmr: false, // Change this line to `false` disable auto-refreshing.
  }
})
```

## Packages

Because this template uses Vite to build your code, you can add install and use npm packages. Simple open the Packager tool to search and manage your packages.

## Learn More

Check out [the vite docs](https://vitejs.dev) to learn more about configuring a frontend application.
---

# Requisito: Criação de Aplicativo Web - "TOM System - Compras"

### Objetivo:
Desenvolver uma aplicação web para gestão de Orçamentos de Vendedores e Pedidos de Compras, com funcionalidades de aprovação por Administradores do sistema. O sistema deve ter controle de autenticação e autorização de usuários, além de uma interface visual limpa e moderna no modo escuro (dark mode).

### **Requisitos Funcionais:**

- Gestão de Orçamentos e Pedidos de Compras:
- Sistema de orçamentos criados por vendedores.
- Pedidos de compra precisam ser aprovados pelos administradores.
- Dashboard administrativo para aprovações de pedidos.
- Histórico de orçamentos e pedidos de compras.
- Funcionalidade de exportação de orçamentos e pedidos (em PDF, CSV).

### **Gestão de Usuários e Permissões:**

- Sistema de gestão de usuários (admin, vendedores, etc.).
- Gerenciamento de permissões para definir acessos às áreas do sistema (somente administradores podem gerenciar permissões).
- Implementação de autenticação e autorização para garantir que as permissões sejam respeitadas.

### ** Funcionalidades Extras:**

- Enviar E-mails: Enviar notificações por e-mail para usuários (ex: aprovação de pedidos).
- Upload de Imagens: Permitir upload de imagens para produtos, clientes e perfis de usuários.
- Gerenciador de Dados de Demonstração (Seed): Criar e popular dados de exemplo para as entidades: "Clientes" (relacionados aos orçamentos), "Vendedores", (responsáveis pelos orçamentos), "Fornecedores" (relacionados aos produtos), "Orcamento" (com itens, cliente, vendedor e fornecedor), "Pedidos de Compras" (com fornecedor, itens e cliente).

### **Requisitos de Design e Interface:**

**Estilo Visual:**

- Interface moderna e limpa com design no modo escuro (Dark Mode).
- Paleta de cores: tons de azul escuro, cinza carvão e acentos em azul elétrico.
- Tipografia elegante e espaçamento generoso.
- Animações suaves e transições fluidas para uma experiência de usuário agradável.

### **Estrutura de Layout:**

- Dashboard principal com estatísticas de orçamentos e pedidos.
- Formulários de criação e edição de orçamentos e pedidos.
- Páginas específicas para a aprovação de pedidos e para relatórios.
- Menu lateral com o mesmo estilo Dark, mantendo a consistência visual com as páginas de conteúdo.

### **Módulo Administrativo:**

**Dashboard Administrativo: Área exclusiva para administradores com acesso às funções de:**

- Aprovação de pedidos de compras.
- Gerenciamento de usuários e permissões.
- Visualização de relatórios, históricos de orçamentos e compras.

### **Tecnologias Sugeridas:**

- Bootstrap 5.3.2.
- Envio de E-mails.
- Gerenciamento de Arquivos.

### **Conclusão:**
A aplicação precisa ser funcional, segura e esteticamente agradável, garantindo uma experiência intuitiva tanto para os administradores quanto para os vendedores. A implementação de todas as funcionalidades descritas acima, juntamente com um design coeso e uma gestão eficiente dos dados de demonstração, deve proporcionar uma plataforma robusta para a gestão de orçamentos e pedidos.
