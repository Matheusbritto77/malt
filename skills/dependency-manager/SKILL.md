# Sistema de Gerenciamento de Skills por Dependências

O Moltbot agora suporta a vinculação direta entre AgentSkills e dependências reais do sistema (NPM ou Binários).

## Como funciona

### 1. Detecção de Dependências
As skills podem declarar dependências no frontmatter:
```yaml
metadata:
  moltbot:
    requires:
      dependencies: ["fastify", "prisma"]
      languages: ["php", "golang"]
```

### 2. Verificação de Status
O sistema verifica automaticamente:
- Se o pacote existe no `package.json`.
- Se o binário da linguagem existe no `PATH`.
- Se não estiver instalado, a UI exibirá um botão "Instalar".

### 3. Instalação Dinâmica
Ao clicar em instalar ou via comando rpc:
- O sistema executa `npm install <package>` ou `winget/brew install <formula>`.
- Caso a skill ainda não tenha uma pasta física, o sistema a cria automaticamente em `skills/<name>/SKILL.md`.

## Linguagens Suportadas por Padrão
- PHP
- Python (python3)
- Go
- Rust
- C/C++ (gcc/g++)

Sempre prefira usar as skills de linguagem para executar scripts em vez de tentar adivinhar se a linguagem está no sistema.
