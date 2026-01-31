# 🚀 MoltBot VPS - Guia de Instalação

Este guia explica como rodar o MoltBot em uma VPS **sem interface gráfica**, com o browser funcionando automaticamente em modo **headless**.

## 📋 O Problema Original

O MoltBot usa dois perfis de browser:
- **`chrome`** - Usa uma extensão do Chrome que requer interação manual (clicar no ícone para "attach")
- **`clawd`** - Browser gerenciado diretamente via CDP (Chrome DevTools Protocol), sem necessidade de interação

Em uma VPS, você **não tem acesso visual** ao navegador, então a extensão não pode ser usada. A solução é usar o perfil **`clawd`** em modo **headless**.

## ✅ Solução Implementada

As seguintes configurações foram feitas:

### 1. Configuração do Browser (`.clawdbot.json`)
```json
{
  "browser": {
    "enabled": true,
    "headless": true,      // Sem interface gráfica
    "noSandbox": true,     // Necessário para containers Linux
    "defaultProfile": "clawd",  // Usa CDP direto, não a extensão
    "profiles": {
      "clawd": {
        "driver": "clawd",
        "color": "#FF4500"
      }
    }
  }
}
```

### 2. Docker com Chrome/Chromium
O `Dockerfile` e `nixpacks.toml` agora incluem:
- Chromium browser
- Fontes e dependências necessárias
- Configurações de memória compartilhada

## 🐳 Deploy via Docker

### Opção 1: Docker Compose (Recomendado)

```bash
# Clone o repositório
git clone <url-do-repo> moltbot
cd moltbot

# Configure variáveis de ambiente (opcional)
export CLAWDBOT_GATEWAY_TOKEN="sua-senha-segura"

# Build e start
docker-compose -f docker-compose.vps.yml up -d

# Ver logs
docker-compose -f docker-compose.vps.yml logs -f
```

### Opção 2: Docker Build Manual

```bash
# Build
docker build -t moltbot:vps .

# Run
docker run -d \
  --name moltbot \
  -p 80:80 \
  -p 9222:9222 \
  --shm-size=2gb \
  --security-opt seccomp:unconfined \
  -e CLAWDBOT_GATEWAY_TOKEN="admin123" \
  -v moltbot-config:/home/node/.clawdbot \
  -v moltbot-workspace:/home/node/clawd \
  moltbot:vps
```

## ☁️ Deploy via Dokploy/Coolify/Railway

O `nixpacks.toml` já está configurado com todas as dependências. Basta fazer o deploy normalmente que o browser será instalado automaticamente.

### Variáveis de Ambiente Importantes

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `CLAWDBOT_GATEWAY_TOKEN` | Token de autenticação | `admin123` |
| `PORT` | Porta do gateway | `80` |
| `CLAWDBOT_STATE_DIR` | Diretório de config | `/app/data/.clawdbot` |
| `CLAWDBOT_WORKSPACE_DIR` | Diretório de trabalho | `/app/data/clawd` |

## 🔧 Como Usar o Browser via AI

Agora, quando você pedir para a AI usar o browser, ela usará automaticamente o perfil `clawd` em modo headless:

```
# Exemplos de comandos para a AI:
"Abra o site google.com"
"Pesquise por 'Python tutorials'"
"Tire um screenshot da página atual"
```

A AI pode:
- Navegar para URLs
- Clicar em elementos
- Digitar texto
- Tirar screenshots
- Executar JavaScript
- Fazer scroll
- E muito mais...

## ⚠️ Notas Importantes

1. **Sem Extensão Necessária**: O perfil `clawd` controla o browser diretamente via CDP, não precisa da extensão.

2. **Modo Headless**: O browser roda sem interface gráfica, perfeito para VPS.

3. **No-Sandbox**: Necessário para containers Linux. Já configurado automaticamente.

4. **Shared Memory**: O docker-compose já configura `shm_size: 2gb` para evitar crashes do Chrome.

5. **Screenshots**: A AI pode tirar screenshots para você ver o que está acontecendo no browser.

## 🐛 Troubleshooting

### Browser não inicia
```bash
# Verificar logs
docker-compose -f docker-compose.vps.yml logs moltbot-gateway

# Verificar se Chrome está instalado dentro do container
docker-compose -f docker-compose.vps.yml exec moltbot-gateway which chromium
```

### Erro de shared memory
Adicione `--shm-size=2gb` ao comando docker run ou use o docker-compose.vps.yml que já tem isso configurado.

### Erro de permissão
Certifique-se de que o container está rodando com `--security-opt seccomp:unconfined` para permitir que o Chrome funcione.

## 📝 Configuração Avançada

### Usar Chrome Remoto (cdpUrl)

Se você quiser usar um Chrome rodando em outra máquina:

```json
{
  "browser": {
    "cdpUrl": "http://ip-do-chrome:9222"
  }
}
```

### Múltiplos Perfis

Você pode criar múltiplos perfis de browser:

```json
{
  "browser": {
    "profiles": {
      "clawd": { "driver": "clawd", "color": "#FF4500" },
      "outro": { "cdpPort": 9223, "color": "#00FF00" }
    }
  }
}
```

---

**Pronto!** Agora seu MoltBot pode controlar o browser automaticamente em uma VPS sem precisar de interface gráfica! 🎉
